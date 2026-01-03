'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import { useCurrency } from '@/hooks/useCurrency';
import Pagination from '@/components/ui/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_LIMIT = 20;

export default function AdminOrdersPage() {
    const { session, user, role, loading: authLoading } = useAuth();
    const { formatPrice } = useCurrency();
    const [orders, setOrders] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: PAGE_LIMIT, last_page: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    const fetchOrders = (page = 1, searchQuery = search) => {
        if (!session) return;
        setLoading(true);
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: PAGE_LIMIT.toString()
        });
        if (searchQuery) {
            queryParams.append('search', searchQuery);
        }

        fetch(`${API_URL}/orders?${queryParams}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(async res => {
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || `Error ${res.status}: Failed to fetch orders`);
                }
                return res.json();
            })
            .then(data => {
                // If API returns success but data structure is valid
                if (data.data) {
                    setOrders(data.data);
                    setMeta(data.meta || { total: 0, page: 1, limit: PAGE_LIMIT, last_page: 1 });
                } else {
                    setOrders([]);
                    setMeta({ total: 0, page: 1, limit: PAGE_LIMIT, last_page: 1 });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                // Clear orders on error to avoid confusion, or keep previous? 
                // Better to show error state, but for now let's clear and user sees "No orders found" or we can add error state UI.
                setOrders([]);
                setMeta({ total: 0, page: 1, limit: PAGE_LIMIT, last_page: 1 });
                setLoading(false);
                // Ideally show a toast or alert here
                if (err.message) alert(err.message);
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchOrders(1, search);
    };

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

    if (loading && !orders.length && !search) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24 text-black">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                            Orders Management
                        </h1>
                        <p className="text-gray-500 mt-1">Manage and track customer orders.</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Search by Order ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-64 shadow-sm"
                                />
                            </div>
                            <Button type="submit" variant="default" className="bg-amber-900 hover:bg-amber-800">
                                Search
                            </Button>
                        </form>
                        <span className="bg-amber-900 text-white px-3 py-1 text-xs font-bold tracking-widest uppercase rounded h-fit">
                            {role} Mode
                        </span>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order Info</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status & Action</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>View</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No orders found.
                                        </TableCell>
                                    </TableRow>
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
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="bg-white border-t border-gray-100 mt-4">
                    <Pagination
                        meta={meta}
                        onPageChange={(page) => fetchOrders(page)}
                    />
                </div>
            </div>
        </div >
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
