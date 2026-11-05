'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { useContactProtection } from '@/hooks/useContactProtection';

type Protection = ReturnType<typeof useContactProtection>;
type TurnstileApi = {
    render: (element: HTMLElement, options: Record<string, unknown>) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId: string) => void;
};
declare global {
    interface Window { turnstile?: TurnstileApi }
}

// Explicit rendering (Cloudflare docs). Loaded once, only in cloudflare mode.
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loader: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    loader ??= new Promise<TurnstileApi>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('TURNSTILE_SCRIPT_TIMEOUT')), 15000);
        const script = document.createElement('script');
        script.src = TURNSTILE_SCRIPT;
        script.async = true;
        script.onload = () => {
            clearTimeout(timer);
            if (window.turnstile?.render) resolve(window.turnstile);
            else reject(new Error('TURNSTILE_SCRIPT_INVALID'));
        };
        script.onerror = () => { clearTimeout(timer); reject(new Error('TURNSTILE_SCRIPT_FAILED')); };
        document.head.appendChild(script);
    }).catch((error: unknown) => {
        loader = null; // allow a later retry (e.g. after an ad blocker is disabled)
        throw error;
    });
    return loader;
}

const buttonClass = 'h-11 shrink-0 border-trad-border-warm bg-trad-bg-light px-4 text-trad-text-main shadow-none';

function CloudflareWidget({ protection, vi, disabled }: { protection: Protection; vi: boolean; disabled: boolean }) {
    const container = useRef<HTMLDivElement>(null);
    const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');
    const [attempt, setAttempt] = useState(0);
    const { siteKey, acceptToken, clearToken, bindWidgetReset } = protection;

    useEffect(() => {
        if (!siteKey) return;
        let cancelled = false;
        let widgetId: string | null = null;
        void Promise.resolve().then(() => { if (!cancelled) setLoad('loading'); });
        loadTurnstile().then((api) => {
            if (cancelled || !container.current) return;
            widgetId = api.render(container.current, {
                sitekey: siteKey,
                action: 'contact',
                theme: 'light',
                language: 'auto',
                callback: (token: unknown) => acceptToken(token),
                'expired-callback': () => clearToken('expired'),
                'error-callback': () => clearToken('retry'),
                'timeout-callback': () => clearToken('retry'),
            });
            bindWidgetReset(() => { if (widgetId) api.reset(widgetId); });
            setLoad('ready');
        }).catch(() => { if (!cancelled) setLoad('failed'); });
        return () => {
            cancelled = true;
            bindWidgetReset(null);
            if (widgetId) window.turnstile?.remove(widgetId);
        };
    }, [siteKey, attempt, acceptToken, clearToken, bindWidgetReset]);

    const error = protection.error === 'expired'
        ? vi ? 'Xác minh đã hết hạn. Vui lòng xác minh lại.' : 'Verification expired. Please verify again.'
        : protection.error ? vi ? 'Xác minh chưa thành công. Vui lòng thử lại.' : 'Verification failed. Please try again.' : null;
    return <div className="space-y-3 rounded-xl border border-trad-border-warm bg-trad-bg-light p-4" aria-label={vi ? 'Xác minh Cloudflare' : 'Cloudflare verification'}>
        <div>
            <p className="text-sm font-medium text-trad-text-main">{vi ? 'Xác minh trước khi gửi' : 'Verify before sending'}</p>
            <p className="mt-1 text-xs text-stone-600">{protection.testKeys
                ? vi ? 'Đang dùng khóa thử của Cloudflare — luôn qua, chưa phải chống bot thật.' : 'Using Cloudflare test keys — always passes, not real bot protection.'
                : vi ? 'Được bảo vệ bởi Cloudflare Turnstile.' : 'Protected by Cloudflare Turnstile.'}</p>
        </div>
        <div ref={container} className="min-h-[65px] max-w-full overflow-hidden" />
        {load === 'failed' ? <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">{vi ? 'Chưa tải được xác minh (có thể do trình chặn quảng cáo hoặc mạng). Vui lòng thử lại.' : 'Verification could not load (possibly an ad blocker or network). Please try again.'}</p>
            <Button variant="outline" type="button" className={buttonClass} disabled={disabled} onClick={() => setAttempt((n) => n + 1)}>{vi ? 'Tải lại xác minh' : 'Reload verification'}</Button>
        </div> : <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-red-700' : 'text-stone-600'}`}>
            {load === 'loading' ? vi ? 'Đang tải xác minh…' : 'Loading verification…'
                : error ?? (protection.token ? vi ? 'Bạn có thể gửi lời nhắn.' : 'You can now send your message.' : vi ? 'Vui lòng hoàn tất xác minh để tiếp tục.' : 'Please complete the verification to continue.')}
        </p>}
    </div>;
}

export function ContactProtection({ protection, locale, disabled = false }: {
    protection: Protection;
    locale: string;
    disabled?: boolean;
}) {
    if (protection.mode === 'disabled') return null;
    const vi = locale === 'vi';
    if (protection.mode === 'loading') return <p role="status" className="text-sm text-stone-600">{vi ? 'Đang tải xác minh…' : 'Loading verification…'}</p>;
    if (protection.mode === 'unavailable') return <div className="space-y-2 rounded-xl border border-trad-border-warm bg-trad-bg-light p-4">
        <p role="alert" className="text-sm text-trad-text-main">{vi ? 'Chưa tải được xác minh. Vui lòng thử lại.' : 'Verification is unavailable. Please try again.'}</p>
        <Button variant="outline" type="button" className={buttonClass} disabled={disabled} onClick={() => void protection.refresh()}>{vi ? 'Tải lại xác minh' : 'Reload verification'}</Button>
    </div>;
    if (protection.mode === 'cloudflare') return <CloudflareWidget protection={protection} vi={vi} disabled={disabled} />;

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
