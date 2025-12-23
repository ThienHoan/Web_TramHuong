'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';
import OrderRow from '@/components/admin/OrderRow';
import Pagination from '@/components/ui/Pagination';
import { ADMIN_PAGE_LIMIT } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
    last_sign_in_at?: string;
    avatar_url?: string;
    is_banned: boolean;
}

export default function AdminUserDetailPage() {
    const { id } = useParams();
    const { session, role, loading: authLoading } = useAuth();
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: ADMIN_PAGE_LIMIT, last_page: 1 });
    const [loading, setLoading] = useState(true);

    // Fetch User Info
    useEffect(() => {
        if (!session || !id) return;

        fetch(`${API_URL}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('User not found');
                return res.json();
            })
            .then(data => setUser(data))
            .catch(err => {
                console.error(err);
                router.push('/admin/users');
            });
    }, [id, session, router]);

    // Fetch User Orders
    const fetchUserOrders = useCallback((page = 1) => {
        if (!session || !id) return;
        setLoading(true);

        fetch(`${API_URL}/users/${id}/orders?page=${page}&limit=${ADMIN_PAGE_LIMIT}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setOrders(data.data);
                    setMeta(data.meta);
                } else {
                    setOrders([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id, session]);

    // Initial Fetch
    useEffect(() => {
        if (!authLoading && session) {
            fetchUserOrders(1);
        }
    }, [authLoading, session, fetchUserOrders]);


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

    if (loading && !user) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24 text-black">
            <div className="max-w-7xl mx-auto">
                {/* Header / Breadcrumb */}
                <div className="mb-6">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-black mb-2 text-sm">
                        ← Back to Users
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
                </div>

                {/* User Info Card */}
                {user && (
                    <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-2xl">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="Ava" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.email.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold">{user.full_name || 'No Name'}</h2>
                            <p className="text-gray-500">{user.email}</p>
                            <div className="mt-4 flex gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-400 text-xs uppercase">Role</span>
                                    <span className="font-medium bg-gray-100 px-2 py-1 rounded">{user.role}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 text-xs uppercase">Joined</span>
                                    <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 text-xs uppercase">Status</span>
                                    <span className={`font-medium px-2 py-1 rounded ${user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {user.is_banned ? 'Banned' : 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order History */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
                    <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Order History</h3>
                        <span className="text-gray-400 text-sm">Total: {meta.total} orders</span>
                    </div>

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
                                            This user has no orders yet.
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

                    <div className="border-t border-gray-100">
                        <Pagination
                            meta={meta}
                            onPageChange={(page) => fetchUserOrders(page)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
