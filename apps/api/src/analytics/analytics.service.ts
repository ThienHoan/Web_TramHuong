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

        // 2. Fetch Wishlist Stats (Top Wishlisted)
        // Note: Simple count aggregation
        const { data: wishlistData } = await this.client
            .from('wishlists')
            .select('product_id');

        const wishlistCounts: Record<string, number> = {};
        if (wishlistData) {
            wishlistData.forEach((w: any) => {
                wishlistCounts[w.product_id] = (wishlistCounts[w.product_id] || 0) + 1;
            });
        }

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
        const categorySales: Record<string, number> = {}; // New: Category Sales

        let totalRevenue = 0;
        let totalOrders = rawOrders.length;
        let pendingOrders = 0;

        // Fetch Product Info for Mapping (to get Names and Categories)
        // For accurate names/categories, we should ideally join products.
        // For MVP, we rely on info stored in OrderItem or fetch products separately if needed.
        // Assuming OrderItem has snapshot, but might lack Category.
        // If snapshot lacks category, we can't do Category Sales accurately without fetching products.
        // Let's assume Order Items *might* have category or we skip Category Sales if missing.
        // Actually, let's fetch all products to build a dictionary map for Category Lookup.

        const { data: allProducts } = await this.client.from('products').select('id, category:categories(slug), translations:product_translations(title)');
        const productMap: Record<string, { name: string, category: string }> = {};
        if (allProducts) {
            allProducts.forEach((p: any) => {
                const name = p.translations?.[0]?.title || 'Unknown Product';
                const cat = p.category?.slug || 'Uncategorized';
                productMap[p.id] = { name, category: cat };
            });
        }

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
                        const key = item.productId || item.product_id; // Handle case sensitivity
                        const pInfo = productMap[key] || { name: item.title || item.slug, category: 'Uncategorized' };

                        // Product Sales
                        if (!productSales[key]) {
                            productSales[key] = {
                                name: pInfo.name,
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        const qty = item.quantity || 0;
                        const rev = (item.price || 0) * qty;

                        productSales[key].quantity += qty;
                        productSales[key].revenue += rev;

                        // Category Sales
                        const cat = pInfo.category;
                        categorySales[cat] = (categorySales[cat] || 0) + rev;
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

        const topWishlist = Object.entries(wishlistCounts)
            .map(([pid, count]) => {
                const pInfo = productMap[pid];
                return {
                    id: pid,
                    name: pInfo ? pInfo.name : 'Unknown',
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const categoryStats = Object.keys(categorySales).map(cat => ({
            name: cat,
            value: categorySales[cat]
        }));

        return {
            summary: {
                totalRevenue,
                totalOrders,
                pendingOrders
            },
            revenueChart,
            statusChart,
            topProducts,
            topWishlist,
            categoryStats
        };
    }
}
