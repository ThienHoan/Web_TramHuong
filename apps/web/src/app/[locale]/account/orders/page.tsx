
'use client';

import { useEffect, useState } from 'react';
import { getMyOrders, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';

export default function MyOrdersPage() {
    const { session, user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (session) {
            setAccessToken(session.access_token);
            getMyOrders().then(data => {
                setOrders(data);
                setLoading(false);
            });
        }
    }, [user, session, authLoading, router]);

    if (loading) return <div className="p-8 text-center">Loading orders...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">My Orders</h1>

                {orders.length === 0 ? (
                    <p>No orders found.</p>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white p-6 rounded shadow-sm border border-gray-100">
                                <div className="flex justify-between mb-4 border-b pb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                                            }`}>
                                            {order.status}
                                        </span>
                                        <p className="font-bold mt-1">${order.total_amount}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-4 text-sm">
                                            <div className="w-10 h-10 bg-gray-100 relative">
                                                <ProductImage src={item.product?.images?.[0]} alt="Product" />
                                            </div>
                                            <span className="flex-1">{item.product?.slug || 'Unknown Product'}</span>
                                            <span>x{item.quantity}</span>
                                            <span>${item.subtotal}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
