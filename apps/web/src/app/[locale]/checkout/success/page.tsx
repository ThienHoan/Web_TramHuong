'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import { useAuth } from '@/components/providers/AuthProvider';
import { getOrder, setAccessToken } from '@/lib/api-client';
import ProductImage from '@/components/ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { motion } from 'framer-motion';

export default function CheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');
    const [date, setDate] = useState('');
    const { session } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (!orderId) {
            router.push('/');
            return;
        }
        setDate(new Date().toLocaleDateString('vi-VN'));

        if (session?.access_token) {
            setAccessToken(session.access_token);
            getOrder(orderId).then(setOrder).catch(console.error);
        }
    }, [orderId, router, session]);

    if (!orderId) return null;

    return (
        <div className="bg-trad-bg-light font-serif antialiased min-h-screen flex flex-col" style={{
            backgroundImage: 'radial-gradient(var(--color-trad-border-warm) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
        }}>
            <TraditionalHeader />

            <main className="flex-grow flex flex-col items-center justify-center py-10 px-4 md:px-6">
                <div className="w-full max-w-[800px] flex flex-col gap-6">
                    {/* Success Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="relative overflow-hidden rounded-2xl bg-trad-red shadow-xl border border-[#7a3e3b]"
                    >
                        {/* Decorative corner accents */}
                        <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-trad-gold/20 to-transparent rounded-tl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-trad-gold/20 to-transparent rounded-br-2xl"></div>

                        <div className="flex flex-col items-center px-6 py-10 md:px-12 md:py-12 text-center">
                            {/* Success Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-trad-gold/15 ring-1 ring-trad-gold/40"
                            >
                                <span className="material-symbols-outlined text-6xl text-trad-gold leading-none">
                                    check_circle
                                </span>
                            </motion.div>

                            {/* Main Headlines */}
                            <h1 className="text-3xl md:text-4xl font-bold text-[#fef3c7] mb-3">Đặt hàng thành công!</h1>
                            <p className="text-[#e8e2ce] text-base md:text-lg max-w-[600px] font-normal leading-relaxed">
                                Cảm ơn quý khách! Đơn hàng của bạn đã được hệ thống tiếp nhận và đang trong quá trình xử lý.
                            </p>

                            {/* Divider */}
                            <div className="w-full h-px bg-[#7a3e3b] my-8 relative">
                                <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-trad-red px-2">
                                    <span className="material-symbols-outlined text-[#f4c025] text-xl">local_shipping</span>
                                </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="flex flex-col gap-1 p-3 rounded-lg border border-[#7a3e3b] bg-[#421614]">
                                    <span className="text-[#9c8749] text-xs font-medium uppercase tracking-wider">Mã đơn hàng</span>
                                    <span className="text-[#fef3c7] text-lg font-bold break-all">{orderId}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-3 rounded-lg border border-[#7a3e3b] bg-[#421614]">
                                    <span className="text-[#9c8749] text-xs font-medium uppercase tracking-wider">Ngày đặt hàng</span>
                                    <span className="text-[#fef3c7] text-lg font-bold">{date}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-3 rounded-lg border border-[#7a3e3b] bg-[#421614]">
                                    <span className="text-[#9c8749] text-xs font-medium uppercase tracking-wider">Dự kiến giao</span>
                                    <span className="text-[#fef3c7] text-lg font-bold">3 - 5 Ngày</span>
                                </div>
                            </div>

                            {/* Ordered Items List */}
                            {order && order.items && order.items.length > 0 && (
                                <div className="w-full flex flex-col gap-4 mb-8">
                                    <h3 className="text-[#fef3c7] font-bold text-lg text-left border-b border-[#7a3e3b] pb-2">Sản phẩm đã đặt</h3>
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="w-full bg-[#421614] p-4 rounded-xl border border-[#7a3e3b] flex items-center gap-4 text-left shadow-sm">
                                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-[#7a3e3b] bg-[#2a0f0e]">
                                                <ProductImage src={item.image} alt={item.title} className="h-full w-full object-cover" />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-[#fef3c7] font-medium line-clamp-1 text-base">
                                                    {item.title}
                                                </span>
                                                {item.variant_name && <span className="text-[#9c8749]/80 text-xs">{item.variant_name}</span>}
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[#9c8749] text-sm">Số lượng: {String(item.quantity).padStart(2, '0')}</span>
                                                    <span className="text-[#fef3c7] text-sm font-bold">{formatPrice(item.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row w-full justify-center gap-4">
                                <Link href="/" className="flex items-center justify-center rounded-lg h-12 px-8 bg-trad-gold hover:bg-[#e0b020] text-[#1c180d] text-base font-bold transition-all shadow-lg hover:shadow-trad-gold/20">
                                    <span className="material-symbols-outlined mr-2 text-[20px]">storefront</span>
                                    Tiếp tục mua sắm
                                </Link>
                                <Link href={`/account/orders/${orderId}`} className="flex items-center justify-center rounded-lg h-12 px-8 bg-transparent border border-trad-gold hover:bg-trad-gold/10 text-trad-gold text-base font-bold transition-all">
                                    <span className="material-symbols-outlined mr-2 text-[20px]">receipt_long</span>
                                    Xem đơn hàng
                                </Link>
                            </div>

                            <p className="mt-8 text-[#9c8749] text-sm">
                                Một email xác nhận đã được gửi đến hộp thư của bạn. <br className="hidden sm:block" />
                                Nếu cần hỗ trợ, vui lòng liên hệ Hotline: <span className="text-[#fef3c7]">1900 1234</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
