import { z } from 'zod';

const analyticsSchema = z.object({
    summary: z.object({ totalRevenue: z.coerce.number().finite(), totalOrders: z.coerce.number().finite(), pendingOrders: z.coerce.number().finite() }),
    revenueChart: z.array(z.object({ date: z.string(), revenue: z.coerce.number().finite() })),
    statusChart: z.array(z.object({ name: z.string(), value: z.coerce.number().finite() })),
    topProducts: z.array(z.object({ name: z.string(), quantity: z.coerce.number().finite(), revenue: z.coerce.number().finite() })),
    topWishlist: z.array(z.object({ id: z.string(), name: z.string(), count: z.coerce.number().finite() })),
    categoryStats: z.array(z.object({ name: z.string(), value: z.coerce.number().finite() })),
});

export type AnalyticsData = z.infer<typeof analyticsSchema>;

export class AnalyticsError extends Error {
    constructor(message: string, public readonly status?: number) { super(message); }
}

export async function fetchAnalytics(url: string, token: string): Promise<AnalyticsData> {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
        throw new AnalyticsError(response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : response.status === 403 ? 'Tài khoản này không có quyền xem thống kê quản trị.' : 'Không thể tải thống kê. Vui lòng thử lại.', response.status);
    }
    const payload: unknown = await response.json().catch(() => null);
    const result = analyticsSchema.safeParse(payload);
    if (!result.success) throw new AnalyticsError('Dữ liệu thống kê không hợp lệ. Vui lòng thử lại hoặc kiểm tra máy chủ.');
    return result.data;
}
