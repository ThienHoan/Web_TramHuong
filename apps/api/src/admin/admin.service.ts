import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { pagination } from '../common/pagination';

const resources = [
  'orders',
  'products',
  'categories',
  'users',
  'posts',
  'contacts',
  'vouchers',
];
const orderStatuses = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'SHIPPED',
  'COMPLETED',
  'CANCELED',
  'EXPIRED',
];
export const escapeSearch = (value: string) =>
  value
    .replace(/[,().%_"'\\]/g, ' ')
    .trim()
    .slice(0, 120);
export const csvCell = (value: unknown) => {
  let text =
    typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ? String(value)
        : '';
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}
  // Table names and filters below are allowlisted; this client serves several table shapes.
  private get db(): SupabaseClient {
    return this.supabase.getClient();
  }

  async list(resource: string, input: Record<string, string>) {
    if (Object.values(input).some((value) => typeof value !== 'string'))
      throw new BadRequestException('Invalid query value');
    if (!resources.includes(resource))
      throw new BadRequestException('Unknown admin resource');
    const { page, limit } = pagination(input.page, input.limit);
    const locale = input.locale === 'en' ? 'en' : 'vi';
    const search = escapeSearch(input.search || '');
    const table = resource === 'vouchers' ? 'vouchers' : resource;
    let selection = '*';
    if (resource === 'products')
      selection =
        '*,translations:product_translations(*),category:categories(slug)';
    if (resource === 'categories')
      selection = '*,translations:category_translations(*)';
    if (search && resource === 'products')
      selection += ',search_translation:product_translations()';
    if (search && resource === 'categories')
      selection += ',search_translation:category_translations()';
    let query = this.db.from(table).select(selection, { count: 'exact' });
    if (resource === 'products' || resource === 'categories') {
      query = query.eq('translations.locale', locale);
      if (input.status === 'active') query = query.eq('is_active', true);
      else if (input.status === 'archived')
        query = query.eq('is_active', false);
      else if (input.status)
        throw new BadRequestException('Invalid visibility status');
      if (search) {
        const column = resource === 'products' ? 'title' : 'name';
        query = query
          .eq('search_translation.locale', locale)
          .ilike(`search_translation.${column}`, `%${search}%`)
          .or(`slug.ilike.%${search}%,search_translation.not.is.null`);
      }
    } else if (search) {
      if (resource === 'orders') {
        const parts = [
          `shipping_info->>name.ilike.%${search}%`,
          `shipping_info->>full_name.ilike.%${search}%`,
          `shipping_info->>phone.ilike.%${search}%`,
          `shipping_info->>email.ilike.%${search}%`,
        ];
        const hex = search.replace(/-/g, '');
        if (/^[a-f0-9]{1,32}$/i.test(hex)) {
          const uuid = (s: string) =>
            `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
          parts.push(
            `and(id.gte.${uuid(hex.padEnd(32, '0'))},id.lte.${uuid(hex.padEnd(32, 'f'))})`,
          );
        }
        query = query.or(parts.join(','));
      } else if (resource === 'users' || resource === 'contacts') {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      } else
        query = query.ilike(
          resource === 'posts' ? 'title' : 'code',
          `%${search}%`,
        );
    }
    if (resource === 'orders') {
      if (input.status) {
        if (!orderStatuses.includes(input.status))
          throw new BadRequestException('Invalid order status');
        query = query.eq('status', input.status);
      }
      if (input.payment_status) {
        if (
          !['pending', 'paid', 'failed', 'refunded'].includes(
            input.payment_status,
          )
        )
          throw new BadRequestException('Invalid payment status');
        query = query.eq('payment_status', input.payment_status);
      }
    }
    if (resource === 'products') {
      if (input.category) query = query.eq('category_id', input.category);
      if (input.stock === 'low')
        query = query.gt('quantity', 0).lt('quantity', 10);
      else if (input.stock === 'out') query = query.lte('quantity', 0);
      else if (input.stock === 'in') query = query.gt('quantity', 0);
      else if (input.stock)
        throw new BadRequestException('Invalid stock filter');
    }
    if (resource === 'users') {
      if (input.role) {
        if (!['ADMIN', 'STAFF', 'CUSTOMER'].includes(input.role))
          throw new BadRequestException('Invalid role');
        query = query.eq('role', input.role);
      }
      if (input.status === 'banned') query = query.eq('is_banned', true);
      else if (input.status === 'active') query = query.eq('is_banned', false);
      else if (input.status)
        throw new BadRequestException('Invalid account status');
    }
    if (resource === 'posts' || resource === 'contacts') {
      const allowed =
        resource === 'posts'
          ? ['draft', 'published', 'archived']
          : ['new', 'read', 'replied'];
      if (input.status) {
        if (!allowed.includes(input.status))
          throw new BadRequestException('Invalid status');
        query = query.eq('status', input.status);
      }
      if (resource === 'posts' && input.category)
        query = query.eq('category', input.category);
    }
    if (resource === 'vouchers' && input.status) {
      const now = new Date().toISOString();
      if (input.status === 'disabled') query = query.eq('is_active', false);
      else if (input.status === 'scheduled')
        query = query.eq('is_active', true).gt('start_date', now);
      else if (input.status === 'expired')
        query = query.eq('is_active', true).lt('end_date', now);
      else if (input.status === 'active' || input.status === 'exhausted') {
        query = query
          .eq('is_active', true)
          .lte('start_date', now)
          .gte('end_date', now);
      } else throw new BadRequestException('Invalid voucher status');
    }
    for (const [key, method] of [
      ['from', 'gte'],
      ['to', 'lt'],
    ] as const) {
      if (!input[key]) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input[key]))
        throw new BadRequestException('Invalid date');
      const calendar = new Date(`${input[key]}T00:00:00.000Z`);
      if (
        !Number.isFinite(calendar.getTime()) ||
        calendar.toISOString().slice(0, 10) !== input[key]
      )
        throw new BadRequestException('Invalid date');
      const date = new Date(`${input[key]}T00:00:00+07:00`);
      if (key === 'to') date.setUTCDate(date.getUTCDate() + 1);
      query = query[method]('created_at', date.toISOString());
    }
    if (input.from && input.to && input.from > input.to)
      throw new BadRequestException('Start date must precede end date');
    const allowedSort: Record<string, string[]> = {
      orders: ['created_at', 'total'],
      products: ['created_at', 'price', 'quantity', 'slug'],
      categories: ['created_at', 'slug'],
      users: ['created_at', 'full_name'],
      posts: ['created_at', 'title'],
      contacts: ['created_at', 'full_name'],
      vouchers: ['created_at', 'code', 'end_date'],
    };
    const [sort, direction] = (input.sort || 'created_at:desc').split(':');
    if (
      !allowedSort[resource].includes(sort) ||
      !['asc', 'desc'].includes(direction)
    )
      throw new BadRequestException('Invalid sort');
    query = query
      .order(sort, { ascending: direction === 'asc', nullsFirst: false })
      .order('id', { ascending: true });
    // PostgREST cannot compare two columns. Read every candidate page on the server
    // before computing availability; never filter only the current visible page.
    if (
      resource === 'vouchers' &&
      ['active', 'exhausted'].includes(input.status)
    ) {
      const matching: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 500) {
        const chunk = await query
          .range(offset, offset + 499)
          .returns<Record<string, unknown>[]>();
        if (chunk.error)
          throw new BadRequestException('Không thể tải mã giảm giá');
        for (const row of chunk.data || []) {
          const exhausted =
            row.usage_limit != null &&
            Number(row.usage_count) >= Number(row.usage_limit);
          if (exhausted === (input.status === 'exhausted')) matching.push(row);
        }
        if ((chunk.data?.length || 0) < 500) break;
      }
      return {
        data: matching.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total: matching.length,
          last_page: Math.max(1, Math.ceil(matching.length / limit)),
        },
      };
    }
    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .returns<Record<string, unknown>[]>();
    if (error)
      throw new BadRequestException(
        'Không thể tải danh sách quản trị: ' + error.message,
      );
    return {
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        last_page: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    };
  }

  async operations() {
    const count = async (table: string, column: string, value: unknown) => {
      const { count, error } = await this.db
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(column, value);
      if (error)
        throw new BadRequestException('Không thể tải số liệu vận hành');
      return count || 0;
    };
    const [awaitingPayment, paidOrders, newContacts, outOfStock, low] =
      await Promise.all([
        count('orders', 'status', 'AWAITING_PAYMENT'),
        count('orders', 'status', 'PAID'),
        count('contacts', 'status', 'new'),
        count('products', 'quantity', 0),
        this.db
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .gt('quantity', 0)
          .lt('quantity', 10),
      ]);
    if (low.error)
      throw new BadRequestException('Không thể tải số liệu tồn kho');
    return {
      awaitingPayment,
      paidOrders,
      newContacts,
      outOfStock,
      lowStock: low.count || 0,
    };
  }

  async export(resource: string, input: Record<string, string>) {
    const first = await this.list(resource, {
      ...input,
      page: '1',
      limit: '500',
    });
    if (first.meta.total > 10000)
      throw new BadRequestException(
        'Có hơn 10.000 kết quả. Hãy thu hẹp bộ lọc trước khi xuất.',
      );
    const rows = [...first.data];
    for (let page = 2; page <= first.meta.last_page; page++) {
      const result = await this.list(resource, {
        ...input,
        page: String(page),
        limit: '500',
      });
      rows.push(...result.data);
    }
    const columns: Record<string, string[]> = {
      orders: ['id', 'created_at', 'status', 'payment_status', 'total'],
      products: ['id', 'slug', 'price', 'quantity', 'is_active'],
      categories: ['id', 'slug', 'is_active'],
      users: ['id', 'full_name', 'email', 'role', 'is_banned'],
      posts: ['id', 'title', 'slug', 'status', 'category'],
      contacts: ['id', 'full_name', 'email', 'topic', 'message', 'status'],
      vouchers: [
        'id',
        'code',
        'discount_type',
        'discount_amount',
        'usage_count',
        'usage_limit',
        'start_date',
        'end_date',
        'is_active',
      ],
    };
    const fields = columns[resource];
    const csv = [
      fields.map(csvCell).join(','),
      ...rows.map((row) =>
        fields.map((field) => csvCell(row[field])).join(','),
      ),
    ].join('\r\n');
    return { csv, count: rows.length };
  }
}
