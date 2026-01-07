import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { Logger } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;

  // Mock dependencies
  const mockSupabaseService = {
    getClient: jest.fn(),
  };
  const mockCartService = {};
  const mockMailService = {};
  const mockVouchersService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: CartService, useValue: mockCartService },
        { provide: MailService, useValue: mockMailService },
        { provide: VouchersService, useValue: mockVouchersService },
        Logger,
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeVietnamesePhone', () => {
    // Access private method using 'any' casting for testing
    const normalize = (phone: any) =>
      (service as any).normalizeVietnamesePhone(phone);

    it('should handle null or undefined', () => {
      expect(normalize(null)).toBe('');
      expect(normalize(undefined)).toBe('');
    });

    it('should handle numbers', () => {
      expect(normalize(356176878)).toBe('+84356176878');
      expect(normalize(84356176878)).toBe('+84356176878');
    });

    it('should normalize standard Vietnamese zero-prefix numbers', () => {
      expect(normalize('0356176878')).toBe('+84356176878');
      expect(normalize('0909123456')).toBe('+84909123456');
    });

    it('should normalize 84 prefix without plus', () => {
      expect(normalize('84356176878')).toBe('+84356176878');
      expect(normalize('84909123456')).toBe('+84909123456');
    });

    it('should keep +84 prefix as is', () => {
      expect(normalize('+84356176878')).toBe('+84356176878');
    });

    it('should handle basic formatting characters (spaces, dashes, parens)', () => {
      expect(normalize('0356-176-878')).toBe('+84356176878');
      expect(normalize('(0356) 176 878')).toBe('+84356176878');
      expect(normalize('+84 356 176 878')).toBe('+84356176878');
    });

    it('should return raw input if not matching Vietnamese pattern', () => {
      expect(normalize('123')).toBe('123'); // Too short
      expect(normalize('abcdef')).toBe('abcdef');
      expect(normalize('+1234567890')).toBe('+1234567890'); // Non-84 country code
    });

    it('should handle numbers with whitespace', () => {
      // Though TS doesn't allow number to have whitespace, runtime might pass number-like strings
      expect(normalize('  0909 123 456  ')).toBe('+84909123456');
    });
  });
});
