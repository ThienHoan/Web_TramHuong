import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AnalyticsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    private get client() {
        return this.supabaseService.getClient();
    }

    async getDashboardData(range: string = '7d') {
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        if (range === '30d') {
            startDate.setDate(now.getDate() - 30);
        } else if (range === 'all') {
            startDate.setFullYear(2000); // Far past
        } else {
            startDate.setDate(now.getDate() - 7); // Default 7d
        }

        // 1. Revenue & Orders Trend (Daily)
        // Note: Supabase/PostgREST doesn't support complex aggregation easily.
        // We will fetch raw data and aggregate in JS for simplicity, 
        // as volume is likely manageable for now. Pro solution would use RPC.
        const { data: rawOrders, error } = await this.client
            .from('orders')
            .select('created_at, total, status, payment_status, items')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw new BadRequestException(error.message);

        // Aggregate Data
        const revenueMap: Record<string, number> = {};
        const statusCounts: Record<string, number> = {
            PENDING: 0,
            PAID: 0,
            SHIPPED: 0,
            COMPLETED: 0,
            CANCELED: 0
        };
        const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
        let totalRevenue = 0;
        let totalOrders = rawOrders.length;
        let pendingOrders = 0;

        rawOrders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('vi-VN'); // DD/MM/YYYY

            // Count Status
            if (statusCounts[order.status] !== undefined) {
                statusCounts[order.status]++;
            }

            if (order.status === 'PENDING') pendingOrders++;

            // Revenue: Only count real money (PAID/SHIPPED/COMPLETED)
            if (['PAID', 'SHIPPED', 'COMPLETED'].includes(order.status) || order.payment_status === 'paid') {
                if (!revenueMap[date]) revenueMap[date] = 0;
                revenueMap[date] += order.total;
                totalRevenue += order.total;

                // Top Products Logic (Only from confirmed orders)
                if (Array.isArray(order.items)) {
                    order.items.forEach((item: any) => {
                        const key = item.productId;
                        if (!productSales[key]) {
                            productSales[key] = {
                                name: item.title || item.slug,
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        productSales[key].quantity += item.quantity;
                        productSales[key].revenue += item.price * item.quantity;
                    });
                }
            }
        });

        // Format for Charts
        const revenueChart = Object.keys(revenueMap).map(date => ({
            date,
            revenue: revenueMap[date]
        }));

        const statusChart = Object.keys(statusCounts).map(name => ({
            name,
            value: statusCounts[name]
        })).filter(item => item.value > 0);

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5); // Top 5

        return {
            summary: {
                totalRevenue,
                totalOrders,
                pendingOrders
            },
            revenueChart,
            statusChart,
            topProducts
        };
    }
}
