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
import { toast } from 'sonner';

export default function CheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');
    const [date, setDate] = useState('');
    const { session } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const { formatPrice } = useCurrency();
    const [copied, setCopied] = useState(false);

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

    const handleCopyId = async () => {
        if (!orderId) return;

        try {
            // Check if clipboard API is available (browser only, not SSR)
            if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(orderId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                toast.success("Đã sao chép mã đơn hàng!");
            } else {
                // Fallback for browsers without clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = orderId;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Đã sao chép mã đơn hàng!");
                } catch (err) {
                    toast.error("Không thể sao chép. Vui lòng copy thủ công!");
                } finally {
                    document.body.removeChild(textArea);
                }
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error("Không thể sao chép. Vui lòng copy thủ công!");
        }
    };

    if (!orderId) return null;

    return (
        <div className="bg-trad-bg-light font-display antialiased min-h-screen flex flex-col" style={{
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
                        className="relative overflow-hidden rounded-2xl bg-[#421614] shadow-xl border border-[#7a3e3b]"
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
                            <h1 className="text-3xl md:text-4xl font-bold text-[#fef3c7] mb-3 font-serif">Đặt hàng thành công!</h1>
                            <p className="text-[#e8e2ce] text-base md:text-lg max-w-[600px] font-normal leading-relaxed">
                                Cảm ơn quý khách! Đơn hàng của bạn đã được hệ thống tiếp nhận và đang trong quá trình xử lý.
                            </p>

                            {/* Guest Warning / Important Note */}
                            {!session && (
                                <div className="mt-8 w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 md:p-5 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-500">
                                    <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-sm">
                                        <span className="material-symbols-outlined">warning</span>
                                        Lưu ý quan trọng
                                    </div>
                                    <p className="text-[#e8e2ce] text-sm md:text-base max-w-lg">
                                        Bạn đang đặt hàng với tư cách <strong>Khách (Chưa đăng nhập)</strong>.
                                        Vui lòng <span className="text-amber-400 font-bold underline">lưu lại Mã Đơn Hàng</span> bên dưới để tra cứu tình trạng đơn hàng sau này.
                                    </p>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="w-full h-px bg-[#7a3e3b] my-8 relative">
                                <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[#421614] px-2">
                                    <span className="material-symbols-outlined text-[#f4c025] text-xl">local_shipping</span>
                                </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="flex flex-col gap-2 p-4 rounded-lg border border-[#7a3e3b] bg-[#2a0f0e] relative group">
                                    <span className="text-[#9c8749] text-xs font-medium uppercase tracking-wider">Mã đơn hàng</span>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-[#fef3c7] text-xl font-bold font-mono tracking-wider">{orderId}</span>
                                        <button
                                            onClick={handleCopyId}
                                            className="p-1.5 rounded-full hover:bg-white/10 text-trad-gold/70 hover:text-trad-gold transition-colors"
                                            title="Sao chép mã đơn hàng"
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {copied ? 'check' : 'content_copy'}
                                            </span>
                                        </button>
                                    </div>
                                    {copied && (
                                        <span className="absolute -top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-out fade-out duration-1000">
                                            Đã chép!
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 p-4 rounded-lg border border-[#7a3e3b] bg-[#2a0f0e]">
                                    <span className="text-[#9c8749] text-xs font-medium uppercase tracking-wider">Ngày đặt hàng</span>
                                    <span className="text-[#fef3c7] text-lg font-bold">{date}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-4 rounded-lg border border-[#7a3e3b] bg-[#2a0f0e]">
                                    <span className="text-[#9c8749] text-xs font-medium uppercase tracking-wider">Dự kiến giao</span>
                                    <span className="text-[#fef3c7] text-lg font-bold">3 - 5 Ngày</span>
                                </div>
                            </div>

                            {/* Ordered Items List */}
                            {order && order.items && order.items.length > 0 && (
                                <div className="w-full flex flex-col gap-4 mb-8">
                                    <h3 className="text-[#fef3c7] font-bold text-lg text-left border-b border-[#7a3e3b] pb-2 font-serif">Sản phẩm đã đặt</h3>
                                    {order.items.map((item: any, idx: number) => {
                                        const price = Number(item.price || 0);
                                        const originalPrice = Number(item.original_price || item.price || 0);
                                        const discountAmount = Number(item.discount_amount || 0);
                                        const hasDiscount = discountAmount > 0 && originalPrice > price;

                                        return (
                                            <div key={idx} className="w-full bg-[#2a0f0e] p-4 rounded-xl border border-[#7a3e3b] flex items-center gap-4 text-left shadow-sm">
                                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-[#7a3e3b] bg-[#2a0f0e]">
                                                    <ProductImage src={item.image} alt={item.title} className="h-full w-full object-cover" />
                                                </div>
                                                <div className="flex flex-col flex-1">
                                                    <span className="text-[#fef3c7] font-medium line-clamp-1 text-base">
                                                        {item.title}
                                                    </span>
                                                    {item.variant_name && <span className="text-[#9c8749]/80 text-xs">{item.variant_name}</span>}
                                                    <div className="flex justify-between items-center mt-1 gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[#9c8749] text-sm">Số lượng: {String(item.quantity).padStart(2, '0')}</span>
                                                            {hasDiscount && (
                                                                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                    -{Math.round((discountAmount / originalPrice) * 100)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            {hasDiscount && (
                                                                <span className="text-xs text-[#9c8749] line-through">
                                                                    {formatPrice(originalPrice)}
                                                                </span>
                                                            )}
                                                            <span className={`text-sm font-bold ${hasDiscount ? 'text-red-400' : 'text-[#fef3c7]'}`}>
                                                                {formatPrice(price)}
                                                            </span>
                                                            {hasDiscount && (
                                                                <span className="text-[10px] text-red-500 font-medium mt-0.5">
                                                                    Tiết kiệm {formatPrice(discountAmount)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Order Summary Total */}
                            {order && (
                                <div className="w-full bg-[#2a0f0e] p-6 rounded-xl border border-[#7a3e3b] shadow-sm mb-8">
                                    <div className="flex flex-col gap-3">
                                        {(() => {
                                            const subtotal = order.items?.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
                                            const totalSavings = order.items?.reduce((sum: number, item: any) => {
                                                const discountAmount = Number(item.discount_amount || 0);
                                                return sum + (discountAmount * item.quantity);
                                            }, 0) || 0;
                                            // Assume total = subtotal + shipping (simplified as success page doesn't always have exact breakdown unless we calc it, but order.total is source of truth)
                                            // Actually order.total is the final amount.

                                            return (
                                                <>
                                                    {totalSavings > 0 && (
                                                        <div className="flex justify-between items-center text-[#9c8749] text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-base">savings</span>
                                                                <span>Đã tiết kiệm</span>
                                                            </div>
                                                            <span>-{formatPrice(totalSavings)}</span>
                                                        </div>
                                                    )}
                                                    {/* Voucher Discount */}
                                                    {Number(order.voucher_discount_amount) > 0 && (
                                                        <div className="flex justify-between items-center text-[#9c8749] text-sm mt-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-base text-purple-400">confirmation_number</span>
                                                                <span>Voucher ({order.voucher_code})</span>
                                                            </div>
                                                            <span className="text-purple-400">-{formatPrice(Number(order.voucher_discount_amount))}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-end pt-3 border-t border-[#7a3e3b] mt-2">
                                                        <span className="text-[#fef3c7] font-bold text-lg font-serif">Tổng cộng</span>
                                                        <span className="text-trad-gold text-2xl font-bold font-serif">{formatPrice(order.total)}</span>
                                                    </div>
                                                    {/* Shipping Fee Display - Inserted BEFORE Total */}
                                                    <div className="flex justify-between items-center text-[#9c8749] text-sm py-2">
                                                        <span>Phí vận chuyển</span>
                                                        <span>
                                                            {/* Logic check: if Total >= Subtotal (implies shipping added) or 0 if free. Here we assume free if not mentioned or calculated? Success page is tricky. If order.total == subtotal, it is free shipping. */}
                                                            {(() => {
                                                                const subtotal = order.items?.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
                                                                const isFree = Number(order.total) <= Number(subtotal); // Rough check
                                                                if (isFree) {
                                                                    return (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="line-through text-[#9c8749]/50 text-xs">{formatPrice(30000)}</span>
                                                                            <span className="text-green-400 font-bold">-{formatPrice(30000)}</span>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return formatPrice(Number(order.total) - Number(subtotal));
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row w-full justify-center gap-4">
                                <Link href="/" className="flex items-center justify-center rounded-lg h-12 px-8 bg-trad-gold hover:bg-[#e0b020] text-[#1c180d] text-base font-bold transition-all shadow-lg hover:shadow-trad-gold/20">
                                    <span className="material-symbols-outlined mr-2 text-[20px]">storefront</span>
                                    Tiếp tục mua sắm
                                </Link>

                                {session ? (
                                    <Link href={`/account/orders/${orderId}`} className="flex items-center justify-center rounded-lg h-12 px-8 bg-transparent border border-trad-gold hover:bg-trad-gold/10 text-trad-gold text-base font-bold transition-all">
                                        <span className="material-symbols-outlined mr-2 text-[20px]">receipt_long</span>
                                        Xem đơn hàng
                                    </Link>
                                ) : (
                                    <Link href={`/order-lookup?code=${orderId}`} className="flex items-center justify-center rounded-lg h-12 px-8 bg-transparent border border-trad-gold hover:bg-trad-gold/10 text-trad-gold text-base font-bold transition-all">
                                        <span className="material-symbols-outlined mr-2 text-[20px]">search</span>
                                        Thử tra cứu ngay
                                    </Link>
                                )}
                            </div>

                            {/* Guest Upsell - Create Account */}
                            {!session && (
                                <div className="mt-8 pt-8 border-t border-[#7a3e3b] w-full animate-in fade-in slide-in-from-bottom-4">
                                    <div className="bg-[#2a0f0e]/50 rounded-xl p-6 border border-[#7a3e3b] flex flex-col md:flex-row items-center gap-6 text-left">
                                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-trad-gold/20 flex items-center justify-center text-trad-gold animate-pulse">
                                            <span className="material-symbols-outlined text-2xl">person_add</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[#fef3c7] font-bold text-lg font-serif">Tạo tài khoản ngay</h4>
                                            <p className="text-[#9c8749] text-sm mt-1">
                                                Theo dõi đơn hàng dễ dàng, lưu địa chỉ cho lần sau và nhận ưu đãi độc quyền.
                                            </p>
                                        </div>
                                        <Link
                                            href={`/register?redirect=/account/orders/${orderId}`} // Redirect to their new order after reg? Maybe. Or just home.
                                            className="flex-shrink-0 whitespace-nowrap px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-[#fef3c7] font-bold rounded-lg transition-colors"
                                        >
                                            Đăng ký thành viên
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <p className="mt-8 text-[#9c8749] text-sm">
                                Một email xác nhận đã được gửi đến bạn. <br className="hidden sm:block" />
                                Nếu cần hỗ trợ, vui lòng liên hệ Hotline: <span className="text-[#fef3c7]">035.617.6878</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </main >

            <TraditionalFooter />
        </div >
    );
}
