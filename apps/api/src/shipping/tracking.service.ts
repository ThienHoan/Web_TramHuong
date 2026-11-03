import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { LogisticsRepository } from './logistics.repository';
import {
  FulfillmentService,
  type Actor,
  type ShipmentData,
} from './fulfillment.service';
import {
  LOGISTICS_SETTINGS,
  type LogisticsSettings,
  type LogisticsRecord,
  type Warehouse,
} from './logistics.types';
import { GHN_CONFIG, type GhnConfig } from './ghn/ghn.config';
import { object, integer, string } from './ghn/ghn.decode';
import { logisticsHash } from './quote.service';
import { GHN_STATES, shipmentTransition } from './shipment-state';
export interface CarrierEvent {
  shopId: number;
  orderCode: string;
  type: string;
  at: string;
  status: string;
  codAmount: number;
  transferDate: string | null;
  weight: number;
  totalFee: number;
}
function normalizeCarrierEvent(payload: unknown): CarrierEvent {
  try {
    const p = object(payload),
      type = string(p.Type),
      at = string(p.Time),
      orderCode = string(p.OrderCode);
    if (
      type.length > 80 ||
      orderCode.length > 32 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(at) ||
      !Number.isFinite(Date.parse(at))
    )
      throw new Error('Invalid event');
    return {
      shopId: integer(p.ShopID, 1),
      orderCode,
      type,
      at: new Date(at).toISOString(),
      status: typeof p.Status === 'string' ? p.Status.slice(0, 80) : '',
      codAmount: integer(p.CODAmount ?? 0, 0, 50000000),
      transferDate:
        typeof p.CODTransferDate === 'string'
          ? p.CODTransferDate.slice(0, 80)
          : null,
      weight: integer(p.Weight ?? 0, 0, 1000000),
      totalFee: integer(p.TotalFee ?? 0, 0, 50000000),
    };
  } catch {
    throw new BadRequestException('WEBHOOK_SCHEMA_INVALID');
  }
}
const providerState = (status: string): string | undefined =>
  Object.hasOwn(GHN_STATES, status) ? GHN_STATES[status] : undefined;
@Injectable()
export class ShippingTrackingService {
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly fulfillment: FulfillmentService,
    @Inject(GHN_CONFIG) private readonly config: GhnConfig,
    @Inject(LOGISTICS_SETTINGS) private readonly settings: LogisticsSettings,
  ) {}
  async track(orderId: string, actor: Actor) {
    const row = await this.fulfillment.get(orderId);
    if (row.owner_id !== actor.id && !['ADMIN', 'STAFF'].includes(actor.role))
      throw new NotFoundException('SHIPMENT_NOT_FOUND');
    const events = await this.repo.list<{
      status: string;
      at: string;
      type?: string;
    }>('event', { orderId, limit: 100 });
    const [notifications, tickets] = await Promise.all([
      this.repo.list('notification', { orderId, limit: 20 }),
      this.repo.list('ticket', { orderId, limit: 20 }),
    ]);
    return {
      orderId,
      provider: 'GHN',
      trackingCode: row.data.trackingCode || null,
      state: row.state,
      eta: row.data.eta,
      updatedAt: row.updated_at,
      milestones: events.data
        .filter((r) => ['create', 'switch_status'].includes(r.data.type || ''))
        .map((r) => ({ state: r.data.status, at: r.data.at }))
        .sort((a, b) => a.at.localeCompare(b.at)),
      gpsAvailable: false,
      notifications: notifications.data.map((r) => ({
        id: r.id,
        state: r.data.state,
        at: r.data.at,
      })),
      supportRequests: tickets.data.map((r) => ({
        id: r.id,
        state: r.state,
        category: r.data.category,
        createdAt: r.created_at,
      })),
    };
  }
  async receive(secret: string | undefined, payload: unknown) {
    const expected = this.settings.webhookSecret;
    const digest = (value: string) =>
      createHash('sha256').update(value).digest();
    if (
      !this.config.enabled ||
      expected.length < 32 ||
      !secret ||
      !timingSafeEqual(digest(expected), digest(secret))
    )
      throw new ForbiddenException('WEBHOOK_AUTH_FAILED');
    const event = normalizeCarrierEvent(payload);
    // Scope by environment/shop; never accept events for an arbitrary token shop.
    const warehouses = await this.repo.list<Warehouse>('warehouse', {
      state: 'ACTIVE',
      limit: 100,
    });
    if (
      !warehouses.data.some(
        (r) => r.data.active && r.data.shopId === event.shopId,
      )
    )
      throw new ForbiddenException('WEBHOOK_SHOP_NOT_CONFIGURED');
    const key = `inbox:${this.config.environment}:${logisticsHash([event.shopId, event.orderCode, event.type, event.at])}`;
    const record = await this.repo.once(key, 'inbox', 'QUEUED', {
      event,
      attempts: 0,
      nextAt: new Date().toISOString(),
    });
    if (logisticsHash(record.data.event) !== logisticsHash(event))
      await this.repo.once(
        `event-collision:${record.id}`,
        'exception',
        'OPEN',
        {
          type: 'CONFLICTING_WEBHOOK_PAYLOAD',
          severity: 'high',
          inboxId: record.id,
        },
      );
    return { accepted: true, id: record.id };
  }
  async process(
    row: LogisticsRecord<{
      event: CarrierEvent;
      attempts: number;
      nextAt: string;
    }>,
  ) {
    const e = row.data.event;
    // Reconciliation is indexed by order for customer reads; workers locate a
    // carrier code through an explicit environment-scoped lookup key.
    const pointer = await this.repo.get<{ key: string }>(
      `carrier:${this.config.environment}:${e.shopId}:${e.orderCode}`,
    );
    let ship = pointer
      ? await this.repo.get<ShipmentData>(pointer.data.key)
      : ((await this.repo.findCarrier(
          this.config.environment,
          e.shopId,
          e.orderCode,
        )) as LogisticsRecord<ShipmentData> | null);
    if (!ship) throw new NotFoundException('WEBHOOK_SHIPMENT_NOT_FOUND');
    if (e.at > new Date(Date.now() + 5 * 60000).toISOString())
      throw new Error('WEBHOOK_FUTURE_TIMESTAMP');
    if (await this.repo.get(`event:${row.id}`)) return;
    const exception = async (type: string) =>
      this.repo.once(
        `exception:${row.id}:${type}`,
        'exception',
        'OPEN',
        { type, severity: 'high', shipmentId: ship!.id },
        null,
        ship!.order_id,
      );
    if (['switch_status', 'create'].includes(e.type)) {
      const target = providerState(e.status);
      if (!target) await exception('UNKNOWN_PROVIDER_STATUS');
      else if (!ship.data.lastEventAt || e.at > ship.data.lastEventAt) {
        if (shipmentTransition(ship.state, target)) {
          ship = await this.repo.write(
            ship.key,
            'shipment',
            target,
            {
              ...ship.data,
              externalStatus: e.status,
              lastEventAt: e.at,
              lastEventKey: row.id,
            },
            ship,
          );
          if (
            [
              'DELIVERY_FAILED',
              'RETURNING',
              'RETURNED',
              'CANCELLED',
              'MANUAL_REVIEW',
            ].includes(target)
          )
            await exception(target);
        } else await exception('UNEXPECTED_TRANSITION');
      }
    } else if (e.type === 'cod') {
      if (ship.data.codAmount === 0 && e.codAmount > 0)
        await exception('ONLINE_ORDER_COD_MISMATCH');
      await this.repo.once(
        `cod:provider:${row.id}`,
        'cod',
        'PROVIDER_REPORTED',
        {
          type: 'provider_reported',
          amount: e.codAmount,
          transferDate: e.transferDate,
          shipmentId: ship.id,
        },
        null,
        ship.order_id,
      );
    } else if (e.type === 'update_cod') await exception('COD_CHANGED');
    else if (e.type === 'update_fee') {
      await exception('SHIPPING_FEE_CHANGED');
      ship = await this.repo.write(
        ship.key,
        'shipment',
        ship.state,
        { ...ship.data, actualProviderFee: e.totalFee },
        ship,
      );
    } else if (e.type === 'update_weight')
      await exception('PACKAGE_WEIGHT_CHANGED');
    else await exception('UNKNOWN_EVENT_TYPE');
    await this.repo.once(
      `event:${row.id}`,
      'event',
      'RECORDED',
      {
        type: e.type,
        status: providerState(e.status) || 'PROVIDER_UPDATE',
        at: e.at,
        shipmentId: ship.id,
      },
      null,
      ship.order_id,
    );
    await this.repo.once(
      `notification:${row.id}`,
      'notification',
      'UNREAD',
      {
        type: e.type,
        state: providerState(e.status) || 'PROVIDER_UPDATE',
        at: e.at,
      },
      ship.owner_id,
      ship.order_id,
    );
  }
  async refresh(orderId: string) {
    let ship = await this.fulfillment.get(orderId);
    const live = await this.fulfillment.detail(ship);
    if (!ship.data.trackingCode)
      ship = await this.repo.write(
        ship.key,
        'shipment',
        'SHIPMENT_CREATED',
        { ...ship.data, trackingCode: live.trackingCode, eta: live.eta },
        ship,
      );
    await this.repo.once(
      `carrier:${this.config.environment}:${ship.data.shopId}:${live.trackingCode}`,
      'event',
      'POINTER',
      { key: ship.key },
    );
    try {
      const fees = await this.fulfillment.currentFee(ship);
      if (fees.fee !== null && fees.fee !== ship.data.actualProviderFee) {
        await this.repo.once(
          `fee-change:${ship.id}:${fees.fee}`,
          'exception',
          'OPEN',
          {
            type: 'SHIPPING_FEE_CHANGED',
            severity: 'medium',
            previous: ship.data.actualProviderFee ?? null,
            current: fees.fee,
          },
          null,
          ship.order_id,
        );
        ship = await this.repo.write(
          ship.key,
          'shipment',
          ship.state,
          { ...ship.data, actualProviderFee: fees.fee },
          ship,
        );
      }
    } catch {
      await this.repo.once(
        `fee-refresh:${ship.id}:${new Date().toISOString().slice(0, 10)}`,
        'exception',
        'OPEN',
        { type: 'FEE_RECONCILIATION_FAILED', shipmentId: ship.id },
        null,
        ship.order_id,
      );
    }
    const at = new Date().toISOString();
    const event: CarrierEvent = {
      shopId: ship.data.shopId,
      orderCode: live.trackingCode,
      type: 'switch_status',
      status: live.status,
      at,
      codAmount: live.codAmount,
      transferDate: null,
      weight: 0,
      totalFee: 0,
    };
    await this.repo.once(`refresh:${ship.id}:${at}`, 'inbox', 'QUEUED', {
      event,
      attempts: 0,
      nextAt: at,
    });
    return ship;
  }
}
