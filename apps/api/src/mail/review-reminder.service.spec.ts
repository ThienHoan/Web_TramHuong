import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from './mail.service';
import { ReviewReminderService } from './review-reminder.service';
const order = { order_id: 'order', lease_token: 'lease' };
describe('review reminder worker', () => {
  const setup = (enabled = true, accepted = true, kill = false) => {
    const rpc = jest.fn().mockImplementation(async (name: string) => ({ error: null, data: name.endsWith('claim') ? [order] : name.endsWith('prepare') ? { to: 'buyer@example.invalid', items: [{ slug: 'incense', title: 'Incense' }] } : true }));
    const mail = { sendReviewReminder: jest.fn().mockResolvedValue(accepted) };
    const worker = new ReviewReminderService({ get: (key: string) => key === 'FEATURE_REVIEW_REMINDERS_ENABLED' ? enabled : kill } as unknown as ConfigService, { getClient: () => ({ rpc }) } as unknown as SupabaseService, mail as unknown as MailService);
    return { worker, rpc, mail };
  };
  it('does no database or SMTP work while disabled or killed', async () => {
    for (const fixture of [setup(false), setup(true, true, true)]) { await fixture.worker.run(); expect(fixture.rpc).not.toHaveBeenCalled(); expect(fixture.mail.sendReviewReminder).not.toHaveBeenCalled(); }
  });
  it('prepares one send and records provider acceptance without claiming delivery', async () => {
    const { worker, rpc, mail } = setup(); await worker.run();
    expect(mail.sendReviewReminder).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenLastCalledWith('review_reminder_finish', { p_order_id: 'order', p_token: 'lease', p_state: 'ACCEPTED' });
  });
  it('records uncertain SMTP outcomes without a retry', async () => {
    const { worker, rpc, mail } = setup(true, false); await worker.run();
    expect(mail.sendReviewReminder).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenLastCalledWith('review_reminder_finish', expect.objectContaining({ p_state: 'UNKNOWN' }));
  });
  it('does not send when the source is canceled, already reviewed, or claim no longer belongs to this worker', async () => {
    const { worker, rpc, mail } = setup(); rpc.mockImplementation(async (name: string) => ({ error: null, data: name.endsWith('claim') ? [order] : null })); await worker.run(); expect(mail.sendReviewReminder).not.toHaveBeenCalled();
  });
  it('does not log recipients or errors returned by the database', async () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    try {
      const { worker, rpc } = setup(); rpc.mockResolvedValue({ data: null, error: { message: 'secret@example.invalid' } }); await worker.run();
      expect(spy.mock.calls).toEqual([['REVIEW_REMINDER_RUN_FAILED']]);
    } finally { spy.mockRestore(); }
  });
});
