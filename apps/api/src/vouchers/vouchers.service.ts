import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

// export interface VoucherRecord {
//   id: string;
//   code: string;
//   // ...
// }
type VoucherRow = Database['public']['Tables']['vouchers']['Row'];

export interface VoucherWithAlias extends VoucherRow {
  discount_amount: number;
}

import { Database } from '../common/types/database.types';

@Injectable()
export class VouchersService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  // 1. Admin: Create Voucher
  async createVoucher(data: CreateVoucherDto): Promise<VoucherRow> {
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
        discount_amount: discountValue,
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
    return voucher;
  }

  // 2. Admin: List Vouchers
  async listVouchers(): Promise<VoucherWithAlias[]> {
    const query = this.supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const mappedData = (data as VoucherRow[]).map(
      (v: VoucherRow): VoucherWithAlias => ({
        ...v,
        discount_amount: v.discount_amount,
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

    const voucher = data;
    return {
      ...voucher,
      discount_amount: voucher.discount_amount,
    };
  }

  // 3. Admin: Update Voucher (e.g. deactivate)
  async updateVoucher(
    id: string,
    updates: UpdateVoucherDto,
  ): Promise<VoucherWithAlias> {
    // Map discount_amount -> discount_value if present
    const updateData: Record<string, unknown> = { ...updates };
    // if (updates.discount_amount !== undefined) {
    //   updateData.discount_amount = updates.discount_amount;
    // }

    const { data, error } = await this.supabase
      .from('vouchers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    const voucher = data;
    return { ...voucher, discount_amount: voucher.discount_amount };
  }

  // 4. Validate Voucher (Core Logic)
  async validateVoucher(
    code: string,
    cartTotal: number,
  ): Promise<{
    isValid: boolean;
    discountAmount: number;
    voucher?: VoucherRow;
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

    const v = voucher;
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

    // safe normalization and casting
    const type = v.discount_type
      ? v.discount_type.toUpperCase()
      : 'FIXED_AMOUNT';
    // Fix: DB returns 'discount_value', code matched 'discount_amount'.
    // Use coalesce to handle both potential schema variants.
    // @ts-expect-error - DB schema uses discount_value but type may reference discount_amount
    let amount = Number(v.discount_value ?? v.discount_amount);
    if (Number.isNaN(amount)) amount = 0;

    let total = Number(cartTotal);
    if (Number.isNaN(total)) total = 0;

    console.log(
      `[VoucherCalc] Code=${normalizedCode} Type=${type} Amount=${amount} Total=${total}`,
    );
    console.log(`[VoucherCalc] Dump:`, JSON.stringify(v));

    if (type === 'PERCENTAGE') {
      const rawDiscount = (total * amount) / 100;
      // Apply Max Cap if exists
      if (v.max_discount_amount) {
        let maxCap = Number(v.max_discount_amount);
        if (Number.isNaN(maxCap)) maxCap = Infinity;
        // If maxCap is 0 in DB it might mean no limit?
        // Usually 0 means 0 limit, but let's check input logic.
        // Frontend sends 0 if no limit? API create sets max_discount_amount || null.
        // So strict check:
        if (v.max_discount_amount !== null && maxCap > 0) {
          discount = Math.min(rawDiscount, maxCap);
        } else {
          discount = rawDiscount;
        }
      } else {
        discount = rawDiscount;
      }
    } else {
      // FIXED_AMOUNT
      discount = amount;
    }

    // Final Safety Cap: Discount cannot exceed cart total
    discount = Math.min(discount, total);

    return {
      isValid: true,
      discountAmount: discount,
      voucher: v,
      message: 'Áp dụng mã thành công',
    };
  }
}
