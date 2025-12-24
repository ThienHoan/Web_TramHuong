'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';

interface Order {
    id: string;
    user_id: string;
    status: string;
    total: number;
    created_at: string;
    shipping_info?: any;
}

interface OrderRowProps {
    order: Order;
    onStatusUpdate: (id: string, newStatus: string) => Promise<void>;
}

import { useCurrency } from '@/hooks/useCurrency';

export default function OrderRow({ order, onStatusUpdate }: OrderRowProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { formatPrice } = useCurrency();

    // Status Badge Logic
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'PAID': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'SHIPPED': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
            case 'CANCELED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;

        // Confirmation for Cancellation
        if (newStatus === 'CANCELED') {
            const confirmed = window.confirm('Are you sure you want to CANCEL this order? This will RESTOCK the items.');
            if (!confirmed) return;
        }

        setIsLoading(true);
        await onStatusUpdate(order.id, newStatus);
        setIsLoading(false);
    };

    return (
        <tr className="border-b hover:bg-gray-50 transition-colors">
            <td className="p-4 align-top">
                <div className="font-mono text-xs text-gray-500">{order.id.slice(0, 8)}...</div>
                <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
            </td>
            <td className="p-4 align-top">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={order.user_id}>
                    {/* In real app, we'd fetch user name or display email */}
                    Customer {order.user_id.slice(0, 4)}...
                </div>
                {order.shipping_info && (
                    <div className="text-xs text-gray-500 mt-1">
                        {order.shipping_info.fullName}
                    </div>
                )}
            </td>
            <td className="p-4 align-top">
                <div className="flex flex-col gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)} w-fit`}>
                        {isLoading ? 'Updating...' : order.status}
                    </span>

                    <select
                        value={order.status}
                        onChange={handleStatusChange}
                        disabled={isLoading}
                        className="block w-full text-xs border-gray-300 rounded-md focus:ring-black focus:border-black bg-white"
                    >
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELED">Canceled</option>
                    </select>
                </div>
            </td>
            <td className="p-4 align-top font-bold text-gray-900">
                {formatPrice(Number(order.total))}
            </td>
            <td className="p-4 align-top">
                <button
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                    Details
                </button>
            </td>
        </tr>
    );
}
