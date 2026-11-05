import {
  Injectable,
  ServiceUnavailableException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { IntegrationOutboxRow } from '../integrations/integration-database.types';
import { IntegrationFailure } from '../integrations/integration-executor';
import {
  validShipmentNotificationMail,
  type ShipmentNotificationMail,
} from './shipment-notification';

export const NOTIFICATION_EVENTS = [
  'order_confirmation',
  'payment_success',
  'order_status',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
const NOTIFICATION_HISTORY_EVENTS = [
  ...NOTIFICATION_EVENTS,
  'notification_source_review',
  'shipment_status',
  'shipment_source_review',
];
function projectOutcome(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.source !== 'mock') return null;
  if (v.status === 'not_eligible')
    return { source: 'mock' as const, status: 'not_eligible' as const };
  if (
    typeof v.id !== 'string' ||
    !uuid.test(v.id) ||
    typeof v.state !== 'string'
  )
    return null;
  if (
    (v.status === 'recorded' || v.status === 'duplicate') &&
    ['QUEUED', 'WORKING', 'ACCEPTED', 'DELIVERED', 'UNKNOWN', 'DEAD'].includes(
      v.state,
    )
  )
    return {
      source: 'mock' as const,
      status: v.status,
      id: v.id,
      state: v.state,
    };
  if (
    v.status === 'requires_review' &&
    v.state === 'DEAD' &&
    (v.errorCode === 'NOTIFICATION_SOURCE_CONFLICT' ||
      v.errorCode === 'NOTIFICATION_SNAPSHOT_INVALID')
  )
    return {
      source: 'mock' as const,
      status: 'requires_review' as const,
      id: v.id,
      state: 'DEAD' as const,
      errorCode: v.errorCode,
    };
  return null;
}
export type NotificationMail = {
  to: string;
  subject: string;
  template: 'order-confirmation' | 'payment-success' | 'order-status';
  context: {
    id: string;
    total: number;
    items?: { title: string; price: number; quantity: number }[];
    status?: string;
  };
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validNotificationMail(
  value: unknown,
): value is NotificationMail {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>,
    c = m.context as NotificationMail['context'];
  if (
    Object.keys(m).some(
      (k) => !['to', 'subject', 'template', 'context'].includes(k),
    ) ||
    typeof m.to !== 'string' ||
    m.to.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.to) ||
    typeof m.subject !== 'string' ||
    m.subject.length > 200 ||
    /[\r\n]/.test(m.subject) ||
    !['order-confirmation', 'payment-success', 'order-status'].includes(
      String(m.template),
    ) ||
    !c ||
    typeof c !== 'object' ||
    Array.isArray(c) ||
    Object.keys(c).some(
      (k) => !['id', 'total', 'items', 'status'].includes(k),
    ) ||
    typeof c.id !== 'string' ||
    !uuid.test(c.id) ||
    typeof c.total !== 'number' ||
    !Number.isFinite(c.total) ||
    c.total < 0 ||
    c.total > 1e12
  )
    return false;
  if (
    m.template !== 'payment-success' &&
    (!Array.isArray(c.items) ||
      c.items.length < 1 ||
      c.items.length > 100 ||
      c.items.some(
        (item) =>
          !item ||
          typeof item.title !== 'string' ||
          item.title.length > 300 ||
          typeof item.price !== 'number' ||
          !Number.isFinite(item.price) ||
          item.price < 0 ||
          item.price > 1e12 ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 999 ||
          Object.keys(item).some(
            (k) => !['title', 'price', 'quantity'].includes(k),
          ),
      ))
  )
    return false;
  if (
    m.template === 'order-status' &&
    ![
      'PENDING',
      'AWAITING_PAYMENT',
      'PAID',
      'SHIPPED',
      'COMPLETED',
      'CANCELED',
      'EXPIRED',
    ].includes(c.status ?? '')
  )
    return false;
  return true;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly supabase: SupabaseService) {}
  reconcile(afterId?: string) {
    return this.reconcilePage('orders', afterId);
  }
  reconcileShipments(afterId?: string) {
    return this.reconcilePage('shipments', afterId);
  }
  private async reconcilePage(scope: 'orders' | 'shipments', afterId?: string) {
    if (
      afterId !== undefined &&
      (typeof afterId !== 'string' || !uuid.test(afterId))
    )
      throw new UnprocessableEntityException('NOTIFICATION_INVALID_CURSOR');
    const cursor = afterId?.toLowerCase(),
      countKey = scope === 'orders' ? 'processedOrders' : 'processedShipments';
    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc(
          scope === 'orders'
            ? 'integration_reconcile_notifications_mock'
            : 'integration_reconcile_shipment_notifications_mock',
          {
            ...(cursor ? { p_after_id: cursor } : {}),
            p_limit: 20,
          },
        );
      const count =
        data && typeof data === 'object' && !Array.isArray(data)
          ? data[countKey]
          : null;
      if (
        error ||
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        data.source !== 'mock' ||
        data.persistence !== 'database' ||
        data.limit !== 20 ||
        typeof count !== 'number' ||
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > 20 ||
        typeof data.hasMore !== 'boolean' ||
        !Array.isArray(data.items) ||
        data.items.length > (scope === 'orders' ? 40 : 20) ||
        (data.hasMore
          ? typeof data.nextCursor !== 'string' ||
            !uuid.test(data.nextCursor) ||
            (cursor !== undefined && data.nextCursor <= cursor) ||
            count !== 20
          : data.nextCursor !== null)
      )
        throw new Error('INVALID_NOTIFICATION_PAGE');
      const seen = new Set<string>(),
        sources = new Set<string>();
      const items = data.items.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          throw new Error('INVALID_NOTIFICATION_ITEM');
        const scopeId = scope === 'orders' ? item.orderId : item.shipmentId;
        if (
          typeof item.orderId !== 'string' ||
          !uuid.test(item.orderId) ||
          typeof scopeId !== 'string' ||
          !uuid.test(scopeId) ||
          (cursor !== undefined && scopeId <= cursor) ||
          (data.hasMore &&
            typeof data.nextCursor === 'string' &&
            scopeId > data.nextCursor) ||
          typeof item.event !== 'string' ||
          (scope === 'orders'
            ? !NOTIFICATION_EVENTS.includes(item.event as NotificationEvent)
            : item.event !== 'shipment_status')
        )
          throw new Error('INVALID_NOTIFICATION_ITEM');
        const outcome = projectOutcome(item.outcome),
          key = scopeId + ':' + item.event;
        if (!outcome || seen.has(key))
          throw new Error('INVALID_NOTIFICATION_ITEM');
        seen.add(key);
        sources.add(scopeId);
        return {
          orderId: item.orderId,
          ...(scope === 'shipments' ? { shipmentId: scopeId } : {}),
          event: item.event,
          outcome,
        };
      });
      if (sources.size > count) throw new Error('INVALID_NOTIFICATION_PAGE');
      return {
        source: 'mock',
        persistence: 'database',
        limit: 20,
        [countKey]: count,
        hasMore: data.hasMore,
        nextCursor: data.nextCursor,
        items,
      };
    } catch {
      throw new ServiceUnavailableException(
        'NOTIFICATION_RECONCILIATION_UNAVAILABLE',
      );
    }
  }
  async resolveShipment(
    row: IntegrationOutboxRow,
  ): Promise<ShipmentNotificationMail> {
    if (
      row.provider !== 'resend' ||
      row.environment !== 'mock' ||
      row.state !== 'WORKING' ||
      row.operation_kind !== 'mutation' ||
      row.event_type !== 'shipment_status' ||
      !row.lease_token
    )
      throw new IntegrationFailure('REJECTED');
    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc('integration_resolve_shipment_notification_mock', {
          p_id: row.id,
          p_lease_token: row.lease_token,
          p_version: row.version,
        });
      if (error)
        throw new IntegrationFailure(
          ['PT409', 'PT404', 'PT422'].includes(error.code)
            ? 'REJECTED'
            : 'UNAVAILABLE',
        );
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        data.source === 'mock' &&
        validShipmentNotificationMail(data.mail) &&
        row.payload &&
        typeof row.payload === 'object' &&
        !Array.isArray(row.payload) &&
        data.mail.context.id === row.payload.orderId &&
        data.mail.context.status === row.payload.status
      )
        return data.mail;
      throw new IntegrationFailure('REJECTED');
    } catch (error) {
      if (error instanceof IntegrationFailure) throw error;
      throw new IntegrationFailure('UNAVAILABLE');
    }
  }
  async capture(orderId: string, event: NotificationEvent) {
    if (!uuid.test(orderId) || !NOTIFICATION_EVENTS.includes(event))
      throw new UnprocessableEntityException('NOTIFICATION_INVALID_REFERENCE');
    const { data, error } = await this.supabase
      .getClient()
      .rpc('integration_capture_notification_mock', {
        p_order_id: orderId,
        p_event: event,
      })
      .then(
        (result) => result,
        () => {
          throw new ServiceUnavailableException(
            'NOTIFICATION_FOUNDATION_UNAVAILABLE',
          );
        },
      );
    if (error) {
      if (error.code === 'PT404')
        throw new NotFoundException('NOTIFICATION_NOT_FOUND');
      if (error.code === 'PT409')
        throw new ConflictException('NOTIFICATION_SOURCE_CONFLICT');
      if (error.code === 'PT422')
        throw new UnprocessableEntityException('NOTIFICATION_SNAPSHOT_INVALID');
      throw new ServiceUnavailableException(
        'NOTIFICATION_FOUNDATION_UNAVAILABLE',
      );
    }
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      data.source === 'mock'
    ) {
      if (data.status === 'not_eligible')
        return { source: 'mock' as const, status: 'not_eligible' as const };
      if (
        (data.status === 'recorded' || data.status === 'duplicate') &&
        typeof data.id === 'string' &&
        uuid.test(data.id) &&
        typeof data.state === 'string' &&
        [
          'QUEUED',
          'WORKING',
          'ACCEPTED',
          'DELIVERED',
          'UNKNOWN',
          'DEAD',
        ].includes(data.state)
      )
        return {
          source: 'mock' as const,
          status: data.status,
          id: data.id,
          state: data.state,
        };
    }
    throw new ServiceUnavailableException(
      'NOTIFICATION_FOUNDATION_UNAVAILABLE',
    );
  }
  async resolve(row: IntegrationOutboxRow): Promise<NotificationMail> {
    if (
      row.provider !== 'resend' ||
      row.environment !== 'mock' ||
      row.state !== 'WORKING' ||
      row.operation_kind !== 'mutation' ||
      !row.lease_token ||
      !NOTIFICATION_EVENTS.includes(row.event_type as NotificationEvent)
    )
      throw new IntegrationFailure('REJECTED');
    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc('integration_resolve_notification_mock', {
          p_id: row.id,
          p_lease_token: row.lease_token,
          p_version: row.version,
        });
      if (error)
        throw new IntegrationFailure(
          ['PT409', 'PT404', 'PT422'].includes(error.code)
            ? 'REJECTED'
            : 'UNAVAILABLE',
        );
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        data.source === 'mock' &&
        validNotificationMail(data.mail) &&
        row.payload &&
        typeof row.payload === 'object' &&
        !Array.isArray(row.payload) &&
        data.mail.context.id === row.payload.orderId &&
        data.mail.template ===
          (
            {
              order_confirmation: 'order-confirmation',
              payment_success: 'payment-success',
              order_status: 'order-status',
            } as const
          )[row.event_type as NotificationEvent]
      )
        return data.mail;
      throw new IntegrationFailure('REJECTED');
    } catch (error) {
      if (error instanceof IntegrationFailure) throw error;
      throw new IntegrationFailure('UNAVAILABLE');
    }
  }
  async list(page: number) {
    const result = await this.supabase
      .getClient()
      .from('integration_outbox')
      .select(
        'id,event_type,state,attempts,last_error_code,created_at,updated_at',
      )
      .eq('provider', 'resend')
      .eq('environment', 'mock')
      .in('event_type', NOTIFICATION_HISTORY_EVENTS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range((page - 1) * 20, (page - 1) * 20 + 20)
      .then(
        (result) => result,
        () => {
          throw new ServiceUnavailableException(
            'NOTIFICATION_HISTORY_UNAVAILABLE',
          );
        },
      );
    if (result.error || !Array.isArray(result.data) || result.data.length > 21)
      throw new ServiceUnavailableException('NOTIFICATION_HISTORY_UNAVAILABLE');
    // Explicit projection prevents payload/PII from being returned even by a bad fixture/client.
    const rows = result.data.slice(0, 20).map((r) => ({
      id: r.id,
      event: r.event_type,
      state: r.state,
      attempts: r.attempts,
      errorCode: r.last_error_code,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return {
      source: 'mock',
      persistence: 'database',
      page,
      limit: 20,
      hasMore: result.data.length > 20,
      rows,
    };
  }
}
