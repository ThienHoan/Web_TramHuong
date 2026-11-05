import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { productPrice } from '../common/commerce-pricing';
import type { Database } from '../common/types/database.types';

type Product = Database['public']['Tables']['products']['Row'];
export type CatalogSearchProduct = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'price'
  | 'quantity'
  | 'is_active'
  | 'category_id'
  | 'variants'
  | 'discount_percentage'
  | 'discount_start_date'
  | 'discount_end_date'
> & {
  translation: { title: string };
  rank: number;
};
export interface CatalogSearchInput {
  query: string;
  locale: 'vi' | 'en';
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
}
export type CatalogSearchResult =
  | { status: 'ready'; data: CatalogSearchProduct[] }
  | {
      status: 'fallback';
      reason:
        | 'FTS_DISABLED'
        | 'FTS_BLOCKED'
        | 'FTS_UNAVAILABLE'
        | 'FTS_TIMEOUT'
        | 'FTS_INVALID_RESPONSE';
    };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keys = new Set([
  'id',
  'slug',
  'price',
  'quantity',
  'is_active',
  'category_id',
  'variants',
  'discount_percentage',
  'discount_start_date',
  'discount_end_date',
  'translation',
  'rank',
]);
function validRow(
  value: unknown,
  input: CatalogSearchInput,
): value is CatalogSearchProduct {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const translation = row.translation as Record<string, unknown> | null;
  if (
    Object.keys(row).some((key) => !keys.has(key)) ||
    typeof row.id !== 'string' ||
    !uuid.test(row.id) ||
    typeof row.slug !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(row.slug) ||
    typeof row.price !== 'number' ||
    !Number.isSafeInteger(row.price) ||
    row.price <= 0 ||
    typeof row.quantity !== 'number' ||
    !Number.isSafeInteger(row.quantity) ||
    row.quantity <= 0 ||
    row.is_active !== true ||
    (row.category_id !== null &&
      (typeof row.category_id !== 'string' || !uuid.test(row.category_id))) ||
    (input.categoryId && row.category_id !== input.categoryId) ||
    (row.variants !== null &&
      (!Array.isArray(row.variants) || row.variants.length > 0)) ||
    typeof row.discount_percentage !== 'number' ||
    !Number.isFinite(row.discount_percentage) ||
    row.discount_percentage < 0 ||
    row.discount_percentage > 100 ||
    typeof row.rank !== 'number' ||
    !Number.isFinite(row.rank) ||
    row.rank <= 0 ||
    row.rank > 1 ||
    !translation ||
    typeof translation !== 'object' ||
    Array.isArray(translation) ||
    Object.keys(translation).some((key) => key !== 'title') ||
    typeof translation.title !== 'string' ||
    !translation.title.trim() ||
    translation.title.length > 300
  )
    return false;
  for (const key of ['discount_start_date', 'discount_end_date'])
    if (
      row[key] !== null &&
      (typeof row[key] !== 'string' || !Number.isFinite(Date.parse(row[key])))
    )
      return false;
  const product = row as CatalogSearchProduct;
  if (
    product.discount_start_date &&
    product.discount_end_date &&
    Date.parse(product.discount_start_date) >
      Date.parse(product.discount_end_date)
  )
    return false;
  const { price } = productPrice(product);
  return (
    price > 0 &&
    price >= (input.minPrice ?? 0) &&
    price <= (input.maxPrice ?? 1e12)
  );
}

@Injectable()
export class CatalogSearchRepository {
  readonly mode: 'disabled' | 'blocked' | 'enabled';
  constructor(
    private readonly supabase: SupabaseService,
    config: ConfigService,
  ) {
    const flag = (key: string) => {
      const value = config.get<unknown>(key);
      if (value === undefined || value === false || value === 'false')
        return false;
      if (value === true || value === 'true') return true;
      throw new Error(`${key} must be true or false`);
    };
    const enabled = flag('CATALOG_FTS_ENABLED'),
      kill = flag('INTEGRATIONS_KILL_SWITCH');
    this.mode =
      !enabled || kill
        ? 'disabled'
        : (config.get<string>('INTEGRATIONS_ENV') ?? 'mock') === 'mock' &&
            ['development', 'test'].includes(
              config.get<string>('NODE_ENV') ?? '',
            )
          ? 'enabled'
          : 'blocked';
  }

  async search(input: CatalogSearchInput): Promise<CatalogSearchResult> {
    if (this.mode !== 'enabled')
      return {
        status: 'fallback',
        reason: this.mode === 'disabled' ? 'FTS_DISABLED' : 'FTS_BLOCKED',
      };
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const query = this.supabase
        .getClient()
        .rpc('catalog_search', {
          p_query: input.query,
          p_locale: input.locale,
          p_min_price: input.minPrice ?? 0,
          p_max_price: input.maxPrice ?? 1e12,
          p_category_id: input.categoryId ?? null,
          p_limit: 20,
        })
        .abortSignal(controller.signal);
      const result = await Promise.race([
        query,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new Error('FTS_TIMEOUT'));
          }, 3000);
        }),
      ]);
      if (result.error)
        return {
          status: 'fallback',
          reason: controller.signal.aborted ? 'FTS_TIMEOUT' : 'FTS_UNAVAILABLE',
        };
      if (
        !Array.isArray(result.data) ||
        result.data.length > 20 ||
        !result.data.every((row: unknown) => validRow(row, input)) ||
        new Set(result.data.map((row) => row.id)).size !== result.data.length
      )
        return { status: 'fallback', reason: 'FTS_INVALID_RESPONSE' };
      return { status: 'ready', data: result.data };
    } catch {
      return {
        status: 'fallback',
        reason: controller.signal.aborted ? 'FTS_TIMEOUT' : 'FTS_UNAVAILABLE',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
