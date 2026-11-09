'use client';

import type { FormEvent, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminMoney } from '@/components/admin/admin-format';
import { AdminField, AdminForm, AdminFormGroup, AdminFormSection, useAdminText } from '@/components/admin/AdminForm';
import { Category } from '@/lib/types';

export interface ProductDraft {
    slug: string;
    price: string;
    originalPrice: string;
    quantity: string;
    category: string;
    style: string;
    titleVi: string;
    descVi: string;
    titleEn: string;
    descEn: string;
    featuredSection: string;
    discountPercentage: string;
    discountStartDate: string;
    discountEndDate: string;
}

export const emptyProduct: ProductDraft = {
    slug: '',
    price: '',
    originalPrice: '',
    quantity: '0',
    category: '',
    style: 'zen',
    titleVi: '',
    descVi: '',
    titleEn: '',
    descEn: '',
    featuredSection: '',
    discountPercentage: '0',
    discountStartDate: '',
    discountEndDate: '',
};

export function ProductForm({ value, onChange, categories, busy, onSubmit, images, actions, extraMain, status, showOriginalPrice }: {
    value: ProductDraft;
    onChange: (changes: Partial<ProductDraft>) => void;
    categories: Category[];
    busy: boolean;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    images: ReactNode;
    actions: ReactNode;
    extraMain?: ReactNode;
    status?: ReactNode;
    showOriginalPrice?: boolean;
}) {
    const { t, locale } = useAdminText();
    const sellingPrice = Number(value.price || 0) * (1 - Number(value.discountPercentage || 0) / 100);

    return (
        <AdminForm
            onSubmit={onSubmit}
            busy={busy}
            actions={actions}
            side={<>
                <AdminFormSection id="product-pricing" title={t('Giá & tồn kho', 'Pricing & inventory')}>
                    <AdminField id="product-price" label={t('Giá bán (VND)', 'Price (VND)')} required><Input id="product-price" name="price" required type="number" min="0" step="0.01" value={value.price} onChange={e => onChange({ price: e.target.value })} /></AdminField>
                    {showOriginalPrice && <AdminField id="product-original-price" label={t('Giá gốc (VND)', 'Original price (VND)')} hint={t('Không bắt buộc', 'Optional')}><Input id="product-original-price" name="original_price" type="number" min="0" step="0.01" value={value.originalPrice} onChange={e => onChange({ originalPrice: e.target.value })} /></AdminField>}
                    <AdminField id="product-quantity" label={t('Số lượng tồn kho', 'Stock quantity')} required><Input id="product-quantity" name="quantity" required type="number" min="0" step="1" value={value.quantity} onChange={e => onChange({ quantity: e.target.value })} /></AdminField>
                </AdminFormSection>
                <AdminFormSection id="product-organization" title={t('Phân loại & hiển thị', 'Organization & display')}>
                    <AdminField id="product-category" label={t('Danh mục', 'Category')} required>
                        <Select required value={value.category} onValueChange={category => onChange({ category })} disabled={busy || categories.length === 0}>
                            <SelectTrigger id="product-category"><SelectValue placeholder={t('Chọn danh mục', 'Select category')} /></SelectTrigger>
                            <SelectContent className="admin-menu">{categories.map(cat => <SelectItem key={cat.id} value={cat.slug}>{cat.translations?.find(item => item.locale === locale)?.name || cat.slug}</SelectItem>)}</SelectContent>
                        </Select>
                        {categories.length === 0 && <p>{t('Chưa có danh mục để chọn.', 'No categories available.')}</p>}
                    </AdminField>
                    <AdminField id="product-style" label={t('Phong cách', 'Style')}>
                        <Select value={value.style} onValueChange={style => onChange({ style })} disabled={busy}>
                            <SelectTrigger id="product-style"><SelectValue /></SelectTrigger>
                            <SelectContent className="admin-menu">
                                <SelectItem value="zen">{t('Zen · Tối giản', 'Zen · Minimal')}</SelectItem>
                                <SelectItem value="traditional">{t('Truyền thống · Việt Nam', 'Traditional · Vietnam')}</SelectItem>
                                <SelectItem value="both">{t('Cả hai phong cách', 'Both styles')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdminField>
                    <AdminField id="product-section" label={t('Vị trí trên trang chủ', 'Homepage section')}>
                        <Select value={value.featuredSection || 'standard'} onValueChange={section => onChange({ featuredSection: section === 'standard' ? '' : section })} disabled={busy}>
                            <SelectTrigger id="product-section"><SelectValue /></SelectTrigger>
                            <SelectContent className="admin-menu">
                                <SelectItem value="standard">{t('Mặc định', 'Standard')}</SelectItem>
                                <SelectItem value="chapter_1">{t('Chương I · Nổi bật', 'Chapter I · Featured')}</SelectItem>
                                <SelectItem value="chapter_2">{t('Chương II · Nghi thức hằng ngày', 'Chapter II · Daily ritual')}</SelectItem>
                                <SelectItem value="chapter_3">{t('Chương III · Bộ quà tặng', 'Chapter III · Gift sets')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdminField>
                    {status}
                </AdminFormSection>
                <AdminFormSection id="product-discounts" title={t('Khuyến mãi', 'Promotion')} description={t('Để mức giảm 0% nếu không áp dụng khuyến mãi.', 'Leave the discount at 0% when no promotion applies.')}>
                    <AdminField id="product-discount" label={t('Giảm giá (%)', 'Discount (%)')}><Input id="product-discount" name="discount_percentage" type="number" min="0" max="100" value={value.discountPercentage} onChange={e => onChange({ discountPercentage: e.target.value })} /></AdminField>
                    <AdminField id="discount-start" label={t('Bắt đầu', 'Starts at')} hint={t('Không bắt buộc', 'Optional')}><Input id="discount-start" name="discount_start_date" type="datetime-local" value={value.discountStartDate} onChange={e => onChange({ discountStartDate: e.target.value })} /></AdminField>
                    <AdminField id="discount-end" label={t('Kết thúc', 'Ends at')} hint={t('Không bắt buộc', 'Optional')}><Input id="discount-end" name="discount_end_date" type="datetime-local" value={value.discountEndDate} onChange={e => onChange({ discountEndDate: e.target.value })} /></AdminField>
                    <div className="admin-form-preview" aria-live="polite"><span>{t('Giá sau giảm', 'Price after discount')}</span><strong>{adminMoney(sellingPrice, locale)}</strong>{Number(value.discountPercentage) > 0 && <del>{adminMoney(Number(value.price || 0), locale)}</del>}</div>
                </AdminFormSection>
            </>}
        >
            <AdminFormSection id="product-content" title={t('Thông tin sản phẩm', 'Product information')} description={t('Tên và mô tả hiển thị theo ngôn ngữ khách hàng chọn.', 'Names and descriptions are displayed in the customer’s chosen language.')}>
                <AdminFormGroup title={t('Tiếng Việt', 'Vietnamese')}>
                    <AdminField id="title-vi" label={t('Tên sản phẩm', 'Product name')} required><Input id="title-vi" name="title_vi" required value={value.titleVi} onChange={e => onChange({ titleVi: e.target.value })} /></AdminField>
                    <AdminField id="desc-vi" label={t('Mô tả sản phẩm', 'Product description')}><textarea id="desc-vi" name="desc_vi" rows={5} value={value.descVi} onChange={e => onChange({ descVi: e.target.value })} /></AdminField>
                </AdminFormGroup>
                <AdminFormGroup title={t('Tiếng Anh', 'English')}>
                    <AdminField id="title-en" label={t('Tên sản phẩm (tiếng Anh)', 'Product name (English)')} required><Input id="title-en" name="title_en" required value={value.titleEn} onChange={e => onChange({ titleEn: e.target.value })} /></AdminField>
                    <AdminField id="desc-en" label={t('Mô tả (tiếng Anh)', 'Description (English)')}><textarea id="desc-en" name="desc_en" rows={5} value={value.descEn} onChange={e => onChange({ descEn: e.target.value })} /></AdminField>
                </AdminFormGroup>
                <AdminField id="product-slug" label={t('Đường dẫn sản phẩm', 'Product URL handle')} required hint={t('Dùng chữ thường không dấu, số và dấu gạch ngang. Ví dụ: vong-tram-huong.', 'Use lowercase letters, numbers and hyphens. Example: agarwood-bracelet.')}><Input id="product-slug" name="slug" required aria-describedby="product-slug-hint" value={value.slug} onChange={e => onChange({ slug: e.target.value })} placeholder="vong-tram-huong" /></AdminField>
            </AdminFormSection>
            <AdminFormSection id="product-images" title={t('Hình ảnh sản phẩm', 'Product images')} description={t('Thêm tối đa 5 ảnh. Ảnh đầu tiên được dùng làm ảnh đại diện.', 'Add up to 5 images. The first image is the product’s main image.')}>
                {images}
            </AdminFormSection>
            {extraMain}
        </AdminForm>
    );
}
