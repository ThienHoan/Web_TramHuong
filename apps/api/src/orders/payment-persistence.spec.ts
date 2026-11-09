import { Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { OrdersController } from './orders.controller';
import type { Request as ExpressRequest } from 'express';
describe('SePay persistence and shipping lifecycle regression', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  let service: OrdersService,
    update: jest.Mock,
    mail: jest.Mock,
    review: jest.Mock,
    confirmation: { data: unknown; error: unknown };
  let status: string;
  beforeEach(() => {
    status = 'AWAITING_PAYMENT';
    confirmation = { data: { id }, error: null };
    mail = jest.fn().mockResolvedValue(undefined);
    review = jest.fn().mockResolvedValue(true);
    update = jest.fn().mockImplementation(() => {
      const q = {
        eq: () => q,
        select: () => ({ maybeSingle: () => Promise.resolve(confirmation) }),
      };
      return q;
    });
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id,
                  total: 200000,
                  status,
                  payment_status: 'pending',
                  user_id: null,
                  shipping_info: { email: 'fixture@example.invalid' },
                },
                error: null,
              }),
            maybeSingle: () =>
              Promise.resolve({
                data: { payment_status: 'paid' },
                error: null,
              }),
          }),
        }),
        update,
      }),
    };
    service = new OrdersService(
      { getClient: () => db } as unknown as SupabaseService,
      {} as CartService,
      {
        sendPaymentSuccess: mail,
        sendAdminAlert: mail,
        sendPaymentReviewAlert: review,
      } as unknown as MailService,
      {} as VouchersService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it('does not acknowledge failed database writes or send success emails', async () => {
    confirmation = {
      data: null,
      error: { message: 'fixture database failure' },
    };
    expect(await service.verifyPayment(id, 200000, 'fixture-tx')).toMatchObject(
      { success: false },
    );
    expect(mail).not.toHaveBeenCalled();
  });
  it('preserves SHIPPED commercial status when a late online payment arrives', async () => {
    status = 'SHIPPED';
    expect(await service.verifyPayment(id, 200000, 'fixture-tx')).toMatchObject(
      { success: true },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SHIPPED', payment_status: 'paid' }),
    );
  });
  it('does not revive cancelled orders or underpaid orders', async () => {
    status = 'CANCELED';
    expect(await service.verifyPayment(id, 200000, 'fixture-tx')).toMatchObject(
      { success: false },
    );
    expect(update).not.toHaveBeenCalled();
    status = 'AWAITING_PAYMENT';
    expect(await service.verifyPayment(id, 1, 'fixture-tx')).toMatchObject({
      success: false,
    });
    expect(update).not.toHaveBeenCalled();
  });
  it('acknowledges a concurrent successful payment without sending duplicate mail', async () => {
    confirmation = { data: null, error: null };
    expect(await service.verifyPayment(id, 200000, 'fixture-tx')).toMatchObject(
      { success: true },
    );
    expect(mail).not.toHaveBeenCalled();
  });
  it('alerts the shop once per SePay transaction when the order already expired', async () => {
    status = 'EXPIRED';
    await service.verifyPayment(id, 200000, 'fixture-tx');
    await service.verifyPayment(id, 200000, 'fixture-tx');
    expect(review).toHaveBeenCalledTimes(1);
    expect(review).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: id,
        status: 'EXPIRED',
        total: 200000,
        received: 200000,
        transactionCode: 'fixture-tx',
      }),
    );
    expect(update).not.toHaveBeenCalled();
    await service.verifyPayment(id, 200000, 'fixture-tx-2');
    expect(review).toHaveBeenCalledTimes(2);
  });
  it('alerts the shop when the transfer is smaller than the order total', async () => {
    await service.verifyPayment(id, 1, 'fixture-tx');
    expect(review).toHaveBeenCalledWith(
      expect.objectContaining({ received: 1, total: 200000 }),
    );
  });
  it('lets a SePay retry send the alert again when the email was not accepted', async () => {
    status = 'EXPIRED';
    review.mockResolvedValueOnce(false);
    await service.verifyPayment(id, 200000, 'fixture-tx');
    await new Promise((resolve) => setImmediate(resolve));
    await service.verifyPayment(id, 200000, 'fixture-tx');
    expect(review).toHaveBeenCalledTimes(2);
  });
  it('does not alert the shop about a normal payment', async () => {
    await service.verifyPayment(id, 200000, 'fixture-tx');
    expect(review).not.toHaveBeenCalled();
  });

  describe('webhook transfer direction', () => {
    const payload = { id: 1, content: id, transferAmount: 200000 };
    const request = {
      headers: { authorization: 'Apikey fixture-key' },
    } as unknown as ExpressRequest;
    let verifyPayment: jest.Mock;
    let controller: OrdersController;
    beforeEach(() => {
      process.env.SEPAY_API_KEY = 'fixture-key';
      verifyPayment = jest.fn().mockResolvedValue({ success: true });
      controller = new OrdersController({
        verifyPayment,
      } as unknown as OrdersService);
    });
    afterEach(() => {
      delete process.env.SEPAY_API_KEY;
    });
    it('applies incoming transfers to the order', async () => {
      await controller.sepayWebhook(
        { ...payload, transferType: 'in' },
        request,
      );
      expect(verifyPayment).toHaveBeenCalledWith(id, 200000, '1');
    });
    it.each(['out', undefined])(
      'acknowledges but never applies transferType %s',
      async (transferType) => {
        await expect(
          controller.sepayWebhook({ ...payload, transferType }, request),
        ).resolves.toMatchObject({ success: true });
        expect(verifyPayment).not.toHaveBeenCalled();
      },
    );
  });
});
