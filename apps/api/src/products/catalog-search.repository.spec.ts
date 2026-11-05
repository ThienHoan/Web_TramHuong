import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CatalogSearchRepository } from './catalog-search.repository';

const input = { query: 'vong tay', locale: 'vi' as const };
const row = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'vong-tay',
  price: 200000,
  quantity: 5,
  is_active: true,
  category_id: null,
  variants: null,
  discount_percentage: 10,
  discount_start_date: null,
  discount_end_date: null,
  translation: { title: 'Vòng tay' },
  rank: 0.8,
};
const enabled = { CATALOG_FTS_ENABLED: 'true', NODE_ENV: 'test' };
function setup(
  config: Record<string, unknown> = enabled,
  response: unknown = { data: [row], error: null },
) {
  const abortSignal = jest
    .fn<Promise<unknown>, [AbortSignal]>()
    .mockResolvedValue(response);
  const rpc = jest.fn(() => ({ abortSignal }));
  const getClient = jest.fn(() => ({ rpc }));
  const repo = new CatalogSearchRepository(
    { getClient } as unknown as SupabaseService,
    new ConfigService(config),
  );
  return { repo, getClient, rpc, abortSignal };
}

describe('catalog FTS repository opt-in and read-only boundary', () => {
  afterEach(() => jest.useRealTimers());
  it.each([
    [{}, 'disabled'],
    [{ ...enabled, CATALOG_FTS_ENABLED: 'false' }, 'disabled'],
    [{ ...enabled, INTEGRATIONS_KILL_SWITCH: 'true' }, 'disabled'],
    [{ ...enabled, INTEGRATIONS_ENV: 'staging' }, 'blocked'],
    [{ ...enabled, INTEGRATIONS_ENV: 'production' }, 'blocked'],
    [{ ...enabled, NODE_ENV: 'production' }, 'blocked'],
    [{ CATALOG_FTS_ENABLED: true, NODE_ENV: '' }, 'blocked'],
  ])('blocks DB access for configuration %j', async (config, mode) => {
    const { repo, getClient } = setup(config as Record<string, unknown>);
    expect(repo.mode).toBe(mode);
    expect(await repo.search(input)).toMatchObject({ status: 'fallback' });
    expect(getClient).not.toHaveBeenCalled();
  });

  it.each(['CATALOG_FTS_ENABLED', 'INTEGRATIONS_KILL_SWITCH'])(
    'rejects invalid %s without echoing its value',
    (key) => {
      expect(() =>
        setup({ ...enabled, [key]: 'SECRET_INVALID_VALUE' }),
      ).toThrow(`${key} must be true or false`);
    },
  );

  it('calls exactly the fixed service RPC with bound values and abort support', async () => {
    const { repo, rpc, abortSignal } = setup();
    expect(await repo.search(input)).toEqual({ status: 'ready', data: [row] });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('catalog_search', {
      p_query: input.query,
      p_locale: 'vi',
      p_min_price: 0,
      p_max_price: 1e12,
      p_category_id: null,
      p_limit: 20,
    });
    expect(abortSignal.mock.calls[0][0].aborted).toBe(false);
  });

  it('passes structured filters instead of interpolating SQL or filter syntax', async () => {
    const { repo, rpc } = setup();
    await repo.search({
      ...input,
      query: "'); DELETE FROM users;--",
      minPrice: 100000,
      maxPrice: 300000,
    });
    expect(rpc.mock.calls[0]).toEqual([
      'catalog_search',
      {
        p_query: "'); DELETE FROM users;--",
        p_locale: 'vi',
        p_min_price: 100000,
        p_max_price: 300000,
        p_category_id: null,
        p_limit: 20,
      },
    ]);
  });

  it.each(['PGRST202', '42501', '42P01', 'PT429'])(
    'falls back once for missing/paused/unavailable RPC %s',
    async (code) => {
      const { repo, rpc } = setup(enabled, {
        data: null,
        error: { code, message: 'RAW_PRIVATE_ERROR' },
      });
      expect(await repo.search(input)).toEqual({
        status: 'fallback',
        reason: 'FTS_UNAVAILABLE',
      });
      expect(rpc).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    null,
    {},
    [null],
    [row, row],
    Array(21).fill(row),
    [{ ...row, is_active: false }],
    [{ ...row, quantity: 0 }],
    [{ ...row, quantity: 0.5 }],
    [{ ...row, price: -1 }],
    [{ ...row, rank: NaN }],
    [{ ...row, rank: -1 }],
    [{ ...row, id: 'bad-id' }],
    [{ ...row, slug: '../private' }],
    [{ ...row, variants: [{}] }],
    [{ ...row, discount_start_date: 'invalid' }],
    [{ ...row, translation: { title: 'Vòng tay', story: 'PRIVATE' } }],
    [{ ...row, wholesale_cost: 1 }],
    [{ ...row, discount_percentage: 101 }],
  ])('refuses malformed or out-of-scope RPC data %j', async (data) => {
    const { repo } = setup(enabled, { data, error: null });
    expect(await repo.search(input)).toEqual({
      status: 'fallback',
      reason: 'FTS_INVALID_RESPONSE',
    });
  });

  it('preserves a valid empty result without manufacturing a fallback match', async () => {
    const { repo } = setup(enabled, { data: [], error: null });
    expect(await repo.search(input)).toEqual({ status: 'ready', data: [] });
  });

  it('rejects data violating category or effective-price scope', async () => {
    const { repo } = setup();
    expect(await repo.search({ ...input, maxPrice: 179999 })).toMatchObject({
      reason: 'FTS_INVALID_RESPONSE',
    });
    expect(await repo.search({ ...input, categoryId: 'other' })).toMatchObject({
      reason: 'FTS_INVALID_RESPONSE',
    });
  });

  it('times out a hung query, aborts its signal and never retries', async () => {
    jest.useFakeTimers();
    const { repo, abortSignal, rpc } = setup();
    abortSignal.mockImplementation(() => new Promise(() => {}));
    const pending = repo.search(input);
    await jest.advanceTimersByTimeAsync(3000);
    expect(await pending).toEqual({
      status: 'fallback',
      reason: 'FTS_TIMEOUT',
    });
    expect(abortSignal.mock.calls[0][0].aborted).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
