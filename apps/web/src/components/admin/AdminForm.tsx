'use client';

import { useCallback, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function useAdminText() {
    const locale = useLocale();
    const t = useCallback((vi: string, en: string) => (locale === 'en' ? en : vi), [locale]);
    return { locale, t };
}

export function AdminFormPage({ backHref, backLabel, title, description, children }: {
    backHref: string;
    backLabel: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    const { t } = useAdminText();
    return (
        <section className="admin-page admin-form-page">
            <Link href={backHref} className="admin-form-back"><ArrowLeft size={16} aria-hidden="true" />{backLabel}</Link>
            <header className="admin-page-heading">
                <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
                <span className="admin-form-required"><span className="text-red-700">*</span> {t('Thông tin bắt buộc', 'Required fields')}</span>
            </header>
            {children}
        </section>
    );
}

/** Two-column form: main content on the left, settings on the right. */
export function AdminForm({ onSubmit, busy, side, actions, children }: {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    busy: boolean;
    side: ReactNode;
    actions: ReactNode;
    children: ReactNode;
}) {
    return (
        <form onSubmit={onSubmit} aria-busy={busy}>
            <fieldset disabled={busy} className="admin-form-grid">
                <div className="admin-form-main">{children}</div>
                <div className="admin-form-side">{side}</div>
            </fieldset>
            {actions}
        </form>
    );
}

export function AdminFormSection({ id, title, description, action, children }: {
    id: string;
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card className="admin-form-section" role="region" aria-labelledby={id}>
            <CardHeader>
                <CardTitle><h2 id={id}>{title}</h2></CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                {action && <CardAction>{action}</CardAction>}
            </CardHeader>
            <CardContent className="space-y-5">{children}</CardContent>
        </Card>
    );
}

export function AdminFormGroup({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <div className="admin-form-group">
            <div className="admin-form-group-heading"><h3>{title}</h3>{action}</div>
            {children}
        </div>
    );
}

export function AdminField({ id, label, required, hint, children }: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="admin-field">
            <label htmlFor={id}>{label}{required && <span className="text-red-700" aria-hidden="true"> *</span>}</label>
            {children}
            {hint && <p id={`${id}-hint`}>{hint}</p>}
        </div>
    );
}

export function AdminCheck({ id, label, hint, ...input }: ComponentProps<'input'> & { id: string; label: string; hint?: string }) {
    return (
        <label className="admin-form-check" htmlFor={id}>
            <input id={id} type="checkbox" {...input} />
            <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
        </label>
    );
}

export function AdminFormActions({ cancelHref, note, submitLabel, busyLabel, busy, disabled, icon }: {
    cancelHref: string;
    note: string;
    submitLabel: string;
    busyLabel: string;
    busy: boolean;
    disabled?: boolean;
    icon?: ReactNode;
}) {
    const { t } = useAdminText();
    const router = useRouter();
    return (
        <footer className="admin-form-actions">
            <p>{note}</p>
            <div>
                <Button type="button" variant="outline" disabled={busy} onClick={() => router.push(cancelHref)}>{t('Hủy', 'Cancel')}</Button>
                <Button type="submit" disabled={busy || disabled}>
                    {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : icon}
                    {busy ? busyLabel : submitLabel}
                </Button>
            </div>
        </footer>
    );
}

export function AdminFormLoading() {
    const { t } = useAdminText();
    return (
        <div className="admin-form-loading" role="status">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-72 w-full" />
            <span>{t('Đang tải dữ liệu…', 'Loading…')}</span>
        </div>
    );
}
