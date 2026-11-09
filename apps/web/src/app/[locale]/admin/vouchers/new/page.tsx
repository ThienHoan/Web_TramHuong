'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { createVoucher } from '@/lib/api-client';
import { toast } from 'sonner';
import { AdminFormPage, useAdminText } from '@/components/admin/AdminForm';
import { emptyVoucher, voucherPayload, VoucherForm } from '@/components/admin/VoucherForm';

export default function NewVoucherPage() {
    const { t } = useAdminText();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ ...emptyVoucher, start_date: new Date().toISOString().split('T')[0] });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.code || !formData.start_date || !formData.end_date) {
            toast.error(t('Vui lòng điền đầy đủ các trường bắt buộc.', 'Please fill in all required fields.'));
            return;
        }

        if (formData.code.includes(' ')) {
            toast.error(t('Mã giảm giá không được chứa khoảng trắng.', 'Discount codes cannot contain spaces.'));
            return;
        }

        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
            await createVoucher(voucherPayload(formData) as any);
            toast.success(t('Tạo mã giảm giá thành công!', 'Discount code created.'));
            router.push('/admin/vouchers');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('Có lỗi xảy ra khi tạo mã.', 'Could not create the code.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminFormPage
            backHref="/admin/vouchers"
            backLabel={t('Mã giảm giá', 'Discounts')}
            title={t('Tạo mã giảm giá', 'Add discount code')}
            description={t('Thiết lập mức giảm, điều kiện và thời gian áp dụng.', 'Set the discount, conditions and validity period.')}
        >
            <VoucherForm
                value={formData}
                onChange={changes => setFormData(previous => ({ ...previous, ...changes }))}
                onSubmit={handleSubmit}
                busy={loading}
                submitLabel={t('Tạo mã giảm giá', 'Create code')}
                busyLabel={t('Đang tạo…', 'Creating…')}
                icon={<Plus aria-hidden="true" />}
            />
        </AdminFormPage>
    );
}
