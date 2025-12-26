'use client';

import { useState } from 'react';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import { useCurrency } from '../../../../hooks/useCurrency';
import DashboardCharts from '../../../../components/admin/DashboardCharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
    const [range, setRange] = useState('7d');
    const { data, isLoading, error } = useAnalytics(range);
    const { formatPrice } = useCurrency();

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900"></div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen text-red-500">
            Failed to load dashboard data. Please try again.
        </div>
    );

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24 text-black">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                            Dashboard Overview
                        </h1>
                        <p className="text-gray-500 mt-1">Track your business performance throughout the selected period.</p>
                    </div>

                    {/* Time Range Filter */}
                    <div className="flex gap-2">
                        {['7d', '30d', 'all'].map((r) => (
                            <Button
                                key={r}
                                onClick={() => setRange(r)}
                                variant={range === r ? 'default' : 'outline'}
                                size="sm"
                            >
                                {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time'}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Top Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Total Revenue"
                        value={formatPrice(Number(data.summary.totalRevenue || 0))}
                        icon="💰"
                        color="bg-emerald-50 text-emerald-700 border-emerald-100"
                    />
                    <MetricCard
                        title="Total Orders"
                        value={data.summary.totalOrders}
                        icon="📦"
                        color="bg-blue-50 text-blue-700 border-blue-100"
                    />
                    <MetricCard
                        title="Pending Orders"
                        value={data.summary.pendingOrders}
                        icon="⏳"
                        color="bg-amber-50 text-amber-700 border-amber-100"
                    />
                </div>

                {/* Charts Section */}
                <DashboardCharts data={data} />

                {/* Top Products Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Top Selling Products</h3>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            Based on {range === '7d' ? 'Last 7 Days' : range === 'all' ? 'All Time' : 'Last 30 Days'}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">Rank</th>
                                    <th className="p-4 font-medium">Product Name</th>
                                    <th className="p-4 font-medium text-right">Sold</th>
                                    <th className="p-4 font-medium text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.topProducts.map((product: any, index: number) => (
                                    <tr key={product.name} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-gray-500 font-medium w-16">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </td>
                                        <td className="p-4 font-medium text-gray-800">{product.name}</td>
                                        <td className="p-4 text-right text-gray-600">{product.quantity}</td>
                                        <td className="p-4 text-right font-medium text-amber-700">
                                            {formatPrice(Number(product.revenue || 0))}
                                        </td>
                                    </tr>
                                ))}
                                {data.topProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                                            No sales data available for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, color }: any) {
    // Extract text color class
    const textColor = color.includes('emerald') ? 'text-emerald-700'
        : color.includes('blue') ? 'text-blue-700'
            : 'text-amber-700';

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <span className="text-4xl opacity-50">{icon}</span>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
            </CardContent>
        </Card>
    );
}
