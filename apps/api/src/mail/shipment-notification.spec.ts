import {
  renderShipmentNotification,
  validShipmentNotificationMail,
  type ShipmentNotificationMail,
} from './shipment-notification';
import { NotificationRepository } from './notification.repository';
import type { SupabaseService } from '../supabase/supabase.service';
import type { IntegrationOutboxRow } from '../integrations/integration-database.types';
const id = '00000000-0000-4000-8000-000000000001';
const mail: ShipmentNotificationMail = {
  to: 'customer@example.invalid',
  subject: 'Shipment update',
  template: 'shipment-status',
  context: { id, trackingCode: 'FIXTURE_1', status: 'DELIVERED' },
};
const row = {
  id,
  provider: 'resend',
  environment: 'mock',
  state: 'WORKING',
  operation_kind: 'mutation',
  event_type: 'shipment_status',
  lease_token: id,
  version: 2,
  payload: { orderId: id, status: 'DELIVERED' },
} as IntegrationOutboxRow;
function make(
  result: unknown = { data: { source: 'mock', mail }, error: null },
) {
  const rpc = jest.fn().mockResolvedValue(result);
  return {
    rpc,
    repo: new NotificationRepository({
      getClient: () => ({ rpc }),
    } as unknown as SupabaseService),
  };
}
describe('shipment notification fixed bilingual template and source contract', () => {
  it('renders accepted state in both languages without amount or payment claim', () => {
    expect(validShipmentNotificationMail(mail)).toBe(true);
    const html = renderShipmentNotification(mail);
    expect(html).toContain('Đã giao hàng / Delivered');
    expect(html).toContain('FIXTURE_1');
    expect(html).not.toMatch(/paid|payment|thanh toán|COD/);
  });
  it('keeps Handlebars escaping even if a caller skips validation', () => {
    const html = renderShipmentNotification({
      ...mail,
      context: { ...mail.context, trackingCode: '<script>bad</script>' },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it.each([
    { ...mail, to: 'bad\n@example.invalid' },
    { ...mail, template: '../../private' },
    { ...mail, context: { ...mail.context, status: 'paid' } },
    { ...mail, context: { ...mail.context, status: 'toString' } },
    { ...mail, context: { ...mail.context, total: 123 } },
    { ...mail, context: { ...mail.context, trackingCode: '<script>' } },
  ])('rejects invalid or financially misleading source %j', (value) => {
    expect(validShipmentNotificationMail(value)).toBe(false);
  });
  it('resolves only an owned mock lease using fixed RPC arguments', async () => {
    const { repo, rpc } = make();
    expect(await repo.resolveShipment(row)).toEqual(mail);
    expect(rpc).toHaveBeenCalledWith(
      'integration_resolve_shipment_notification_mock',
      { p_id: id, p_lease_token: id, p_version: 2 },
    );
  });
  it.each(['PT409', 'PT404', 'PT422'])(
    'treats known invalid source %s as rejected before send',
    async (code) => {
      await expect(
        make({
          data: null,
          error: { code, message: 'PRIVATE' },
        }).repo.resolveShipment(row),
      ).rejects.toMatchObject({ code: 'REJECTED' });
    },
  );
  it('refuses cross-order and changed-state RPC mail', async () => {
    const { repo, rpc } = make();
    await expect(
      repo.resolveShipment({
        ...row,
        payload: { orderId: id, status: 'IN_TRANSIT' },
      }),
    ).rejects.toMatchObject({ code: 'REJECTED' });
    rpc.mockResolvedValue({
      data: {
        source: 'mock',
        mail: {
          ...mail,
          context: {
            ...mail.context,
            id: '00000000-0000-4000-8000-000000000009',
          },
        },
      },
      error: null,
    });
    await expect(repo.resolveShipment(row)).rejects.toMatchObject({
      code: 'REJECTED',
    });
  });
  it('blocks unexpected scope before database access and sanitizes transport errors', async () => {
    const { repo, rpc } = make();
    await expect(
      repo.resolveShipment({ ...row, environment: 'production' }),
    ).rejects.toThrow('INTEGRATION_REJECTED');
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockRejectedValue(new Error('PRIVATE'));
    await expect(repo.resolveShipment(row)).rejects.toThrow(
      'INTEGRATION_UNAVAILABLE',
    );
  });
});
