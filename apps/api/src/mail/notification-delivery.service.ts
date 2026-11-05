import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationFailure } from '../integrations/integration-executor';
import { renderShipmentNotification } from './shipment-notification';
import type { MockDeliveryConsumer } from '../integrations/mock-delivery.consumer';
import type { MockResendEmailProvider } from './mock-resend-email.provider';
import type { IntegrationRepository } from '../integrations/integration.repository';
import {
  NotificationRepository,
  type NotificationEvent,
  type NotificationMail,
} from './notification.repository';

export function renderNotification(mail: NotificationMail): string {
  const engine = Handlebars.create();
  engine.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  const template = engine.compile(
    readFileSync(join(__dirname, 'templates', `${mail.template}.hbs`), 'utf8'),
  );
  return template({
    ...mail.context,
    total: new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(mail.context.total),
  });
}
export class NotificationDeliveryService {
  readonly enabled: boolean;
  private readonly local: boolean;
  constructor(
    private readonly registry: IntegrationRegistry,
    config: ConfigService,
    private readonly repo: NotificationRepository,
    private readonly consumer: MockDeliveryConsumer,
    private readonly provider: MockResendEmailProvider,
    private readonly usage: IntegrationRepository,
    private readonly render = renderNotification,
  ) {
    const flag = config.get<unknown>('FEATURE_NOTIFICATION_OUTBOX_ENABLED');
    if (
      flag !== undefined &&
      flag !== true &&
      flag !== false &&
      flag !== 'true' &&
      flag !== 'false'
    )
      throw new Error(
        'FEATURE_NOTIFICATION_OUTBOX_ENABLED must be true or false',
      );
    this.enabled = flag === true || flag === 'true';
    this.local = ['development', 'test'].includes(
      config.get<string>('NODE_ENV') ?? '',
    );
  }
  mode() {
    return !this.enabled
      ? 'disabled'
      : this.registry.resend.mode === 'mock' && this.local
        ? 'mock'
        : 'blocked';
  }
  private requireMock() {
    if (this.mode() !== 'mock')
      throw new ServiceUnavailableException(
        'NOTIFICATION_DELIVERY_NOT_EXECUTABLE',
      );
  }
  async capture(orderId: string, event: NotificationEvent) {
    this.requireMock();
    return this.repo.capture(orderId, event);
  }
  async reconcile(afterId?: string) {
    this.requireMock();
    return this.repo.reconcile(afterId);
  }
  async reconcileShipments(afterId?: string) {
    this.requireMock();
    return this.repo.reconcileShipments(afterId);
  }
  async drain() {
    this.requireMock();
    const counts = await this.consumer.drain('resend', async (row, signal) => {
      const mail =
        row.event_type === 'shipment_status'
          ? await this.repo.resolveShipment(row)
          : await this.repo.resolve(row);
      signal.throwIfAborted();
      const html =
        mail.template === 'shipment-status'
          ? renderShipmentNotification(mail)
          : this.render(mail);
      signal.throwIfAborted();
      await this.usage.reserveMockUsage('resend', 100, 'emails');
      signal.throwIfAborted();
      const result = await this.provider.send(
        { to: mail.to, subject: mail.subject, html },
        row.dedupe_key,
      );
      if (result.source !== 'mock' || result.outcome !== 'accepted')
        throw new IntegrationFailure('UNAVAILABLE', false, 'unknown');
    });
    return {
      source: 'mock',
      persistence: 'database',
      mode: this.mode(),
      delivered: false,
      ...counts,
    };
  }
  async list(page: number) {
    return {
      ...(await this.repo.list(page)),
      mode: this.mode(),
      deliveredMetric: null,
    };
  }
}
