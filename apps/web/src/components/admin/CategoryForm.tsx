'use client';

import type { FormEvent, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { AdminCheck, AdminField, AdminForm, AdminFormActions, AdminFormGroup, AdminFormSection, useAdminText } from '@/components/admin/AdminForm';

export const emptyCategory = { slug: '', nameVi: '', descVi: '', nameEn: '', descEn: '', isActive: true };
export type CategoryDraft = typeof emptyCategory;

export const categoryPayload = (value: CategoryDraft) => ({
    slug: value.slug,
    name_en: value.nameEn,
    name_vi: value.nameVi,
    description_en: value.descEn,
    description_vi: value.descVi,
    is_active: value.isActive,
});

export function CategoryForm({ value, onChange, onSubmit, busy, submitLabel, busyLabel, icon }: {
    value: CategoryDraft;
    onChange: (changes: Partial<CategoryDraft>) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    busy: boolean;
    submitLabel: string;
    busyLabel: string;
    icon?: ReactNode;
}) {
    const { t } = useAdminText();
    return (
        <AdminForm
            onSubmit={onSubmit}
            busy={busy}
            actions={<AdminFormActions
                cancelHref="/admin/categories"
                note={t('Kiểm tra thông tin trước khi lưu danh mục.', 'Review the details before saving the category.')}
                submitLabel={submitLabel}
                busyLabel={busyLabel}
                busy={busy}
                icon={icon}
            />}
            side={
                <AdminFormSection id="category-settings" title={t('Đường dẫn & hiển thị', 'URL & display')}>
                    <AdminField id="category-slug" label={t('Đường dẫn danh mục', 'Category URL handle')} required hint={t('Dùng chữ thường không dấu, số và dấu gạch ngang. Ví dụ: nu-tram.', 'Use lowercase letters, numbers and hyphens. Example: agarwood-incense.')}>
                        <Input id="category-slug" name="slug" required aria-describedby="category-slug-hint" value={value.slug} onChange={e => onChange({ slug: e.target.value })} placeholder="nu-tram" />
                    </AdminField>
                    <AdminCheck id="category-active" label={t('Hiển thị trên website', 'Show on website')} checked={value.isActive} onChange={e => onChange({ isActive: e.target.checked })} />
                </AdminFormSection>
            }
        >
            <AdminFormSection id="category-content" title={t('Thông tin danh mục', 'Category information')} description={t('Tên và mô tả hiển thị theo ngôn ngữ khách hàng chọn.', 'Names and descriptions are displayed in the customer’s chosen language.')}>
                <AdminFormGroup title={t('Tiếng Việt', 'Vietnamese')}>
                    <AdminField id="category-name-vi" label={t('Tên danh mục', 'Category name')} required><Input id="category-name-vi" name="name_vi" required value={value.nameVi} onChange={e => onChange({ nameVi: e.target.value })} /></AdminField>
                    <AdminField id="category-desc-vi" label={t('Mô tả', 'Description')}><textarea id="category-desc-vi" name="description_vi" rows={4} value={value.descVi} onChange={e => onChange({ descVi: e.target.value })} /></AdminField>
                </AdminFormGroup>
                <AdminFormGroup title={t('Tiếng Anh', 'English')}>
                    <AdminField id="category-name-en" label={t('Tên danh mục (tiếng Anh)', 'Category name (English)')} required><Input id="category-name-en" name="name_en" required value={value.nameEn} onChange={e => onChange({ nameEn: e.target.value })} /></AdminField>
                    <AdminField id="category-desc-en" label={t('Mô tả (tiếng Anh)', 'Description (English)')}><textarea id="category-desc-en" name="description_en" rows={4} value={value.descEn} onChange={e => onChange({ descEn: e.target.value })} /></AdminField>
                </AdminFormGroup>
            </AdminFormSection>
        </AdminForm>
    );
}
