import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { SmtpEmailProvider } from './smtp-email.provider';

describe('transaction mail logging privacy', () => {
  const order = {
    id: 'fixture-order',
    total: 200000,
    items: [],
    shipping_info: { email: 'synthetic-customer@example.invalid' },
    status: 'PAID',
  };
  afterEach(() => jest.restoreAllMocks());

  it('keeps SMTP failure nonblocking and does not log provider payload/PII', async () => {
    const sendMail = jest
      .fn()
      .mockRejectedValue(
        new Error(
          'synthetic-customer@example.invalid password=synthetic-secret',
        ),
      );
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const service = new MailService(
      new SmtpEmailProvider({ sendMail } as unknown as MailerService),
      {} as ConfigService,
    );
    await expect(service.sendPaymentSuccess(order)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: order.shipping_info.email,
        template: './payment-success',
      }),
    );
    expect(log.mock.calls).toEqual([['MAIL_DELIVERY_FAILED']]);
  });

  it('retains the successful SMTP path without retrying or claiming delivered', async () => {
    const sendMail = jest.fn().mockResolvedValue({ accepted: ['fixture'] });
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const service = new MailService(
      new SmtpEmailProvider({ sendMail } as unknown as MailerService),
      {} as ConfigService,
    );
    await service.sendOrderConfirmation(order);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  describe('new order emails', () => {
    const sale = {
      ...order,
      payment_method: 'cod',
      items: [{ title: 'Fixture', quantity: 1, price: 200000 }],
      shipping_info: {
        email: 'buyer@example.invalid',
        name: 'Fixture Buyer',
      },
    };
    const context = (sendMail: jest.Mock) =>
      (sendMail.mock.calls[0] as [{ context: Record<string, unknown> }])[0]
        .context;
    const service = (sendMail: jest.Mock) =>
      new MailService(
        new SmtpEmailProvider({ sendMail } as unknown as MailerService),
        { get: () => 'shop@example.invalid' } as unknown as ConfigService,
      );

    it('shows item prices as money and names the payment method', async () => {
      const sendMail = jest.fn().mockResolvedValue({ accepted: ['fixture'] });
      await service(sendMail).sendOrderConfirmation(sale);
      const { items, payment } = context(sendMail) as {
        items: { price: string }[];
        payment: string;
      };
      expect(items[0].price).toMatch(/^200\.000/);
      expect(payment).toContain('Cash on delivery');
    });

    it('labels a store pickup as paying at the store', async () => {
      const sendMail = jest.fn().mockResolvedValue({ accepted: ['fixture'] });
      await service(sendMail).sendAdminAlert({
        ...sale,
        shipping_info: { ...sale.shipping_info, delivery_method: 'pickup' },
      });
      expect(context(sendMail).payment).toContain('Pay at the store');
    });
  });

  describe('payment review alert', () => {
    const alert = {
      orderId: 'fixture-order',
      status: 'EXPIRED',
      total: 200000,
      received: 200000,
      transactionCode: 'fixture-tx',
      reason: 'fixture reason',
    };
    const config = (address?: string) =>
      ({ get: () => address }) as unknown as ConfigService;

    it('emails the shop address and reports acceptance', async () => {
      const sendMail = jest.fn().mockResolvedValue({ accepted: ['fixture'] });
      const service = new MailService(
        new SmtpEmailProvider({ sendMail } as unknown as MailerService),
        config('shop@example.invalid'),
      );
      await expect(service.sendPaymentReviewAlert(alert)).resolves.toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'shop@example.invalid',
          template: './admin-payment-review',
        }),
      );
    });

    it('reports false when the mail server does not accept it', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const sendMail = jest.fn().mockRejectedValue(new Error('fixture'));
      const service = new MailService(
        new SmtpEmailProvider({ sendMail } as unknown as MailerService),
        config('shop@example.invalid'),
      );
      await expect(service.sendPaymentReviewAlert(alert)).resolves.toBe(false);
    });

    it('reports false and logs when no shop address is configured', async () => {
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      const sendMail = jest.fn();
      const service = new MailService(
        new SmtpEmailProvider({ sendMail } as unknown as MailerService),
        config(undefined),
      );
      await expect(service.sendPaymentReviewAlert(alert)).resolves.toBe(false);
      expect(sendMail).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('MAIL_ADMIN_ADDRESS_MISSING');
    });
  });
});
