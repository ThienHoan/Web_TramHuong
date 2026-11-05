import { Injectable } from '@nestjs/common';
import { MailerService, type ISendMailOptions } from '@nestjs-modules/mailer';
import type { EmailProvider, EmailSendResult } from './email-provider';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  constructor(private readonly mailer: MailerService) {}

  async send(options: ISendMailOptions): Promise<EmailSendResult> {
    try {
      const response: unknown = await this.mailer.sendMail(options);
      if (response && typeof response === 'object') {
        const result = response as Record<string, unknown>;
        if (Array.isArray(result.accepted) && result.accepted.length > 0) {
          return { source: 'smtp', outcome: 'accepted', delivered: false };
        }
        if (Array.isArray(result.rejected) && result.rejected.length > 0) {
          return { source: 'smtp', outcome: 'rejected', delivered: false };
        }
      }
    } catch {
      // A timeout/error can follow upstream acceptance. Never blindly resend.
    }
    return { source: 'smtp', outcome: 'unknown', delivered: false };
  }
}
