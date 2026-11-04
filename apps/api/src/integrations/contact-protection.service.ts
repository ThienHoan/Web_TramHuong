import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { IntegrationRegistry } from './integrations.config';
import { IntegrationExecutor } from './integration-executor';
import { MockTurnstileAdapter } from './turnstile.adapter';

export class ContactProtectionService {
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly environment: string,
    private readonly executor: IntegrationExecutor,
    private readonly adapter = new MockTurnstileAdapter(),
    private readonly now = Date.now,
  ) {}

  status(): { mode: 'disabled' | 'mock' | 'unavailable' } {
    if (this.registry.turnstile.mode === 'disabled')
      return { mode: 'disabled' };
    if (
      this.registry.turnstile.mode !== 'mock' ||
      !['development', 'test'].includes(this.environment)
    )
      return { mode: 'unavailable' };
    return { mode: 'mock' };
  }

  issue(origin?: string) {
    this.requireMock();
    const hostname = this.localHostname(origin);
    try {
      return {
        mode: 'mock' as const,
        ...this.adapter.issue(hostname, 'contact'),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Xác minh đang tạm gián đoạn. Vui lòng thử lại sau.',
      );
    }
  }

  async verify(token: string | undefined, origin?: string) {
    if (this.status().mode === 'disabled') return;
    this.requireMock();
    const hostname = this.localHostname(origin);
    if (!token || token.length > 2048) throw this.rejected();
    let result;
    try {
      result = (
        await this.executor.runMock(
          'turnstile',
          'verify_contact',
          'mutation',
          () => this.adapter.verify(token),
        )
      ).data;
    } catch {
      throw new ServiceUnavailableException(
        'Xác minh đang tạm gián đoạn. Vui lòng thử lại sau.',
      );
    }
    const age = this.now() - Date.parse(result.challenge_ts ?? '');
    if (
      !result.success ||
      result.hostname !== hostname ||
      result.action !== 'contact' ||
      !Number.isFinite(age) ||
      age < -30000 ||
      age >= 300000
    )
      throw this.rejected();
  }
  private requireMock() {
    if (this.status().mode !== 'mock')
      throw new ServiceUnavailableException(
        'Xác minh đang tạm gián đoạn. Vui lòng thử lại sau.',
      );
  }
  private localHostname(origin?: string): string {
    try {
      const url = new URL(origin ?? '');
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== origin ||
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
        throw new Error();
      return url.hostname;
    } catch {
      throw this.rejected();
    }
  }
  private rejected() {
    return new ForbiddenException(
      'Vui lòng xác minh lại trước khi gửi lời nhắn.',
    );
  }
}
