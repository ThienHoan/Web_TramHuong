import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISendMailOptions } from '@nestjs-modules/mailer';
import { EMAIL_PROVIDER, type EmailProvider } from './email-provider';
import { NotificationDeliveryService } from './notification-delivery.service';
import type { NotificationEvent } from './notification.repository';

interface IOrderForMail {
  id: string;
  total: number;
  items: any[];
  shipping_info: {
    email: string;
    [key: string]: any;
  };
  status: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly configService: ConfigService,
    @Optional() private readonly notifications?: NotificationDeliveryService,
  ) {}

  private async sendSafe(
    options: ISendMailOptions,
    reference?: { id: string; event: NotificationEvent },
  ) {
    try {
      if (this.notifications?.enabled && reference) {
        await this.notifications.capture(reference.id, reference.event);
        return;
      }
      const result = await this.emailProvider.send(options);
      if (result.outcome !== 'accepted')
        this.logger.error('MAIL_DELIVERY_FAILED');
    } catch {
      // SMTP errors can contain recipients, message bodies and credentials.
      this.logger.error('MAIL_DELIVERY_FAILED');
      // Non-blocking: Do not re-throw error to prevent stopping the order flow
    }
  }

  private formatPrice(amount: number): string {
    try {
      const vnd = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);
      return vnd;
    } catch {
      return `${amount} VND`;
    }
  }

  async sendOrderConfirmation(order: IOrderForMail) {
    // Find main customer email - assuming user object is attached or we use shipping info?
    // In orders.service, we usually have user_id, but prompt says "shipping_info" has details.
    // Let's assume shipping_info.email Exists.
    const email = order.shipping_info?.email;
    if (!email) return;

    await this.sendSafe(
      {
        to: email,
        subject: `Order Confirmation #${order.id}`,
        template: './order-confirmation',
        context: {
          id: order.id,
          total: this.formatPrice(order.total),
          items: order.items,
          shipping: order.shipping_info,
        },
      },
      { id: order.id, event: 'order_confirmation' },
    );
  }

  async sendAdminAlert(order: IOrderForMail) {
    // Opt-in mock delivery must not accidentally send an admin email via SMTP.
    if (this.notifications?.enabled) return;
    const adminEmail = this.configService.get<string>('MAIL_ADMIN_ADDRESS');
    if (!adminEmail) return;

    await this.sendSafe({
      to: adminEmail,
      subject: `[New Order] #${order.id} - ${this.formatPrice(order.total)}`,
      template: './admin-new-order',
      context: {
        id: order.id,
        total: this.formatPrice(order.total),
        items: order.items,
        shipping: order.shipping_info,
        date: new Date().toLocaleString(),
      },
    });
  }

  async sendPaymentSuccess(order: IOrderForMail) {
    const email = order.shipping_info?.email;
    if (!email) return;

    await this.sendSafe(
      {
        to: email,
        subject: `Payment Received for Order #${order.id}`,
        template: './payment-success',
        context: {
          id: order.id,
          total: this.formatPrice(order.total),
        },
      },
      { id: order.id, event: 'payment_success' },
    );
  }

  async sendOrderStatusUpdate(order: IOrderForMail) {
    const email = order.shipping_info?.email;
    if (!email) return;

    let subject = `Order #${order.id} Update`;

    switch (order.status) {
      case 'PAID':
      case 'CONFIRMED':
        subject = `Order #${order.id} Confirmed`;
        break;
      case 'SHIPPED':
        subject = `Order #${order.id} is on the way!`;
        break;
      case 'COMPLETED':
      case 'DELIVERED':
        subject = `Order #${order.id} Delivered Successfully`;
        break;
      case 'CANCELED':
        subject = `Order #${order.id} Canceled`;
        break;
    }

    await this.sendSafe(
      {
        to: email,
        subject,
        template: './order-status',
        context: {
          id: order.id,
          status: order.status,
          items: order.items,
        },
      },
      { id: order.id, event: 'order_status' },
    );
  }
}
