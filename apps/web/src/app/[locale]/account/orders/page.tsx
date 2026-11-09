'use client';

import { useEffect, useState } from 'react';
import { getMyOrders, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import AccountNavigation from '@/components/layout/AccountNavigation';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { motion } from 'framer-motion';
import { AppIcon } from "@/components/icons/AppIcon";
import { useBilingual } from '@/hooks/useBilingual';

interface OrderItem {
    title?: string;
    product?: {
        title?: string;
        images?: string[];
    };
    image?: string;
    price: number;
    quantity: number;
}

interface Order {
    id: string;
    status: string;
    created_at: string;
    total_amount?: number;
    total?: number;
    items?: OrderItem[];
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    last_page: number;
}

export default function MyOrdersPage() {
    const { t } = useBilingual();
    const { session, user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, last_page: 1 });
    const router = useRouter();
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        if (!session) return;

        // Set access token and then fetch orders (don't call setLoading(true) synchronously)
        setAccessToken(session.access_token);

        // Use a flag to track if this is the first render to avoid duplicate loading state
        const shouldSetLoading = orders.length === 0 || page > 1;
        if (!shouldSetLoading) {
            // If we already have orders, just fetch without resetting loading
        }

        getMyOrders(page).then(response => {
            const data = response.data || [];
            setOrders(data);
            if (response.meta) setMeta(response.meta as PaginationMeta);
            setLoading(false);
        });
    }, [user, session, authLoading, router, page, orders.length]);

    const filteredOrders = orders.filter(order => {
        if (filter === 'ALL') return true;
        if (filter === 'ACTIVE') return ['PENDING', 'AWAITING_PAYMENT', 'PROCESSING', 'SHIPPING'].includes(order.status);
        if (filter === 'COMPLETED') return ['COMPLETED', 'PAID', 'DELIVERED', 'CANCELED', 'EXPIRED'].includes(order.status);
        return true;
    });

    if (loading) return (
        <div className="atelier-page min-h-screen flex items-center justify-center bg-[#ECEAE4]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#785538]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#ECEAE4] text-stone-800 font-sans flex flex-col transition-colors duration-300 relative">
            {/* Background Texture & Blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'noise\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.8\\' numOctaves=\\'3\\' stitchTiles=\\'stitch\\'/%3E%3C/filter%3E%3Crect width=\\'100\\' height=\\'100\\' filter=\\'url(%23noise)\\' opacity=\\'0.08\\'/%3E%3C/svg%3E')" }}></div>
                <div className="absolute top-0 left-0 w-64 h-64 bg-amber-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-stone-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-72 h-72 bg-emerald-100/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <ShopHeader />
            <AccountNavigation />

            <main className="flex-grow py-12 px-4 sm:px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-16 relative">
                        <span className="font-serif text-[#785538] text-sm tracking-[0.2em] uppercase mb-2 block">{t("Tài khoản", "Account")}</span>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-800 mb-4">{t("Đơn hàng của tôi", "My orders")}</h1>
                        <div className="flex justify-center items-center gap-3">
                            <div className="h-[1px] w-12 bg-[#785538]/40"></div>
                            <span className="text-stone-500 font-serif text-xl italic">{t("Theo dõi những đơn bạn đã đặt", "Follow the orders you have placed")}</span>
                            <div className="h-[1px] w-12 bg-[#785538]/40"></div>
                        </div>

                        {/* Filters */}
                        <div className="mt-8 inline-flex bg-white/80 backdrop-blur rounded-full p-1.5 shadow-sm border border-stone-200">
                            <button
                                onClick={() => setFilter('ALL')}
                                className={`px-6 py-2 rounded-full text-sm font-serif font-medium transition-all ${filter === 'ALL' ? 'bg-[#785538] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}
                            >
                                {t("Tất cả", "All")}
                            </button>
                            <button
                                onClick={() => setFilter('ACTIVE')}
                                className={`px-6 py-2 rounded-full text-sm font-serif font-medium transition-all ${filter === 'ACTIVE' ? 'bg-[#785538] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}
                            >
                                {t("Đang thực hiện", "In progress")}
                            </button>
                            <button
                                onClick={() => setFilter('COMPLETED')}
                                className={`px-6 py-2 rounded-full text-sm font-serif font-medium transition-all ${filter === 'COMPLETED' ? 'bg-[#785538] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}
                            >
                                {t("Hoàn thành", "Completed")}
                            </button>
                        </div>
                    </div>

                    {/* Timeline / Order List */}
                    <div className="relative space-y-16 pl-4 md:pl-0">
                        {/* Center Line */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#785538]/30 to-transparent -translate-x-1/2"></div>

                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-12 text-stone-500 italic font-serif text-lg">
                                {t("Chưa có đơn hàng nào ở mục này.", "There are no orders here yet.")}
                            </div>
                        ) : (
                            filteredOrders.map((order, index) => {
                                const isEven = index % 2 === 0;
                                const status = order.status;
                                let statusConfig = {
                                    label: t("Đang xử lý", "Processing"),
                                    icon: 'pending',
                                    colorClass: 'text-stone-500',
                                    borderColor: 'border-stone-400',
                                    bgDot: 'bg-[#F5F2EA]',
                                    grayscale: false
                                };

                                if (['COMPLETED', 'PAID', 'DELIVERED'].includes(status)) {
                                    statusConfig = {
                                        label: t("Đã thanh toán", "Paid"),
                                        icon: 'verified',
                                        colorClass: 'text-emerald-700',
                                        borderColor: 'border-[#785538]',
                                        bgDot: 'bg-[#785538]',
                                        grayscale: false
                                    };
                                } else if (['AWAITING_PAYMENT', 'PENDING'].includes(status)) {
                                    statusConfig = {
                                        label: t("Chờ thanh toán", "Awaiting payment"),
                                        icon: 'hourglass_top',
                                        colorClass: 'text-amber-600',
                                        borderColor: 'border-amber-500',
                                        bgDot: 'bg-amber-500',
                                        grayscale: false
                                    };
                                } else if (['CANCELED', 'EXPIRED'].includes(status)) {
                                    statusConfig = {
                                        label: status === 'EXPIRED' ? t("Hết hạn", "Expired") : t("Đã hủy", "Canceled"),
                                        icon: 'cancel',
                                        colorClass: 'text-stone-500',
                                        borderColor: 'border-stone-400',
                                        bgDot: 'bg-stone-400',
                                        grayscale: true
                                    };
                                }

                                const firstItem = order.items?.[0];
                                const itemCount = order.items?.length || 0;
                                const title = firstItem?.title || firstItem?.product?.title || t("Đơn hàng", "Order");
                                const image = firstItem?.image || firstItem?.product?.images?.[0];

                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 50 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className={`relative flex flex-col md:flex-row items-center md:justify-between gap-8 group ${statusConfig.grayscale ? 'opacity-70 hover:opacity-100 transition-opacity duration-300' : ''}`}
                                    >
                                        {/* Center Dot */}
                                        <div className={`absolute left-1/2 top-8 w-4 h-4 rounded-full border-2 ${statusConfig.borderColor} bg-[#F5F2EA] z-10 -translate-x-1/2 hidden md:block group-hover:${statusConfig.bgDot} transition-colors duration-300`}></div>

                                        {/* Left Side (Date/Info) - Swaps based on index */}
                                        <div className={`w-full md:w-5/12 ${isEven ? 'text-center md:text-right md:pr-12 order-2 md:order-1' : 'text-center md:text-left md:pl-12 order-2 md:order-2'}`}>
                                            <div className={`inline-flex flex-col items-center ${isEven ? 'md:items-end' : 'md:items-start'}`}>
                                                <div className={`flex items-center gap-2 ${statusConfig.colorClass} mb-1`}>
                                                    <AppIcon name={statusConfig.icon} className={`text-sm ${status === 'AWAITING_PAYMENT' ? 'animate-pulse' : ''}`} />
                                                    <span className="text-xs font-bold tracking-widest uppercase">{statusConfig.label}</span>
                                                </div>
                                                <h3 className="font-serif text-3xl text-stone-800 font-bold mb-1">#{order.id.slice(0, 8).toUpperCase()}</h3>
                                                <p className="font-serif text-lg text-stone-500 italic">
                                                    {new Date(order.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Side (Card) - Swaps based on index */}
                                        <div className={`w-full md:w-5/12 ${isEven ? 'md:pl-12 order-3 md:order-2' : 'md:pr-12 order-3 md:order-1'}`}>
                                            <div className={`bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden ${statusConfig.grayscale ? 'grayscale group-hover:grayscale-0' : ''}`}>
                                                {/* Decorative background SVG for visual texture */}
                                                <div className="absolute -right-10 -top-10 w-32 h-32 opacity-5 pointer-events-none">
                                                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M45.7,-49.3C58.9,-39.9,69.1,-25.1,70.9,-9.4C72.7,6.3,66.1,22.9,55.3,35.4C44.5,47.9,29.5,56.3,13.6,58.8C-2.3,61.3,-19.1,57.9,-33.6,48.5C-48.1,39.1,-60.3,23.7,-63.3,6.7C-66.3,-10.3,-60.1,-28.9,-48.5,-40C-36.9,-51.1,-19.9,-54.7,-2.3,-52C15.3,-49.3,32.5,-58.7,45.7,-49.3Z" fill="#785538" transform="translate(100 100)"></path>
                                                    </svg>
                                                </div>

                                                <div className="flex gap-4 mb-4 relative z-10">
                                                    <div className="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
                                                        <ProductImage src={image} alt={title} className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700" />
                                                    </div>
                                                    <div className="flex flex-col justify-between py-1 flex-1">
                                                        <div>
                                                            <h4 className="font-serif font-semibold text-lg text-stone-800 leading-tight line-clamp-2">{title}</h4>
                                                            {itemCount > 1 && <p className="text-xs text-stone-500 mt-1 font-serif">+{itemCount - 1} sản phẩm khác</p>}
                                                        </div>
                                                        <div className="font-serif text-[#785538] text-lg font-bold">{formatPrice(Number(order.total_amount || order.total || 0))}</div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-dashed border-stone-200 flex justify-between items-center relative z-10">
                                                    <span className="text-xs text-stone-400 font-serif italic">
                                                        {status === 'SHIPPING' ? t("Đang vận chuyển…", "On its way…") : status}
                                                    </span>
                                                    <Link href={status === 'AWAITING_PAYMENT' ? `/checkout/payment?id=${order.id}` : `/account/orders/${order.id}`}>
                                                        <button className="flex items-center gap-1 text-[#785538] hover:text-[#7C2D12] transition-colors text-sm font-medium group/btn">
                                                            <span className="font-serif">{['COMPLETED', 'PAID', 'SHIPPED', 'DELIVERED'].includes(status) ? t("Xem lại đơn", "View order") : (status === 'AWAITING_PAYMENT' ? t("Thanh toán ngay", "Pay now") : t("Xem chi tiết", "View details"))}</span>
                                                            <AppIcon name="arrow_forward" className="text-base transform group-hover/btn:translate-x-1 transition-transform" />
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}

                        {/* Ending Dots */}
                        <div className="flex justify-center pt-8">
                            <div className="w-2 h-2 rounded-full bg-[#785538]/20 mb-2"></div>
                            <div className="w-2 h-2 rounded-full bg-[#785538]/20 mx-2 mb-2"></div>
                            <div className="w-2 h-2 rounded-full bg-[#785538]/20 mb-2"></div>
                        </div>

                        {/* Pagination Controls */}
                        {meta.last_page > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-[#785538] hover:text-white hover:border-[#785538] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-600"
                                >
                                    <AppIcon name="arrow_back_ios" className="text-sm" />
                                </button>

                                {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-10 h-10 rounded-lg border transition-all font-serif font-bold ${page === p
                                            ? 'bg-[#785538] text-white border-[#785538]'
                                            : 'border-stone-200 text-stone-600 hover:border-[#785538] hover:text-[#785538]'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                                    disabled={page === meta.last_page}
                                    className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-[#785538] hover:text-white hover:border-[#785538] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-600"
                                >
                                    <AppIcon name="arrow_forward_ios" className="text-sm" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ShopFooter />
        </div>
    );
}
