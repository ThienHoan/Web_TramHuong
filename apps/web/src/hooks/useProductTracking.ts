import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { API_URL } from '@/services/base-http';

const EVENT_API = `${API_URL}/user-events`;

export function useProductTracking() {
    const { session } = useAuth();
    const [sessionId, setSessionId] = useState<string>('');

    useEffect(() => {
        // Initialize Session ID for guests
        let sid = localStorage.getItem('guest_session_id');
        if (!sid) {
            // Fallback for environments where crypto.randomUUID might be missing
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                sid = crypto.randomUUID();
            } else {
                sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
            }
            localStorage.setItem('guest_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    const trackEvent = useCallback(async (
        eventType: 'view' | 'click' | 'add_to_cart' | 'wishlist' | 'purchase',
        productId: string,
        metadata?: Record<string, any>
    ) => {
        if (!sessionId) return; // Wait for init

        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // Fire and forget (don't block UI)
            fetch(EVENT_API, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    eventType,
                    productId,
                    sessionId, // Always send session ID
                    metadata
                }),
            }).catch(err => console.error('Tracking error:', err));

        } catch (e) {
            console.error('Tracking failed', e);
        }
    }, [sessionId, session]);

    return { trackEvent };
}
