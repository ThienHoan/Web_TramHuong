import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from './mail.service';

@Injectable()
export class ReviewReminderService {
  private readonly logger = new Logger(ReviewReminderService.name);
  private running = false;
  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly mail: MailService,
  ) {}
  @Cron('0 */30 * * * *')
  async run() {
    const enabled = this.config.get<unknown>(
      'FEATURE_REVIEW_REMINDERS_ENABLED',
    );
    const kill = this.config.get<unknown>('INTEGRATIONS_KILL_SWITCH');
    if (
      this.running ||
      (enabled !== true && enabled !== 'true') ||
      kill === true ||
      kill === 'true'
    )
      return;
    this.running = true;
    const client = this.supabase.getClient();
    try {
      const claimed = await client.rpc('review_reminder_claim', {
        p_limit: 20,
      });
      if (claimed.error) throw new Error('REVIEW_REMINDER_CLAIM_FAILED');
      for (const row of claimed.data || []) {
        const prepared = await client.rpc('review_reminder_prepare', {
          p_order_id: row.order_id,
          p_token: row.lease_token,
        });
        if (prepared.error) {
          this.logger.error('REVIEW_REMINDER_PREPARE_FAILED');
          continue;
        }
        if (!prepared.data) continue;
        // Once prepared, even an ambiguous SMTP outcome must never auto-retry.
        let accepted = false;
        try {
          accepted = await this.mail.sendReviewReminder(prepared.data);
        } catch {
          this.logger.error('REVIEW_REMINDER_SEND_FAILED');
        }
        const finished = await client.rpc('review_reminder_finish', {
          p_order_id: row.order_id,
          p_token: row.lease_token,
          p_state: accepted ? 'ACCEPTED' : 'UNKNOWN',
        });
        if (finished.error || !finished.data)
          this.logger.error('REVIEW_REMINDER_FINISH_FAILED');
      }
    } catch {
      this.logger.error('REVIEW_REMINDER_RUN_FAILED');
    } finally {
      this.running = false;
    }
  }
}
