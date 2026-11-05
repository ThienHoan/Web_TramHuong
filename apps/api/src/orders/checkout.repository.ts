import {
  BadRequestException,
  ConflictException,
  GoneException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Database } from '../common/types/database.types';

export type CheckoutOrder = Database['public']['Tables']['orders']['Row'];
export interface CheckoutResult {
  order: CheckoutOrder;
  replayed: boolean;
}
interface RpcPort {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
}
const CONFLICTS = new Set([
  'CHECKOUT_KEY_CONFLICT',
  'CHECKOUT_RETRY_SAME_KEY',
  'CHECKOUT_PRODUCT_UNAVAILABLE',
  'CHECKOUT_OUT_OF_STOCK',
  'CHECKOUT_VARIANT_UNAVAILABLE',
  'CHECKOUT_CATALOG_INVALID',
  'CHECKOUT_PRICE_CHANGED',
  'CHECKOUT_VOUCHER_UNAVAILABLE',
  'SHIPPING_QUOTE_CHANGED',
]);
export class CheckoutRepository {
  constructor(private readonly supabase: SupabaseService) {}
  private async call(
    name: string,
    args: Record<string, unknown>,
  ): Promise<CheckoutResult | null> {
    let result: Awaited<ReturnType<RpcPort['rpc']>>;
    try {
      result = await (this.supabase.getClient() as unknown as RpcPort).rpc(
        name,
        args,
      );
    } catch {
      throw new ServiceUnavailableException('CHECKOUT_RESULT_UNKNOWN');
    }
    if (result.error) {
      const { code, message } = result.error;
      if (code === 'PT409' && message && CONFLICTS.has(message))
        throw new ConflictException(message);
      if (code === 'PT410')
        throw new GoneException('CHECKOUT_ORDER_UNAVAILABLE');
      if (code === '22023')
        throw new BadRequestException('CHECKOUT_INVALID_REQUEST');
      if (code === 'PGRST202' || code === '42883' || code === '42501')
        throw new ServiceUnavailableException('CHECKOUT_DATABASE_NOT_READY');
      throw new ServiceUnavailableException('CHECKOUT_RESULT_UNKNOWN');
    }
    if (result.data === null) return null;
    const d = result.data as CheckoutResult;
    if (
      !d ||
      typeof d.replayed !== 'boolean' ||
      typeof d.order?.id !== 'string' ||
      !Array.isArray(d.order.items) ||
      typeof d.order.total !== 'number' ||
      !Number.isFinite(d.order.total) ||
      d.order.total < 0
    ) {
      throw new ServiceUnavailableException('CHECKOUT_RESULT_UNKNOWN');
    }
    return d;
  }
  lookup(key: string, userId: string | null, fingerprint: string) {
    return this.call('checkout_lookup_request', {
      p_key: key,
      p_user_id: userId,
      p_fingerprint: fingerprint,
    });
  }
  async create(args: Record<string, unknown>): Promise<CheckoutResult> {
    const result = await this.call('checkout_create_order', args);
    if (!result)
      throw new ServiceUnavailableException('CHECKOUT_RESULT_UNKNOWN');
    return result;
  }
}
