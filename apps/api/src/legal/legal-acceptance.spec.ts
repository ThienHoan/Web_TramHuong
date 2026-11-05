import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  LEGAL_POLICY_VERSION,
  LegalAcceptanceDto,
  legalReceipt,
} from './legal-acceptance';
import { ContactsController } from '../contacts/contacts.controller';
import { ContactsService } from '../contacts/contacts.service';
import type { ContactProtectionService } from '../integrations/contact-protection.service';
import type { SupabaseService } from '../supabase/supabase.service';
import { OrdersController } from '../orders/orders.controller';
import type { OrdersService } from '../orders/orders.service';
import type { CreateOrderDto } from '../orders/dto/create-order.dto';

const accepted = { accepted: true as const, version: LEGAL_POLICY_VERSION };
const contact = {
  full_name: 'Test User',
  email: 'test@example.invalid',
  message: 'Synthetic contact message',
};
const config = (enabled: boolean) =>
  new ConfigService({ LEGAL_CONSENT_ENFORCED: String(enabled) });
function database(error: unknown = null) {
  const insert = jest.fn().mockResolvedValue({ error });
  return {
    insert,
    db: {
      getClient: () => ({ from: () => ({ insert }) }),
    } as unknown as SupabaseService,
  };
}

describe('legal acceptance rollout without network or hosted writes', () => {
  it('records server time, exact policy and purpose, never caller timestamps', () => {
    const receipt = legalReceipt(
      {
        ...accepted,
        recorded_at: 'forged',
        ip: 'private',
      } as LegalAcceptanceDto,
      'contact_response',
      true,
      () => new Date('2026-11-06T01:00:00Z'),
    );
    expect(receipt).toEqual({
      ...accepted,
      purpose: 'contact_response',
      recorded_at: '2026-11-06T01:00:00.000Z',
    });
  });
  it('requires acceptance only after explicit rollout', () => {
    expect(() => legalReceipt(undefined, 'contact_response', true)).toThrow(
      'LEGAL_ACCEPTANCE_REQUIRED',
    );
    expect(() =>
      legalReceipt(null as unknown as undefined, 'contact_response', true),
    ).toThrow('LEGAL_ACCEPTANCE_REQUIRED');
    expect(legalReceipt(undefined, 'contact_response', false)).toBeUndefined();
  });
  it.each([
    { accepted: false, version: LEGAL_POLICY_VERSION },
    { accepted: true, version: 'old' },
    { accepted: 'true', version: LEGAL_POLICY_VERSION },
  ])('rejects invalid acceptance during compatibility rollout: %j', (value) => {
    expect(() =>
      legalReceipt(value as LegalAcceptanceDto, 'contact_response', false),
    ).toThrow('LEGAL_ACCEPTANCE_INVALID');
  });
  it('rejects extra metadata through DTO validation', async () => {
    const errors = await validate(
      plainToInstance(LegalAcceptanceDto, {
        ...accepted,
        recorded_at: 'forged',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.map((error) => error.property)).toContain('recorded_at');
    expect(
      await validate(plainToInstance(LegalAcceptanceDto, accepted)),
    ).toEqual([]);
  });
  it('rejects before Turnstile or persistence when consent is required', async () => {
    const create = jest.fn(),
      verify = jest.fn();
    const controller = new ContactsController(
      { create } as unknown as ContactsService,
      { verify } as unknown as ContactProtectionService,
      config(true),
    );
    await expect(controller.create(contact)).rejects.toThrow(
      'LEGAL_ACCEPTANCE_REQUIRED',
    );
    expect(verify).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it('inserts receipt atomically with the contact after rollout', async () => {
    const { insert, db } = database();
    const service = new ContactsService(db, config(true));
    const controller = new ContactsController(
      service,
      { verify: jest.fn() } as unknown as ContactProtectionService,
      config(true),
    );
    await controller.create({ ...contact, legalAcceptance: accepted });
    expect(insert).toHaveBeenCalledTimes(1);
    expect((insert.mock.calls[0] as unknown[])[0]).toMatchObject({
      ...contact,
      legal_acceptance: {
        ...accepted,
        purpose: 'contact_response',
        recorded_at: expect.any(String) as unknown,
      },
    });
    expect((insert.mock.calls[0] as unknown[])[0]).not.toHaveProperty(
      'legalAcceptance',
    );
  });
  it('preserves the original contact schema before migration', async () => {
    const { insert, db } = database();
    await new ContactsService(db, config(false)).create(contact);
    expect((insert.mock.calls[0] as unknown[])[0]).not.toHaveProperty(
      'legal_acceptance',
    );
  });
  it('never reports successful consent persistence when DB fails', async () => {
    const { db } = database({ message: 'private provider error' });
    await expect(
      new ContactsService(db, config(true)).create({
        ...contact,
        legal_acceptance: legalReceipt(accepted, 'contact_response', true),
      }),
    ).rejects.toThrow('Could not save contact message');
  });
  it('carries a receipt in the existing order snapshot', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'synthetic-order' });
    const controller = new OrdersController(
      { create } as unknown as OrdersService,
      config(true),
    );
    const body = {
      items: [{ productId: 'synthetic-product', quantity: 1 }],
      shipping_info: {
        name: 'Test',
        phone: '0000000000',
        address: 'Test',
        city: 'Test',
      },
      paymentMethod: 'cod',
      legalAcceptance: accepted,
    } as CreateOrderDto;
    const request = { user: null } as unknown as Parameters<
      OrdersController['create']
    >[0];
    await controller.create(request, body);
    expect((create.mock.calls[0] as unknown[])[2]).toMatchObject({
      legal_acceptance: {
        ...accepted,
        purpose: 'order_fulfilment_and_terms',
        recorded_at: expect.any(String) as unknown,
      },
    });
    await expect(
      controller.create(request, { ...body, legalAcceptance: undefined }),
    ).rejects.toThrow('LEGAL_ACCEPTANCE_REQUIRED');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
