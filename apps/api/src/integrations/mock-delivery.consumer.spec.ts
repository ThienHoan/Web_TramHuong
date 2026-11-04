import { Logger } from '@nestjs/common';
import { MockDeliveryConsumer } from './mock-delivery.consumer';
import { IntegrationRepository } from './integration.repository';
import { loadIntegrationRegistry } from './integrations.config';
import { IntegrationFailure } from './integration-executor';
import type { IntegrationOutboxRow } from './integration-database.types';

describe('explicit mock consumer', () => {
  const row = {
    id: 'fixture',
    provider: 'resend',
    environment: 'mock',
    event_type: 'fixture',
    operation_kind: 'mutation',
    lease_token: 'fixture',
    version: 1,
  } as IntegrationOutboxRow;
  const create = (enabled = true, record = row) => {
    const repo = {
      claimMock: jest.fn().mockResolvedValue([record]),
      reserveMockUsage: jest.fn().mockResolvedValue({ used: 1 }),
      finish: jest.fn().mockResolvedValue(undefined),
    };
    const registry = loadIntegrationRegistry({
      get: (key) =>
        key === 'FEATURE_RESEND_ENABLED' ? String(enabled) : undefined,
    });
    return {
      repo,
      consumer: new MockDeliveryConsumer(
        registry,
        repo as unknown as IntegrationRepository,
      ),
    };
  };
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it('flag off makes no database or callback calls', async () => {
    const { repo, consumer } = create(false);
    const handler = jest.fn();
    await expect(consumer.drain('resend', handler)).rejects.toThrow(
      'INTEGRATION_NOT_EXECUTABLE',
    );
    expect(repo.claimMock).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
  it('reserves usage before execution and acknowledges only persisted results', async () => {
    const { repo, consumer } = create();
    const handler = jest.fn().mockImplementation(() => {
      expect(repo.reserveMockUsage).toHaveBeenCalledTimes(1);
      return Promise.resolve();
    });
    await expect(consumer.drain('resend', handler)).resolves.toMatchObject({
      accepted: 1,
      conflicts: 0,
    });
    expect(repo.finish).toHaveBeenCalledWith(row, 'ACCEPTED', undefined);
  });
  it('does not invoke handlers if quota reservation fails', async () => {
    const { repo, consumer } = create();
    repo.reserveMockUsage.mockRejectedValue(
      new IntegrationFailure('QUOTA_EXCEEDED'),
    );
    const handler = jest.fn();
    await consumer.drain('resend', handler);
    expect(handler).not.toHaveBeenCalled();
    expect(repo.finish).toHaveBeenCalledWith(row, 'DEAD', 'QUOTA_EXCEEDED');
  });
  it('records mutation ambiguity without retrying or claiming accepted', async () => {
    const { repo, consumer } = create();
    const handler = jest.fn().mockRejectedValue(new Error('synthetic timeout'));
    await expect(consumer.drain('resend', handler)).resolves.toMatchObject({
      accepted: 0,
      failed: 1,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(repo.finish).toHaveBeenCalledWith(row, 'UNKNOWN', 'UNAVAILABLE');
  });
  it('only reads can be rescheduled after availability failure', async () => {
    const read = { ...row, operation_kind: 'read' as const };
    const { repo, consumer } = create(true, read);
    const handler = jest.fn().mockRejectedValue(new Error('synthetic timeout'));
    await consumer.drain('resend', handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(repo.finish).toHaveBeenCalledWith(read, 'RETRY', 'UNAVAILABLE');
  });
  it('does not resend a successful operation after CAS failure', async () => {
    const { repo, consumer } = create();
    repo.finish.mockRejectedValue(new Error('conflict'));
    const handler = jest.fn().mockResolvedValue(undefined);
    await expect(consumer.drain('resend', handler)).resolves.toMatchObject({
      accepted: 0,
      conflicts: 1,
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('prevents overlapping drains within the same instance', async () => {
    const { repo, consumer } = create();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = consumer.drain('resend', () => waiting);
    await expect(consumer.drain('resend', jest.fn())).resolves.toMatchObject({
      busy: true,
      claimed: 0,
    });
    release();
    await first;
    expect(repo.claimMock).toHaveBeenCalledTimes(1);
  });
});
