
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

interface CartItem {
    id: string; // Product ID
    slug: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
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
                            body: JSON.stringify({ items: localCart })
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
                        setItems(data);
                    }
                } catch (e) {
                    console.error('Failed to fetch cart', e);
                }
            } else {
                // GUEST MODE
                // Only load from local if not already loaded to avoid overwriting if we just logged out
                // Actually, for guest, we just trust local storage
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
    }, [user, session]); // Re-run when user/session changes

    // 2. Persist to Local Storage (Only for guests)
    useEffect(() => {
        if (!user && initialized) {
            localStorage.setItem('cart', JSON.stringify(items));
        }
    }, [items, user, initialized]);

    const addItem = async (newItem: Omit<CartItem, 'quantity'>) => {
        // Optimistic Update
        const oldItems = [...items];
        setItems(prev => {
            const existing = prev.find(i => i.id === newItem.id);
            if (existing) {
                return prev.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...newItem, quantity: 1 }];
        });

        if (user && session) {
            try {
                await fetch(`${API_URL}/cart/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ productId: newItem.id, quantity: 1 })
                });
            } catch (e) {
                console.error('Failed to add item', e);
                setItems(oldItems); // Rollback
            }
        }
    };

    const removeItem = async (id: string) => {
        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.id !== id));

        if (user && session) {
            try {
                await fetch(`${API_URL}/cart/items/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
            } catch (e) {
                console.error('Failed to remove item', e);
                setItems(oldItems);
            }
        }
    };

    const updateQuantity = async (id: string, delta: number) => {
        const oldItems = [...items];
        let newQty = 0;

        setItems(prev => prev.map(i => {
            if (i.id === id) {
                newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));

        if (user && session) {
            try {
                await fetch(`${API_URL}/cart/items/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ quantity: newQty })
                });
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
