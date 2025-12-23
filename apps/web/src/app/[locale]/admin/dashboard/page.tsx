'use client';

import { useEffect, useState } from 'react';
import { setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';
import OrderRow from '@/components/admin/OrderRow';
import Pagination from '@/components/ui/Pagination';
import { ADMIN_PAGE_LIMIT } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminDashboardPage() {
    const { session, user, role, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: ADMIN_PAGE_LIMIT, last_page: 1 });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchOrders = (page = 1) => {
        if (!session) return;
        setLoading(true);
        fetch(`${API_URL}/orders?page=${page}&limit=${ADMIN_PAGE_LIMIT}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setOrders(data.data);
                    setMeta(data.meta);
                } else {
                    setOrders([]); // Fallback
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
                setAccessToken(session.access_token);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24 text-black">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                        <p className="text-gray-500 mt-1">Manage and track customer orders.</p>
                    </div>

                    <span className="bg-black text-white px-3 py-1 text-xs font-bold tracking-widest uppercase">
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
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border-t border-gray-100">
                    <Pagination
                        meta={meta}
                        onPageChange={(page) => fetchOrders(page)}
                    />
                </div>
            </div>
        </div>
    );
}
