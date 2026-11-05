import type { ISendMailOptions } from '@nestjs-modules/mailer';
import { createHash } from 'node:crypto';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { canonicalJson } from '../integrations/integration.repository';
import type { Json } from '../common/types/database.types';
import {
  requireMockIntegration,
  type IntegrationRegistry,
} from '../integrations/integrations.config';
import type { EmailProvider, EmailSendResult } from './email-provider';

// No network/credentials/automatic selection. Process-memory mock ledger only.
export class MockResendEmailProvider implements EmailProvider {
  private readonly ledger = new Map<
    string,
    { hash: string; result: Promise<EmailSendResult> }
  >();

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly executor: IntegrationExecutor,
    private readonly nodeEnv: string,
    private readonly simulate: (signal: AbortSignal) => Promise<void> = () =>
      Promise.resolve(),
  ) {}

  send(
    options: ISendMailOptions,
    idempotencyKey?: string,
  ): Promise<EmailSendResult> {
    requireMockIntegration(this.registry, 'resend');
    if (!['development', 'test'].includes(this.nodeEnv))
      throw new Error('RESEND_MOCK_REQUIRES_LOCAL_ENV');
    if (!idempotencyKey || !/^[a-zA-Z0-9:_-]{1,250}$/.test(idempotencyKey))
      throw new Error('RESEND_MOCK_INVALID_KEY');
    let serialized: string;
    try {
      serialized = JSON.stringify(options);
    } catch {
      throw new Error('RESEND_MOCK_INVALID_MESSAGE');
    }
    if (
      !serialized ||
      Buffer.byteLength(serialized) > 60000 ||
      typeof options.to !== 'string' ||
      !options.to ||
      typeof options.subject !== 'string' ||
      !options.subject ||
      Object.keys(options).some(
        (key) =>
          ![
            'to',
            'from',
            'subject',
            'template',
            'context',
            'html',
            'text',
          ].includes(key),
      )
    )
      throw new Error('RESEND_MOCK_INVALID_MESSAGE');
    const hash = createHash('sha256')
      .update(canonicalJson(JSON.parse(serialized) as Json))
      .digest('hex');
    const previous = this.ledger.get(idempotencyKey);
    if (previous) {
      if (previous.hash !== hash) throw new Error('RESEND_MOCK_KEY_CONFLICT');
      return previous.result;
    }
    // Never evict an ambiguous outcome to make room for a fresh send.
    if (this.ledger.size >= 100) throw new Error('RESEND_MOCK_LEDGER_FULL');
    const result = this.attempt();
    this.ledger.set(idempotencyKey, { hash, result });
    return result;
  }

  private async attempt(): Promise<EmailSendResult> {
    try {
      await this.executor.runMock(
        'resend',
        'send_email',
        'mutation',
        this.simulate,
      );
      return { source: 'mock', outcome: 'accepted', delivered: false };
    } catch {
      // No SMTP fallback, retries or raw provider payload in the public result.
      return { source: 'mock', outcome: 'unknown', delivered: false };
    }
  }
}
