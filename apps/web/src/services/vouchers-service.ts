import { getHeaders, API_URL } from './base-http';

export interface CreateVoucherDto {
    code: string;
    discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discount_amount: number;
    min_order_value: number;
    max_discount_amount?: number;
    start_date: string;
    end_date: string;
    usage_limit: number;
    is_active: boolean;
}

export type UpdateVoucherDto = Partial<CreateVoucherDto>;

export interface Voucher extends CreateVoucherDto {
    id: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

export interface VoucherValidation {
    valid: boolean;
    isValid?: boolean; // API alias
    discount: number;
    discountAmount?: number; // Added for checkout page compatibility
    message?: string;
    voucher?: {
        id: string;
        code: string;
        discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discount_value: number;
        usage_count: number;
        [key: string]: unknown;
    };
}

export const vouchersService = {
    async getVouchers(query?: Record<string, string>): Promise<Voucher[]> {
        try {
            const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
            const res = await fetch(`${API_URL}/vouchers${queryString}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                // Return empty if fail or throw?
                return [];
            }
            return await res.json() as Voucher[];
        } catch (e) {
            console.error("Get Vouchers Error:", e);
            throw e;
        }
    },

    async getVoucher(id: string): Promise<Voucher | null> {
        try {
            const res = await fetch(`${API_URL}/vouchers/${id}`, {
                headers: getHeaders(),
            });
            if (!res.ok) return null;
            return await res.json() as Voucher;
        } catch (e) {
            console.error("Get Voucher Error:", e);
            throw e;
        }
    },

    async createVoucher(data: CreateVoucherDto): Promise<Voucher> {
        try {
            const res = await fetch(`${API_URL}/vouchers`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json() as { message?: string };
                throw new Error(err.message || 'Failed to create voucher');
            }
            return await res.json() as Voucher;
        } catch (e) {
            console.error("Create Voucher Error:", e);
            throw e;
        }
    },

    async updateVoucher(id: string, data: UpdateVoucherDto): Promise<Voucher> {
        try {
            const res = await fetch(`${API_URL}/vouchers/${id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json() as { message?: string };
                throw new Error(err.message || 'Failed to update voucher');
            }
            return await res.json() as Voucher;
        } catch (e) {
            console.error("Update Voucher Error:", e);
            throw e;
        }
    },

    async deleteVoucher(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/vouchers/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) {
                throw new Error('Failed to delete voucher');
            }
            return true;
        } catch (e) {
            console.error("Delete Voucher Error:", e);
            throw e;
        }
    },

    async validateVoucher(code: string, cartTotal: number): Promise<VoucherValidation> {
        try {
            const res = await fetch(`${API_URL}/vouchers/validate`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ code, cartTotal }),
            });
            const data = await res.json() as VoucherValidation & { message?: string };

            if (!res.ok) {
                throw new Error(data.message || 'Mã giảm giá không hợp lệ');
            }
            return data;
        } catch (e) {
            console.error("Validate Voucher Error:", e);
            throw e;
        }
    }
};
