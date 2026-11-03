import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogisticsRepository } from './logistics.repository';
import { ShippingTrackingService, type CarrierEvent } from './tracking.service';
import { LOGISTICS_SETTINGS, type LogisticsSettings } from './logistics.types';
import { ShippingOperationsService } from './operations.service';
@Injectable()
export class ShippingJobs {
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly tracking: ShippingTrackingService,
    @Inject(LOGISTICS_SETTINGS) private readonly settings: LogisticsSettings,
    private readonly operations: ShippingOperationsService,
  ) {}
  @Cron(CronExpression.EVERY_HOUR)
  async reconcile() {
    if (this.settings.jobs) await this.operations.sweep();
  }
  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    if (!this.settings.jobs) return;
    await this.drain();
  }
  async drain() {
    const queue = await this.repo.list<{
      event: CarrierEvent;
      attempts: number;
      nextAt: string;
    }>('inbox', { state: 'QUEUED', limit: 20, ascending: true });
    const abandoned = await this.repo.list<{
      event: CarrierEvent;
      attempts: number;
      nextAt: string;
    }>('inbox', { state: 'WORKING', limit: 20, ascending: true });
    for (const row of [...queue.data, ...abandoned.data]) {
      if (
        Date.parse(row.data.nextAt) > Date.now() ||
        (row.state === 'WORKING' &&
          Date.parse(row.updated_at) > Date.now() - 120000)
      )
        continue;
      let claimed;
      try {
        claimed = await this.repo.write(
          row.key,
          'inbox',
          'WORKING',
          { ...row.data, attempts: row.data.attempts + 1 },
          row,
        );
      } catch {
        continue;
      }
      try {
        await this.tracking.process(claimed);
        await this.repo.write(
          claimed.key,
          'inbox',
          'DONE',
          claimed.data,
          claimed,
        );
      } catch {
        const dead = claimed.data.attempts >= 8;
        if (dead)
          await this.repo.once(`dead:${claimed.id}`, 'exception', 'OPEN', {
            type: 'DEAD_WEBHOOK',
            severity: 'high',
            inboxId: claimed.id,
          });
        await this.repo.write(
          claimed.key,
          'inbox',
          dead ? 'DEAD' : 'QUEUED',
          {
            ...claimed.data,
            nextAt: new Date(
              Date.now() + Math.min(3600000, 2 ** claimed.data.attempts * 1000),
            ).toISOString(),
          },
          claimed,
        );
      }
    }
  }
}
