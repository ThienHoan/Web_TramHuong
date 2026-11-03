import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { LogisticsKind, LogisticsRecord } from '../logistics.types';
// Test-only storage. Never registered by the application or used as a silent
// fallback when the real database/migration is missing.
export class MemoryLogisticsRepository {
  rows = new Map<string, LogisticsRecord<unknown>>();
  async findCarrier(environment: string, shopId: number, trackingCode: string) {
    await Promise.resolve();
    return structuredClone(
      [...this.rows.values()].find(
        (r) =>
          r.key.startsWith(`shipment:${environment}:`) &&
          (r.data as { shopId: number }).shopId === shopId &&
          (r.data as { trackingCode: string }).trackingCode === trackingCode,
      ) || null,
    ) as LogisticsRecord | null;
  }
  async byId(id: string) {
    await Promise.resolve();
    return structuredClone(
      [...this.rows.values()].find((r) => r.id === id) || null,
    ) as LogisticsRecord | null;
  }
  async get<T = Record<string, unknown>>(key: string) {
    await Promise.resolve();
    return structuredClone(
      this.rows.get(key) || null,
    ) as LogisticsRecord<T> | null;
  }
  async write<T>(
    key: string,
    kind: LogisticsKind,
    state: string,
    data: T,
    old?: LogisticsRecord<unknown>,
    ownerId: string | null = null,
    orderId: string | null = null,
  ) {
    await Promise.resolve();
    const current = this.rows.get(key);
    if ((current?.version || 0) !== (old?.version || 0))
      throw new ConflictException('SHIPPING_CONFLICT');
    const row = {
      id: current?.id || randomUUID(),
      key,
      kind,
      state,
      data: structuredClone(data),
      version: (old?.version || 0) + 1,
      owner_id: old ? old.owner_id : ownerId,
      order_id: old ? old.order_id : orderId,
      created_at: current?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.rows.set(key, row);
    return structuredClone(row);
  }
  async once<T>(
    key: string,
    kind: LogisticsKind,
    state: string,
    data: T,
    ownerId: string | null = null,
    orderId: string | null = null,
  ) {
    return (
      (await this.get<T>(key)) ||
      (await this.write(key, kind, state, data, undefined, ownerId, orderId))
    );
  }
  async list<T = Record<string, unknown>>(
    kind: LogisticsKind,
    o: {
      state?: string;
      orderId?: string;
      orderIds?: string[];
      ownerId?: string;
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
    } = {},
  ) {
    await Promise.resolve();
    const rows = [...this.rows.values()].filter(
      (r) =>
        r.kind === kind &&
        (!o.state || r.state === o.state) &&
        (!o.orderId || r.order_id === o.orderId) &&
        (!o.orderIds || o.orderIds.includes(r.order_id || '')) &&
        (!o.ownerId || r.owner_id === o.ownerId) &&
        (!o.from || r.created_at >= o.from) &&
        (!o.to || r.created_at <= o.to),
    );
    const page = o.page || 1,
      limit = o.limit || 20;
    return {
      data: structuredClone(
        rows.slice((page - 1) * limit, page * limit),
      ) as LogisticsRecord<T>[],
      total: rows.length,
      page,
      limit,
    };
  }
}
