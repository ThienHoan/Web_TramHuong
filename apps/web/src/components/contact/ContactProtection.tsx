'use client';

import { Button } from '@/components/ui/button';
import type { useContactProtection } from '@/hooks/useContactProtection';

export function ContactProtection({ protection, locale, disabled = false }: {
    protection: ReturnType<typeof useContactProtection>;
    locale: string;
    disabled?: boolean;
}) {
    if (protection.mode === 'disabled') return null;
    const vi = locale === 'vi';
    const buttonClass = 'h-11 shrink-0 border-trad-border-warm bg-trad-bg-light px-4 text-trad-text-main shadow-none';
    if (protection.mode === 'loading') return <p role="status" className="text-sm text-stone-600">{vi ? 'Đang tải xác minh…' : 'Loading verification…'}</p>;
    if (protection.mode === 'unavailable') return <div className="space-y-2 rounded-xl border border-trad-border-warm bg-trad-bg-light p-4">
        <p role="alert" className="text-sm text-trad-text-main">{vi ? 'Chưa tải được xác minh. Vui lòng thử lại.' : 'Verification is unavailable. Please try again.'}</p>
        <Button variant="outline" type="button" className={buttonClass} disabled={disabled} onClick={() => void protection.refresh()}>{vi ? 'Tải lại xác minh' : 'Reload verification'}</Button>
    </div>;

    const error = protection.error === 'expired'
        ? vi ? 'Xác minh đã hết hạn. Vui lòng xác minh lại.' : 'Verification expired. Please verify again.'
        : protection.error ? vi ? 'Xác minh chưa thành công. Vui lòng thử lại.' : 'Verification failed. Please try again.' : null;
    return <div className="space-y-3 rounded-xl border border-trad-border-warm bg-trad-bg-light p-4" aria-label={vi ? 'Xác minh thử nghiệm' : 'Test verification'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <p className="text-sm font-medium text-trad-text-main">{vi ? 'Xác minh trước khi gửi' : 'Verify before sending'}</p>
                <p className="mt-1 text-xs text-stone-600">{vi ? 'Thử nghiệm tại máy — chưa phải chống bot thực tế.' : 'Local test mode — real bot protection is not active.'}</p>
            </div>
            <Button variant="outline" type="button" className={buttonClass} disabled={disabled || protection.busy || !!protection.token} onClick={() => void protection.verify()}>
                {protection.busy ? vi ? 'Đang xác minh…' : 'Verifying…' : protection.token ? vi ? 'Đã xác minh' : 'Verified' : vi ? 'Xác minh thử nghiệm' : 'Verify test challenge'}
            </Button>
        </div>
        <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-red-700' : 'text-stone-600'}`}>
            {error ?? (protection.token ? vi ? 'Bạn có thể gửi lời nhắn.' : 'You can now send your message.' : vi ? 'Vui lòng xác minh để tiếp tục.' : 'Please verify to continue.')}
        </p>
    </div>;
}
