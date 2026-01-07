import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

@Injectable()
export class VouchersService {
    constructor(
        @Inject('SUPABASE_CLIENT')
        private readonly supabase: SupabaseClient,
    ) { }

    // 1. Admin: Create Voucher
    // Note: In real production, use DTOs. For now, using loose types for MVP speed.
    async createVoucher(data: CreateVoucherDto) {
        // Validation handled by database constraints mostly, but good to check basic enums
        // Map frontend 'discount_amount' to DB 'discount_value'
        const discountValue = data.discount_value ?? data.discount_amount;

        const { code, discount_type, min_order_value, max_discount_amount, start_date, end_date, usage_limit } = data;

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
            throw new BadRequestException('Failed to create voucher: ' + error.message);
        }
        return voucher;
    }

    // 2. Admin: List Vouchers
    async listVouchers(filters: any = {}) {
        let query = this.supabase.from('vouchers').select('*').order('created_at', { ascending: false });

        // Simple filtering if needed
        // if (filters.active) query = query.eq('is_active', true);

        const { data, error } = await query;
        if (error) throw new BadRequestException(error.message);

        // Map DB 'discount_value' back to 'discount_amount' for frontend consistency if needed
        // But frontend likely reads 'discount_value' if we don't map it back. 
        // Let's keep it as is, frontend can read 'discount_value' if strictly typed or we map it here.
        // To be safe and minimal change, let's Map it in response OR update Frontend to read discount_value.
        // Actually, frontend 'vouchers/page.tsx' reads 'discount_amount' (line 155 in previous view).
        // Checks: `voucher.discount_amount`
        // So I MUST map it back on list/get as well OR update Frontend.
        // Updating Backend is centralized.

        const mappedData = data?.map((v: any) => ({
            ...v,
            discount_amount: v.discount_value
        }));

        return mappedData;
    }

    // 2.5 Admin: Get One
    async getVoucher(id: string) {
        const { data, error } = await this.supabase
            .from('vouchers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new NotFoundException('Voucher not found');

        return {
            ...data,
            discount_amount: data.discount_value
        };
    }

    // 3. Admin: Update Voucher (e.g. deactivate)
    async updateVoucher(id: string, updates: UpdateVoucherDto) {
        // Map discount_amount -> discount_value if present
        if (updates.discount_amount !== undefined) {
            updates.discount_value = updates.discount_amount;
            delete updates.discount_amount;
        }

        const { data, error } = await this.supabase
            .from('vouchers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return { ...data, discount_amount: data.discount_value };
    }

    // 4. Validate Voucher (Core Logic)
    async validateVoucher(code: string, cartTotal: number): Promise<{
        isValid: boolean;
        discountAmount: number;
        voucher?: any;
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

        const now = new Date();

        // a. Active Check
        if (!voucher.is_active) {
            throw new BadRequestException('Mã giảm giá đã bị khóa');
        }

        // b. Date Range Check
        if (new Date(voucher.start_date) > now) {
            throw new BadRequestException('Mã giảm giá chưa đến đợt sử dụng');
        }
        if (new Date(voucher.end_date) < now) {
            throw new BadRequestException('Mã giảm giá đã hết hạn');
        }

        // c. Minimum Order Value Check
        if (cartTotal < voucher.min_order_value) {
            const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
            throw new BadRequestException(`Đơn hàng phải từ ${formatter.format(voucher.min_order_value)} để sử dụng mã này`);
        }

        // d. Usage Limit Check
        // Note: usage_limit === null means unlimited
        if (voucher.usage_limit !== null && voucher.usage_count >= voucher.usage_limit) {
            throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
        }

        // e. Calculation
        let discount = 0;
        if (voucher.discount_type === 'PERCENTAGE') {
            const rawDiscount = (cartTotal * voucher.discount_value) / 100;
            // Apply Max Cap if exists
            if (voucher.max_discount_amount) {
                discount = Math.min(rawDiscount, voucher.max_discount_amount);
            } else {
                discount = rawDiscount;
            }
        } else {
            // FIXED_AMOUNT
            discount = voucher.discount_value;
        }

        // Final Safety Cap: Discount cannot exceed cart total
        discount = Math.min(discount, cartTotal);

        return {
            isValid: true,
            discountAmount: discount,
            voucher,
            message: 'Áp dụng mã thành công'
        };
    }
}
