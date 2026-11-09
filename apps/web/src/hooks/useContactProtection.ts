'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ContactProtectionMode = 'loading' | 'disabled' | 'mock' | 'cloudflare' | 'unavailable';
export type ContactProtectionError = 'unavailable' | 'retry' | 'expired' | null;

// Cloudflare tokens are valid for 300 s and single-use (Turnstile docs).
const CLOUDFLARE_TOKEN_TTL_MS = 290000;
const SITE_KEY = /^[0-9A-Za-z_-]{10,100}$/;

/** contact and checkout are verified by our API; account tokens go to Supabase Auth. */
export type ProtectionAction = 'contact' | 'checkout' | 'account';

export function useContactProtection(action: ProtectionAction = 'contact') {
    const [mode, setMode] = useState<ContactProtectionMode>('loading');
    const [siteKey, setSiteKey] = useState<string | null>(null);
    const [testKeys, setTestKeys] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ContactProtectionError>(null);
    const mounted = useRef(true);
    const revision = useRef(0);
    const widgetReset = useRef<(() => void) | null>(null);

    const refresh = useCallback(async () => {
        const current = ++revision.current;
        setMode('loading'); setToken(null); setExpiresAt(null); setError(null); setBusy(false); setSiteKey(null); setTestKeys(false);
        try {
            const response = await fetch('/api/contacts/protection', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error();
            const value: unknown = await response.json();
            if (!value || typeof value !== 'object' || !('mode' in value) || !['disabled', 'mock', 'cloudflare', 'unavailable'].includes(String(value.mode))) throw new Error();
            if (value.mode === 'cloudflare') {
                // Only the public site key is ever sent; the secret stays on the backend.
                if (!('siteKey' in value) || typeof value.siteKey !== 'string' || !SITE_KEY.test(value.siteKey) || !('testKeys' in value) || typeof value.testKeys !== 'boolean') throw new Error();
                if (mounted.current && revision.current === current) { setSiteKey(value.siteKey); setTestKeys(value.testKeys); }
            }
            if (mounted.current && revision.current === current) setMode(value.mode as ContactProtectionMode);
        } catch {
            if (mounted.current && revision.current === current) { setMode('unavailable'); setError('unavailable'); }
        }
    }, []);

    const cancelPending = useCallback(() => { mounted.current = false; revision.current++; }, []);
    useEffect(() => {
        mounted.current = true;
        void Promise.resolve().then(() => { if (mounted.current) void refresh(); });
        return cancelPending;
    }, [refresh, cancelPending]);

    const verify = useCallback(async () => {
        if (mode !== 'mock' || busy) return;
        const current = ++revision.current;
        setBusy(true); setError(null); setToken(null); setExpiresAt(null);
        try {
            const response = await fetch('/api/contacts/protection/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }), signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error();
            const value: unknown = await response.json();
            if (!value || typeof value !== 'object' || !('mode' in value) || value.mode !== 'mock' || !('token' in value) || typeof value.token !== 'string' || !value.token || value.token.length > 2048 || !('expiresAt' in value) || typeof value.expiresAt !== 'string') throw new Error();
            const expiration = Date.parse(value.expiresAt);
            if (!Number.isFinite(expiration) || expiration <= Date.now() || expiration > Date.now() + 301000) throw new Error();
            if (mounted.current && revision.current === current) { setToken(value.token); setExpiresAt(expiration); }
        } catch {
            if (mounted.current && revision.current === current) setError('retry');
        } finally { if (mounted.current && revision.current === current) setBusy(false); }
    }, [mode, busy, action]);

    // Cloudflare widget callbacks (stable identities so the widget is rendered once).
    const acceptToken = useCallback((value: unknown) => {
        if (!mounted.current) return;
        if (typeof value !== 'string' || !value || value.length > 2048) { setToken(null); setExpiresAt(null); setError('retry'); return; }
        setToken(value); setExpiresAt(Date.now() + CLOUDFLARE_TOKEN_TTL_MS); setError(null);
    }, []);
    const clearToken = useCallback((reason: Exclude<ContactProtectionError, null>) => {
        if (!mounted.current) return;
        setToken(null); setExpiresAt(null); setError(reason);
    }, []);
    const bindWidgetReset = useCallback((reset: (() => void) | null) => { widgetReset.current = reset; }, []);

    useEffect(() => {
        if (!expiresAt) return;
        const timer = setTimeout(() => {
            setToken(null); setExpiresAt(null); setError('expired');
            widgetReset.current?.();
        }, Math.max(0, expiresAt - Date.now()));
        return () => clearTimeout(timer);
    }, [expiresAt]);

    // After any submit the token is spent (or rejected): Cloudflare needs a fresh one.
    const resetToken = useCallback(() => {
        setToken(null); setExpiresAt(null); setError(null);
        widgetReset.current?.();
    }, []);
    const hasToken = !!token && !!expiresAt && expiresAt > Date.now();
    const canSubmit = mode === 'disabled' || ((mode === 'mock' || mode === 'cloudflare') && hasToken && !busy);
    return { action, mode, siteKey, testKeys, token, busy, error, canSubmit, refresh, verify, resetToken, acceptToken, clearToken, bindWidgetReset };
}
