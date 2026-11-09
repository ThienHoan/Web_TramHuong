'use client';

import { refreshCatalog } from '@/app/actions/catalog';
import { API_URL } from "@/services/base-http";

import { useEffect, useMemo, useRef, useState, use } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { getCategories, setAccessToken } from '@/lib/api-client';
import { MAX_SOURCE_IMAGE_BYTES, shrinkImageIfNeeded } from '@/lib/shrink-image';
import { useAuth } from '@/components/providers/AuthProvider';
import { Category } from '@/lib/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminCheck, AdminFormActions, AdminFormGroup, AdminFormLoading, AdminFormPage, AdminFormSection, useAdminText } from '@/components/admin/AdminForm';
import { emptyProduct, ProductForm } from '@/components/admin/ProductForm';
import { ImageDropzone, ImageTile, ImageTileGrid } from '@/components/admin/ImageUploader';

const MAX_IMAGES = 5;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

type Spec = { key: string; value: string };
type Variant = { name: string; price: number | null; original_price?: number | null; description: string };

function SpecList({ title, items, onChange }: { title: string; items: Spec[]; onChange: (items: Spec[]) => void }) {
    const { t } = useAdminText();
    const update = (index: number, changes: Partial<Spec>) => onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
    return (
        <AdminFormGroup
            title={title}
            action={<Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { key: '', value: '' }])}><Plus aria-hidden="true" />{t('Thêm', 'Add')}</Button>}
        >
            {items.length > 0 ? (
                <div className="admin-form-repeat">
                    {items.map((item, index) => (
                        <div key={index} className="admin-form-repeat-row">
                            <Input aria-label={t('Tên thông số', 'Specification name')} placeholder={t('Tên thông số', 'Name')} value={item.key} onChange={e => update(index, { key: e.target.value })} />
                            <Input aria-label={t('Giá trị thông số', 'Specification value')} placeholder={t('Giá trị', 'Value')} value={item.value} onChange={e => update(index, { value: e.target.value })} />
                            <Button type="button" size="icon" variant="ghost" aria-label={t('Xóa thông số', 'Remove specification')} onClick={() => onChange(items.filter((_, i) => i !== index))}><X aria-hidden="true" /></Button>
                        </div>
                    ))}
                </div>
            ) : <p className="admin-form-empty">{t('Chưa có thông số.', 'No specifications yet.')}</p>}
        </AdminFormGroup>
    );
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t, locale } = useAdminText();
    const { session } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    const [draft, setDraft] = useState({ ...emptyProduct, style: 'both' });
    const [isActive, setIsActive] = useState(false);
    const [currentImages, setCurrentImages] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [specsEn, setSpecsEn] = useState<Spec[]>([]);
    const [specsVi, setSpecsVi] = useState<Spec[]>([]);

    const previews = useMemo(() => newFiles.map(file => URL.createObjectURL(file)), [newFiles]);
    useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);

    const token = session?.access_token;
    const loadedProductId = useRef<string | null>(null);

    useEffect(() => {
        if (!token) return;
        setAccessToken(token);
        getCategories(locale, true).then(data => {
            setCategories(data);
            setDraft(previous => ({ ...previous, category: previous.category || data[0]?.slug || '' }));
        });
    }, [token, locale]);

    // Load once per product: a token refresh must not overwrite unsaved edits.
    useEffect(() => {
        if (!token || loadedProductId.current === id) return;
        loadedProductId.current = id;

        fetch(`${API_URL}/products/admin/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        })
            .then(res => res.json())
            .then(data => {
                const catSlug = (data.category && typeof data.category === 'object') ? data.category.slug : data.category;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
                const tEn = data.translations?.find((item: any) => item.locale === 'en');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
                const tVi = data.translations?.find((item: any) => item.locale === 'vi');

                setDraft(previous => ({
                    ...previous,
                    slug: data.slug,
                    price: data.price.toString(),
                    originalPrice: data.original_price?.toString() || '',
                    quantity: data.quantity?.toString() || '0',
                    category: catSlug || previous.category,
                    style: data.style || data.style_affinity || 'both',
                    featuredSection: data.featured_section || (data.is_featured ? 'chapter_1' : ''),
                    titleEn: tEn?.title || '',
                    descEn: tEn?.description || '',
                    titleVi: tVi?.title || '',
                    descVi: tVi?.description || '',
                    discountPercentage: data.discount_percentage?.toString() || '0',
                    // Convert DB timestamps to datetime-local format
                    discountStartDate: data.discount_start_date ? new Date(data.discount_start_date).toISOString().slice(0, 16) : '',
                    discountEndDate: data.discount_end_date ? new Date(data.discount_end_date).toISOString().slice(0, 16) : '',
                }));
                setIsActive(data.is_active === true);

                // Support images array primarily
                setCurrentImages(data.images && data.images.length > 0 ? data.images : (data.image ? [data.image] : []));

                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
                const parseSpecs = (raw: any) => {
                    if (!raw) return [];
                    if (typeof raw === 'object') return Object.entries(raw).map(([key, value]) => ({ key, value: String(value) }));
                    if (typeof raw === 'string') {
                        try { return Object.entries(JSON.parse(raw)).map(([key, value]) => ({ key, value: String(value) })); } catch { }
                        return raw.split('. ').map((s: string) => {
                            const [k, v] = s.split(':');
                            return { key: k?.trim() || '', value: v?.trim() || '' };
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
                        }).filter((x: any) => x.key);
                    }
                    return [];
                };
                setSpecsEn(parseSpecs(tEn?.specifications));
                setSpecsVi(parseSpecs(tVi?.specifications));
                setVariants(Array.isArray(data.variants) ? data.variants : []);

                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error(t('Không thể tải sản phẩm', 'Failed to load product'));
                router.push('/admin/products');
            });

    }, [id, token, router, t]);

    const addFiles = (files: File[]) => {
        const accepted = files.filter(file => IMAGE_TYPES.has(file.type) && file.size <= MAX_SOURCE_IMAGE_BYTES);
        if (accepted.length < files.length) toast.error(t('Chỉ nhận ảnh JPEG, PNG, WebP, AVIF tối đa 50 MB.', 'Only JPEG, PNG, WebP or AVIF images up to 50 MB are accepted.'));
        const room = Math.max(0, MAX_IMAGES - currentImages.length - newFiles.length);
        if (accepted.length > room) toast.error(t(`Mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh.`, `Each product can have up to ${MAX_IMAGES} images.`));
        setNewFiles([...newFiles, ...accepted.slice(0, room)]);
    };

    const updateVariant = (index: number, changes: Partial<Variant>) => setVariants(variants.map((variant, i) => (i === index ? { ...variant, ...changes } : variant)));
    const nullableNumber = (value: string) => (value === '' ? null : Number(value));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);
        const toastId = toast.loading(t('Đang lưu sản phẩm…', 'Saving product…'));

        try {
            const formData = new FormData();
            formData.append('slug', draft.slug);
            formData.append('price', draft.price);
            formData.append('original_price', draft.originalPrice);
            formData.append('quantity', draft.quantity);
            formData.append('category', draft.category);
            formData.append('style', draft.style);
            formData.append('title_en', draft.titleEn);
            formData.append('desc_en', draft.descEn);
            formData.append('title_vi', draft.titleVi);
            formData.append('desc_vi', draft.descVi);
            formData.append('featured_section', draft.featuredSection || '');
            formData.append('is_active', String(isActive));

            formData.append('variants', JSON.stringify(variants));

            const specsEnObj = specsEn.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            const specsViObj = specsVi.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            formData.append('specifications_en', JSON.stringify(specsEnObj));
            formData.append('specifications_vi', JSON.stringify(specsViObj));

            // Discount fields
            formData.append('discount_percentage', draft.discountPercentage);
            if (draft.discountStartDate) formData.append('discount_start_date', draft.discountStartDate);
            if (draft.discountEndDate) formData.append('discount_end_date', draft.discountEndDate);

            formData.append('keep_images', JSON.stringify(currentImages));
            for (const file of newFiles) formData.append('files', await shrinkImageIfNeeded(file));

            // Note: Patch request in NestJS with FileInterceptor requires Multipart
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                    // No Content-Type header for FormData, browser sets it with boundary
                },
                body: formData
            });

            if (res.ok) {
                await refreshCatalog().catch(() => undefined);
                toast.success(t('Đã lưu sản phẩm', 'Product saved'), { id: toastId });
                router.push('/admin/products');
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(err.message || t('Không thể lưu sản phẩm', 'Could not save product'), { id: toastId });
            }
        } catch {
            toast.error(t('Không thể lưu sản phẩm', 'Could not save product'), { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <AdminFormLoading />;

    return (
        <AdminFormPage
            backHref="/admin/products"
            backLabel={t('Sản phẩm', 'Products')}
            title={t('Sửa sản phẩm', 'Edit product')}
            description={t('Cập nhật nội dung, hình ảnh và thông tin bán hàng của sản phẩm.', 'Update the product’s content, images and selling details.')}
        >
            <ProductForm
                value={draft}
                onChange={changes => setDraft(previous => ({ ...previous, ...changes }))}
                categories={categories}
                busy={submitting}
                onSubmit={handleSubmit}
                showOriginalPrice
                status={<AdminCheck id="product-active" label={t('Hiển thị trên website', 'Show on website')} hint={t('Sản phẩm cần ít nhất 1 ảnh để hiển thị.', 'A product needs at least 1 image to be shown.')} checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
                images={
                    <div className="space-y-4">
                        <ImageDropzone onFiles={addFiles} count={currentImages.length + newFiles.length} maxImages={MAX_IMAGES} disabled={submitting} />
                        {(currentImages.length > 0 || newFiles.length > 0) && (
                            <ImageTileGrid>
                                {currentImages.map((image, index) => (
                                    <ImageTile
                                        key={image}
                                        src={image}
                                        index={index}
                                        disabled={submitting}
                                        onRemove={() => setCurrentImages(currentImages.filter(item => item !== image))}
                                        onMakeMain={() => setCurrentImages([image, ...currentImages.filter(item => item !== image)])}
                                    />
                                ))}
                                {newFiles.map((file, index) => (
                                    <ImageTile
                                        key={previews[index]}
                                        src={previews[index]}
                                        index={currentImages.length + index}
                                        disabled={submitting}
                                        onRemove={() => setNewFiles(newFiles.filter(item => item !== file))}
                                    />
                                ))}
                            </ImageTileGrid>
                        )}
                    </div>
                }
                extraMain={<>
                    <AdminFormSection
                        id="product-variants"
                        title={t('Phân loại hàng', 'Variants')}
                        description={t('Ví dụ các kích thước 30cm, 40cm. Để trống giá để dùng giá bán chính.', 'For example sizes such as 30cm or 40cm. Leave the price blank to use the main price.')}
                        action={<Button type="button" size="sm" variant="outline" onClick={() => setVariants([...variants, { name: '', price: 0, description: '' }])}><Plus aria-hidden="true" />{t('Thêm phân loại', 'Add variant')}</Button>}
                    >
                        {variants.length > 0 ? (
                            <div className="admin-form-repeat">
                                {variants.map((variant, index) => (
                                    <div key={index} className="admin-form-repeat-row admin-form-repeat-row--variant">
                                        <Input aria-label={t('Tên phân loại', 'Variant name')} placeholder={t('Tên, ví dụ 30cm', 'Name, e.g. 30cm')} value={variant.name} onChange={e => updateVariant(index, { name: e.target.value })} />
                                        <Input aria-label={t('Giá bán', 'Price')} type="number" min="0" placeholder={t('Giá bán', 'Price')} value={variant.price ?? ''} onChange={e => updateVariant(index, { price: nullableNumber(e.target.value) })} />
                                        <Input aria-label={t('Giá gốc', 'Original price')} type="number" min="0" placeholder={t('Giá gốc', 'Original price')} value={variant.original_price ?? ''} onChange={e => updateVariant(index, { original_price: nullableNumber(e.target.value) })} />
                                        <Input aria-label={t('Mô tả ngắn', 'Short description')} placeholder={t('Mô tả ngắn', 'Short description')} value={variant.description} onChange={e => updateVariant(index, { description: e.target.value })} />
                                        <Button type="button" size="icon" variant="ghost" aria-label={t('Xóa phân loại', 'Remove variant')} onClick={() => setVariants(variants.filter((_, i) => i !== index))}><X aria-hidden="true" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="admin-form-empty">{t('Chưa có phân loại.', 'No variants yet.')}</p>}
                    </AdminFormSection>
                    <AdminFormSection id="product-specs" title={t('Thông số sản phẩm', 'Specifications')}>
                        <SpecList title={t('Tiếng Việt', 'Vietnamese')} items={specsVi} onChange={setSpecsVi} />
                        <SpecList title={t('Tiếng Anh', 'English')} items={specsEn} onChange={setSpecsEn} />
                    </AdminFormSection>
                </>}
                actions={<AdminFormActions
                    cancelHref="/admin/products"
                    note={t('Kiểm tra thông tin trước khi lưu sản phẩm.', 'Review the details before saving the product.')}
                    submitLabel={t('Lưu thay đổi', 'Save changes')}
                    busyLabel={t('Đang lưu…', 'Saving…')}
                    busy={submitting}
                    disabled={!draft.category}
                    icon={<Save aria-hidden="true" />}
                />}
            />

            {/* SEED REVIEW SECTION */}
            < div className="mt-12 border-t pt-8" >
                <h2 className="text-xl font-bold mb-6 text-gray-800">Seed Fake Review (Buffing)</h2>
                <SeedReviewForm productId={id} />
            </div >
        </AdminFormPage>
    );
}

function SeedReviewForm({ productId }: { productId: string }) {
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const { session } = useAuth();
    const router = useRouter();

    const handleSeed = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (session?.access_token) setAccessToken(session.access_token);

        try {
            const { seedReview } = await import('@/lib/api-client');
            // Use provided URL or generate one
            const finalAvatar = avatarUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

            await seedReview({
                productId,
                rating,
                comment,
                reviewerName: name,
                reviewerAvatar: finalAvatar
            });
            alert('Review seeded successfully!');
            setName('');
            setAvatarUrl('');
            setComment('');
            router.refresh();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSeed} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Reviewer Name</label>
                    <input required type="text" className="w-full border p-2 rounded-md"
                        placeholder="e.g. Nguyen Van A"
                        value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button type="button" key={star} onClick={() => setRating(star)}
                                className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                ★
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Avatar URL (Optional)</label>
                <input type="url" className="w-full border p-2 rounded-md"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from name.</p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Comment</label>
                <textarea required className="w-full border p-2 rounded-md" rows={2}
                    placeholder="Very good product..."
                    value={comment} onChange={e => setComment(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 w-full">
                {loading ? 'Seeding...' : 'Add Fake Review'}
            </button>
        </form>
    );
}
