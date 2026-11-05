import type { ISendMailOptions } from '@nestjs-modules/mailer';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export type EmailSendResult = {
  source: 'smtp' | 'mock';
  outcome: 'accepted' | 'rejected' | 'unknown';
  // Provider acceptance never proves delivery to the customer's mailbox.
  delivered: false;
};

export interface EmailProvider {
  send(
    options: ISendMailOptions,
    idempotencyKey?: string,
  ): Promise<EmailSendResult>;
}
