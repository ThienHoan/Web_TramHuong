
'use client';

import { useEffect, useState } from 'react';
import { getMyOrders, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';

import { useCurrency } from '@/hooks/useCurrency';

export default function MyOrdersPage() {
    const { session, user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { formatPrice } = useCurrency();

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

    // Helper to calculate time remaining
    const getTimeRemaining = (deadline: string) => {
        const diff = new Date(deadline).getTime() - Date.now();
        if (diff <= 0) return 'EXPIRED';

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Real-time countdown component
    const PaymentCountdown = ({ deadline }: { deadline: string }) => {
        const [time, setTime] = useState(getTimeRemaining(deadline));

        useEffect(() => {
            const interval = setInterval(() => {
                setTime(getTimeRemaining(deadline));
            }, 1000);

            return () => clearInterval(interval);
        }, [deadline]);

        if (time === 'EXPIRED') {
            return (
                <div className="mt-2 text-sm text-red-600 font-medium">
                    ⚠️ Payment deadline expired
                </div>
            );
        }

        return (
            <div className="mt-2 text-sm text-orange-600 font-medium">
                ⏰ Pay within: {time}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center">Loading orders...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">My Orders</h1>

                {orders.length === 0 ? (
                    <p>No orders found.</p>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => {
                            const isAwaitingPayment = order.status === 'AWAITING_PAYMENT';
                            const isExpired = order.payment_deadline &&
                                new Date(order.payment_deadline).getTime() <= Date.now();

                            return (
                                <div key={order.id} className="bg-white p-6 rounded shadow-sm border border-gray-100">
                                    <div className="flex justify-between mb-4 border-b pb-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                                            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'AWAITING_PAYMENT' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                                                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                                                }`}>
                                                {order.status}
                                            </span>
                                            <p className="font-bold mt-1">{formatPrice(Number(order.total_amount || order.total || 0))}</p>

                                            {/* Payment action buttons */}
                                            {isAwaitingPayment && !isExpired && (
                                                <div className="mt-3">
                                                    <Link
                                                        href={`/checkout/payment?id=${order.id}`}
                                                        className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
                                                    >
                                                        💳 Pay Now
                                                    </Link>
                                                    {order.payment_deadline && (
                                                        <PaymentCountdown deadline={order.payment_deadline} />
                                                    )}
                                                </div>
                                            )}

                                            {isAwaitingPayment && isExpired && (
                                                <div className="mt-3 text-sm text-red-600">
                                                    ❌ Payment expired
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {order.items?.map((item: any, index: number) => {
                                            // Support both old structure (nested product) and new snapshot (flat)
                                            const title = item.title || item.product?.title || item.product?.slug || 'Unknown Product';
                                            const image = item.image || item.product?.images?.[0] || item.product?.image;

                                            return (
                                                <div key={`${order.id}-item-${index}`} className="flex items-center gap-4 text-sm">
                                                    <div className="w-10 h-10 bg-gray-100 relative overflow-hidden rounded">
                                                        <ProductImage src={image} alt={title} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{title}</p>
                                                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                                    </div>
                                                    <span>{formatPrice(Number((item.price || 0) * item.quantity))}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
