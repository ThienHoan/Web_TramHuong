import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { EMAIL_PROVIDER } from './email-provider';
import { SmtpEmailProvider } from './smtp-email.provider';
import { MockResendEmailProvider } from './mock-resend-email.provider';
import {
  INTEGRATION_REGISTRY,
  IntegrationsModule,
} from '../integrations/integrations.module';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { MockDeliveryConsumer } from '../integrations/mock-delivery.consumer';
import { NotificationRepository } from './notification.repository';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationController } from './notification.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { IntegrationRepository } from '../integrations/integration.repository';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from:
            config.get('MAIL_FROM') || '"Tram Huong" <noreply@tramhuong.vn>',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter({
            eq: (a, b) => a === b,
          }),
          options: {
            strict: false,
          },
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    IntegrationsModule,
    SupabaseModule,
  ],
  controllers: [NotificationController],
  providers: [
    MailService,
    SmtpEmailProvider,
    NotificationRepository,
    {
      provide: NotificationDeliveryService,
      inject: [
        INTEGRATION_REGISTRY,
        ConfigService,
        NotificationRepository,
        MockDeliveryConsumer,
        MockResendEmailProvider,
        IntegrationRepository,
      ],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        repo: NotificationRepository,
        consumer: MockDeliveryConsumer,
        provider: MockResendEmailProvider,
        usage: IntegrationRepository,
      ) =>
        new NotificationDeliveryService(
          registry,
          config,
          repo,
          consumer,
          provider,
          usage,
        ),
    },
    { provide: EMAIL_PROVIDER, useExisting: SmtpEmailProvider },
    {
      provide: MockResendEmailProvider,
      inject: [INTEGRATION_REGISTRY, IntegrationExecutor, ConfigService],
      useFactory: (
        registry: IntegrationRegistry,
        executor: IntegrationExecutor,
        config: ConfigService,
      ) =>
        new MockResendEmailProvider(
          registry,
          executor,
          config.get<string>('NODE_ENV') ?? '',
        ),
    },
  ],
  exports: [MailService, MockResendEmailProvider, NotificationDeliveryService],
})
export class MailModule {}
