
'use client';

import { useEffect, useState } from 'react';
import { setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminDashboardPage() {
    const { session, user, role, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (role !== 'ADMIN' && role !== 'STAFF') {
                router.push('/');
            } else if (session) {
                setAccessToken(session.access_token);
                // Fetch All Orders (Manually here since it wasn't in api-client yet, or we assume it is)
                // Let's implement fetch directly here for speed
                fetch(`${API_URL}/orders`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        setOrders(data);
                        setLoading(false);
                    })
                    .catch(err => console.error(err));
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
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            } else {
                alert('Failed to update status');
            }
        } catch (e) {
            alert('Error updating status');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Admin Dashboard...</div>;

    return (
        <div className="min-h-screen bg-white py-12 px-4 pt-24 text-black">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-bold">
                        {role} ACCESS
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono text-xs">{order.id}</td>
                                    <td className="p-4 text-sm">{order.user_id}</td>
                                    <td className="p-4">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                            className="border rounded p-1 text-sm bg-white"
                                        >
                                            <option value="PENDING">PENDING</option>
                                            <option value="PAID">PAID</option>
                                            <option value="SHIPPED">SHIPPED</option>
                                            <option value="COMPLETED">COMPLETED</option>
                                            <option value="CANCELED">CANCELED</option>
                                        </select>
                                    </td>
                                    <td className="p-4 font-bold">${order.total_amount}</td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {new Date(order.created_at).toLocaleString()}
                                    </td>


                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
