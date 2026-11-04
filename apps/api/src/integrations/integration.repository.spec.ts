import { IntegrationRepository, canonicalJson } from './integration.repository';
import { SupabaseService } from '../supabase/supabase.service';

describe('integration repository mock-only boundary', () => {
  const row = {
    provider: 'resend',
    environment: 'mock',
    state: 'WORKING',
    operation_kind: 'mutation',
    event_type: 'fixture',
    payload: { a: 1 },
    lease_token: 'lease',
    id: 'id',
    version: 2,
  };
  const make = (result: unknown) => {
    const rpc = jest.fn().mockResolvedValue(result);
    return {
      rpc,
      repo: new IntegrationRepository({
        getClient: () => ({ rpc }),
      } as unknown as SupabaseService),
    };
  };
  it('accepts only matching mock leases', async () => {
    const { repo } = make({ data: [row], error: null });
    await expect(repo.claimMock('resend')).resolves.toEqual([row]);
  });
  it.each([
    { ...row, environment: 'production' },
    { ...row, provider: 'merchant' },
    { ...row, lease_token: null },
    { ...row, state: 'QUEUED' },
  ])('rejects unexpected claim scope/lease', async (invalid) => {
    await expect(
      make({ data: [invalid], error: null }).repo.claimMock('resend'),
    ).rejects.toThrow('INVALID_INTEGRATION_LEASE');
  });
  it('maps database quota rejection without leaking raw errors', async () => {
    await expect(
      make({
        data: null,
        error: { code: 'PT429', message: 'synthetic secret' },
      }).repo.reserveMockUsage('resend', 100),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    await expect(
      make({
        data: null,
        error: { code: 'OTHER', message: 'synthetic secret' },
      }).repo.reserveMockUsage('resend', 100),
    ).rejects.toThrow('INTEGRATION_STORE_UNAVAILABLE');
  });
  it('rejects invalid limits before accessing the database', async () => {
    const { repo, rpc } = make({ data: [], error: null });
    await expect(repo.claimMock('resend', 21)).rejects.toThrow();
    await expect(repo.reserveMockUsage('resend', 0)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('normalizes object key order without merging different payloads', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(canonicalJson({ a: [1, 2] })).not.toBe(canonicalJson({ a: [2, 1] }));
  });
  it('does not overwrite an existing event with a colliding dedupe key', async () => {
    const lookup = {
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: row, error: null }),
    };
    lookup.eq.mockReturnValue(lookup);
    const upsert = jest.fn().mockReturnValue({
      select: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    });
    const repo = new IntegrationRepository({
      getClient: () => ({ from: () => ({ upsert, select: () => lookup }) }),
    } as unknown as SupabaseService);
    await expect(
      repo.enqueueMock('resend', 'fixture:1', 'fixture', 'mutation', { a: 1 }),
    ).resolves.toEqual(row);
    await expect(
      repo.enqueueMock('resend', 'fixture:1', 'fixture', 'mutation', { a: 2 }),
    ).rejects.toThrow('INTEGRATION_DEDUPE_CONFLICT');
    await expect(
      repo.enqueueMock(
        'resend',
        'email@example.invalid',
        'fixture',
        'mutation',
        {},
      ),
    ).rejects.toThrow('INVALID_INTEGRATION_EVENT');
  });
});
