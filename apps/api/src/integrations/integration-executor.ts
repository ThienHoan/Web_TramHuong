import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type {
  IntegrationProvider,
  IntegrationRegistry,
} from './integrations.config';

export type IntegrationFailureCode =
  | 'DISABLED'
  | 'BLOCKED'
  | 'INVALID_OPERATION'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'CIRCUIT_OPEN'
  | 'CONCURRENCY_LIMIT'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'REJECTED';

export class IntegrationFailure extends Error {
  constructor(
    readonly code: IntegrationFailureCode,
    readonly retryable = false,
    readonly outcome: 'rejected' | 'unknown' = 'rejected',
  ) {
    super(`INTEGRATION_${code}`);
  }
}

interface ExecutorSettings {
  timeoutMs: number;
  readRetries: number;
  circuitFailures: number;
  cooldownMs: number;
  maxInFlight: number;
  mockDailyLimit: number;
  requestsPerMinute: number;
}

interface ProviderState {
  failures: number;
  openUntil: number;
  generation: number;
  probe: boolean;
  inFlight: number;
  minute: number;
  minuteUsed: number;
  day: number;
  dayUsed: number;
  warnings: Set<number>;
}

// Executes injected MOCK operations only; no fetch, URL or credentials here.
// Memory limits apply to mock attempts in this process, not a live cost ledger.
export class IntegrationExecutor {
  private readonly logger = new Logger(IntegrationExecutor.name);
  private readonly states = new Map<IntegrationProvider, ProviderState>();
  private readonly settings: ExecutorSettings;

  constructor(
    private readonly registry: IntegrationRegistry,
    settings: Partial<ExecutorSettings> = {},
    private readonly now = Date.now,
    private readonly wait: (ms: number) => Promise<void> = async (ms) => {
      await delay(ms);
    },
    private readonly random = Math.random,
  ) {
    this.settings = {
      timeoutMs: 8000,
      readRetries: 1,
      circuitFailures: 3,
      cooldownMs: 30000,
      maxInFlight: 4,
      mockDailyLimit: 100,
      requestsPerMinute: 30,
      ...settings,
    };
    const limits: Record<keyof ExecutorSettings, number> = {
      timeoutMs: 30000,
      readRetries: 2,
      circuitFailures: 10,
      cooldownMs: 3600000,
      maxInFlight: 16,
      mockDailyLimit: 10000,
      requestsPerMinute: 1000,
    };
    for (const key of Object.keys(
      this.settings,
    ) as (keyof ExecutorSettings)[]) {
      const value = this.settings[key];
      const max = limits[key];
      const min = key === 'readRetries' ? 0 : 1;
      if (
        max === undefined ||
        !Number.isSafeInteger(value) ||
        value < min ||
        value > max
      ) {
        throw new Error('INVALID_EXECUTOR_SETTINGS');
      }
    }
  }

  async runMock<T>(
    provider: IntegrationProvider,
    operation: string,
    kind: 'read' | 'mutation',
    execute: (signal: AbortSignal) => Promise<T>,
  ): Promise<{
    source: 'mock';
    correlationId: string;
    attempts: number;
    data: T;
  }> {
    const policy = Object.hasOwn(this.registry, provider)
      ? this.registry[provider]
      : undefined;
    if (!policy || policy.mode === 'blocked')
      throw new IntegrationFailure('BLOCKED');
    if (policy.mode === 'disabled') throw new IntegrationFailure('DISABLED');
    if (
      !/^[a-z][a-z0-9_]{0,63}$/.test(operation) ||
      !['read', 'mutation'].includes(kind)
    ) {
      throw new IntegrationFailure('INVALID_OPERATION');
    }
    const correlationId = randomUUID();
    const state = this.state(provider);
    const retries = kind === 'read' ? this.settings.readRetries : 0;
    for (let attempt = 0; ; attempt++) {
      const lease = this.reserve(provider, state);
      const startedAt = this.now();
      try {
        const data = await this.timed(execute, state);
        // A success launched before another call opened the breaker must not
        // close that newer circuit generation.
        if (state.generation === lease) {
          state.failures = 0;
          state.openUntil = 0;
          state.probe = false;
        }
        this.logger.log({
          event: 'integration_success',
          source: 'mock',
          provider,
          operation,
          correlationId,
          attempt: attempt + 1,
          durationMs: this.now() - startedAt,
        });
        return { source: 'mock', correlationId, attempts: attempt + 1, data };
      } catch (error: unknown) {
        const failure =
          error instanceof IntegrationFailure
            ? error
            : new IntegrationFailure('UNAVAILABLE', true);
        const unavailable = ['TIMEOUT', 'UNAVAILABLE'].includes(failure.code);
        if (unavailable || state.probe) {
          state.failures++;
          if (state.probe || state.failures >= this.settings.circuitFailures) {
            state.openUntil = this.now() + this.settings.cooldownMs;
            state.generation++;
          }
          state.probe = false;
        }
        this.logger.warn({
          event: 'integration_failure',
          source: 'mock',
          provider,
          operation,
          correlationId,
          attempt: attempt + 1,
          code: failure.code,
          durationMs: this.now() - startedAt,
        });
        if (kind === 'mutation' && unavailable) {
          throw new IntegrationFailure(failure.code, false, 'unknown');
        }
        if (!failure.retryable || attempt >= retries || state.openUntil > 0)
          throw failure;
        await this.wait(200 * 2 ** attempt + Math.floor(this.random() * 100));
      }
    }
  }

  private state(provider: IntegrationProvider): ProviderState {
    let state = this.states.get(provider);
    if (!state) {
      state = {
        failures: 0,
        openUntil: 0,
        generation: 0,
        probe: false,
        inFlight: 0,
        minute: -1,
        minuteUsed: 0,
        day: -1,
        dayUsed: 0,
        warnings: new Set(),
      };
      this.states.set(provider, state);
    }
    return state;
  }

  private reserve(provider: IntegrationProvider, state: ProviderState): number {
    const now = this.now();
    if (state.openUntil && (now < state.openUntil || state.probe)) {
      throw new IntegrationFailure('CIRCUIT_OPEN');
    }
    if (state.inFlight >= this.settings.maxInFlight) {
      throw new IntegrationFailure('CONCURRENCY_LIMIT');
    }
    const day = Math.floor(now / 86400000);
    if (state.day !== day) {
      state.day = day;
      state.dayUsed = 0;
      state.warnings.clear();
    }
    const minute = Math.floor(now / 60000);
    if (state.minute !== minute) {
      state.minute = minute;
      state.minuteUsed = 0;
    }
    if (state.dayUsed >= this.settings.mockDailyLimit)
      throw new IntegrationFailure('QUOTA_EXCEEDED');
    if (state.minuteUsed >= this.settings.requestsPerMinute)
      throw new IntegrationFailure('RATE_LIMITED');
    // Synchronous reservation before any await prevents local oversubscription.
    state.inFlight++;
    state.dayUsed++;
    state.minuteUsed++;
    if (state.openUntil) state.probe = true;
    for (const threshold of [60, 80, 95]) {
      if (
        state.dayUsed * 100 >= this.settings.mockDailyLimit * threshold &&
        !state.warnings.has(threshold)
      ) {
        state.warnings.add(threshold);
        this.logger.warn({
          event: 'integration_mock_quota',
          provider,
          threshold,
        });
      }
    }
    return state.generation;
  }

  private async timed<T>(
    execute: (signal: AbortSignal) => Promise<T>,
    state: ProviderState,
  ): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Keep the slot until the task actually settles, even if it ignores abort.
    const task = Promise.resolve().then(() => execute(controller.signal));
    void task.then(
      () => state.inFlight--,
      () => state.inFlight--,
    );
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new IntegrationFailure('TIMEOUT', true));
        controller.abort();
      }, this.settings.timeoutMs);
    });
    try {
      return await Promise.race([task, deadline]);
    } finally {
      clearTimeout(timer);
    }
  }
}
