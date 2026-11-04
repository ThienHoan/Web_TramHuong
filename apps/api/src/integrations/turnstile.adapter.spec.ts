import {
  MockTurnstileAdapter,
  SiteverifyTurnstileAdapter,
} from './turnstile.adapter';

describe('Turnstile adapter contracts without external requests', () => {
  afterEach(() => jest.useRealTimers());
  it('issues mock tokens with official response fields and single-use behavior', async () => {
    const mock = new MockTurnstileAdapter();
    const { token } = mock.issue('localhost', 'contact');
    const results = await Promise.all([mock.verify(token), mock.verify(token)]);
    expect(results[0]).toMatchObject({
      success: true,
      hostname: 'localhost',
      action: 'contact',
    });
    expect(results[1]).toMatchObject({
      success: false,
      'error-codes': ['timeout-or-duplicate'],
    });
  });
  it('rejects expired, unknown and empty tokens', async () => {
    let clock = 1700000000000;
    const mock = new MockTurnstileAdapter(() => clock);
    const { token } = mock.issue('localhost', 'contact');
    clock += 300000;
    expect((await mock.verify(token)).success).toBe(false);
    expect((await mock.verify('made-up')).success).toBe(false);
    expect((await mock.verify('')).success).toBe(false);
  });
  it('bounds mock token memory and reclaims expired challenges', () => {
    let clock = 1700000000000;
    const mock = new MockTurnstileAdapter(() => clock);
    for (let i = 0; i < 1000; i++) mock.issue('localhost', 'contact');
    expect(() => mock.issue('localhost', 'contact')).toThrow(
      'MOCK_CHALLENGE_CAPACITY',
    );
    clock += 300000;
    expect(() => mock.issue('localhost', 'contact')).not.toThrow();
  });
  it('uses the fixed siteverify POST contract with an injected fake transport', async () => {
    const transport = jest.fn().mockResolvedValue(
      Response.json({
        success: true,
        hostname: 'localhost',
        action: 'contact',
        challenge_ts: new Date().toISOString(),
      }),
    );
    const adapter = new SiteverifyTurnstileAdapter(
      'synthetic-secret',
      transport as typeof fetch,
    );
    await expect(adapter.verify('synthetic-token')).resolves.toMatchObject({
      success: true,
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const args = transport.mock.calls[0] as [string, RequestInit];
    expect(args[0]).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(args[1]).toMatchObject({ method: 'POST', redirect: 'error' });
    const body = args[1].body as URLSearchParams;
    expect(body.get('secret')).toBe('synthetic-secret');
    expect(body.get('response')).toBe('synthetic-token');
  });
  it.each([
    Response.json({ success: 'yes' }),
    Response.json({ success: true, hostname: { private: 'data' } }),
    new Response('private body', { status: 503 }),
    new Response('x'.repeat(17000)),
  ])('sanitizes invalid/provider error responses', async (response) => {
    const adapter = new SiteverifyTurnstileAdapter(
      'synthetic-secret',
      jest.fn().mockResolvedValue(response) as typeof fetch,
    );
    await expect(adapter.verify('token')).rejects.toThrow(
      'TURNSTILE_UNAVAILABLE',
    );
  });
  it('does not retry or wait forever when a transport ignores abort', async () => {
    jest.useFakeTimers();
    const transport = jest.fn().mockReturnValue(new Promise(() => {}));
    const adapter = new SiteverifyTurnstileAdapter(
      'synthetic-secret',
      transport as typeof fetch,
      20,
    );
    const pending = expect(adapter.verify('token')).rejects.toThrow(
      'TURNSTILE_UNAVAILABLE',
    );
    await jest.advanceTimersByTimeAsync(20);
    await pending;
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
