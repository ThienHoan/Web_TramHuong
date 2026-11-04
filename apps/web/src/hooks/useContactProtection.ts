'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ContactProtectionMode = 'loading' | 'disabled' | 'mock' | 'unavailable';
export type ContactProtectionError = 'unavailable' | 'retry' | 'expired' | null;

export function useContactProtection() {
    const [mode, setMode] = useState<ContactProtectionMode>('loading');
    const [token, setToken] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ContactProtectionError>(null);
    const mounted = useRef(true);
    const revision = useRef(0);

    const refresh = useCallback(async () => {
        const current = ++revision.current;
        setMode('loading'); setToken(null); setExpiresAt(null); setError(null); setBusy(false);
        try {
            const response = await fetch('/api/contacts/protection', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error();
            const value: unknown = await response.json();
            if (!value || typeof value !== 'object' || !('mode' in value) || !['disabled','mock','unavailable'].includes(String(value.mode))) throw new Error();
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
            const response = await fetch('/api/contacts/protection/challenge', { method: 'POST', signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error();
            const value: unknown = await response.json();
            if (!value || typeof value !== 'object' || !('mode' in value) || value.mode !== 'mock' || !('token' in value) || typeof value.token !== 'string' || !value.token || value.token.length > 2048 || !('expiresAt' in value) || typeof value.expiresAt !== 'string') throw new Error();
            const expiration = Date.parse(value.expiresAt);
            if (!Number.isFinite(expiration) || expiration <= Date.now() || expiration > Date.now() + 301000) throw new Error();
            if (mounted.current && revision.current === current) { setToken(value.token); setExpiresAt(expiration); }
        } catch {
            if (mounted.current && revision.current === current) setError('retry');
        } finally { if (mounted.current && revision.current === current) setBusy(false); }
    }, [mode, busy]);

    useEffect(() => {
        if (!expiresAt) return;
        const timer = setTimeout(() => { setToken(null); setExpiresAt(null); setError('expired'); }, Math.max(0, expiresAt - Date.now()));
        return () => clearTimeout(timer);
    }, [expiresAt]);

    const resetToken = useCallback(() => { setToken(null); setExpiresAt(null); setError(null); }, []);
    const canSubmit = mode === 'disabled' || (mode === 'mock' && !!token && !!expiresAt && expiresAt > Date.now() && !busy);
    return { mode, token, busy, error, canSubmit, refresh, verify, resetToken };
}
