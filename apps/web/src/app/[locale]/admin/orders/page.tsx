'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import { useCurrency } from '@/hooks/useCurrency';
import Pagination from '@/components/ui/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_LIMIT = 20;

export default function AdminOrdersPage() {
    const { session, user, role, loading: authLoading } = useAuth();
    const { formatPrice } = useCurrency();
    const [orders, setOrders] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: PAGE_LIMIT, last_page: 1 });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchOrders = (page = 1) => {
        if (!session) return;
        setLoading(true);
        fetch(`${API_URL}/orders?page=${page}&limit=${PAGE_LIMIT}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setOrders(data.data);
                    setMeta(data.meta);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (role !== 'ADMIN' && role !== 'STAFF') {
                router.push('/');
            } else if (session) {
                fetchOrders(1);
            }
        }
    }, [user, session, role, authLoading, router]);

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        if (!session) return;
        try {
            const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const updatedOrder = await res.json();
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updatedOrder.status } : o));
            } else {
                const err = await res.json();
                alert(`Failed: ${err.message}`);
            }
        } catch (e) {
            alert('Connection Error updating status');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24 text-black">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                            Orders Management
                        </h1>
                        <p className="text-gray-500 mt-1">Manage and track customer orders.</p>
                    </div>
                    <span className="bg-amber-900 text-white px-3 py-1 text-xs font-bold tracking-widest uppercase rounded">
                        {role} Mode
                    </span>
                </div>

                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="p-4">Order Info</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Status & Action</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400">
                                            No orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map(order => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            onStatusUpdate={handleStatusUpdate}
                                            formatPrice={formatPrice}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border-t border-gray-100 mt-4">
                    <Pagination
                        meta={meta}
                        onPageChange={(page) => fetchOrders(page)}
                    />
                </div>
            </div>
        </div>
    );
}

function OrderRow({ order, onStatusUpdate, formatPrice }: any) {
    const getTimeInfo = (order: any) => {
        if (!order.payment_deadline) return null;

        // Only show timing info for AWAITING_PAYMENT and EXPIRED statuses
        if (order.status !== 'AWAITING_PAYMENT' && order.status !== 'EXPIRED') {
            return null;
        }

        const deadline = new Date(order.payment_deadline).getTime();
        const now = Date.now();
        const diff = deadline - now;

        if (order.status === 'EXPIRED') {
            return {
                text: 'Payment expired',
                color: 'text-red-600',
                icon: '❌'
            };
        }

        // For AWAITING_PAYMENT status
        if (diff <= 0) {
            return {
                text: 'Expiring soon',
                color: 'text-red-600',
                icon: '⚠️'
            };
        }

        const minutes = Math.floor(diff / 60000);

        if (minutes < 5) {
            return {
                text: `${minutes}min left`,
                color: 'text-orange-600',
                icon: '⏰'
            };
        }

        return {
            text: `${minutes}min left`,
            color: 'text-gray-500',
            icon: '⏱️'
        };
    };

    const statusColors: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-700',
        AWAITING_PAYMENT: 'bg-blue-100 text-blue-700',
        PAID: 'bg-green-100 text-green-700',
        SHIPPED: 'bg-blue-100 text-blue-700',
        COMPLETED: 'bg-purple-100 text-purple-700',
        CANCELED: 'bg-red-100 text-red-700',
        EXPIRED: 'bg-gray-100 text-gray-700'
    };

    const timeInfo = getTimeInfo(order);

    return (
        <tr className="hover:bg-gray-50/50 transition-colors">
            <td className="p-4">
                <div className="font-medium text-gray-900">#{order.id.slice(0, 8)}</div>
                <div className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </div>
            </td>
            <td className="p-4">
                <div className="font-medium text-gray-800">{order.shipping_info?.name || 'N/A'}</div>
                <div className="text-xs text-gray-500">{order.shipping_info?.phone || ''}</div>
            </td>
            <td className="p-4">
                <div className="space-y-2">
                    <select
                        value={order.status}
                        onChange={(e) => onStatusUpdate(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold w-full ${statusColors[order.status] || 'bg-gray-100'}`}
                    >
                        <option value="PENDING">PENDING</option>
                        <option value="AWAITING_PAYMENT">AWAITING PAYMENT</option>
                        <option value="PAID">PAID</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELED">CANCELED</option>
                        <option value="EXPIRED">EXPIRED</option>
                    </select>

                    {timeInfo && (
                        <div className={`text-xs flex items-center gap-1 ${timeInfo.color}`}>
                            <span>{timeInfo.icon}</span>
                            <span className="font-medium">{timeInfo.text}</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="p-4 font-semibold text-amber-700">
                {formatPrice(Number(order.total || order.total_amount || 0))}
            </td>
            <td className="p-4">
                <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-amber-900 hover:underline text-sm font-medium"
                >
                    View Details →
                </Link>
            </td>
        </tr>
    );
}
