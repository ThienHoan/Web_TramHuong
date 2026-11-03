import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Json } from '../common/types/database.types';
import type { LogisticsKind, LogisticsRecord } from './logistics.types';

@Injectable()
export class LogisticsRepository {
  constructor(private readonly supabase: SupabaseService) {}
  private get db() {
    return this.supabase.getClient();
  }
  async completeCod(
    ship: LogisticsRecord<unknown>,
    action: LogisticsRecord<unknown>,
    amount: number,
  ) {
    const r = await this.db.rpc('shipping_complete_cod', {
      p_ship_key: ship.key,
      p_ship_version: ship.version,
      p_action_key: action.key,
      p_action_version: action.version,
      p_amount: amount,
    });
    if (r.error) throw new ConflictException('COD_RECONCILIATION_REQUIRED');
    return r.data as unknown as LogisticsRecord;
  }
  async findCarrier(
    environment: string,
    shopId: number,
    trackingCode: string,
  ): Promise<LogisticsRecord | null> {
    const r = await this.db
      .from('shipping_records')
      .select('*')
      .eq('kind', 'shipment')
      .like('key', `shipment:${environment}:%`)
      .eq('data->>shopId', String(shopId))
      .eq('data->>trackingCode', trackingCode)
      .maybeSingle();
    if (r.error)
      throw new ServiceUnavailableException('SHIPPING_DATABASE_NOT_READY');
    return r.data as unknown as LogisticsRecord | null;
  }
  async byId(id: string): Promise<LogisticsRecord | null> {
    const r = await this.db
      .from('shipping_records')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (r.error)
      throw new ServiceUnavailableException('SHIPPING_DATABASE_NOT_READY');
    return r.data as unknown as LogisticsRecord | null;
  }
  async reserve<T>(
    orderId: string,
    key: string,
    data: T,
  ): Promise<LogisticsRecord<T>> {
    const r = await this.db.rpc('shipping_reserve_shipment', {
      p_order_id: orderId,
      p_key: key,
      p_data: JSON.parse(JSON.stringify(data)) as Json,
    });
    if (r.error)
      throw new ConflictException(
        'SHIPMENT_RESERVATION_FAILED: refetch order/shipment',
      );
    return r.data as unknown as LogisticsRecord<T>;
  }
  async get<T = Record<string, unknown>>(
    key: string,
  ): Promise<LogisticsRecord<T> | null> {
    const { data, error } = await this.db
      .from('shipping_records')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    if (error)
      throw new ServiceUnavailableException(
        'SHIPPING_DATABASE_NOT_READY: apply smart-logistics.sql',
      );
    return data as unknown as LogisticsRecord<T> | null;
  }
  async list<T = Record<string, unknown>>(
    kind: LogisticsKind,
    options: {
      state?: string;
      orderId?: string;
      orderIds?: string[];
      ownerId?: string;
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      ascending?: boolean;
    } = {},
  ) {
    const page = Math.max(1, options.page || 1),
      limit = Math.min(100, Math.max(1, options.limit || 20));
    let query = this.db
      .from('shipping_records')
      .select('*', { count: 'exact' })
      .eq('kind', kind);
    if (options.state) query = query.eq('state', options.state);
    if (options.orderId) query = query.eq('order_id', options.orderId);
    if (options.orderIds) query = query.in('order_id', options.orderIds);
    if (options.ownerId) query = query.eq('owner_id', options.ownerId);
    if (options.from) query = query.gte('created_at', options.from);
    if (options.to) query = query.lte('created_at', options.to);
    const result = await query
      .order('created_at', { ascending: options.ascending || false })
      .range((page - 1) * limit, page * limit - 1);
    if (result.error)
      throw new ServiceUnavailableException('SHIPPING_DATABASE_NOT_READY');
    return {
      data: result.data as unknown as LogisticsRecord<T>[],
      total: result.count || 0,
      page,
      limit,
    };
  }
  async write<T>(
    key: string,
    kind: LogisticsKind,
    state: string,
    data: T,
    previous?: LogisticsRecord<unknown>,
    ownerId: string | null = null,
    orderId: string | null = null,
  ): Promise<LogisticsRecord<T>> {
    const result = await this.db.rpc('shipping_write_record', {
      p_key: key,
      p_kind: kind,
      p_state: state,
      p_data: JSON.parse(JSON.stringify(data)) as Json,
      p_expected_version: previous?.version || 0,
      p_owner_id: previous ? previous.owner_id : ownerId,
      p_order_id: previous ? previous.order_id : orderId,
    });
    if (result.error?.code === 'PT409')
      throw new ConflictException('SHIPPING_CONFLICT: refetch before retry');
    if (result.error)
      throw new ServiceUnavailableException('SHIPPING_DATABASE_WRITE_FAILED');
    return result.data as unknown as LogisticsRecord<T>;
  }
  async once<T>(
    key: string,
    kind: LogisticsKind,
    state: string,
    data: T,
    ownerId: string | null = null,
    orderId: string | null = null,
  ) {
    const existing = await this.get<T>(key);
    if (existing) return existing;
    try {
      return await this.write(
        key,
        kind,
        state,
        data,
        undefined,
        ownerId,
        orderId,
      );
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      const winner = await this.get<T>(key);
      if (!winner) throw error;
      return winner;
    }
  }
}
