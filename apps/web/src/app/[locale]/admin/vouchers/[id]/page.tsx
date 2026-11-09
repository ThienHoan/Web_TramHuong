'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { getVoucher, updateVoucher } from '@/lib/api-client';
import { toast } from 'sonner';
import { AdminFormLoading, AdminFormPage, useAdminText } from '@/components/admin/AdminForm';
import { emptyVoucher, voucherPayload, VoucherForm } from '@/components/admin/VoucherForm';

export default function EditVoucherPage({ params }: { params: Promise<{ id: string }> }) {
    const { t } = useAdminText();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [voucherId, setVoucherId] = useState<string | null>(null);
    const [formData, setFormData] = useState(emptyVoucher);

    const fetchVoucher = useCallback(async (id: string) => {
        try {
            const data = await getVoucher(id);
            if (!data) {
                toast.error(t('Không tìm thấy mã giảm giá', 'Discount code not found'));
                router.push('/admin/vouchers');
                return;
            }

            // Format dates
            const startDate = data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '';
            const endDate = data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '';

            setFormData({
                code: data.code,
                discount_type: data.discount_type,
                discount_amount: Number(data.discount_amount),
                min_order_value: Number(data.min_order_value),
                max_discount_amount: Number(data.max_discount_amount || 0),
                start_date: startDate,
                end_date: endDate,
                usage_limit: Number(data.usage_limit),
                is_active: data.is_active
            });
        } catch (e) {
            console.error(e);
            toast.error(t('Lỗi khi tải dữ liệu', 'Failed to load data'));
        } finally {
            setFetching(false);
        }
    }, [router, t]);

    useEffect(() => {
        params.then(p => {
            setVoucherId(p.id);
            fetchVoucher(p.id);
        });
    }, [params, fetchVoucher]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voucherId) return;

        // Validation
        if (!formData.code || !formData.start_date || !formData.end_date) {
            toast.error(t('Vui lòng điền đầy đủ các trường bắt buộc.', 'Please fill in all required fields.'));
            return;
        }

        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
            await updateVoucher(voucherId, voucherPayload(formData) as any);
            toast.success(t('Cập nhật mã giảm giá thành công!', 'Discount code updated.'));
            router.push('/admin/vouchers');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('Có lỗi xảy ra khi cập nhật.', 'Could not update the code.'));
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <AdminFormLoading />;

    return (
        <AdminFormPage
            backHref="/admin/vouchers"
            backLabel={t('Mã giảm giá', 'Discounts')}
            title={t('Sửa mã giảm giá', 'Edit discount code')}
            description={formData.code}
        >
            <VoucherForm
                value={formData}
                onChange={changes => setFormData(previous => ({ ...previous, ...changes }))}
                onSubmit={handleSubmit}
                busy={loading}
                codeLocked
                submitLabel={t('Lưu thay đổi', 'Save changes')}
                busyLabel={t('Đang lưu…', 'Saving…')}
                icon={<Save aria-hidden="true" />}
            />
        </AdminFormPage>
    );
}
