import { FulfillmentService } from './fulfillment.service';
import { MemoryLogisticsRepository } from './testing/memory-repository';
import { LogisticsRepository } from './logistics.repository';
import { SupabaseService } from '../supabase/supabase.service';
import { GhnClient } from './ghn/ghn.client';
import type { GhnConfig } from './ghn/ghn.config';
import { shipmentTransition } from './shipment-state';
describe('safe fulfillment', () => {
  let repo: MemoryLogisticsRepository,
    service: FulfillmentService,
    request: jest.Mock;
  const snapshot = {
    total: 200000,
    shopId: 123,
    eta: null,
    preview: {
      recipient: { name: 'Fixture', phone: '0900000000', address: 'Street' },
      destination: {
        province: { name: 'Province' },
        ward: { name: 'Ward' },
        scheme: 'two_level',
      },
      parcel: {
        weightGrams: 200,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        declaredValue: 200000,
      },
      content: 'Fixture',
    },
  };
  const order = {
    id: 'order',
    status: 'PAID',
    payment_method: 'sepay',
    payment_status: 'paid',
    total: 200000,
    user_id: 'owner',
    shipping_info: { shipping_snapshot: snapshot },
  };
  beforeEach(() => {
    repo = new MemoryLogisticsRepository();
    const repository = repo as unknown as LogisticsRepository;
    repository.reserve = async (orderId, key, data) =>
      repo.write(
        key,
        'shipment',
        'SHIPMENT_PENDING',
        data,
        undefined,
        'owner',
        orderId,
      );
    request = jest
      .fn()
      .mockResolvedValue({ trackingCode: 'GHN-FIXTURE', fee: 25000 });
    const client = { forShop: () => ({ request }) };
    service = new FulfillmentService(
      repository,
      {
        getClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: order, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseService,
      client as unknown as GhnClient,
      { enabled: true, environment: 'staging' } as GhnConfig,
      { checkout: true, fulfillment: true, jobs: false, webhookSecret: '' },
    );
  });
  it('persists one reservation before provider IO; repeats return the same shipment', async () => {
    const a = await service.create(
      'order',
      { id: 'admin', role: 'ADMIN' },
      'request',
    );
    const b = await service.create(
      'order',
      { id: 'admin', role: 'ADMIN' },
      'request',
    );
    expect(a.id).toBe(b.id);
    expect(request).toHaveBeenCalledTimes(1);
    expect(a.data.codAmount).toBe(0);
    expect((await repo.list('action')).total).toBe(1);
  });
  it('does not blindly create again after a timeout/ambiguous failure', async () => {
    request.mockRejectedValue(new Error('timeout'));
    await expect(
      service.create('order', { id: 'admin', role: 'ADMIN' }, 'request'),
    ).rejects.toThrow('timeout');
    await expect(
      service.create('order', { id: 'admin', role: 'ADMIN' }, 'request2'),
    ).rejects.toThrow('UNCERTAIN');
    expect(request).toHaveBeenCalledTimes(1);
    expect((await repo.list('exception')).total).toBe(1);
  });
  it('racing reservations cause at most one external call', async () => {
    await Promise.allSettled([
      service.create('order', { id: 'a', role: 'ADMIN' }, '1'),
      service.create('order', { id: 'a', role: 'ADMIN' }, '2'),
    ]);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('blocks staff COD mutations before external IO', async () => {
    await expect(
      service.action(
        'order',
        { id: 'staff', role: 'STAFF' },
        'key',
        'updateCod',
        1,
      ),
    ).rejects.toThrow('APPROVAL');
    expect(request).not.toHaveBeenCalled();
  });
  it('normalizes forward transitions without regressions from terminal states', () => {
    expect(shipmentTransition('PICKUP_PENDING', 'DELIVERED')).toBe(true);
    expect(shipmentTransition('DELIVERED', 'IN_TRANSIT')).toBe(false);
    expect(shipmentTransition('DELIVERY_FAILED', 'OUT_FOR_DELIVERY')).toBe(
      true,
    );
    expect(shipmentTransition('OUT_FOR_DELIVERY', 'PICKUP_PENDING')).toBe(
      false,
    );
  });
});
