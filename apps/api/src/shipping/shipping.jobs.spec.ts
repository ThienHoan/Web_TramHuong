import { MemoryLogisticsRepository } from './testing/memory-repository';
import { LogisticsRepository } from './logistics.repository';
import { ShippingTrackingService } from './tracking.service';
import { ShippingJobs } from './shipping.jobs';
import { ShippingOperationsService } from './operations.service';
describe('durable shipping worker leases and dead letters', () => {
  let repo: MemoryLogisticsRepository, jobs: ShippingJobs, process: jest.Mock;
  beforeEach(() => {
    repo = new MemoryLogisticsRepository();
    process = jest.fn().mockResolvedValue(undefined);
    jobs = new ShippingJobs(
      repo as unknown as LogisticsRepository,
      { process } as unknown as ShippingTrackingService,
      { checkout: false, fulfillment: false, jobs: false, webhookSecret: '' },
      {} as ShippingOperationsService,
    );
  });
  it('does no work for disabled automatic jobs', async () => {
    await jobs.run();
    expect(process).not.toHaveBeenCalled();
  });
  it('claims each inbox event only once across competing workers', async () => {
    await repo.write('inbox:fixture', 'inbox', 'QUEUED', {
      event: {},
      attempts: 0,
      nextAt: new Date(0).toISOString(),
    });
    await Promise.all([jobs.drain(), jobs.drain()]);
    expect(process).toHaveBeenCalledTimes(1);
    expect((await repo.get('inbox:fixture'))?.state).toBe('DONE');
  });
  it('keeps exhausted events in dead letters with an actionable exception', async () => {
    await repo.write('inbox:fixture', 'inbox', 'QUEUED', {
      event: {},
      attempts: 7,
      nextAt: new Date(0).toISOString(),
    });
    process.mockRejectedValue(new Error('fixture failure'));
    await jobs.drain();
    expect((await repo.get('inbox:fixture'))?.state).toBe('DEAD');
    expect((await repo.list('exception')).total).toBe(1);
  });
  it('recovers abandoned work after lease expiry', async () => {
    await repo.write('inbox:fixture', 'inbox', 'WORKING', {
      event: {},
      attempts: 1,
      nextAt: new Date(0).toISOString(),
    });
    repo.rows.get('inbox:fixture')!.updated_at = new Date(
      Date.now() - 180000,
    ).toISOString();
    await jobs.drain();
    expect(process).toHaveBeenCalledTimes(1);
    expect((await repo.get('inbox:fixture'))?.state).toBe('DONE');
  });
});
