import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService
    ) { }

    private async sendSafe(options: any) {
        try {
            await this.mailerService.sendMail(options);
            console.log(`Email sent successfully to ${options.to}`);
        } catch (error) {
            console.error(`Failed to send email to ${options.to}:`, error);
            // Non-blocking: Do not re-throw error to prevent stopping the order flow
        }
    }

    private formatPrice(amount: number): string {
        try {
            const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            // Approx 1 USD = 25,000 VND
            const usd = (amount / 25000).toFixed(2);
            return `${vnd} (~ $${usd})`;
        } catch (e) {
            return `${amount} VND`;
        }
    }

    async sendOrderConfirmation(order: any) {
        // Find main customer email - assuming user object is attached or we use shipping info?
        // In orders.service, we usually have user_id, but prompt says "shipping_info" has details.
        // Let's assume shipping_info.email Exists.
        const email = order.shipping_info?.email;
        if (!email) return;

        await this.sendSafe({
            to: email,
            subject: `Order Confirmation #${order.id}`,
            template: './order-confirmation',
            context: {
                id: order.id,
                total: this.formatPrice(order.total),
                items: order.items,
                shipping: order.shipping_info,
            },
        });
    }

    async sendAdminAlert(order: any) {
        const adminEmail = this.configService.get('MAIL_ADMIN_ADDRESS');
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

    async sendPaymentSuccess(order: any) {
        const email = order.shipping_info?.email;
        if (!email) return;

        await this.sendSafe({
            to: email,
            subject: `Payment Received for Order #${order.id}`,
            template: './payment-success',
            context: {
                id: order.id,
                total: this.formatPrice(order.total),
            },
        });
    }

    async sendOrderStatusUpdate(order: any) {
        const email = order.shipping_info?.email;
        if (!email) return;

        const subject = order.status === 'SHIPPED'
            ? `Your order #${order.id} has been shipped!`
            : `Order #${order.id} Completed`;

        await this.sendSafe({
            to: email,
            subject,
            template: './order-status',
            context: {
                id: order.id,
                status: order.status,
                items: order.items,
            },
        });
    }
}
