'use client';

import { refreshCatalog } from '@/app/actions/catalog';
import { API_URL } from "@/services/base-http";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';
import { AdminFormPage, useAdminText } from '@/components/admin/AdminForm';
import { categoryPayload, CategoryForm, emptyCategory } from '@/components/admin/CategoryForm';

export default function NewCategoryPage() {
    const { t } = useAdminText();
    const { session } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [draft, setDraft] = useState(emptyCategory);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryPayload(draft))
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || t('Không thể tạo danh mục', 'Could not create category'));
            }

            await refreshCatalog().catch(() => undefined);
            toast.success(t('Đã tạo danh mục', 'Category created'));
            router.push('/admin/categories');
            router.refresh();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('Đã có lỗi xảy ra', 'An error occurred'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminFormPage
            backHref="/admin/categories"
            backLabel={t('Danh mục', 'Categories')}
            title={t('Thêm danh mục', 'Add category')}
            description={t('Tạo nhóm sản phẩm mới cho cửa hàng.', 'Create a new product group for your store.')}
        >
            <CategoryForm
                value={draft}
                onChange={changes => setDraft(previous => ({ ...previous, ...changes }))}
                onSubmit={handleSubmit}
                busy={submitting}
                submitLabel={t('Tạo danh mục', 'Create category')}
                busyLabel={t('Đang tạo…', 'Creating…')}
                icon={<Plus aria-hidden="true" />}
            />
        </AdminFormPage>
    );
}
