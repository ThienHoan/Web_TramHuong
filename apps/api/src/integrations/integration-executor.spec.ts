import { Logger } from '@nestjs/common';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from './integration-executor';
import { loadIntegrationRegistry } from './integrations.config';

const registry = (values: Record<string, unknown> = {}) =>
  loadIntegrationRegistry({
    get: (key: string) =>
      ({
        FEATURE_RESEND_ENABLED: 'true',
        FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
        ...values,
      })[key],
  });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe('mock integration execution boundaries', () => {
  let warningCalls: unknown[][];
  beforeEach(() => {
    warningCalls = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((...args: unknown[]) => {
        warningCalls.push(args);
      });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    { FEATURE_RESEND_ENABLED: 'false' },
    { INTEGRATIONS_KILL_SWITCH: 'true' },
    { INTEGRATIONS_ENV: 'staging' },
    { INTEGRATIONS_ENV: 'production' },
  ])('does not invoke a callback when disabled/blocked: %p', async (values) => {
    const callback = jest.fn();
    await expect(
      new IntegrationExecutor(registry(values)).runMock(
        'resend',
        'send',
        'mutation',
        callback,
      ),
    ).rejects.toBeInstanceOf(IntegrationFailure);
    expect(callback).not.toHaveBeenCalled();
  });

  it('returns clearly labeled mock data and correlation metadata', async () => {
    const result = await new IntegrationExecutor(registry()).runMock(
      'resend',
      'preview',
      'read',
      () => Promise.resolve({ accepted: false }),
    );
    expect(result).toMatchObject({
      source: 'mock',
      attempts: 1,
      data: { accepted: false },
    });
    expect(result.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects non-static operation names before invoking callbacks', async () => {
    const callback = jest.fn();
    await expect(
      new IntegrationExecutor(registry()).runMock(
        'resend',
        'email@example.invalid',
        'read',
        callback,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_OPERATION' });
    expect(callback).not.toHaveBeenCalled();
  });

  it('bounds read retries, charges every attempt, and uses backoff', async () => {
    const callback = jest
      .fn()
      .mockRejectedValue(new Error('synthetic-provider-error'));
    const wait = jest.fn().mockResolvedValue(undefined);
    const executor = new IntegrationExecutor(
      registry(),
      { readRetries: 2, circuitFailures: 10 },
      Date.now,
      wait,
      () => 0,
    );
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(callback).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[200], [400]]);
  });

  it('does not retry mutation failures, preserving unknown outcome', async () => {
    const callback = jest
      .fn()
      .mockRejectedValue(new Error('synthetic-provider-error'));
    const wait = jest.fn();
    const executor = new IntegrationExecutor(registry(), {}, Date.now, wait);
    await expect(
      executor.runMock('resend', 'send', 'mutation', callback),
    ).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      outcome: 'unknown',
      retryable: false,
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('does not retry a definitive provider rejection', async () => {
    const callback = jest
      .fn()
      .mockRejectedValue(new IntegrationFailure('REJECTED'));
    await expect(
      new IntegrationExecutor(registry()).runMock(
        'resend',
        'send',
        'mutation',
        callback,
      ),
    ).rejects.toMatchObject({ code: 'REJECTED', outcome: 'rejected' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops retries at the mock quota and records 60/80/95 warnings once', async () => {
    const executor = new IntegrationExecutor(registry(), {
      mockDailyLimit: 20,
      requestsPerMinute: 100,
    });
    const callback = jest.fn().mockResolvedValue(null);
    for (let i = 0; i < 20; i++)
      await executor.runMock('resend', 'lookup', 'read', callback);
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(callback).toHaveBeenCalledTimes(20);
    const warnings = warningCalls.map(
      ([entry]) => entry as { event: string; threshold: number },
    );
    expect(
      warnings
        .filter((v) => v.event === 'integration_mock_quota')
        .map((v) => v.threshold),
    ).toEqual([60, 80, 95]);
  });

  it('counts failed read attempts against quota without refund', async () => {
    const executor = new IntegrationExecutor(
      registry(),
      { mockDailyLimit: 1 },
      Date.now,
      () => Promise.resolve(),
    );
    const callback = jest
      .fn()
      .mockRejectedValue(new Error('synthetic-provider-error'));
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('reserves budgets synchronously across simultaneous requests', async () => {
    const task = deferred<null>();
    const executor = new IntegrationExecutor(registry(), { mockDailyLimit: 1 });
    const first = executor.runMock(
      'resend',
      'lookup',
      'read',
      () => task.promise,
    );
    const secondCallback = jest.fn();
    await expect(
      executor.runMock('resend', 'lookup', 'read', secondCallback),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(secondCallback).not.toHaveBeenCalled();
    task.resolve(null);
    await first;
  });

  it('isolates provider budgets and resets minute/day windows', async () => {
    let clock = 1000;
    const executor = new IntegrationExecutor(
      registry(),
      { mockDailyLimit: 2, requestsPerMinute: 1 },
      () => clock,
    );
    const callback = () => Promise.resolve(null);
    await executor.runMock('resend', 'lookup', 'read', callback);
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await executor.runMock('pagespeed', 'audit', 'read', callback);
    clock += 60000;
    await executor.runMock('resend', 'lookup', 'read', callback);
    clock += 60000;
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    clock += 86400000;
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).resolves.toMatchObject({ attempts: 1 });
  });

  it('opens a breaker, admits one half-open probe, then recovers', async () => {
    let clock = 1000;
    const executor = new IntegrationExecutor(
      registry(),
      { readRetries: 0, circuitFailures: 1, cooldownMs: 100 },
      () => clock,
    );
    await expect(
      executor.runMock('resend', 'lookup', 'read', () =>
        Promise.reject(new Error('failure')),
      ),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    const callback = jest.fn();
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    expect(callback).not.toHaveBeenCalled();
    clock += 100;
    const task = deferred<string>();
    const probe = executor.runMock(
      'resend',
      'lookup',
      'read',
      () => task.promise,
    );
    await expect(
      executor.runMock('resend', 'lookup', 'read', callback),
    ).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    task.resolve('recovered');
    await probe;
    await expect(
      executor.runMock('resend', 'lookup', 'read', () => Promise.resolve(null)),
    ).resolves.toMatchObject({ attempts: 1 });
  });

  it('does not let an older successful call close a newer open circuit', async () => {
    const executor = new IntegrationExecutor(registry(), {
      readRetries: 0,
      circuitFailures: 1,
    });
    const oldTask = deferred<null>();
    const first = executor.runMock(
      'resend',
      'lookup',
      'read',
      () => oldTask.promise,
    );
    await expect(
      executor.runMock('resend', 'lookup', 'read', () =>
        Promise.reject(new Error('failure')),
      ),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    oldTask.resolve(null);
    await first;
    await expect(
      executor.runMock('resend', 'lookup', 'read', () => Promise.resolve(null)),
    ).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
  });

  it('times out an abort-ignoring task and keeps its concurrency slot until settlement', async () => {
    jest.useFakeTimers();
    const executor = new IntegrationExecutor(registry(), {
      timeoutMs: 20,
      maxInFlight: 1,
      readRetries: 0,
    });
    const task = deferred<null>();
    let signal: AbortSignal | undefined;
    const request = executor.runMock('resend', 'send', 'mutation', (value) => {
      signal = value;
      return task.promise;
    });
    const rejected = expect(request).rejects.toMatchObject({
      code: 'TIMEOUT',
      outcome: 'unknown',
    });
    await jest.advanceTimersByTimeAsync(20);
    await rejected;
    expect(signal?.aborted).toBe(true);
    await expect(
      executor.runMock('resend', 'lookup', 'read', () => Promise.resolve(null)),
    ).rejects.toMatchObject({ code: 'CONCURRENCY_LIMIT' });
    task.resolve(null);
    await task.promise;
    await Promise.resolve();
    await expect(
      executor.runMock('resend', 'lookup', 'read', () => Promise.resolve(null)),
    ).resolves.toMatchObject({ attempts: 1 });
  });

  it('does not include raw exceptions or response payloads in logs', async () => {
    const executor = new IntegrationExecutor(registry(), { readRetries: 0 });
    await expect(
      executor.runMock('resend', 'lookup', 'read', () =>
        Promise.reject(new Error('private-token fixture@example.invalid')),
      ),
    ).rejects.toMatchObject({ message: 'INTEGRATION_UNAVAILABLE' });
    const logged = JSON.stringify(warningCalls);
    expect(logged).not.toContain('private-token');
    expect(logged).not.toContain('fixture@example.invalid');
  });

  it.each([
    { readRetries: 3 },
    { maxInFlight: 0 },
    { timeoutMs: NaN },
    { mockDailyLimit: 1.5 },
  ])('validates execution settings: %p', (settings) => {
    expect(() => new IntegrationExecutor(registry(), settings)).toThrow(
      'INVALID_EXECUTOR_SETTINGS',
    );
  });
});
