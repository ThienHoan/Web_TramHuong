import { AdminService, csvCell, escapeSearch } from './admin.service';
import { SupabaseService } from '../supabase/supabase.service';

class QueryFixture {
  calls: [string, unknown[]][] = [];
  start = 0;
  end = 19;
  constructor(public rows: Record<string, unknown>[]) {}
  select(...args: unknown[]) {
    this.calls.push(['select', args]);
    return this;
  }
  eq(...args: unknown[]) {
    this.calls.push(['eq', args]);
    return this;
  }
  gt(...args: unknown[]) {
    this.calls.push(['gt', args]);
    return this;
  }
  gte(...args: unknown[]) {
    this.calls.push(['gte', args]);
    return this;
  }
  lt(...args: unknown[]) {
    this.calls.push(['lt', args]);
    return this;
  }
  lte(...args: unknown[]) {
    this.calls.push(['lte', args]);
    return this;
  }
  ilike(...args: unknown[]) {
    this.calls.push(['ilike', args]);
    return this;
  }
  or(...args: unknown[]) {
    this.calls.push(['or', args]);
    return this;
  }
  order(...args: unknown[]) {
    this.calls.push(['order', args]);
    return this;
  }
  range(start: number, end: number) {
    this.start = start;
    this.end = end;
    this.calls.push(['range', [start, end]]);
    return this;
  }
  returns<T>() {
    return Promise.resolve({
      data: this.rows.slice(this.start, this.end + 1) as T,
      count: this.rows.length,
      error: null,
    });
  }
}
function setup(rows: Record<string, unknown>[] = []) {
  const queries: QueryFixture[] = [];
  const db = {
    from: () => {
      const query = new QueryFixture(rows);
      queries.push(query);
      return query;
    },
  };
  return {
    queries,
    service: new AdminService({
      getClient: () => db,
    } as unknown as SupabaseService),
  };
}
describe('admin lists and exports', () => {
  it('applies page bounds and preserves the server total', async () => {
    const { service, queries } = setup(
      Array.from({ length: 67 }, (_, i) => ({ id: String(i) })),
    );
    const result = await service.list('orders', {
      page: '2',
      limit: '20',
      status: 'PAID',
    });
    expect(result.data).toHaveLength(20);
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 67,
      last_page: 4,
    });
    expect(queries[0].calls).toContainEqual(['range', [20, 39]]);
    expect(queries[0].calls).toContainEqual(['eq', ['status', 'PAID']]);
  });
  it('filters vouchers across every candidate page before paginating', async () => {
    const rows = Array.from({ length: 520 }, (_, i) => ({
      id: String(i),
      usage_limit: 10,
      usage_count: i < 500 ? 10 : 0,
    }));
    const { service } = setup(rows);
    const result = await service.list('vouchers', {
      page: '2',
      limit: '10',
      status: 'active',
    });
    expect(result.meta.total).toBe(20);
    expect(result.data).toHaveLength(10);
    expect(result.data[0].id).toBe('510');
  });
  it('keeps exhausted vouchers distinct from unlimited vouchers', async () => {
    const { service } = setup([
      { id: '1', usage_limit: null, usage_count: 100 },
      { id: '2', usage_limit: 2, usage_count: 2 },
    ]);
    const result = await service.list('vouchers', { status: 'exhausted' });
    expect(result.data.map((row) => row.id)).toEqual(['2']);
  });
  it('converts inclusive Vietnam calendar days into query boundaries', async () => {
    const { service, queries } = setup();
    await service.list('contacts', { from: '2026-11-01', to: '2026-11-01' });
    expect(queries[0].calls).toContainEqual([
      'gte',
      ['created_at', '2026-10-31T17:00:00.000Z'],
    ]);
    expect(queries[0].calls).toContainEqual([
      'lt',
      ['created_at', '2026-11-01T17:00:00.000Z'],
    ]);
  });
  it.each([
    ['unknown', {}],
    ['orders', { page: '0' }],
    ['orders', { sort: 'email:desc' }],
    ['orders', { status: 'invalid' }],
    ['contacts', { from: '2026-02-30' }],
    ['orders', { from: '2026-11-02', to: '2026-11-01' }],
  ])('rejects invalid list input %s %j', async (resource, input) => {
    await expect(
      setup().service.list(resource, input as Record<string, string>),
    ).rejects.toThrow();
  });
  it('exports every filtered page instead of only the visible page', async () => {
    const { service } = setup(
      Array.from({ length: 510 }, (_, i) => ({
        id: String(i),
        code: 'SALE' + i,
      })),
    );
    const result = await service.export('vouchers', {
      page: '8',
      limit: '20',
      search: 'SALE',
    });
    expect(result.count).toBe(510);
    expect(result.csv.split('\r\n')).toHaveLength(511);
  });
  it('requires a narrower filter for oversized exports', async () => {
    await expect(
      setup(
        Array.from({ length: 10001 }, (_, i) => ({ id: String(i) })),
      ).service.export('orders', {}),
    ).rejects.toThrow('10.000');
  });
  it('escapes spreadsheet formulas and delimiters', () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell(' hello,\nworld')).toBe('" hello,\nworld"');
    expect(escapeSearch('wood),id.eq.1%')).toBe('wood  id eq 1');
  });
});
