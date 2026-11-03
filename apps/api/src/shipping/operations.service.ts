import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Optional,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LogisticsRepository } from './logistics.repository';
import {
  FulfillmentService,
  type Actor,
  type ShipmentData,
} from './fulfillment.service';
import type {
  LogisticsKind,
  LogisticsRecord,
  Warehouse,
} from './logistics.types';
import {
  ShippingQuoteService,
  logisticsHash,
  canonicalItems,
} from './quote.service';
import { ShippingTrackingService } from './tracking.service';
import { GhnClient } from './ghn/ghn.client';
import { SupabaseService } from '../supabase/supabase.service';
import { object, integer, string } from './ghn/ghn.decode';
import type { QuoteDto } from './dto/quote.dto';

@Injectable()
export class ShippingOperationsService {
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly fulfillment: FulfillmentService,
    private readonly tracking: ShippingTrackingService,
    private readonly quotes: ShippingQuoteService,
    private readonly client: GhnClient,
    @Optional() private readonly supabase?: SupabaseService,
  ) {}
  async owned(orderId: string, actor: Actor) {
    const ship = await this.fulfillment.get(orderId);
    if (ship.owner_id !== actor.id && !['ADMIN', 'STAFF'].includes(actor.role))
      throw new NotFoundException('SHIPMENT_NOT_FOUND');
    return ship;
  }
  admin(actor: Actor) {
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException('ADMIN_APPROVAL_REQUIRED');
  }
  async record(id: string, kind: LogisticsKind) {
    const r = await this.repo.byId(id);
    if (!r || r.kind !== kind)
      throw new NotFoundException('LOGISTICS_RECORD_NOT_FOUND');
    return r;
  }
  async requestReturn(
    orderId: string,
    actor: Actor,
    requestId: string,
    reason: string,
  ) {
    await this.owned(orderId, actor);
    return this.repo.once(
      `return:${actor.id}:${requestId}`,
      'return',
      'REQUESTED',
      { reason, requestedBy: actor.id },
      actor.id,
      orderId,
    );
  }
  async reviewReturn(
    id: string,
    actor: Actor,
    requestId: string,
    decision: 'approve' | 'reject' | 'receive',
    note: string,
  ) {
    this.admin(actor);
    const row = await this.record(id, 'return');
    if (!row.order_id) throw new BadRequestException('RETURN_ORDER_REQUIRED');
    if (decision === 'receive') {
      if (!note.trim())
        throw new BadRequestException('RETURN_INSPECTION_REQUIRED');
      if (!['APPROVED', 'MANUAL_RETURN', 'RETURNING'].includes(row.state))
        throw new BadRequestException('RETURN_NOT_APPROVED');
      return this.repo.write(
        row.key,
        'return',
        'RECEIVED',
        {
          ...row.data,
          inspection: note,
          receivedBy: actor.id,
          receivedAt: new Date().toISOString(),
        },
        row,
      );
    }
    if (row.state !== 'REQUESTED')
      throw new ConflictException('RETURN_ALREADY_REVIEWED');
    if (decision === 'reject')
      return this.repo.write(
        row.key,
        'return',
        'REJECTED',
        { ...row.data, reviewedBy: actor.id, note },
        row,
      );
    const ship = await this.fulfillment.get(row.order_id);
    const manual = ['DELIVERED', 'RETURNED'].includes(ship.state);
    const approved = await this.repo.write(
      row.key,
      'return',
      manual ? 'MANUAL_RETURN' : 'APPROVED',
      { ...row.data, reviewedBy: actor.id, note },
      row,
    );
    if (!manual)
      await this.fulfillment.action(row.order_id, actor, requestId, 'return');
    return approved;
  }
  async resolveException(id: string, actor: Actor, note: string) {
    this.admin(actor);
    const row = await this.record(id, 'exception');
    if (!note.trim())
      throw new BadRequestException('RESOLUTION_EVIDENCE_REQUIRED');
    return this.repo.write(
      row.key,
      'exception',
      'RESOLVED',
      {
        ...row.data,
        resolvedBy: actor.id,
        resolvedAt: new Date().toISOString(),
        resolution: note,
      },
      row,
    );
  }
  async staff() {
    if (!this.supabase)
      throw new BadRequestException('STAFF_DIRECTORY_UNAVAILABLE');
    const r = await this.supabase
      .getClient()
      .from('users')
      .select('id,full_name')
      .in('role', ['ADMIN', 'STAFF'])
      .eq('is_banned', false)
      .limit(100);
    if (r.error) throw new BadRequestException('STAFF_DIRECTORY_UNAVAILABLE');
    return (r.data || []).map((row) => ({
      id: row.id,
      name: row.full_name || row.id.slice(0, 8),
    }));
  }
  async assignException(id: string, actor: Actor, assigneeId: string) {
    this.admin(actor);
    if (!(await this.staff()).some((row) => row.id === assigneeId))
      throw new BadRequestException('ASSIGNEE_MUST_BE_ACTIVE_STAFF');
    const row = await this.record(id, 'exception');
    if (row.state !== 'OPEN')
      throw new BadRequestException('EXCEPTION_NOT_OPEN');
    return this.repo.write(
      row.key,
      'exception',
      'OPEN',
      { ...row.data, assigneeId, assignedBy: actor.id },
      row,
    );
  }
  async prepare(orderId: string, actor: Actor, handedOver: boolean) {
    const ship = await this.fulfillment.get(orderId);
    if (!['SHIPMENT_CREATED', 'PICKUP_PENDING'].includes(ship.state))
      throw new BadRequestException('SHIPMENT_NOT_IN_PICKUP_QUEUE');
    if (handedOver && !ship.data.prepared)
      throw new BadRequestException('PREPARE_BEFORE_HANDOVER');
    if (handedOver && ship.data.handoverAt) return ship;
    const audit = await this.repo.write(
      `pickup:${ship.id}:${randomUUID()}`,
      'action',
      'PENDING',
      { actorId: actor.id, action: handedOver ? 'handover' : 'prepare' },
      undefined,
      actor.id,
      orderId,
    );
    const updated = await this.repo.write(
      ship.key,
      'shipment',
      ship.state,
      {
        ...ship.data,
        prepared: true,
        ...(handedOver ? { handoverAt: new Date().toISOString() } : {}),
        preparedBy: actor.id,
      },
      ship,
    );
    await this.repo.write(audit.key, 'action', 'DONE', audit.data, audit);
    return updated;
  }
  async codReceipt(
    orderId: string,
    actor: Actor,
    requestId: string,
    type: 'bank_confirmed' | 'collected',
    amount: number,
    proof: string,
  ) {
    this.admin(actor);
    const ship = await this.fulfillment.get(orderId);
    if (!Number.isSafeInteger(amount) || amount <= 0 || !proof.trim())
      throw new BadRequestException('COD_PROOF_AND_POSITIVE_AMOUNT_REQUIRED');
    if (ship.data.codAmount === 0)
      throw new BadRequestException('ONLINE_ORDER_HAS_NO_COD_DEBT');
    const key =
      type === 'bank_confirmed'
        ? `cod:bank:${logisticsHash(proof.trim().toUpperCase())}`
        : `cod:receipt:${actor.id}:${requestId}`;
    const existing = await this.repo.get(key);
    const hash = logisticsHash([orderId, type, amount, proof]);
    if (existing) {
      if (existing.data.hash !== hash)
        throw new ConflictException('RECEIPT_PROOF_ALREADY_USED');
      return existing;
    }
    return this.repo.write(
      key,
      'cod',
      'CONFIRMED',
      { type, amount, proof, hash, actorId: actor.id, shipmentId: ship.id },
      undefined,
      actor.id,
      orderId,
    );
  }
  async batchHandover(orderIds: string[], actor: Actor) {
    if (!['ADMIN', 'STAFF'].includes(actor.role))
      throw new ForbiddenException('STAFF_REQUIRED');
    if (!orderIds.length || orderIds.length > 100)
      throw new BadRequestException('SELECT_1_TO_100_ORDERS');
    const results: { orderId: string; success: boolean }[] = [];
    for (const orderId of new Set(orderIds)) {
      try {
        await this.prepare(orderId, actor, true);
        results.push({ orderId, success: true });
      } catch {
        results.push({ orderId, success: false });
      }
    }
    return { results };
  }
  async codSummary(orderId: string, actor: Actor) {
    this.admin(actor);
    const entries = await this.all('cod', { orderId });
    const total = (type: string) =>
      entries
        .filter((r) => r.data.type === type)
        .reduce((s, r) => s + Number(r.data.amount || 0), 0);
    const expected = total('expected') + total('expected_adjustment'),
      bankConfirmed = total('bank_confirmed');
    return {
      expected,
      collected: total('collected'),
      providerReported: total('provider_reported'),
      bankConfirmed,
      outstanding: Math.max(0, expected - bankConfirmed),
      difference: bankConfirmed - expected,
      entries,
    };
  }
  async support(
    orderId: string,
    actor: Actor,
    requestId: string,
    category: string,
    description: string,
  ) {
    await this.owned(orderId, actor);
    return this.repo.once(
      `ticket:${actor.id}:${requestId}`,
      'ticket',
      'OPEN',
      { category, description, attachments: [] },
      actor.id,
      orderId,
    );
  }
  async ticketAction(
    id: string,
    actor: Actor,
    requestId: string,
    action: 'send' | 'reply' | 'refresh' | 'note',
    description?: string,
  ) {
    this.admin(actor);
    const ticket = await this.record(id, 'ticket');
    if (action === 'note') {
      if (!description?.trim())
        throw new BadRequestException('TICKET_NOTE_REQUIRED');
      return this.repo.once(
        `ticket-note:${ticket.id}:${requestId}`,
        'action',
        'DONE',
        {
          actorId: actor.id,
          action: 'internal_note',
          ticketId: ticket.id,
          description,
        },
        actor.id,
        ticket.order_id,
      );
    }
    this.fulfillment.gate();
    if (!ticket.order_id)
      throw new BadRequestException('TICKET_ORDER_REQUIRED');
    const ship = await this.fulfillment.get(ticket.order_id);
    if (!ship.data.trackingCode)
      throw new BadRequestException('TICKET_REQUIRES_CARRIER_ORDER');
    if (action === 'refresh') {
      if (!ticket.data.externalId)
        throw new BadRequestException('TICKET_NOT_SENT');
      const data = await this.client
        .forShop(ship.data.shopId)
        .request('ticketDetail', { ticket_id: ticket.data.externalId }, (v) => {
          const t = object(v);
          return {
            id: integer(t.id, 1),
            status: string(t.status),
            statusId: integer(t.status_id, 1, 3),
          };
        });
      return this.repo.write(
        ticket.key,
        'ticket',
        data.statusId === 3 ? 'CLOSED' : 'SENT',
        { ...ticket.data, providerStatus: data.status },
        ticket,
      );
    }
    const existing = await this.repo.get(
      `ticket-action:${ticket.id}:${requestId}`,
    );
    if (existing)
      throw new ConflictException(
        'TICKET_ACTION_ALREADY_ATTEMPTED: review before retry',
      );
    if (action === 'send' && ticket.data.externalId)
      throw new ConflictException('TICKET_ALREADY_SENT');
    if (action === 'reply' && !ticket.data.externalId)
      throw new BadRequestException('TICKET_NOT_SENT');
    const audit = await this.repo.write(
      `ticket-action:${ticket.id}:${requestId}`,
      'action',
      'PENDING',
      {
        actorId: actor.id,
        action,
        ticketId: ticket.id,
        description: description || String(ticket.data.description),
      },
      undefined,
      actor.id,
      ticket.order_id,
    );
    const form = new FormData();
    if ((description || String(ticket.data.description)).length > 2000)
      throw new BadRequestException('GHN_TICKET_DESCRIPTION_MAX_2000');
    form.set(
      action === 'send' ? 'order_code' : 'ticket_id',
      action === 'send'
        ? ship.data.trackingCode
        : String(ticket.data.externalId),
    );
    form.set('description', description || String(ticket.data.description));
    if (action === 'send') form.set('category', String(ticket.data.category));
    if (Array.isArray(ticket.data.attachments)) {
      for (const [index, path] of ticket.data.attachments.entries()) {
        if (
          typeof path !== 'string' ||
          !path.startsWith(`tickets/${ticket.id}/`) ||
          !this.supabase
        )
          throw new BadRequestException('TICKET_EVIDENCE_INVALID');
        const file = await this.supabase
          .getClient()
          .storage.from('shipping-evidence')
          .download(path);
        if (file.error || !file.data || file.data.size > 2 * 1024 * 1024)
          throw new BadRequestException('TICKET_EVIDENCE_UNAVAILABLE');
        form.append('attachments', file.data, `evidence-${index + 1}.jpg`);
      }
    }
    const result = await this.client
      .forShop(ship.data.shopId)
      .request(action === 'send' ? 'ticketCreate' : 'ticketReply', form, (v) =>
        action === 'send' ? integer(object(v).id, 1) : null,
      );
    const updated = await this.repo.write(
      ticket.key,
      'ticket',
      'SENT',
      {
        ...ticket.data,
        ...(result ? { externalId: result } : {}),
        lastReply: description || null,
      },
      ticket,
    );
    await this.repo.write(audit.key, 'action', 'DONE', audit.data, audit);
    return updated;
  }
  async all<T = Record<string, unknown>>(
    kind: LogisticsKind,
    filter: {
      from?: string;
      to?: string;
      orderId?: string;
      orderIds?: string[];
      state?: string;
    } = {},
  ) {
    const rows: LogisticsRecord<T>[] = [];
    for (let page = 1; page <= 100; page++) {
      const r = await this.repo.list<T>(kind, { ...filter, page, limit: 100 });
      rows.push(...r.data);
      if (rows.length >= r.total) return rows;
    }
    throw new BadRequestException('REPORT_TOO_LARGE: narrow date range');
  }
  async analytics(from: string, to: string, state?: string) {
    if (
      Date.parse(to) - Date.parse(from) > 366 * 86400000 ||
      Date.parse(from) > Date.parse(to)
    )
      throw new BadRequestException('REPORT_RANGE_MAX_366_DAYS');
    const rows = await this.all<ShipmentData>('shipment', {
      from,
      to,
      ...(state ? { state } : {}),
    });
    const delivered = rows.filter((r) => r.state === 'DELIVERED'),
      etaKnown = delivered.filter((r) => r.data.eta && r.data.lastEventAt);
    const cost = rows.reduce((s, r) => s + r.data.snapshot.actualFee, 0),
      subsidy = rows.reduce((s, r) => s + r.data.snapshot.subsidy, 0);
    const groups = Object.create(null) as Record<
      string,
      { shipments: number; cost: number }
    >;
    const warehouses = Object.create(null) as Record<
      string,
      { name: string; shipments: number; cost: number }
    >;
    const categories = Object.create(null) as Record<
      string,
      { merchandiseSubtotal: number; allocatedQuotedFee: number | null }
    >;
    for (const r of rows) {
      const key = r.data.snapshot.preview.destination.province.name;
      const g = groups[key] || { shipments: 0, cost: 0 };
      g.shipments++;
      g.cost += r.data.snapshot.actualFee;
      groups[key] = g;
      const origin = r.data.snapshot.warehouseId;
      const w = warehouses[origin] || {
        name: r.data.snapshot.warehouseName || origin,
        shipments: 0,
        cost: 0,
      };
      w.shipments++;
      w.cost += r.data.snapshot.actualFee;
      warehouses[origin] = w;
      for (const item of r.data.snapshot.categoryValues || []) {
        const key = item.categoryId || 'uncategorized';
        const c = categories[key] || {
          merchandiseSubtotal: 0,
          allocatedQuotedFee: r.data.snapshot.subtotal > 0 ? 0 : null,
        };
        c.merchandiseSubtotal += item.subtotal;
        if (c.allocatedQuotedFee !== null && r.data.snapshot.subtotal > 0)
          c.allocatedQuotedFee +=
            (r.data.snapshot.actualFee * item.subtotal) /
            r.data.snapshot.subtotal;
        categories[key] = c;
      }
    }
    const actualKnown = rows.filter(
      (r) => r.data.actualProviderFee !== undefined,
    );
    const ledger: LogisticsRecord[] = [];
    for (let offset = 0; offset < rows.length; offset += 100) {
      const ids = rows
        .slice(offset, offset + 100)
        .map((r) => r.order_id)
        .filter((id): id is string => !!id);
      if (ids.length)
        ledger.push(...(await this.all('cod', { orderIds: ids })));
    }
    const sums = new Map<string, { expected: number; bank: number }>();
    for (const entry of ledger) {
      if (!entry.order_id) continue;
      const sum = sums.get(entry.order_id) || { expected: 0, bank: 0 };
      if (['expected', 'expected_adjustment'].includes(String(entry.data.type)))
        sum.expected += Number(entry.data.amount || 0);
      if (entry.data.type === 'bank_confirmed')
        sum.bank += Number(entry.data.amount || 0);
      sums.set(entry.order_id, sum);
    }
    return {
      totalShipments: rows.length,
      delivered: delivered.length,
      failed: rows.filter((r) => r.state === 'DELIVERY_FAILED').length,
      returnRate: rows.length
        ? rows.filter((r) => r.state === 'RETURNED').length / rows.length
        : null,
      onTimeRate: etaKnown.length
        ? etaKnown.filter((r) => r.data.lastEventAt! <= r.data.eta!).length /
          etaKnown.length
        : null,
      averageDeliveryHours: delivered.length
        ? delivered.reduce(
            (s, r) =>
              s +
              (Date.parse(r.data.lastEventAt || r.updated_at) -
                Date.parse(r.created_at)) /
                3600000,
            0,
          ) / delivered.length
        : null,
      averageQuotedCost: rows.length ? cost / rows.length : null,
      averageActualCost: actualKnown.length
        ? actualKnown.reduce((s, r) => s + r.data.actualProviderFee!, 0) /
          actualKnown.length
        : null,
      quotedActualDifference: actualKnown.length
        ? actualKnown.reduce(
            (s, r) => s + r.data.actualProviderFee! - r.data.snapshot.actualFee,
            0,
          )
        : null,
      codOutstanding: [...sums.values()].reduce(
        (s, r) => s + Math.max(0, r.expected - r.bank),
        0,
      ),
      codDiscrepancies: [...sums.values()].filter((r) => r.expected !== r.bank)
        .length,
      manualAttention: rows.filter((r) =>
        ['MANUAL_REVIEW', 'DELIVERY_FAILED', 'RETURN_REQUESTED'].includes(
          r.state,
        ),
      ).length,
      shippingSubsidy: subsidy,
      byProvince: groups,
      byWarehouse: warehouses,
      categoryCostAllocation: {
        method: 'quoted_fee_by_merchandise_subtotal_share',
        estimated: true,
        values: categories,
      },
    };
  }
  async recommend(input: QuoteDto, ownerId: string | null) {
    const warehouses = await this.repo.list<Warehouse>('warehouse', {
      state: 'ACTIVE',
      limit: 100,
    });
    const candidates = [];
    for (const w of warehouses.data) {
      const id = w.key.slice(10);
      let available = w.data.active;
      for (const item of canonicalItems(input.items)) {
        const inventory = await this.repo.get<{ available: number }>(
          `inventory:${id}:${item.productId}:${item.variantId || ''}`,
        );
        if (
          !inventory ||
          inventory.state !== 'ACTIVE' ||
          inventory.data.available < item.quantity
        )
          available = false;
      }
      if (!available) continue;
      try {
        const q = await this.quotes.quote(
          { ...input, warehouseId: id },
          ownerId,
          false,
        );
        candidates.push({
          warehouseId: id,
          name: w.data.name,
          fee: q.actualFee,
          eta: q.eta,
        });
      } catch {
        continue;
      }
    }
    return candidates.sort(
      (a, b) => a.fee - b.fee || (a.eta || '~').localeCompare(b.eta || '~'),
    );
  }
  async sweep() {
    const cursor = await this.repo.get<{ page: number }>(
      'reconciliation:cursor',
    );
    const page = cursor?.data.page || 1;
    const ships = await this.repo.list<ShipmentData>('shipment', {
      limit: 100,
      page,
    });
    for (const ship of ships.data) {
      if (['DELIVERED', 'RETURNED', 'CANCELLED'].includes(ship.state)) continue;
      const overdue = ship.data.eta && Date.parse(ship.data.eta) < Date.now();
      const missing = Date.parse(ship.updated_at) < Date.now() - 48 * 3600000;
      if (overdue || missing)
        await this.repo.once(
          `delay:${ship.id}:${new Date().toISOString().slice(0, 10)}`,
          'exception',
          'OPEN',
          {
            type: overdue ? 'OVERDUE' : 'MISSING_EVENTS',
            severity: 'medium',
            shipmentId: ship.id,
          },
          null,
          ship.order_id,
        );
      if (ship.order_id)
        try {
          await this.tracking.refresh(ship.order_id);
        } catch {
          await this.repo.once(
            `refresh-error:${ship.id}:${new Date().toISOString().slice(0, 10)}`,
            'exception',
            'OPEN',
            { type: 'RECONCILIATION_FAILED', shipmentId: ship.id },
            null,
            ship.order_id,
          );
        }
    }
    await this.repo.write(
      'reconciliation:cursor',
      'action',
      'CURSOR',
      { page: page * 100 >= ships.total ? 1 : page + 1 },
      cursor || undefined,
    );
  }
}
