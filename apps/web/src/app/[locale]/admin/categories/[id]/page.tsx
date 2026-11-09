'use client';

import { refreshCatalog } from '@/app/actions/catalog';
import { API_URL } from "@/services/base-http";

import { useEffect, useState, use } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';
import { CategoryTranslation } from '@/lib/types';
import { AdminFormLoading, AdminFormPage, useAdminText } from '@/components/admin/AdminForm';
import { categoryPayload, CategoryForm, emptyCategory } from '@/components/admin/CategoryForm';

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useAdminText();
    const { session } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [draft, setDraft] = useState(emptyCategory);

    useEffect(() => {
        if (session && id) {
            fetch(`${API_URL}/categories/${id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
                .then(res => res.json())
                .then(data => {
                    const en = data.translations?.find((item: CategoryTranslation) => item.locale === 'en');
                    const vi = data.translations?.find((item: CategoryTranslation) => item.locale === 'vi');
                    setDraft({
                        slug: data.slug,
                        isActive: data.is_active,
                        nameEn: en?.name || '',
                        descEn: en?.description || '',
                        nameVi: vi?.name || '',
                        descVi: vi?.description || '',
                    });
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    toast.error(t('Không thể tải danh mục', 'Failed to load category'));
                    router.push('/admin/categories');
                });
        }
    }, [id, session, router, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryPayload(draft))
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || t('Không thể cập nhật danh mục', 'Failed to update category'));
            }

            await refreshCatalog().catch(() => undefined);
            toast.success(t('Đã cập nhật danh mục', 'Category updated'));
            router.push('/admin/categories');
            router.refresh();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('Đã có lỗi xảy ra', 'An error occurred'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <AdminFormLoading />;

    return (
        <AdminFormPage
            backHref="/admin/categories"
            backLabel={t('Danh mục', 'Categories')}
            title={t('Sửa danh mục', 'Edit category')}
            description={t('Cập nhật tên, mô tả và trạng thái hiển thị của danh mục.', 'Update the category’s names, descriptions and visibility.')}
        >
            <CategoryForm
                value={draft}
                onChange={changes => setDraft(previous => ({ ...previous, ...changes }))}
                onSubmit={handleSubmit}
                busy={submitting}
                submitLabel={t('Lưu thay đổi', 'Save changes')}
                busyLabel={t('Đang lưu…', 'Saving…')}
                icon={<Save aria-hidden="true" />}
            />
        </AdminFormPage>
    );
}
