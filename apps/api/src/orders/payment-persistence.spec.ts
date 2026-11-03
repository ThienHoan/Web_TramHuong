import { Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
describe('SePay persistence and shipping lifecycle regression', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  let service: OrdersService,
    update: jest.Mock,
    mail: jest.Mock,
    confirmation: { data: unknown; error: unknown };
  let status: string;
  beforeEach(() => {
    status = 'AWAITING_PAYMENT';
    confirmation = { data: { id }, error: null };
    mail = jest.fn().mockResolvedValue(undefined);
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
      } as unknown as MailService,
      {} as VouchersService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
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
});
