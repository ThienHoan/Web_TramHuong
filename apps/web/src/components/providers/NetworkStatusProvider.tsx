'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Network Status Provider
 * Detects online/offline status and shows toast notifications
 * Uses debounce to avoid spam when connection flickers
 */
export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const isOfflineRef = useRef(false);

    const showOfflineToast = useCallback(() => {
        if (!isOfflineRef.current) {
            isOfflineRef.current = true;
            toast.error('Mất kết nối mạng', {
                id: 'network-status', // Unique ID to prevent duplicates
                description: 'Vui lòng kiểm tra kết nối internet của bạn',
                duration: Infinity, // Stay until online
                action: {
                    label: 'Thử lại',
                    onClick: () => window.location.reload()
                }
            });
        }
    }, []);

    const showOnlineToast = useCallback(() => {
        if (isOfflineRef.current) {
            isOfflineRef.current = false;
            toast.success('Đã kết nối lại', {
                id: 'network-status',
                description: 'Kết nối internet đã được khôi phục',
                duration: 3000
            });
        }
    }, []);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const handleOffline = () => {
            // Debounce 500ms to avoid flickering
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(showOfflineToast, 500);
        };

        const handleOnline = () => {
            // Clear any pending offline toast
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            showOnlineToast();
        };

        // Check initial state
        if (!navigator.onLine) {
            showOfflineToast();
        }

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [showOfflineToast, showOnlineToast]);

    return <>{children}</>;
}

export default NetworkStatusProvider;
