'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import { setAccessToken } from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import { useCurrency } from '@/hooks/useCurrency';

export default function OrderDetailPage() {
    const { id } = useParams();
    const { session, user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (!authLoading) {
            if (!user || (role !== 'ADMIN' && role !== 'STAFF')) {
                router.push('/');
                return;
            }
            if (session && id) {
                setAccessToken(session.access_token);
                fetch(`${API_URL}/orders/${id}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                    .then(async res => {
                        if (res.ok) {
                            const data = await res.json();
                            setOrder(data);
                        } else {
                            alert('Order not found');
                            router.push('/admin/dashboard');
                        }
                    })
                    .catch(err => console.error(err))
                    .finally(() => setLoading(false));
            }
        }
    }, [id, session, user, role, authLoading, router]);

    if (loading) return <div className="p-10 text-center">Loading Order Details...</div>;
    if (!order) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
    const subtotal = order.items?.reduce((acc: number, item: any) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0) || 0;
    const total = Number(order.total || order.total_amount || 0);

    let shippingFee = 0;
    if (order.shipping_info?.shipping_fee !== undefined) {
        shippingFee = Number(order.shipping_info.shipping_fee);
    } else {
        shippingFee = Math.max(0, total - subtotal);
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24 text-black">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => router.back()} className="mb-4 text-sm text-gray-500 hover:text-black">
                    ← Back to Dashboard
                </button>

                <div className="bg-white shadow rounded-lg overflow-hidden p-6 mb-6">
                    <h1 className="text-2xl font-bold mb-2">Order #{order.id}</h1>
                    <div className="flex gap-4 text-sm text-gray-500 mb-6">
                        <span>Date: {new Date(order.created_at).toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-medium text-black">{order.status}</span>
                    </div>

                    {/* Payment Deadline Info */}
                    {order.payment_deadline && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-yellow-900">Payment Deadline:</span>
                                <span className={order.expired_at ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                    {new Date(order.payment_deadline).toLocaleString()}
                                    {order.expired_at && (
                                        <span className="ml-2 text-red-600">
                                            (Expired at {new Date(order.expired_at).toLocaleString()})
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
                        <div>
                            <h2 className="font-bold text-lg mb-4">Customer Info</h2>
                            <p className="text-sm text-gray-600">User ID: {order.user_id}</p>
                            {/* If we had user profile fetching, we would show email/name here */}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg mb-4">Shipping Info</h2>
                            {order.shipping_info ? (
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><span className="font-medium">Name:</span> {order.shipping_info.name}</p>
                                    <p><span className="font-medium">Phone:</span> {order.shipping_info.phone}</p>
                                    <p><span className="font-medium">Address:</span> {order.shipping_info.address}</p>
                                    <p><span className="font-medium">City/Province:</span> {order.shipping_info.city}</p>
                                </div>
                            ) : (
                                <p className="text-red-500">Missing Shipping Info</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden p-6">
                    <h2 className="font-bold text-lg mb-4">Order Items</h2>
                    <table className="w-full text-left">
                        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="p-3">Product</th>
                                <th className="p-3">Price</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type */}
                            {order.items && order.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {item.image && <Image src={item.image} alt="" width={40} height={40} className="w-10 h-10 object-cover rounded" />}
                                            <span className="text-sm font-medium">{item.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-sm">{formatPrice(Number(item.price || 0))}</td>
                                    <td className="p-3 text-sm">{item.quantity}</td>
                                    <td className="p-3 text-sm text-right font-bold">
                                        {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                            <tr>
                                <td colSpan={3} className="p-3 text-right text-gray-600">Subtotal</td>
                                <td className="p-3 text-right font-medium">
                                    {formatPrice(subtotal)}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="p-3 text-right text-gray-600">Shipping Fee</td>
                                <td className="p-3 text-right font-medium text-green-600">
                                    {shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}
                                </td>
                            </tr>
                            <tr className="text-lg bg-gray-100">
                                <td colSpan={3} className="p-4 text-right font-bold">Total Amount</td>
                                <td className="p-4 text-right font-bold text-green-700">
                                    {formatPrice(total)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
