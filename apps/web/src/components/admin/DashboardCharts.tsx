'use client';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { useCurrency } from '../../hooks/useCurrency';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
export default function DashboardCharts({ data }: { data: any }) {
    const { formatPrice } = useCurrency();

    if (!data) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Revenue Trend</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.revenueChart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickFormatter={(val) => new Intl.NumberFormat('en', { notation: 'compact' }).format(val)}
                            />
                            <Tooltip
                                formatter={(value: unknown) => formatPrice(Number(value))}
                                labelStyle={{ color: '#333' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Status</h3>
                <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.statusChart}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type */}
                                {data.statusChart.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
