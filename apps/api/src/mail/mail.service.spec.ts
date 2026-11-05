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
});
