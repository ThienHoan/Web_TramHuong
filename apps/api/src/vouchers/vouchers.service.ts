import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

export interface VoucherRecord {
  id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoucherWithAlias extends VoucherRecord {
  discount_amount: number;
}

@Injectable()
export class VouchersService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  // 1. Admin: Create Voucher
  async createVoucher(data: CreateVoucherDto): Promise<VoucherRecord> {
    // Map frontend 'discount_amount' to DB 'discount_value'
    const discountValue = data.discount_value ?? data.discount_amount;

    const {
      code,
      discount_type,
      min_order_value,
      max_discount_amount,
      start_date,
      end_date,
      usage_limit,
    } = data;

    const { data: voucher, error } = await this.supabase
      .from('vouchers')
      .insert({
        code: code.trim().toUpperCase(),
        description: data.description,
        discount_type,
        discount_value: discountValue,
        min_order_value: min_order_value || 0,
        max_discount_amount: max_discount_amount || null,
        start_date,
        end_date,
        usage_limit: usage_limit || null,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        'Failed to create voucher: ' + error.message,
      );
    }
    return voucher as VoucherRecord;
  }

  // 2. Admin: List Vouchers
  async listVouchers(): Promise<VoucherWithAlias[]> {
    const query = this.supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const mappedData = (data as VoucherRecord[]).map(
      (v: VoucherRecord): VoucherWithAlias => ({
        ...v,
        discount_amount: v.discount_value,
      }),
    );

    return mappedData;
  }

  // 2.5 Admin: Get One
  async getVoucher(id: string): Promise<VoucherWithAlias> {
    const { data, error } = await this.supabase
      .from('vouchers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Voucher not found');

    const voucher = data as VoucherRecord;
    return {
      ...voucher,
      discount_amount: voucher.discount_value,
    };
  }

  // 3. Admin: Update Voucher (e.g. deactivate)
  async updateVoucher(
    id: string,
    updates: UpdateVoucherDto,
  ): Promise<VoucherWithAlias> {
    // Map discount_amount -> discount_value if present
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.discount_amount !== undefined) {
      updateData.discount_value = updates.discount_amount;
      delete updateData.discount_amount;
    }

    const { data, error } = await this.supabase
      .from('vouchers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    const voucher = data as VoucherRecord;
    return { ...voucher, discount_amount: voucher.discount_value };
  }

  // 4. Validate Voucher (Core Logic)
  async validateVoucher(
    code: string,
    cartTotal: number,
  ): Promise<{
    isValid: boolean;
    discountAmount: number;
    voucher?: VoucherRecord;
    message?: string;
  }> {
    const normalizedCode = code.trim().toUpperCase();

    const { data: voucher, error } = await this.supabase
      .from('vouchers')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (error || !voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    const v = voucher as VoucherRecord;
    const now = new Date();

    // a. Active Check
    if (!v.is_active) {
      throw new BadRequestException('Mã giảm giá đã bị khóa');
    }

    // b. Date Range Check
    if (new Date(v.start_date) > now) {
      throw new BadRequestException('Mã giảm giá chưa đến đợt sử dụng');
    }
    if (new Date(v.end_date) < now) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }

    // c. Minimum Order Value Check
    if (cartTotal < v.min_order_value) {
      const formatter = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      });
      throw new BadRequestException(
        `Đơn hàng phải từ ${formatter.format(v.min_order_value)} để sử dụng mã này`,
      );
    }

    // d. Usage Limit Check
    if (
      v.usage_limit !== null &&
      v.usage_limit !== undefined &&
      v.usage_count >= v.usage_limit
    ) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    // e. Calculation
    let discount = 0;
    if (v.discount_type === 'PERCENTAGE') {
      const rawDiscount = (cartTotal * v.discount_value) / 100;
      // Apply Max Cap if exists
      if (v.max_discount_amount) {
        discount = Math.min(rawDiscount, v.max_discount_amount);
      } else {
        discount = rawDiscount;
      }
    } else {
      // FIXED_AMOUNT
      discount = v.discount_value;
    }

    // Final Safety Cap: Discount cannot exceed cart total
    discount = Math.min(discount, cartTotal);

    return {
      isValid: true,
      discountAmount: discount,
      voucher: v,
      message: 'Áp dụng mã thành công',
    };
  }
}
