
'use client';

import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { createOrder, setAccessToken } from '@/lib/api-client';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';
import ProductImage from '@/components/ui/ProductImage';

export default function CheckoutPage() {
    const { items, total, updateQuantity, removeItem, clearCart } = useCart();
    const { user, session } = useAuth();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCheckout = async () => {
        if (!user || !session) {
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            setAccessToken(session.access_token);
            const orderItems = items.map(i => ({ productId: i.id, quantity: i.quantity }));
            await createOrder(orderItems);

            clearCart();
            router.push('/account/orders');
            alert('Order placed successfully!');
        } catch (e: any) {
            alert('Checkout failed: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl mb-4">Your cart is empty</h1>
                <button onClick={() => router.push('/products')} className="underline">Continue Shopping</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="md:col-span-2 space-y-4">
                    <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
                    {items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded shadow-sm flex gap-4 items-center">
                            <div className="w-20 h-20 bg-gray-100 flex-shrink-0 relative">
                                <ProductImage src={item.image} alt={item.title} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{item.title}</h3>
                                <p className="text-sm text-gray-500">${item.price}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => updateQuantity(item.id, -1)} className="px-2 border rounded">-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="px-2 border rounded">+</button>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-red-500 text-sm">Remove</button>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded shadow-sm sticky top-24">
                        <h2 className="text-xl font-bold mb-4">Summary</h2>
                        <div className="flex justify-between mb-2">
                            <span>Subtotal</span>
                            <span>${total}</span>
                        </div>
                        <div className="flex justify-between mb-6 font-bold text-lg border-t pt-4">
                            <span>Total</span>
                            <span>${total}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="w-full bg-black text-white py-3 rounded font-medium hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Place Order'}
                        </button>
                        {!user && (
                            <p className="text-xs text-red-500 mt-2 text-center">You must be logged in to checkout.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
