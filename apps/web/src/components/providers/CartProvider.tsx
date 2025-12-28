
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

export interface CartItem {
    key: string;        // Unique ID (Server ID or Composite for local)
    productId: string;  // Product ID 
    id: string;         // Alias for Product ID (Legacy compatibility)
    slug: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
    variantId?: string | null;
    variantName?: string | null;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity' | 'key' | 'productId' | 'id'> & { id: string, quantity?: number, variantId?: string, variantName?: string }) => void;
    removeItem: (key: string) => void;
    updateQuantity: (key: string, delta: number) => void;
    clearCart: () => void;
    total: number;
    count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { user, session } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [initialized, setInitialized] = useState(false);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // 1. Initial Load (Guest) or Sync (User)
    useEffect(() => {
        const loadCart = async () => {
            if (user && session) {
                // USER MODE
                const localCart = JSON.parse(localStorage.getItem('cart') || '[]');

                if (localCart.length > 0) {
                    // Merge local items to server
                    try {
                        await fetch(`${API_URL}/cart/merge`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify({ items: localCart.map((i: any) => ({ ...i, id: i.productId })) })
                        });
                        localStorage.removeItem('cart'); // Clear local after merge
                    } catch (e) {
                        console.error('Failed to merge cart', e);
                    }
                }

                // Fetch latest cart from server
                try {
                    const res = await fetch(`${API_URL}/cart`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Map backend format to frontend CartItem
                        const mapped = data.map((i: any) => ({
                            key: i.cartItemId,
                            productId: i.id,
                            id: i.id,
                            slug: i.slug,
                            title: i.title,
                            price: i.price,
                            image: i.image,
                            quantity: i.quantity,
                            variantId: i.variantId,
                            variantName: i.variantName
                        }));
                        setItems(mapped);
                    }
                } catch (e) {
                    console.error('Failed to fetch cart', e);
                }
            } else {
                // GUEST MODE
                const saved = localStorage.getItem('cart');
                if (saved) {
                    setItems(JSON.parse(saved));
                } else {
                    setItems([]);
                }
            }
            setInitialized(true);
        };

        loadCart();
    }, [user, session]);

    // 2. Persist to Local Storage (Only for guests)
    useEffect(() => {
        if (!user && initialized) {
            localStorage.setItem('cart', JSON.stringify(items));
        }
    }, [items, user, initialized]);

    const addItem = async (newItem: Omit<CartItem, 'quantity' | 'key' | 'productId'> & { quantity?: number, id: string }) => {
        const qtyToAdd = newItem.quantity || 1;
        const variantId = newItem.variantId || null;

        // Optimistic Unique Key Generation for new items (Guest or Optimistic UI)
        // For Guest: Composite Key. For User: Temporary until re-fetch, but we reuse composite for matching.
        const compositeKey = `${newItem.id}-${variantId || 'default'}`;

        const oldItems = [...items];

        setItems(prev => {
            // Check existence by Product + Variant
            const existingIndex = prev.findIndex(i => i.productId === newItem.id && (i.variantId || null) === variantId);

            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex].quantity += qtyToAdd;
                return updated;
            }

            // New Item
            return [...prev, {
                key: user ? `temp-${Date.now()}` : compositeKey, // Temp key for User, stable for guest
                productId: newItem.id,
                id: newItem.id,
                slug: newItem.slug,
                title: newItem.title,
                price: newItem.price,
                image: newItem.image,
                quantity: qtyToAdd,
                variantId: variantId,
                variantName: newItem.variantName || null
            }];
        });

        if (user && session) {
            try {
                // We don't rely only on optimistic key here, we call API
                await fetch(`${API_URL}/cart/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        productId: newItem.id,
                        quantity: qtyToAdd,
                        variantId: variantId,
                        variantName: newItem.variantName
                    })
                });

                // Re-fetch to get real server IDs (Keys)
                // This replaces the optimistic item with the real one (Cleanest way)
                const res = await fetch(`${API_URL}/cart`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const mapped = data.map((i: any) => ({
                        key: i.cartItemId,
                        productId: i.id,
                        id: i.id,
                        slug: i.slug,
                        title: i.title,
                        price: i.price,
                        image: i.image,
                        quantity: i.quantity,
                        variantId: i.variantId,
                        variantName: i.variantName
                    }));
                    setItems(mapped);
                }

            } catch (e) {
                console.error('Failed to add item', e);
                setItems(oldItems); // Rollback
            }
        }
    };

    const removeItem = async (key: string) => {
        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.key !== key));

        if (user && session) {
            try {
                // API expects Cart Item ID (which is 'key' in User mode)
                // If the key is temporary (starts with temp-), we should theoretically block or wait, 
                // but usually Remove only happens on loaded items.
                if (!key.startsWith('temp-')) {
                    await fetch(`${API_URL}/cart/items/${key}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                }
            } catch (e) {
                console.error('Failed to remove item', e);
                setItems(oldItems);
            }
        }
    };

    const updateQuantity = async (key: string, delta: number) => {
        const oldItems = [...items];
        let newQty = 0;

        setItems(prev => prev.map(i => {
            if (i.key === key) {
                newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));

        if (user && session) {
            try {
                if (!key.startsWith('temp-')) {
                    await fetch(`${API_URL}/cart/items/${key}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ quantity: newQty })
                    });
                }
            } catch (e) {
                console.error('Failed to update quantity', e);
                setItems(oldItems);
            }
        }
    };

    const clearCart = () => {
        setItems([]);
        if (!user) {
            localStorage.removeItem('cart');
        } else {
            // Optional: Clear server cart too? Usually "Audit" order process does this.
            // If manual clear, we might need an API. For now, we assume this is only used on checkout success (which should be handled by order creation maybe?)
            // Or if user manually clears.
            // Let's leave server sync for clearCart for later or if explicitly requested. 
            // Ideally PlaceOrder should clear the cart on backend.
        }
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
