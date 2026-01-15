import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { API_URL } from '@/services/base-http';

const EVENT_API = `${API_URL}/user-events`;
const THROTTLE_MS = 60000; // 60 seconds - don't track same product+event within this window

export function useProductTracking() {
    const { session } = useAuth();
    const [sessionId, setSessionId] = useState<string>('');

    // Track recently sent events to prevent duplicates
    const recentEventsRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        // Initialize Session ID for guests
        let sid = localStorage.getItem('guest_session_id');
        if (!sid) {
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
        if (!sessionId) return;

        // Throttle: Check if we recently tracked this event
        const eventKey = `${eventType}:${productId}`;
        const lastSent = recentEventsRef.current.get(eventKey);
        const now = Date.now();

        if (lastSent && (now - lastSent) < THROTTLE_MS) {
            // Skip - already tracked recently
            return;
        }

        // Update throttle map
        recentEventsRef.current.set(eventKey, now);

        // Clean up old entries (prevent memory leak)
        if (recentEventsRef.current.size > 100) {
            const cutoff = now - THROTTLE_MS;
            recentEventsRef.current.forEach((time, key) => {
                if (time < cutoff) recentEventsRef.current.delete(key);
            });
        }

        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // Fire and forget
            fetch(EVENT_API, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    eventType,
                    productId,
                    sessionId,
                    metadata
                }),
            }).catch(err => console.error('Tracking error:', err));

        } catch (e) {
            console.error('Tracking failed', e);
        }
    }, [sessionId, session]);

    return { trackEvent };
}

