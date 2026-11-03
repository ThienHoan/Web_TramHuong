import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LogisticsRepository } from './logistics.repository';
import {
  LOGISTICS_SETTINGS,
  type LogisticsSettings,
  type LogisticsRecord,
} from './logistics.types';
import { GHN_CONFIG, type GhnConfig } from './ghn/ghn.config';
import { GhnClient } from './ghn/ghn.client';
import { integer, object, string } from './ghn/ghn.decode';
import type { QuoteSnapshot } from './quote.service';
import { logisticsHash } from './quote.service';
import type { GhnOperation } from './ghn/ghn.operations';
import { ShippingAddressService } from './address.service';
import { ShipmentDetailsDto } from './dto/operations.dto';
export interface ShipmentData {
  actualProviderFee?: number;
  clientCode: string;
  trackingCode?: string;
  shopId: number;
  snapshot: QuoteSnapshot;
  codAmount: number;
  eta: string | null;
  externalStatus?: string;
  lastEventAt?: string;
  lastEventKey?: string;
  prepared?: boolean;
  handoverAt?: string;
}
export interface Actor {
  id: string;
  role: string;
}
@Injectable()
export class FulfillmentService {
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly supabase: SupabaseService,
    private readonly client: GhnClient,
    @Inject(GHN_CONFIG) private readonly config: GhnConfig,
    @Inject(LOGISTICS_SETTINGS) private readonly settings: LogisticsSettings,
    @Optional() private readonly addresses?: ShippingAddressService,
  ) {}
  key(orderId: string) {
    return `shipment:${this.config.environment}:${orderId}`;
  }
  async updateDetails(orderId: string, actor: Actor, body: ShipmentDetailsDto) {
    this.gate();
    const row = await this.get(orderId);
    const live = await this.detail(row);
    if (
      ![
        'ready_to_pick',
        'picking',
        'picked',
        'storing',
        'transporting',
        'sorting',
        'delivering',
        'delivery_fail',
        'waiting_to_return',
      ].includes(live.status)
    )
      throw new BadRequestException('GHN_ACTION_NOT_ALLOWED_IN_CURRENT_STATE');
    const payload: Record<string, unknown> = { order_code: live.trackingCode };
    for (const [source, target] of [
      ['recipientName', 'to_name'],
      ['recipientPhone', 'to_phone'],
      ['recipientAddress', 'to_address'],
      ['note', 'note'],
    ] as const) {
      if (body[source] !== undefined) {
        if (!body[source].trim())
          throw new BadRequestException('SHIPMENT_DETAIL_EMPTY');
        payload[target] = body[source].trim();
      }
    }
    if (body.destination) {
      if (!this.addresses)
        throw new ServiceUnavailableException('ADDRESS_SERVICE_UNAVAILABLE');
      const d = await this.addresses.validate(body.destination);
      payload.to_province_name = d.province.name;
      payload.to_ward_name = d.ward.name;
      payload.is_new_to_address = d.scheme === 'two_level';
      if (d.district) payload.to_district_name = d.district.name;
    }
    if (Object.keys(payload).length === 1)
      throw new BadRequestException('SHIPMENT_CHANGES_REQUIRED');
    const key = `action:${row.id}:${body.requestId}`,
      hash = logisticsHash(payload),
      old = await this.repo.get(key);
    if (old) {
      if (old.data.payloadHash !== hash || old.state !== 'DONE')
        throw new ConflictException('ACTION_UNCERTAIN_OR_KEY_REUSED');
      return old;
    }
    const audit = await this.repo.write(
      key,
      'action',
      'PENDING',
      {
        actorId: actor.id,
        action: 'update_details',
        payloadHash: hash,
        fields: Object.keys(payload),
      },
      undefined,
      actor.id,
      orderId,
    );
    await this.client
      .forShop(row.data.shopId)
      .request('updateShipment', payload, (v) => {
        if (v !== null) throw new Error('Unexpected update response');
        return null;
      });
    return this.repo.write(audit.key, 'action', 'DONE', audit.data, audit);
  }
  gate() {
    if (!this.settings.fulfillment || !this.config.enabled)
      throw new ServiceUnavailableException('SHIPPING_FULFILLMENT_DISABLED');
    if (this.config.environment !== 'staging')
      throw new ForbiddenException('PRODUCTION_SHIPMENTS_LOCKED');
  }
  async get(orderId: string) {
    const row = await this.repo.get<ShipmentData>(this.key(orderId));
    if (!row) throw new NotFoundException('SHIPMENT_NOT_FOUND');
    return row;
  }
  async create(
    orderId: string,
    actor: Actor,
    requestId: string,
    pickShift?: number,
  ) {
    this.gate();
    const previous = await this.repo.get<ShipmentData>(this.key(orderId));
    if (previous) {
      if (previous.data.trackingCode) return previous;
      throw new ConflictException(
        'SHIPMENT_CREATION_UNCERTAIN: refresh by client code; do not recreate',
      );
    }
    const { data: order, error } = await this.supabase
      .getClient()
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (error || !order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (
      !['PENDING', 'PAID'].includes(order.status) ||
      (order.payment_method !== 'cod' && order.payment_status !== 'paid')
    )
      throw new BadRequestException('ORDER_NOT_FULFILLABLE');
    const info = order.shipping_info as unknown as {
      delivery_method?: string;
      shipping_snapshot?: QuoteSnapshot;
    };
    if (info.delivery_method === 'pickup' || !info.shipping_snapshot)
      throw new BadRequestException('VERIFIED_SHIPPING_SNAPSHOT_REQUIRED');
    const snapshot = info.shipping_snapshot;
    if (order.total !== snapshot.total)
      throw new ConflictException('ORDER_SHIPPING_TOTAL_MISMATCH');
    const codAmount = order.payment_status === 'paid' ? 0 : order.total;
    if (
      !['pending', 'paid'].includes(order.payment_status) ||
      !Number.isSafeInteger(codAmount) ||
      codAmount < 0 ||
      codAmount > 50000000
    )
      throw new BadRequestException('ORDER_PAYMENT_NOT_FULFILLABLE');
    // Unique DB key/CAS is persisted BEFORE any provider mutation. Competing
    // callers cannot both cross this reservation boundary.
    let row = await this.repo.reserve<ShipmentData>(
      orderId,
      this.key(orderId),
      {
        clientCode: `TH${orderId.replace(/-/g, '')}`,
        shopId: snapshot.shopId,
        snapshot,
        codAmount,
        eta: snapshot.eta,
      },
    );
    const audit = await this.repo.write(
      `action:${row.id}:${requestId}`,
      'action',
      'PENDING',
      { actorId: actor.id, action: 'create', shipmentId: row.id },
      undefined,
      actor.id,
      orderId,
    );
    try {
      const client = this.client.forShop(snapshot.shopId);
      if (pickShift !== undefined) {
        const shifts = await this.shifts(snapshot.shopId);
        if (!shifts.some((s) => s.id === pickShift))
          throw new BadRequestException('PICKUP_SHIFT_EXPIRED');
      }
      const p = snapshot.preview,
        d = p.destination;
      const result = await client.request(
        'createShipment',
        {
          client_order_code: row.data.clientCode,
          to_name: p.recipient.name,
          to_phone: p.recipient.phone,
          to_address: p.recipient.address,
          to_province_name: d.province.name,
          to_ward_name: d.ward.name,
          ...(d.district ? { to_district_name: d.district.name } : {}),
          is_new_to_address: d.scheme === 'two_level',
          weight: p.parcel.weightGrams,
          length: p.parcel.lengthCm,
          width: p.parcel.widthCm,
          height: p.parcel.heightCm,
          insurance_value: p.parcel.declaredValue,
          cod_amount: codAmount,
          service_type_id: 2,
          payment_type_id: 1,
          required_note: 'KHONGCHOXEMHANG',
          content: p.content,
          ...(pickShift === undefined ? {} : { pick_shift: [pickShift] }),
        },
        (v) => {
          const r = object(v);
          return {
            trackingCode: string(r.order_code),
            fee: integer(r.total_fee),
          };
        },
      );
      row = await this.repo.write(
        row.key,
        'shipment',
        'SHIPMENT_CREATED',
        {
          ...row.data,
          trackingCode: result.trackingCode,
          actualProviderFee: result.fee,
        },
        row,
      );
      await this.repo.once(
        `carrier:${this.config.environment}:${row.data.shopId}:${result.trackingCode}`,
        'event',
        'POINTER',
        { key: row.key },
      );
      await this.repo.write(
        audit.key,
        'action',
        'DONE',
        { ...audit.data, fee: result.fee, pickShift: pickShift ?? null },
        audit,
      );
      await this.repo.once(
        `cod:expected:${row.id}`,
        'cod',
        'EXPECTED',
        { amount: codAmount, type: 'expected', shipmentId: row.id },
        null,
        orderId,
      );
      return row;
    } catch (error) {
      await this.repo.once(
        `exception:create:${row.id}`,
        'exception',
        'OPEN',
        { type: 'CREATION_UNCERTAIN', severity: 'high', shipmentId: row.id },
        null,
        orderId,
      );
      throw error;
    }
  }
  async shifts(shopId: number) {
    return this.client.forShop(shopId).request('shifts', {}, (v) => {
      if (!Array.isArray(v)) throw new Error('Invalid shifts');
      return v.map((item) => {
        const row = object(item);
        return {
          id: integer(row.id, 1),
          title: string(row.title),
          fromTime: integer(row.from_time),
          toTime: integer(row.to_time),
        };
      });
    });
  }
  async detail(row: LogisticsRecord<ShipmentData>) {
    return this.client
      .forShop(row.data.shopId)
      .request(
        row.data.trackingCode ? 'detail' : 'detailByClient',
        row.data.trackingCode
          ? { order_code: row.data.trackingCode }
          : { client_order_code: row.data.clientCode },
        (v) => {
          const d = object(v);
          if (
            integer(d.shop_id, 1) !== row.data.shopId ||
            string(d.client_order_code) !== row.data.clientCode
          )
            throw new Error('Wrong shipment');
          return {
            trackingCode: string(d.order_code),
            status: string(d.status),
            eta: typeof d.leadtime === 'string' ? d.leadtime : null,
            codAmount: integer(d.cod_amount),
            codCollected: d.is_cod_collected === true,
            codTransferred: d.is_cod_transferred === true,
          };
        },
      );
  }
  async currentFee(row: LogisticsRecord<ShipmentData>) {
    if (!row.data.trackingCode)
      throw new BadRequestException('SHIPMENT_NOT_CREATED');
    return this.client
      .forShop(row.data.shopId)
      .request('actualFee', { order_code: row.data.trackingCode }, (v) => {
        const d = object(v);
        if (d.order_code !== row.data.trackingCode)
          throw new Error('Wrong fee record');
        const detail = object(d.detail);
        return {
          fee: detail.total === undefined ? null : integer(detail.total),
        };
      });
  }
  async action(
    orderId: string,
    actor: Actor,
    requestId: string,
    action: 'cancel' | 'return' | 'redeliver' | 'updateCod' | 'update',
    value?: number | string,
  ) {
    this.gate();
    if (['return', 'updateCod'].includes(action) && actor.role !== 'ADMIN')
      throw new ForbiddenException('ADMIN_APPROVAL_REQUIRED');
    const row = await this.get(orderId);
    if (!row.data.trackingCode)
      throw new ConflictException('SHIPMENT_CREATION_UNCERTAIN');
    const payloadHash = logisticsHash([action, value ?? null]);
    const key = `action:${row.id}:${requestId}`;
    const old = await this.repo.get(key);
    if (old) {
      if (old.data.payloadHash !== payloadHash)
        throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
      if (old.state === 'DONE') return old;
      throw new ConflictException(
        'ACTION_UNCERTAIN: refresh and review before retry',
      );
    }
    const audit = await this.repo.write(
      key,
      'action',
      'PENDING',
      { actorId: actor.id, action, payloadHash, shipmentId: row.id },
      undefined,
      actor.id,
      orderId,
    );
    const live = await this.detail(row);
    const allowed =
      action === 'cancel'
        ? ['ready_to_pick']
        : action === 'return'
          ? ['delivery_fail', 'storing', 'waiting_to_return', 'return']
          : action === 'redeliver'
            ? ['storing', 'waiting_to_return']
            : action === 'update'
              ? [
                  'ready_to_pick',
                  'picking',
                  'picked',
                  'storing',
                  'transporting',
                  'sorting',
                  'delivering',
                  'delivery_fail',
                  'waiting_to_return',
                ]
              : ['ready_to_pick'];
    if (!allowed.includes(live.status))
      throw new BadRequestException('GHN_ACTION_NOT_ALLOWED_IN_CURRENT_STATE');
    if (
      action === 'updateCod' &&
      (!Number.isSafeInteger(value) ||
        Number(value) < 0 ||
        Number(value) > 5000000 ||
        (row.data.codAmount === 0 && Number(value) > 0))
    )
      throw new BadRequestException('COD_UPDATE_INVALID');
    if (action === 'updateCod' && live.codAmount !== row.data.codAmount)
      throw new ConflictException('COD_RECONCILIATION_REQUIRED');
    if (action === 'updateCod' && Number(value) > 0) {
      const current = await this.supabase
        .getClient()
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();
      if (
        current.error ||
        !current.data ||
        current.data.payment_status === 'paid'
      )
        throw new ConflictException('ONLINE_ORDER_HAS_NO_COD_DEBT');
    }
    const operation: GhnOperation =
      action === 'cancel'
        ? 'cancelShipment'
        : action === 'return'
          ? 'returnShipment'
          : action === 'redeliver'
            ? 'redeliver'
            : action === 'updateCod'
              ? 'updateCod'
              : 'updateShipment';
    const payload =
      action === 'updateCod'
        ? { order_code: live.trackingCode, cod_amount: value }
        : action === 'update'
          ? { order_code: live.trackingCode, note: value }
          : { order_codes: [live.trackingCode] };
    await this.client
      .forShop(row.data.shopId)
      .request(operation, payload, (v) => {
        if (['cancel', 'return', 'redeliver'].includes(action)) {
          if (
            !Array.isArray(v) ||
            !v.some((item) => {
              const r = object(item);
              return r.order_code === live.trackingCode && r.result === true;
            })
          )
            throw new Error('Action rejected');
        }
        return null;
      });
    if (action === 'updateCod')
      return this.repo.completeCod(row, audit, Number(value));
    return this.repo.write(key, 'action', 'DONE', audit.data, audit);
  }
  async labels(orderIds: string[], actor: Actor, requestId: string) {
    this.gate();
    if (!orderIds.length || orderIds.length > 100)
      throw new BadRequestException('SELECT_1_TO_100_ORDERS');
    const rows = await Promise.all(
      [...new Set(orderIds)].map((id) => this.get(id)),
    );
    if (
      rows.some(
        (r) => !r.data.trackingCode || r.data.shopId !== rows[0].data.shopId,
      )
    )
      throw new BadRequestException(
        'LABELS_REQUIRE_CREATED_SHIPMENTS_FROM_ONE_SHOP',
      );
    const audit = await this.repo.write(
      `labels:${actor.id}:${requestId}`,
      'action',
      'PENDING',
      { action: 'labels', orderIds },
      undefined,
      actor.id,
    );
    const token = await this.client
      .forShop(rows[0].data.shopId)
      .request(
        'printLabels',
        { order_codes: rows.map((r) => r.data.trackingCode) },
        (v) => string(object(v).token),
      );
    await this.repo.write(
      audit.key,
      'action',
      'DONE',
      { action: 'labels', count: rows.length },
      audit,
    );
    return {
      url: `${this.config.origin}/a5/public-api/printA5?token=${encodeURIComponent(token)}`,
      expiresInSeconds: 1800,
    };
  }
}
