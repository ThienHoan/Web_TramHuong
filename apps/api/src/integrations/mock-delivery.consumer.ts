import type {
  IntegrationProvider,
  IntegrationRegistry,
} from './integrations.config';
import { requireMockIntegration } from './integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from './integration-executor';
import { IntegrationRepository } from './integration.repository';
import type { IntegrationOutboxRow } from './integration-database.types';

/**
 * Thrown by a handler that made NO provider call and wants the row requeued
 * (e.g. Merchant send fence busy). Only honoured when drain() got `defer`;
 * otherwise it is an ordinary non-retryable failure.
 */
export class IntegrationDeferred extends IntegrationFailure {
  constructor() {
    super('CONCURRENCY_LIMIT');
  }
}

// Explicit invocation only: no cron, no provider handler and no order hooks.
export class MockDeliveryConsumer {
  private readonly running = new Set<IntegrationProvider>();
  private readonly executor: IntegrationExecutor;
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly repo: IntegrationRepository,
  ) {
    // One outbox lease attempt corresponds to one callback/usage reservation.
    this.executor = new IntegrationExecutor(registry, { readRetries: 0 });
  }

  async drain(
    provider: IntegrationProvider,
    handler: (row: IntegrationOutboxRow, signal: AbortSignal) => Promise<void>,
    defer?: (row: IntegrationOutboxRow) => Promise<void>,
  ) {
    requireMockIntegration(this.registry, provider);
    if (this.running.has(provider))
      return {
        busy: true,
        claimed: 0,
        accepted: 0,
        failed: 0,
        conflicts: 0,
        deferred: 0,
      };
    this.running.add(provider);
    const counts = {
      busy: false,
      claimed: 0,
      accepted: 0,
      failed: 0,
      conflicts: 0,
      deferred: 0,
    };
    try {
      const rows = await this.repo.claimMock(provider);
      counts.claimed = rows.length;
      for (const row of rows) {
        let outcome: 'ACCEPTED' | 'RETRY' | 'UNKNOWN' | 'DEAD' = 'ACCEPTED';
        let code: string | undefined;
        try {
          await this.executor.runMock(
            provider,
            row.event_type,
            row.operation_kind,
            async (signal) => {
              await this.repo.reserveMockUsage(provider, 100);
              signal.throwIfAborted();
              await handler(row, signal);
            },
          );
        } catch (error: unknown) {
          if (error instanceof IntegrationDeferred && defer) {
            // Not finished: the caller proves no provider call happened.
            try {
              await defer(row);
              counts.deferred++;
            } catch {
              counts.conflicts++; // lease expires → UNKNOWN, never resent
            }
            continue;
          }
          counts.failed++;
          const failure =
            error instanceof IntegrationFailure
              ? error
              : new IntegrationFailure('UNAVAILABLE');
          code = failure.code;
          outcome =
            failure.outcome === 'unknown'
              ? 'UNKNOWN'
              : row.operation_kind === 'read' && failure.retryable
                ? 'RETRY'
                : 'DEAD';
        }
        try {
          await this.repo.finish(row, outcome, code);
          if (outcome === 'ACCEPTED') counts.accepted++;
        } catch {
          counts.conflicts++;
        } // Do not re-run the provider on a CAS failure.
      }
      return counts;
    } finally {
      this.running.delete(provider);
    }
  }
}
