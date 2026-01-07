'use client';

import { Order } from '@/types/order';
import { Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import ZenFooter from '@/components/zen/ZenFooter'; // Assuming we want the footer
// Assuming we might want a ZenHeader too, but the original file had a hardcoded header. 
// I will keep the header from the original file for now to match the design exactly, 
// or I should use a standard Zen Header?
// The original file had a specific minimal header. I will reproduce it.

interface ZenOrderSuccessProps {
    order: Order;
    loading?: boolean;
}

export default function ZenOrderSuccess({ order, loading = false }: ZenOrderSuccessProps) {
    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Format currency
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main font-display antialiased min-h-screen flex flex-col">
            {/* Top Navigation - specific for this page as per design */}
            <header className="w-full border-b border-[#ecf3e7] dark:border-[#2a3820] bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
                    {/* Left: Logo */}
                    <Link href="/" className="flex items-center gap-4 group">
                        <div className="size-6 text-primary group-hover:text-primary-dark transition-colors">
                            <span className="material-symbols-outlined !text-[24px]">spa</span>
                        </div>
                        <h2 className="text-text-main dark:text-white text-lg font-bold tracking-[0.1em] uppercase">Zen Agarwood</h2>
                    </Link>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-6">
                        {/* Minified header actions compared to full site */}
                        <Link href="/account" className="text-text-main dark:text-white hover:text-primary transition-colors">
                            <span className="material-symbols-outlined !text-[20px]">person</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center py-20 px-4 relative overflow-hidden">
                {/* Abstract Background Element */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-[120px] -z-10 pointer-events-none"></div>

                <div className="w-full max-w-3xl flex flex-col items-center text-center">
                    {/* Success Icon */}
                    <div className="mb-10 animate-fade-in text-primary">
                        <div className="size-20 rounded-full border border-primary/20 flex items-center justify-center bg-surface-light dark:bg-surface-dark">
                            <span className="material-symbols-outlined !text-[40px] font-thin">check</span>
                        </div>
                    </div>

                    {/* Main Heading */}
                    <h1 className="animate-fade-in delay-100 text-text-main dark:text-white text-3xl md:text-5xl font-thin uppercase tracking-zen mb-6">
                        Order Confirmed
                    </h1>

                    {/* Sub Heading */}
                    <p className="animate-fade-in delay-200 text-text-muted dark:text-gray-400 text-sm md:text-base font-light leading-loose tracking-widest max-w-lg mx-auto mb-16">
                        Thank you for your journey. We have received your order and will begin preparing it with care. A confirmation email has been sent to you.
                    </p>

                    {/* Order Details Container */}
                    <div className="animate-fade-in delay-300 w-full bg-white dark:bg-surface-dark/50 border border-surface-light dark:border-surface-dark rounded-xl p-8 md:p-12 mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                        {/* Order Meta */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 pb-10 border-b border-surface-light dark:border-white/5">
                            <div className="flex flex-col items-center md:items-start gap-2">
                                <span className="text-text-muted text-xs font-medium tracking-[0.15em] uppercase">Order Number</span>
                                {loading ? (
                                    <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                                ) : (
                                    <span className="text-text-main dark:text-white text-base md:text-lg font-light tracking-wide break-all">{order.id.toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-text-muted text-xs font-medium tracking-[0.15em] uppercase">Date</span>
                                <span className="text-text-main dark:text-white text-lg font-light tracking-wide">{formatDate(order.created_at)}</span>
                            </div>
                            <div className="flex flex-col items-center md:items-end gap-2">
                                {/* TODO: delivery_method not in ShippingInfo type - needs backend update */}
                                <span className="text-text-muted text-xs font-medium tracking-[0.15em] uppercase">Est. Delivery</span>
                                <span className="text-text-main dark:text-white text-lg font-light tracking-wide">3 - 5 Days</span>
                            </div>
                        </div>

                        {/* TODO: Pickup instructions - delivery_method and pickup_location not in ShippingInfo type
                        {order.shipping_info?.delivery_method === 'pickup' && order.shipping_info?.pickup_location && (
                            <div className="mb-10 p-6 bg-[#FDF8F6] border border-[#EBE5E0] rounded-lg text-left">
                                <h4 className="text-[#9A3412] font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined">storefront</span>
                                    Thông tin nhận hàng
                                </h4>
                                <div className="space-y-3 text-sm text-stone-600 font-sans">
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-stone-400 text-lg">location_on</span>
                                        <div>
                                            <p className="font-semibold text-stone-800">{order.shipping_info.pickup_location.name}</p>
                                            <p>{order.shipping_info.pickup_location.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-stone-400 text-lg">schedule</span>
                                        <div>
                                            <p className="font-semibold text-stone-800">Giờ mở cửa</p>
                                            <p>{order.shipping_info.pickup_location.hours}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-stone-400 text-lg">info</span>
                                        <div>
                                            <p className="font-semibold text-stone-800">Hướng dẫn nhận hàng</p>
                                            <p>{order.shipping_info.pickup_location.instructions}</p>
                                            <p className="mt-1 text-xs text-stone-500 italic">*Mã đơn hàng của bạn là: <strong className="text-[#9A3412]">{order.id.slice(0, 8).toUpperCase()}</strong></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        */}

                        {/* Product Preview (Mini) - Loop through items */}
                        {order.items && order.items.length > 0 ? (
                            <>
                                <div className="flex flex-col gap-6 mb-10">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-6 items-center justify-between">
                                            <div className="flex items-center gap-6 text-left w-full">
                                                <div className="size-20 bg-surface-light dark:bg-black/20 rounded-lg overflow-hidden flex-shrink-0 relative group">
                                                    {item.image ? (
                                                        <ProductImage src={item.image} alt={item.title || 'Product'} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-gray-400">spa</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1 flex-grow">
                                                    <h3 className="text-text-main dark:text-white text-sm font-medium tracking-wider uppercase">{item.title}</h3>
                                                    <p className="text-text-muted text-xs tracking-wide">Qty: {item.quantity} {item.variant_name ? `• ${item.variant_name}` : ''}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-text-main dark:text-white text-lg font-light tracking-wide whitespace-nowrap">
                                                        {formatPrice(item.price * item.quantity)}
                                                    </div>
                                                    {(item.discount_amount || 0) > 0 && (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-text-muted text-xs line-through block">
                                                                {formatPrice((item.original_price || item.price) * item.quantity)}
                                                            </span>
                                                            <span className="text-primary text-[10px] font-medium tracking-wider uppercase">
                                                                Saved {formatPrice((item.discount_amount || 0) * item.quantity)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-center pt-6 border-t border-surface-light dark:border-white/5">
                                    <span className="text-text-main dark:text-white text-lg font-medium tracking-wider uppercase">Total</span>
                                    <span className="text-text-main dark:text-white text-2xl font-light tracking-wide">{formatPrice(order.total)}</span>
                                </div>
                                {(() => {
                                    const totalSavings = order.items?.reduce((sum: number, item) => {
                                        const discountAmount = Number(item.discount_amount || 0);
                                        return sum + (discountAmount * item.quantity);
                                    }, 0) || 0;

                                    if (totalSavings > 0) {
                                        return (
                                            <div className="flex justify-between items-center pt-4 text-primary">
                                                <span className="text-xs font-medium tracking-widest uppercase flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">savings</span>
                                                    You Saved
                                                </span>
                                                <span className="text-lg font-medium tracking-wide">-{formatPrice(totalSavings)}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </>
                        ) : (
                            <div className="text-center py-8 border-t border-surface-light dark:border-white/5">
                                <p className="text-text-muted dark:text-gray-400 mb-4">
                                    You are checking out as a Guest.
                                    <br />
                                    Please check your email for full order details.
                                </p>
                                <div className="p-4 bg-primary/5 rounded-lg inline-block">
                                    <p className="text-primary text-sm font-medium">Save your Order ID to track your shipment.</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Action Buttons */}
                    <div className="animate-fade-in delay-400 flex flex-col md:flex-row gap-4 w-full justify-center">
                        {/* Logic: If items exist, assume user logged in or we have data -> Account/Orders. Else Guest -> Order Lookup */}
                        {order.items && order.items.length > 0 ? (
                            <Link href={`/account/orders/${order.id}`} className="flex items-center justify-center min-w-[200px] h-12 px-8 bg-primary hover:bg-primary-dark text-white text-xs font-bold tracking-[0.2em] uppercase rounded-lg transition-all duration-300 shadow-lg shadow-primary/20">
                                View Order
                            </Link>
                        ) : (
                            <Link href={`/order-lookup?code=${order.id}`} className="flex items-center justify-center min-w-[200px] h-12 px-8 bg-primary hover:bg-primary-dark text-white text-xs font-bold tracking-[0.2em] uppercase rounded-lg transition-all duration-300 shadow-lg shadow-primary/20">
                                Track Order
                            </Link>
                        )}
                        <Link href="/" className="flex items-center justify-center min-w-[200px] h-12 px-8 bg-transparent border border-surface-light dark:border-white/20 text-text-main dark:text-white hover:bg-surface-light dark:hover:bg-white/5 text-xs font-bold tracking-[0.2em] uppercase rounded-lg transition-all duration-300">
                            Continue Shopping
                        </Link>
                    </div>

                    <div className="animate-fade-in delay-500 mt-16 opacity-60">
                        <p className="text-xs text-text-muted italic font-display tracking-widest">&quot;May tranquility be with you&quot;</p>
                    </div>
                </div>
            </main>

            <ZenFooter />
        </div>
    );
}