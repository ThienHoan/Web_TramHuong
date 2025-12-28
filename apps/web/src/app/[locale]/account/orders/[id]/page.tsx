'use client';

import { useEffect, useState } from 'react';
import { getOrder, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { session, user, loading: authLoading } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { formatPrice } = useCurrency();
    const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

    useEffect(() => {
        params.then(setResolvedParams);
    }, [params]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (session && resolvedParams?.id) {
            setAccessToken(session.access_token);
            getOrder(resolvedParams.id).then(data => {
                if (!data) {
                    router.push('/account/orders');
                } else {
                    setOrder(data);
                }
                setLoading(false);
            });
        }
    }, [user, session, authLoading, router, resolvedParams]);

    if (loading || !order) return (
        <div className="min-h-screen flex items-center justify-center bg-[#ECEAE4]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9A3412]"></div>
        </div>
    );

    const status = order.status;
    const isExpiredOrCanceled = ['CANCELED', 'EXPIRED'].includes(status);
    const isCompleted = ['COMPLETED', 'PAID', 'DELIVERED'].includes(status);
    const isPending = ['AWAITING_PAYMENT', 'PENDING'].includes(status);

    // Status Config
    let statusConfig = {
        label: 'Đang xử lý',
        icon: 'pending',
        textColor: 'text-stone-500',
        borderColor: 'border-stone-200',
        bgColor: 'bg-stone-50',
        mainColor: 'text-trad-gray',
        headerIcon: 'hourglass_top',
        pulse: false
    };

    if (isCompleted) {
        statusConfig = {
            label: 'Đã hoàn thành',
            icon: 'check_circle',
            textColor: 'text-green-700',
            borderColor: 'border-green-200',
            bgColor: 'bg-green-50',
            mainColor: 'text-primary-dark', // Dark Red/Brown in new theme context or Gold
            headerIcon: 'verified',
            pulse: true
        };
    } else if (isPending) {
        statusConfig = {
            label: 'Chờ thanh toán',
            icon: 'hourglass_top',
            textColor: 'text-amber-700',
            borderColor: 'border-amber-200',
            bgColor: 'bg-amber-50',
            mainColor: 'text-primary',
            headerIcon: 'pending',
            pulse: true
        };
    } else if (isExpiredOrCanceled) {
        statusConfig = {
            label: status === 'EXPIRED' ? 'Đã Hết Hạn' : 'Đã Hủy',
            icon: status === 'EXPIRED' ? 'event_busy' : 'cancel',
            textColor: 'text-trad-red-bright',
            borderColor: 'border-red-100',
            bgColor: 'bg-red-50',
            mainColor: 'text-trad-gray',
            headerIcon: 'hourglass_disabled',
            pulse: false
        };
    }

    const shippingInfo = order.shipping_info || {};
    const totalAmount = Number(order.total_amount || order.total || 0);

    return (
        <div className="min-h-screen bg-background-light font-display text-text-main antialiased selection:bg-primary selection:text-white flex flex-col transition-colors duration-300">
            {/* Zalo Button Fixed - keeping from template */}
            <a className="fixed bottom-8 right-6 z-50 group" href="#">
                <div className="relative flex items-center justify-center size-14 bg-gradient-to-br from-[#0068FF] to-[#0041a3] text-white rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ring-4 ring-white/30">
                    <span className="material-symbols-outlined text-3xl">chat</span>
                    <span className="absolute right-0 top-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </div>
                <div className="absolute bottom-16 right-0 bg-white px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 whitespace-nowrap text-sm font-bold text-[#0068FF] border border-blue-100">
                    Chat Zalo ngay
                </div>
            </a>

            <TraditionalHeader />

            <main className="flex-grow py-12 md:py-16">
                <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
                    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-text-main/60 hover:text-primary transition-colors group">
                            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Quay lại danh sách đơn hàng
                        </Link>
                        {/* Extra buttons from template if needed, keeping simple for now or adding map */}
                    </div>

                    <div className="space-y-8">
                        {/* Order Status Card */}
                        <div className={`relative overflow-hidden bg-white rounded-2xl shadow-sm border border-[#E6DCC8] p-8 md:p-10 ${isExpiredOrCanceled ? 'filter-expired' : ''}`}>
                            {/* Background Blurs */}
                            <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full blur-3xl pointer-events-none ${isExpiredOrCanceled ? 'bg-red-500/5' : 'bg-accent-gold/5'}`}></div>
                            <div className={`absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full blur-3xl pointer-events-none ${isExpiredOrCanceled ? 'bg-gray-500/5' : 'bg-primary/5'}`}></div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                <div>
                                    <span className={`block text-sm font-bold uppercase tracking-widest mb-2 ${isExpiredOrCanceled ? 'text-trad-gray' : 'text-accent-gold'}`}>Chi Tiết Đơn Hàng</span>
                                    <h1 className={`font-serif text-3xl md:text-4xl font-bold flex items-center gap-3 ${statusConfig.mainColor}`}>
                                        #{order.id?.slice(0, 8).toUpperCase()}
                                        <span className={`material-symbols-outlined text-2xl ${isExpiredOrCanceled ? 'text-trad-gray/50' : 'text-accent-gold'}`}>{statusConfig.headerIcon}</span>
                                    </h1>
                                    <p className={`mt-2 text-sm ${isExpiredOrCanceled ? 'text-text-main/70 italic font-serif' : 'text-text-main/60'}`}>
                                        {isExpiredOrCanceled
                                            ? order.status === 'EXPIRED' ? '"Đơn hàng của bạn đã hết hạn. Hãy khám phá lại những tinh hoa khác nhé."' : '"Đơn hàng đã được hủy theo yêu cầu."'
                                            : "Cảm ơn bạn đã tin tưởng lựa chọn Thiên Phúc."}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-semibold shadow-sm ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                                        {statusConfig.pulse && <span className={`w-2 h-2 rounded-full animate-pulse ${isCompleted ? 'bg-green-500' : 'bg-amber-500'}`}></span>}
                                        {!statusConfig.pulse && <span className="material-symbols-outlined text-[16px]">{statusConfig.icon}</span>}
                                        {statusConfig.label}
                                    </span>
                                    <div className="text-right">
                                        <span className="text-xs text-text-main/50 uppercase tracking-wide">Ngày đặt hàng</span>
                                        <p className="font-medium text-text-main">{new Date(order.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Logic */}
                            {(() => {
                                const stepStatus = order.status;
                                const isCanceled = ['CANCELED', 'EXPIRED'].includes(stepStatus);
                                const hasPaid = ['PAID', 'SHIPPED', 'COMPLETED', 'DELIVERED'].includes(stepStatus);
                                const hasShipped = ['SHIPPED', 'COMPLETED', 'DELIVERED'].includes(stepStatus);
                                const isFinished = ['COMPLETED', 'DELIVERED'].includes(stepStatus);

                                return (
                                    <div className="mt-12 relative">
                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 hidden md:block"></div>
                                        {/* Progressive Bar */}
                                        <div className={`absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 hidden md:block transition-all duration-1000 ease-out`}
                                            style={{ width: isFinished ? '100%' : hasShipped ? '75%' : hasPaid ? '50%' : '25%' }}></div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                                            {/* Step 1: Placed */}
                                            <div className="flex md:flex-col items-center gap-4 md:text-center">
                                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10">
                                                    <span className="material-symbols-outlined text-sm">receipt_long</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main">Đặt Hàng</p>
                                                    <p className="text-xs text-text-main/50">
                                                        {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, {new Date(order.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Step 2: Payment */}
                                            <div className={`flex md:flex-col items-center gap-4 md:text-center ${isCanceled ? 'opacity-60' : ''}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10 transition-colors duration-500 
                                                ${hasPaid ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'} 
                                                ${stepStatus === 'AWAITING_PAYMENT' ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`}>
                                                    <span className="material-symbols-outlined text-sm">payments</span>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${hasPaid ? 'text-text-main' : 'text-gray-400'}`}>Thanh Toán</p>
                                                    <p className="text-xs text-gray-400">
                                                        {hasPaid ? 'Thành công' : (stepStatus === 'AWAITING_PAYMENT' ? 'Đang chờ...' : '--:--')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Step 3: Shipping */}
                                            <div className={`flex md:flex-col items-center gap-4 md:text-center ${isCanceled ? 'opacity-40' : ''}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10 transition-colors duration-500
                                                ${hasShipped ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}
                                                ${stepStatus === 'SHIPPED' ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`}>
                                                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${hasShipped ? 'text-text-main' : 'text-gray-400'}`}>Vận Chuyển</p>
                                                    <p className="text-xs text-gray-400">
                                                        {hasShipped ? 'Đang giao hàng' : '--:--'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Step 4: Finish */}
                                            <div className="flex md:flex-col items-center gap-4 md:text-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 shadow-sm z-10 transition-colors duration-500
                                                ${isCanceled ? 'bg-white text-red-500 border-red-100' : (isFinished ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border-white')}`}>
                                                    <span className="material-symbols-outlined text-sm">{isCanceled ? 'cancel' : 'check'}</span>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${isCanceled ? 'text-trad-red-bright' : (isFinished ? 'text-green-700' : 'text-gray-400')}`}>
                                                        {isCanceled ? (stepStatus === 'EXPIRED' ? 'Hết Hạn' : 'Đã Hủy') : 'Hoàn Tất'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Product List */}
                                <div className="bg-white rounded-2xl shadow-sm border border-[#E6DCC8] overflow-hidden">
                                    <div className="px-8 py-6 border-b border-[#F5EFE6] bg-[#FFFAF0]/50 flex items-center justify-between">
                                        <h2 className="font-serif text-xl font-bold text-text-main flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">inventory_2</span>
                                            Sản Phẩm Đã Chọn
                                        </h2>
                                        <span className="text-xs text-text-main/50 font-medium uppercase tracking-wider">{order.items?.length || 0} Sản phẩm</span>
                                    </div>
                                    <div className="divide-y divide-[#F5EFE6]">
                                        {order.items?.map((item: any, idx: number) => {
                                            const title = item.title || item.product?.title || 'Sản phẩm';
                                            const image = item.image || item.product?.images?.[0];
                                            const price = Number(item.price || 0);

                                            return (
                                                <div key={idx} className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 hover:bg-[#FFFAF0]/30 transition-colors group relative">
                                                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none w-24 h-24 bg-[url('https://www.svgrepo.com/show/396264/lotus.svg')] bg-no-repeat bg-bottom bg-contain mix-blend-multiply"></div>
                                                    <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-lg border border-[#E6DCC8] p-1 bg-white relative">
                                                        <div className={`w-full h-full rounded-md overflow-hidden ${isExpiredOrCanceled ? 'grayscale-[0.3]' : ''}`}>
                                                            <ProductImage src={image} alt={title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500`} />
                                                        </div>
                                                        {isExpiredOrCanceled && <div className="absolute inset-0 bg-gray-900/5 rounded-md pointer-events-none"></div>}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-serif text-lg font-bold text-text-main group-hover:text-primary transition-colors">{title}</h3>
                                                            <span className={`font-bold whitespace-nowrap ${isExpiredOrCanceled ? 'text-text-main/60 line-through decoration-red-400 decoration-2' : 'text-primary'}`}>
                                                                {formatPrice(price * item.quantity)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-text-main/50">
                                                            <span className="px-2 py-0.5 rounded bg-surface-accent text-text-main font-medium border border-[#E6DCC8]">Số lượng: {item.quantity}</span>
                                                            {item.variant_name && <span className="bg-trad-bg-warm px-2 py-0.5 rounded border border-trad-border-warm">{item.variant_name}</span>}
                                                            {/* Placeholder SKU if not available */}
                                                            <span>Đơn giá: {formatPrice(price)}</span>
                                                        </div>
                                                        <div className="pt-2">
                                                            <p className="text-sm text-text-main/70 italic leading-relaxed font-light border-l-2 border-accent-gold/30 pl-3">
                                                                "Hương thơm ngọt dịu của trầm núi rừng, lan tỏa sự thanh tịnh cho không gian thiền định."
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Savings / Payment Method */}
                                <div className={`bg-[#FDFBF7] rounded-2xl p-6 border border-dashed border-accent-gold/30 flex flex-col md:flex-row justify-between items-center gap-6 ${isExpiredOrCanceled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-sm ${isExpiredOrCanceled ? 'bg-white border-gray-200' : 'bg-white border-accent-gold/20'}`}>
                                            <span className={`material-symbols-outlined text-2xl ${isExpiredOrCanceled ? 'text-gray-400' : 'text-accent-gold'}`}>savings</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-main/60">{isExpiredOrCanceled ? 'Bạn đã bỏ lỡ ưu đãi' : 'Bạn đã tiết kiệm được'}</p>
                                            <p className={`font-bold ${isExpiredOrCanceled ? 'text-gray-500 line-through' : 'text-primary'}`}>0₫</p>
                                        </div>
                                    </div>
                                    <div className={`h-10 w-px hidden md:block ${isExpiredOrCanceled ? 'bg-gray-200' : 'bg-accent-gold/20'}`}></div>
                                    <div className="text-center md:text-right">
                                        <p className="text-sm text-text-main/60 mb-1">{isExpiredOrCanceled ? 'Phương thức thanh toán dự kiến' : 'Phương thức thanh toán'}</p>
                                        <p className={`font-medium flex items-center gap-2 ${isExpiredOrCanceled ? 'text-text-main/70' : 'text-text-main'}`}>
                                            <span className={`material-symbols-outlined text-lg ${isExpiredOrCanceled ? 'text-gray-500' : 'text-primary'}`}>credit_card</span>
                                            {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng (VietQR/Sepay)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1 space-y-6">
                                {/* Shipping Info Card */}
                                <div className={`bg-white rounded-2xl shadow-sm border border-[#E6DCC8] p-6 relative overflow-hidden group ${isExpiredOrCanceled ? 'filter-expired pointer-events-none select-none' : ''}`}>
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#F5EFE6] rounded-bl-full -mr-4 -mt-4 z-0"></div>
                                    <div className="relative z-10">
                                        <h3 className={`font-serif text-lg font-bold mb-6 flex items-center gap-2 ${isExpiredOrCanceled ? 'text-gray-500' : 'text-text-main'}`}>
                                            <span className={`material-symbols-outlined ${isExpiredOrCanceled ? 'text-gray-400' : 'text-primary'}`}>local_shipping</span>
                                            Thông Tin Giao Hàng
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="flex gap-4">
                                                <div className={`mt-1 ${isExpiredOrCanceled ? 'text-gray-400' : 'text-primary'}`}>
                                                    <span className="material-symbols-outlined text-xl">person</span>
                                                </div>
                                                <div>
                                                    <p className={`text-xs uppercase tracking-wide mb-1 ${isExpiredOrCanceled ? 'text-gray-400' : 'text-text-main/50'}`}>Người nhận</p>
                                                    <p className={`font-medium ${isExpiredOrCanceled ? 'text-gray-600' : 'text-text-main'}`}>{shippingInfo.name || shippingInfo.full_name || shippingInfo.fullName || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className={`mt-1 ${isExpiredOrCanceled ? 'text-gray-400' : 'text-primary'}`}>
                                                    <span className="material-symbols-outlined text-xl">call</span>
                                                </div>
                                                <div>
                                                    <p className={`text-xs uppercase tracking-wide mb-1 ${isExpiredOrCanceled ? 'text-gray-400' : 'text-text-main/50'}`}>Số điện thoại</p>
                                                    <p className={`font-medium ${isExpiredOrCanceled ? 'text-gray-600' : 'text-text-main'}`}>{shippingInfo.phone || shippingInfo.phone_number || shippingInfo.phoneNumber || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className={`mt-1 ${isExpiredOrCanceled ? 'text-gray-400' : 'text-primary'}`}>
                                                    <span className="material-symbols-outlined text-xl">location_on</span>
                                                </div>
                                                <div>
                                                    <p className={`text-xs uppercase tracking-wide mb-1 ${isExpiredOrCanceled ? 'text-gray-400' : 'text-text-main/50'}`}>Địa chỉ nhận hàng</p>
                                                    <p className={`font-medium leading-relaxed ${isExpiredOrCanceled ? 'text-gray-600' : 'text-text-main'}`}>
                                                        {shippingInfo.full_address || shippingInfo.address || ((shippingInfo.ward && shippingInfo.district) ? `${shippingInfo.address}, ${shippingInfo.ward}, ${shippingInfo.district}, ${shippingInfo.city}` : 'N/A')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                                            <div className={`flex items-center justify-between text-xs ${isExpiredOrCanceled ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <span className="flex items-center gap-1">{!isExpiredOrCanceled && <span className="w-2 h-2 rounded-full bg-green-500"></span>} Giao hàng tiêu chuẩn</span>
                                                <span>GHTK Express</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Summary Card */}
                                {(() => {
                                    const subtotal = order.items?.reduce((acc: number, item: any) => acc + (Number(item.price) * Number(item.quantity)), 0) || 0;
                                    // Shipping Fee Priority: 1. From Shipping Info (New Logic) 2. Calculated (Total - Subtotal)
                                    let shippingFee = 0;
                                    if (order.shipping_info?.shipping_fee !== undefined) {
                                        shippingFee = Number(order.shipping_info.shipping_fee);
                                    } else {
                                        shippingFee = Math.max(0, totalAmount - subtotal);
                                    }

                                    // If strict logic needed: >= 300k -> 0. Else 30k. (Only if total matches expectation)
                                    // But trusting DB is safer.

                                    return (
                                        <div className="bg-primary-dark text-white rounded-2xl shadow-xl p-6 relative overflow-hidden">
                                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                                            <div className={`absolute bottom-0 right-0 w-32 h-32 opacity-20 pointer-events-none ${isExpiredOrCanceled ? 'bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-black via-transparent to-transparent' : ''}`}></div>

                                            <div className="relative z-10 space-y-4">
                                                <h3 className="font-serif text-lg font-bold text-accent-gold mb-4 border-b border-white/10 pb-4">Tổng Kết Đơn Hàng</h3>
                                                <div className={`flex justify-between text-sm ${isExpiredOrCanceled ? 'text-white/60 line-through' : 'text-white/80'}`}>
                                                    <span>Tạm tính</span>
                                                    <span>{formatPrice(subtotal)}</span>
                                                </div>
                                                <div className={`flex justify-between text-sm ${isExpiredOrCanceled ? 'text-white/60 line-through' : 'text-white/80'}`}>
                                                    <span>Phí vận chuyển</span>
                                                    <span>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span>
                                                </div>
                                                <div className={`flex justify-between text-sm ${isExpiredOrCanceled ? 'text-white/60 line-through' : 'text-accent-gold'}`}>
                                                    <span>Giảm giá</span>
                                                    <span>0₫</span>
                                                </div>
                                                <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-end">
                                                    <span className={`text-sm font-medium uppercase tracking-wide ${isExpiredOrCanceled ? 'text-white/70' : 'text-white/90'}`}>Tổng cộng</span>
                                                    <span className={`text-2xl font-serif font-bold ${isExpiredOrCanceled ? 'text-white/70' : 'text-accent-gold'}`}>{formatPrice(totalAmount)}</span>
                                                </div>

                                                {isExpiredOrCanceled ? (
                                                    <div className="mt-6 bg-red-900/30 rounded-lg p-3 flex items-center justify-center gap-2 backdrop-blur-sm border border-red-500/30">
                                                        <span className="material-symbols-outlined text-red-300">highlight_off</span>
                                                        <span className="text-sm font-bold text-red-100 uppercase tracking-wider">Chưa Thanh Toán</span>
                                                    </div>
                                                ) : isPending ? (
                                                    <div className="mt-6">
                                                        <Link href={`/checkout/payment?id=${order.id}`} className="block w-full text-center bg-accent-gold hover:bg-accent-gold-dark text-white p-3 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-lg">
                                                            Thanh toán ngay
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <div className="mt-6 bg-white/10 rounded-lg p-3 flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10">
                                                        <span className="material-symbols-outlined text-green-400">check_circle</span>
                                                        <span className="text-sm font-bold text-white uppercase tracking-wider">Đã Thanh Toán</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
