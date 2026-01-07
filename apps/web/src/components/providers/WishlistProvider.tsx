'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { getLikedIds, toggleWishlist } from '@/lib/api-client';

interface WishlistContextType {
    items: Set<string>;
    toggle: (productId: string) => Promise<void>;
    loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [items, setItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadWishlist = async () => {
            if (!user) {
                setItems(new Set());
                return;
            }

            setLoading(true);
            try {
                const ids = await getLikedIds();
                if (mounted) setItems(new Set(ids));
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadWishlist();

        return () => {
            mounted = false;
        };
    }, [user]);

    const toggle = async (productId: string) => {
        if (!user) {
            alert('Please login to save favorites!');
            return;
        }

        // Optimistic update
        setItems(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });

        try {
            await toggleWishlist(productId);
        } catch (error) {
            console.error('Failed to toggle wishlist', error);
            // Revert on failure (optional, but good UX)
            setItems(prev => {
                const next = new Set(prev);
                if (next.has(productId)) next.delete(productId);
                else next.add(productId);
                return next;
            });
        }
    };

    return (
        <WishlistContext.Provider value={{ items, toggle, loading }}>
            {children}
        </WishlistContext.Provider>
    );
}

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};
