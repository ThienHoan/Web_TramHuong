'use client';

import { API_URL } from "@/services/base-http";

import { useState, useEffect, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminMoney } from '@/components/admin/admin-format';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import { Category } from '@/lib/types';
import { getCategories, setAccessToken } from '@/lib/api-client';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { toast } from 'sonner';


function Field({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: ReactNode }) {
    return <div className="product-field">
        <label htmlFor={id}>{label}{required && <span className="text-red-700" aria-hidden="true"> *</span>}</label>
        {children}
        {hint && <p id={`${id}-hint`}>{hint}</p>}
    </div>;
}

function FormSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
    return <Card className="product-form-section" role="region" aria-labelledby={id}>
        <CardHeader><CardTitle><h2 id={id}>{title}</h2></CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
        <CardContent className="space-y-5">{children}</CardContent>
    </Card>;
}

export default function NewProductPage() {
    const locale = useLocale();
    const t = (vi: string, en: string) => locale === 'en' ? en : vi;
    const { session } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form State
    const [slug, setSlug] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('0');
    const [category, setCategory] = useState('');
    const [style, setStyle] = useState('zen'); // zen or traditional
    const [titleEn, setTitleEn] = useState('');
    const [descEn, setDescEn] = useState('');
    const [titleVi, setTitleVi] = useState('');
    const [descVi, setDescVi] = useState('');
    const [images, setImages] = useState<string[]>([]); // Multiple images
    const [featuredSection, setFeaturedSection] = useState<string>(''); // section enum

    // Discount fields
    const [discountPercentage, setDiscountPercentage] = useState('0');
    const [discountStartDate, setDiscountStartDate] = useState('');
    const [discountEndDate, setDiscountEndDate] = useState('');

    // Fetch Categories
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
                slug,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                category,
                style,
                title_en: titleEn,
                desc_en: descEn,
                title_vi: titleVi,
                desc_vi: descVi,
                images,
                featured_section: featuredSection || null,
                discount_percentage: parseFloat(discountPercentage),
                discount_start_date: discountStartDate || null,
                discount_end_date: discountEndDate || null,
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

    const sellingPrice = Number(price || 0) * (1 - Number(discountPercentage || 0) / 100);

    return (
        <section className="admin-page product-create-page">
            <Link href="/admin/products" className="product-back-link"><ArrowLeft size={16} aria-hidden="true" />{t('Sản phẩm', 'Products')}</Link>
            <header className="admin-page-heading">
                <div><h1>{t('Thêm sản phẩm', 'Add product')}</h1><p>{t('Thêm nội dung, hình ảnh và thông tin bán hàng cho sản phẩm mới.', 'Add content, images and selling details for your new product.')}</p></div>
                <span className="product-required-note"><span className="text-red-700">*</span> {t('Thông tin bắt buộc', 'Required fields')}</span>
            </header>
            <form onSubmit={handleSubmit} aria-busy={loading}>
                <fieldset disabled={loading} className="product-form-grid">
                    <div className="product-form-main">
                        <FormSection id="product-content" title={t('Thông tin sản phẩm', 'Product information')} description={t('Tên và mô tả hiển thị theo ngôn ngữ khách hàng chọn.', 'Names and descriptions are displayed in the customer’s chosen language.')}>
                            <div className="product-language-group">
                                <h3>{t('Tiếng Việt', 'Vietnamese')}</h3>
                                <Field id="title-vi" label={t('Tên sản phẩm', 'Product name')} required><Input id="title-vi" name="title_vi" required value={titleVi} onChange={e => setTitleVi(e.target.value)} /></Field>
                                <Field id="desc-vi" label={t('Mô tả sản phẩm', 'Product description')}><textarea id="desc-vi" name="desc_vi" rows={5} value={descVi} onChange={e => setDescVi(e.target.value)} /></Field>
                            </div>
                            <div className="product-language-group">
                                <h3>{t('Tiếng Anh', 'English')}</h3>
                                <Field id="title-en" label={t('Tên sản phẩm (tiếng Anh)', 'Product name (English)')} required><Input id="title-en" name="title_en" required value={titleEn} onChange={e => setTitleEn(e.target.value)} /></Field>
                                <Field id="desc-en" label={t('Mô tả (tiếng Anh)', 'Description (English)')}><textarea id="desc-en" name="desc_en" rows={5} value={descEn} onChange={e => setDescEn(e.target.value)} /></Field>
                            </div>
                            <Field id="product-slug" label={t('Đường dẫn sản phẩm', 'Product URL handle')} required hint={t('Dùng chữ thường không dấu, số và dấu gạch ngang. Ví dụ: vong-tram-huong.', 'Use lowercase letters, numbers and hyphens. Example: agarwood-bracelet.')}><Input id="product-slug" name="slug" required aria-describedby="product-slug-hint" value={slug} onChange={e => setSlug(e.target.value)} placeholder="vong-tram-huong" /></Field>
                        </FormSection>
                        <FormSection id="product-images" title={t('Hình ảnh sản phẩm', 'Product images')} description={t('Thêm tối đa 5 ảnh. Ảnh đầu tiên được dùng làm ảnh đại diện.', 'Add up to 5 images. The first image is the product’s main image.')}>
                            <ImageUploader images={images} onChange={setImages} maxImages={5} disabled={loading} />
                        </FormSection>
                    </div>
                    <div className="product-form-side">
                        <FormSection id="product-pricing" title={t('Giá & tồn kho', 'Pricing & inventory')}>
                            <Field id="product-price" label={t('Giá bán (VND)', 'Price (VND)')} required><Input id="product-price" name="price" required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></Field>
                            <Field id="product-quantity" label={t('Số lượng tồn kho', 'Stock quantity')} required><Input id="product-quantity" name="quantity" required type="number" min="0" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></Field>
                        </FormSection>
                        <FormSection id="product-organization" title={t('Phân loại & hiển thị', 'Organization & display')}>
                            <Field id="product-category" label={t('Danh mục', 'Category')} required>
                                <Select required value={category} onValueChange={setCategory} disabled={loading || categories.length === 0}>
                                    <SelectTrigger id="product-category"><SelectValue placeholder={t('Chọn danh mục', 'Select category')} /></SelectTrigger>
                                    <SelectContent className="admin-menu">{categories.map(cat => <SelectItem key={cat.id} value={cat.slug}>{cat.translations?.find(item => item.locale === locale)?.name || cat.slug}</SelectItem>)}</SelectContent>
                                </Select>
                                {categories.length === 0 && <p>{t('Chưa có danh mục để chọn.', 'No categories available.')}</p>}
                            </Field>
                            <Field id="product-style" label={t('Phong cách', 'Style')}>
                                <Select value={style} onValueChange={setStyle} disabled={loading}><SelectTrigger id="product-style"><SelectValue /></SelectTrigger><SelectContent className="admin-menu"><SelectItem value="zen">{t('Zen · Tối giản', 'Zen · Minimal')}</SelectItem><SelectItem value="traditional">{t('Truyền thống · Việt Nam', 'Traditional · Vietnam')}</SelectItem></SelectContent></Select>
                            </Field>
                            <Field id="product-section" label={t('Vị trí trên trang chủ', 'Homepage section')}>
                                <Select value={featuredSection || 'standard'} onValueChange={value => setFeaturedSection(value === 'standard' ? '' : value)} disabled={loading}><SelectTrigger id="product-section"><SelectValue /></SelectTrigger><SelectContent className="admin-menu"><SelectItem value="standard">{t('Mặc định', 'Standard')}</SelectItem><SelectItem value="chapter_1">{t('Chương I · Nổi bật', 'Chapter I · Featured')}</SelectItem><SelectItem value="chapter_2">{t('Chương II · Nghi thức hằng ngày', 'Chapter II · Daily ritual')}</SelectItem><SelectItem value="chapter_3">{t('Chương III · Bộ quà tặng', 'Chapter III · Gift sets')}</SelectItem></SelectContent></Select>
                            </Field>
                        </FormSection>
                        <FormSection id="product-discounts" title={t('Khuyến mãi', 'Promotion')} description={t('Để mức giảm 0% nếu không áp dụng khuyến mãi.', 'Leave the discount at 0% when no promotion applies.')}>
                            <Field id="product-discount" label={t('Giảm giá (%)', 'Discount (%)')}><Input id="product-discount" name="discount_percentage" type="number" min="0" max="100" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value)} /></Field>
                            <Field id="discount-start" label={t('Bắt đầu', 'Starts at')} hint={t('Không bắt buộc', 'Optional')}><Input id="discount-start" name="discount_start_date" type="datetime-local" value={discountStartDate} onChange={e => setDiscountStartDate(e.target.value)} /></Field>
                            <Field id="discount-end" label={t('Kết thúc', 'Ends at')} hint={t('Không bắt buộc', 'Optional')}><Input id="discount-end" name="discount_end_date" type="datetime-local" value={discountEndDate} onChange={e => setDiscountEndDate(e.target.value)} /></Field>
                            <div className="product-price-preview" aria-live="polite"><span>{t('Giá sau giảm', 'Price after discount')}</span><strong>{adminMoney(sellingPrice, locale)}</strong>{Number(discountPercentage) > 0 && <del>{adminMoney(Number(price || 0), locale)}</del>}</div>
                        </FormSection>
                    </div>
                </fieldset>
                <footer className="product-form-actions">
                    <p>{t('Kiểm tra thông tin trước khi tạo sản phẩm.', 'Review the details before creating the product.')}</p>
                    <div><Button type="button" variant="outline" disabled={loading} onClick={() => router.push('/admin/products')}>{t('Hủy', 'Cancel')}</Button><Button type="submit" disabled={loading || !category}>{loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}{loading ? t('Đang tạo…', 'Creating…') : t('Tạo sản phẩm', 'Create product')}</Button></div>
                </footer>
            </form>
        </section>
    );
}
