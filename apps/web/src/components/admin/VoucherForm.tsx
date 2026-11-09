'use client';

import type { FormEvent, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminCheck, AdminField, AdminForm, AdminFormActions, AdminFormSection, useAdminText } from '@/components/admin/AdminForm';

export const emptyVoucher = {
    code: '',
    discount_type: 'PERCENTAGE', // PERCENTAGE | FIXED_AMOUNT
    discount_amount: 0,
    min_order_value: 0,
    max_discount_amount: 0,
    start_date: '',
    end_date: '',
    usage_limit: 100,
    is_active: true,
};
export type VoucherDraft = typeof emptyVoucher;

export const voucherPayload = (value: VoucherDraft) => ({
    ...value,
    code: value.code.toUpperCase(),
    max_discount_amount: value.discount_type === 'PERCENTAGE' ? value.max_discount_amount : undefined,
});

export function VoucherForm({ value, onChange, onSubmit, busy, codeLocked, submitLabel, busyLabel, icon }: {
    value: VoucherDraft;
    onChange: (changes: Partial<VoucherDraft>) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    busy: boolean;
    codeLocked?: boolean;
    submitLabel: string;
    busyLabel: string;
    icon?: ReactNode;
}) {
    const { t } = useAdminText();
    const percentage = value.discount_type === 'PERCENTAGE';
    const number = (key: keyof VoucherDraft) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [key]: Number(e.target.value) });

    return (
        <AdminForm
            onSubmit={onSubmit}
            busy={busy}
            actions={<AdminFormActions
                cancelHref="/admin/vouchers"
                note={t('Kiểm tra điều kiện và thời gian trước khi lưu mã.', 'Review the conditions and dates before saving the code.')}
                submitLabel={submitLabel}
                busyLabel={busyLabel}
                busy={busy}
                icon={icon}
            />}
            side={<>
                <AdminFormSection id="voucher-period" title={t('Thời gian hiệu lực', 'Validity period')}>
                    <AdminField id="voucher-start" label={t('Ngày bắt đầu', 'Start date')} required><Input id="voucher-start" name="start_date" type="date" required value={value.start_date} onChange={e => onChange({ start_date: e.target.value })} /></AdminField>
                    <AdminField id="voucher-end" label={t('Ngày kết thúc', 'End date')} required><Input id="voucher-end" name="end_date" type="date" required value={value.end_date} onChange={e => onChange({ end_date: e.target.value })} /></AdminField>
                </AdminFormSection>
                <AdminFormSection id="voucher-status" title={t('Trạng thái', 'Status')}>
                    <AdminCheck id="voucher-active" label={t('Cho phép sử dụng', 'Allow use')} hint={t('Bỏ chọn để tạm dừng mã mà không xóa.', 'Clear this to pause the code without deleting it.')} checked={value.is_active} onChange={e => onChange({ is_active: e.target.checked })} />
                </AdminFormSection>
            </>}
        >
            <AdminFormSection id="voucher-basics" title={t('Thông tin mã', 'Code details')}>
                <AdminField
                    id="voucher-code"
                    label={t('Mã giảm giá', 'Discount code')}
                    required
                    hint={codeLocked
                        ? t('Không thể thay đổi mã sau khi tạo.', 'The code cannot be changed after creation.')
                        : t('Mã sẽ được tự động chuyển thành in hoa. Không chứa khoảng trắng.', 'Codes are converted to uppercase. Spaces are not allowed.')}
                >
                    <Input id="voucher-code" name="code" required readOnly={codeLocked} aria-describedby="voucher-code-hint" className="uppercase font-mono" placeholder={t('VD: SUMMER2024', 'e.g. SUMMER2024')} value={value.code} onChange={e => onChange({ code: e.target.value })} />
                </AdminField>
                <div className="admin-form-row">
                    <AdminField id="voucher-type" label={t('Loại giảm giá', 'Discount type')}>
                        <Select value={value.discount_type} onValueChange={discount_type => onChange({ discount_type })} disabled={busy}>
                            <SelectTrigger id="voucher-type"><SelectValue /></SelectTrigger>
                            <SelectContent className="admin-menu">
                                <SelectItem value="PERCENTAGE">{t('Phần trăm (%)', 'Percentage (%)')}</SelectItem>
                                <SelectItem value="FIXED_AMOUNT">{t('Số tiền cố định (VND)', 'Fixed amount (VND)')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdminField>
                    <AdminField id="voucher-amount" label={percentage ? t('Giá trị (%)', 'Value (%)') : t('Số tiền giảm (VND)', 'Amount off (VND)')} required>
                        <Input id="voucher-amount" name="discount_amount" type="number" min="0" required value={value.discount_amount} onChange={number('discount_amount')} />
                    </AdminField>
                </div>
            </AdminFormSection>
            <AdminFormSection id="voucher-conditions" title={t('Điều kiện áp dụng', 'Conditions')}>
                <div className="admin-form-row">
                    <AdminField id="voucher-min-order" label={t('Đơn hàng tối thiểu (VND)', 'Minimum order (VND)')}><Input id="voucher-min-order" name="min_order_value" type="number" min="0" value={value.min_order_value} onChange={number('min_order_value')} /></AdminField>
                    <AdminField id="voucher-usage" label={t('Số lượt dùng', 'Usage limit')}><Input id="voucher-usage" name="usage_limit" type="number" min="1" value={value.usage_limit} onChange={number('usage_limit')} /></AdminField>
                    {percentage && <AdminField id="voucher-max" label={t('Mức giảm tối đa (VND)', 'Maximum discount (VND)')} hint={t('Để 0 nếu không giới hạn.', 'Use 0 for no limit.')}><Input id="voucher-max" name="max_discount_amount" type="number" min="0" value={value.max_discount_amount} onChange={number('max_discount_amount')} /></AdminField>}
                </div>
            </AdminFormSection>
        </AdminForm>
    );
}
