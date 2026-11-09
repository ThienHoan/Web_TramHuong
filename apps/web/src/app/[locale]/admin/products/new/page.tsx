'use client';

import { refreshCatalog } from '@/app/actions/catalog';
import { API_URL } from "@/services/base-http";

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AdminFormActions, AdminFormPage, useAdminText } from '@/components/admin/AdminForm';
import { emptyProduct, ProductForm } from '@/components/admin/ProductForm';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import { Category } from '@/lib/types';
import { getCategories, setAccessToken } from '@/lib/api-client';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { toast } from 'sonner';

export default function NewProductPage() {
    const { t, locale } = useAdminText();
    const { session } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [draft, setDraft] = useState(emptyProduct);
    const [images, setImages] = useState<string[]>([]);

    useEffect(() => {
        if (session) {
            setAccessToken(session.access_token);
            getCategories(locale, true).then(data => {
                setCategories(data);
            }).catch(err => console.error('Failed to load categories', err));
        }
    }, [session, locale]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        // Validate at least one image
        if (images.length === 0) {
            toast.error(t('Vui lòng thêm ít nhất một ảnh sản phẩm.', 'Please add at least one product image.'));
            document.getElementById('product-images')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setLoading(true);
        const toastId = toast.loading(t('Đang tạo sản phẩm…', 'Creating product…'));

        try {
            const payload = {
                slug: draft.slug,
                price: parseFloat(draft.price),
                quantity: parseInt(draft.quantity),
                category: draft.category,
                style: draft.style,
                title_en: draft.titleEn,
                desc_en: draft.descEn,
                title_vi: draft.titleVi,
                desc_vi: draft.descVi,
                images,
                featured_section: draft.featuredSection || null,
                discount_percentage: parseFloat(draft.discountPercentage),
                discount_start_date: draft.discountStartDate || null,
                discount_end_date: draft.discountEndDate || null,
            };

            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await refreshCatalog().catch(() => undefined);
                toast.success(t('Đã tạo sản phẩm', 'Product created successfully'), { id: toastId });
                router.push('/admin/products');
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(`${t('Không thể tạo sản phẩm', 'Could not create product')}: ${err.message || t('Vui lòng thử lại.', 'Please try again.')}`, { id: toastId });
            }
        } catch {
            toast.error(t('Không thể tạo sản phẩm. Vui lòng thử lại.', 'Could not create product. Please try again.'), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminFormPage
            backHref="/admin/products"
            backLabel={t('Sản phẩm', 'Products')}
            title={t('Thêm sản phẩm', 'Add product')}
            description={t('Thêm nội dung, hình ảnh và thông tin bán hàng cho sản phẩm mới.', 'Add content, images and selling details for your new product.')}
        >
            <ProductForm
                value={draft}
                onChange={changes => setDraft(previous => ({ ...previous, ...changes }))}
                categories={categories}
                busy={loading}
                onSubmit={handleSubmit}
                images={<ImageUploader images={images} onChange={setImages} maxImages={5} disabled={loading} />}
                actions={<AdminFormActions
                    cancelHref="/admin/products"
                    note={t('Kiểm tra thông tin trước khi tạo sản phẩm.', 'Review the details before creating the product.')}
                    submitLabel={t('Tạo sản phẩm', 'Create product')}
                    busyLabel={t('Đang tạo…', 'Creating…')}
                    busy={loading}
                    disabled={!draft.category}
                    icon={<Plus aria-hidden="true" />}
                />}
            />
        </AdminFormPage>
    );
}
