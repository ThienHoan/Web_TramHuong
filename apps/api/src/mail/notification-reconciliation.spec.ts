import { NotificationRepository } from './notification.repository';
import type { SupabaseService } from '../supabase/supabase.service';
const id = '00000000-0000-4000-8000-000000000001';
const outcome = { source: 'mock', status: 'duplicate', id, state: 'UNKNOWN' };
const page = {
  source: 'mock',
  persistence: 'database',
  limit: 20,
  processedOrders: 1,
  hasMore: false,
  nextCursor: null,
  items: [{ orderId: id, event: 'payment_success', outcome }],
};
function make(result: unknown = { data: page, error: null }) {
  const rpc = jest.fn().mockResolvedValue(result);
  return {
    rpc,
    repo: new NotificationRepository({
      getClient: () => ({ rpc }),
    } as unknown as SupabaseService),
  };
}
describe('notification reconciliation strict projection and privacy', () => {
  it('projects source references only and retains unknown as duplicate without replay', async () => {
    const { repo, rpc } = make({
      data: {
        ...page,
        to: 'PRIVATE',
        items: [
          {
            ...page.items[0],
            mail: 'PRIVATE',
            outcome: { ...outcome, to: 'PRIVATE' },
          },
        ],
      },
      error: null,
    });
    expect(await repo.reconcile()).toEqual(page);
    expect(rpc).toHaveBeenCalledWith(
      'integration_reconcile_notifications_mock',
      { p_limit: 20 },
    );
  });
  it('projects safe review codes, never raw source content', async () => {
    const review = {
      source: 'mock',
      status: 'requires_review',
      id,
      state: 'DEAD',
      errorCode: 'NOTIFICATION_SOURCE_CONFLICT',
    };
    const { repo } = make({
      data: {
        ...page,
        items: [
          {
            orderId: id,
            event: 'payment_success',
            outcome: { ...review, recipient: 'PRIVATE' },
          },
        ],
      },
      error: null,
    });
    expect(await repo.reconcile()).toMatchObject({
      items: [{ outcome: review }],
    });
    expect(JSON.stringify(await repo.reconcile())).not.toContain('PRIVATE');
  });
  it.each([
    null,
    [],
    { ...page, source: 'live' },
    { ...page, limit: 100 },
    { ...page, processedOrders: 21 },
    { ...page, processedOrders: 0 },
    { ...page, hasMore: true },
    { ...page, nextCursor: id },
    { ...page, items: [...page.items, ...page.items] },
    { ...page, items: [{ orderId: id, event: 'admin_mail', outcome }] },
    {
      ...page,
      items: [
        {
          orderId: id,
          event: 'payment_success',
          outcome: { ...outcome, status: 'resent' },
        },
      ],
    },
  ])('rejects malformed/unbounded RPC result %j', async (data) => {
    await expect(make({ data, error: null }).repo.reconcile()).rejects.toThrow(
      'NOTIFICATION_RECONCILIATION_UNAVAILABLE',
    );
  });
  it('rejects a page outside the requested cursor', async () => {
    await expect(make().repo.reconcile(id)).rejects.toThrow(
      'NOTIFICATION_RECONCILIATION_UNAVAILABLE',
    );
  });
  it('does not leak database rejection or rejected transport promise', async () => {
    const { repo, rpc } = make({ data: null, error: { message: 'PRIVATE' } });
    await expect(repo.reconcile()).rejects.toThrow(
      'NOTIFICATION_RECONCILIATION_UNAVAILABLE',
    );
    rpc.mockRejectedValue(new Error('PRIVATE'));
    await expect(repo.reconcile()).rejects.toThrow(
      'NOTIFICATION_RECONCILIATION_UNAVAILABLE',
    );
  });
  it('validates cursor before database access', async () => {
    const { repo, rpc } = make();
    await expect(repo.reconcile('private text')).rejects.toThrow(
      'NOTIFICATION_INVALID_CURSOR',
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it('uses shipment ID for paging and exposes no raw tracking data', async () => {
    const { repo, rpc } = make({
      data: {
        ...page,
        processedShipments: 1,
        items: [
          {
            orderId: id,
            shipmentId: id,
            event: 'shipment_status',
            outcome,
            trackingCode: 'PRIVATE',
          },
        ],
      },
      error: null,
    });
    const result = await repo.reconcileShipments();
    expect(result).toMatchObject({
      processedShipments: 1,
      items: [{ shipmentId: id, event: 'shipment_status' }],
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(rpc).toHaveBeenCalledWith(
      'integration_reconcile_shipment_notifications_mock',
      { p_limit: 20 },
    );
  });
});
