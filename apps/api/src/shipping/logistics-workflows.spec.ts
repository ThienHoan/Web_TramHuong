import { MemoryLogisticsRepository } from './testing/memory-repository';
import { LogisticsRepository } from './logistics.repository';
import { FulfillmentService } from './fulfillment.service';
import { ShippingTrackingService } from './tracking.service';
import { ShippingOperationsService } from './operations.service';
import { ShippingQuoteService } from './quote.service';
import { GhnClient } from './ghn/ghn.client';
import type { GhnConfig } from './ghn/ghn.config';
describe('P1–P3 durable logistics workflows (local fixtures)', () => {
  let repo: MemoryLogisticsRepository,
    tracking: ShippingTrackingService,
    operations: ShippingOperationsService;
  const owner = { id: 'owner', role: 'CUSTOMER' },
    admin = { id: 'admin', role: 'ADMIN' };
  beforeEach(async () => {
    repo = new MemoryLogisticsRepository();
    const r = repo as unknown as LogisticsRepository;
    const fulfillment = {
      get: async (id: string) => {
        const row = await repo.get(`shipment:staging:${id}`);
        if (!row) throw new Error('missing');
        return row;
      },
      gate: () => {},
      action: jest.fn(),
    };
    tracking = new ShippingTrackingService(
      r,
      fulfillment as unknown as FulfillmentService,
      { enabled: true, environment: 'staging' } as GhnConfig,
      {
        checkout: true,
        fulfillment: true,
        jobs: false,
        webhookSecret: 's'.repeat(32),
      },
    );
    operations = new ShippingOperationsService(
      r,
      fulfillment as unknown as FulfillmentService,
      tracking,
      { quote: jest.fn() } as unknown as ShippingQuoteService,
      {
        forShop: () => ({ request: jest.fn().mockResolvedValue(123) }),
      } as unknown as GhnClient,
    );
    await repo.write('warehouse:fixture', 'warehouse', 'ACTIVE', {
      name: 'Fixture',
      shopId: 123,
      active: true,
    });
    await repo.write(
      'shipment:staging:order',
      'shipment',
      'IN_TRANSIT',
      {
        clientCode: 'THorder',
        shopId: 123,
        trackingCode: 'GHN-FIXTURE',
        codAmount: 200000,
        eta: null,
        snapshot: {
          actualFee: 25000,
          subsidy: 0,
          preview: { destination: { province: { name: 'Fixture' } } },
        },
      },
      undefined,
      'owner',
      'order',
    );
  });
  const payload = (
    at: string,
    status = 'delivered',
    type = 'switch_status',
  ) => ({
    ShopID: 123,
    OrderCode: 'GHN-FIXTURE',
    Time: at,
    Status: status,
    Type: type,
    CODAmount: 200000,
  });
  it('rejects unauthenticated webhook before persistence', async () => {
    await expect(
      tracking.receive('wrong', payload(new Date().toISOString())),
    ).rejects.toThrow('AUTH');
    expect((await repo.list('inbox')).total).toBe(0);
  });
  it('rejects malformed authenticated payloads without treating them as server crashes', async () => {
    await expect(
      tracking.receive('s'.repeat(32), { Type: 'switch_status' }),
    ).rejects.toThrow('WEBHOOK_SCHEMA_INVALID');
  });
  it('raises a conflict alert when a provider dedup key carries different payloads', async () => {
    const p = payload(new Date().toISOString(), 'delivered', 'cod');
    await tracking.receive('s'.repeat(32), p);
    await tracking.receive('s'.repeat(32), { ...p, CODAmount: 1 });
    expect((await repo.list('inbox')).total).toBe(1);
    expect((await repo.list('exception')).total).toBe(1);
  });
  it('deduplicates callbacks and never publishes recipient or bank settlement from delivery', async () => {
    const p = payload(new Date().toISOString());
    await tracking.receive('s'.repeat(32), p);
    await tracking.receive('s'.repeat(32), p);
    const inbox = await repo.list('inbox');
    expect(inbox.total).toBe(1);
    await tracking.process(inbox.data[0] as never);
    await tracking.process(inbox.data[0] as never);
    expect((await repo.list('event')).total).toBe(1);
    expect((await repo.list('cod')).total).toBe(0);
    const view = await tracking.track('order', owner);
    expect(view.state).toBe('DELIVERED');
    expect(view).not.toHaveProperty('snapshot');
    expect(view.gpsAvailable).toBe(false);
  });
  it('refuses other-customer tracking', async () => {
    await expect(
      tracking.track('order', { id: 'other', role: 'CUSTOMER' }),
    ).rejects.toThrow('NOT_FOUND');
  });
  it('retains unknown statuses/events as actionable exceptions', async () => {
    await tracking.receive(
      's'.repeat(32),
      payload(new Date().toISOString(), 'new_status', 'future_type'),
    );
    const row = (await repo.list('inbox')).data[0];
    await tracking.process(row as never);
    expect((await repo.list('exception')).total).toBe(1);
    expect((await repo.get('shipment:staging:order'))!.state).toBe(
      'IN_TRANSIT',
    );
  });
  it('does not regress delivery state when an older callback arrives', async () => {
    for (const p of [
      payload(new Date().toISOString()),
      payload(new Date(Date.now() - 60000).toISOString(), 'transporting'),
    ]) {
      await tracking.receive('s'.repeat(32), p);
      const rows = (await repo.list('inbox')).data;
      await tracking.process(rows[rows.length - 1] as never);
    }
    expect((await repo.get('shipment:staging:order'))!.state).toBe('DELIVERED');
  });
  it('requires admin approval and inspection for returns, without financial mutations', async () => {
    const r = await operations.requestReturn(
      'order',
      owner,
      'request',
      'Damaged',
    );
    await expect(
      operations.reviewReturn(r.id, owner, 'review', 'approve', 'Check'),
    ).rejects.toThrow('APPROVAL');
    await expect(
      operations.reviewReturn(r.id, admin, 'review', 'receive', 'Inspected'),
    ).rejects.toThrow('NOT_APPROVED');
    expect((await repo.list('cod')).total).toBe(0);
  });
  it('deduplicates bank proof globally and keeps provider reports separate', async () => {
    await repo.write(
      'cod:expected:fixture',
      'cod',
      'EXPECTED',
      { type: 'expected', amount: 200000 },
      undefined,
      null,
      'order',
    );
    await repo.write(
      'cod:reported:fixture',
      'cod',
      'PROVIDER_REPORTED',
      { type: 'provider_reported', amount: 200000 },
      undefined,
      null,
      'order',
    );
    expect((await operations.codSummary('order', admin)).bankConfirmed).toBe(0);
    const a = await operations.codReceipt(
      'order',
      admin,
      'request',
      'bank_confirmed',
      200000,
      'BANK-TXN',
    );
    const b = await operations.codReceipt(
      'order',
      admin,
      'other-request',
      'bank_confirmed',
      200000,
      'BANK-TXN',
    );
    expect(a.id).toBe(b.id);
    expect((await operations.codSummary('order', admin)).outstanding).toBe(0);
    await expect(
      operations.codReceipt(
        'order',
        owner,
        'request',
        'bank_confirmed',
        1,
        'proof',
      ),
    ).rejects.toThrow('APPROVAL');
  });
  it('prevents duplicate support requests and customer access to carrier ticket mutations', async () => {
    const a = await operations.support(
      'order',
      owner,
      'ticket-request',
      'Tư vấn',
      'Where is my order?',
    );
    const b = await operations.support(
      'order',
      owner,
      'ticket-request',
      'Tư vấn',
      'Where is my order?',
    );
    expect(a.id).toBe(b.id);
    await expect(
      operations.ticketAction(a.id, owner, 'request', 'send'),
    ).rejects.toThrow('APPROVAL');
  });
  it('reports no invented rates or fees on empty reporting intervals', async () => {
    const result = await operations.analytics(
      '2020-01-01T00:00:00Z',
      '2020-01-02T00:00:00Z',
    );
    expect(result.totalShipments).toBe(0);
    expect(result.onTimeRate).toBeNull();
    expect(result.averageQuotedCost).toBeNull();
  });
  it('does not recommend a warehouse with unknown local stock', async () => {
    const result = await operations.recommend(
      {
        items: [{ productId: 'p', quantity: 1 }],
        warehouseId: 'fixture',
        paymentMethod: 'cod',
        recipient: { name: 'N', phone: '0900000000', address: 'A' },
        destination: { scheme: 'two_level', provinceId: 1, wardCode: '2' },
      },
      'owner',
    );
    expect(result).toEqual([]);
  });
  it('keeps internal ticket notes out of customer tracking and exposes saved request status', async () => {
    await operations.support(
      'order',
      owner,
      'visible',
      'Tư vấn',
      'Customer question',
    );
    await repo.write(
      'private-note',
      'action',
      'DONE',
      { description: 'PRIVATE NOTE' },
      undefined,
      admin.id,
      'order',
    );
    const view = await tracking.track('order', owner);
    expect(view.supportRequests).toHaveLength(1);
    expect(view.supportRequests[0].state).toBe('OPEN');
    expect(JSON.stringify(view)).not.toContain('PRIVATE NOTE');
  });
  it('hands over only prepared orders and returns individual batch failures', async () => {
    const ship = (await repo.get('shipment:staging:order'))!;
    await repo.write(
      ship.key,
      'shipment',
      'PICKUP_PENDING',
      { ...ship.data, prepared: true },
      ship,
    );
    const result = await operations.batchHandover(
      ['order', 'missing', 'order'],
      admin,
    );
    expect(result.results).toEqual([
      { orderId: 'order', success: true },
      { orderId: 'missing', success: false },
    ]);
    const first = (await repo.get(ship.key))!;
    await operations.batchHandover(['order'], admin);
    expect((await repo.get(ship.key))!.version).toBe(first.version);
    await expect(operations.batchHandover(['order'], owner)).rejects.toThrow(
      'STAFF_REQUIRED',
    );
  });
  it('filters analytics by stored shipment state', async () => {
    const r = await operations
      .analytics('2020-01-01T00:00:00Z', '2030-01-01T00:00:00Z', 'DELIVERED')
      .catch((e) => e as Error);
    expect(r).toBeInstanceOf(Error);
    const from = new Date(Date.now() - 86400000).toISOString(),
      to = new Date(Date.now() + 86400000).toISOString();
    expect(
      (await operations.analytics(from, to, 'DELIVERED')).totalShipments,
    ).toBe(0);
    expect(
      (await operations.analytics(from, to, 'IN_TRANSIT')).totalShipments,
    ).toBe(1);
  });
});
