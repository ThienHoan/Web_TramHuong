'use client';

import { Order } from '@/types/order';
import { useCurrency } from '@/hooks/useCurrency';
import ProductImage from '@/components/ui/ProductImage';

interface ZenOrderLookupDialogProps {
    order: Order;
    isOpen: boolean;
    onClose: () => void;
}

export default function ZenOrderLookupDialog({ order, isOpen, onClose }: ZenOrderLookupDialogProps) {
    const { formatPrice } = useCurrency();

    if (!isOpen) return null;

    // Derived status
    // Map status to uppercase for comparison just in case, or use strict enum checks
    const statusUpper = order.status.toUpperCase();
    const isPaid = order.payment_status === 'paid' || statusUpper === 'PAID';

    const statusLabel = statusUpper === 'PENDING' ? 'Processing' :
        statusUpper === 'CONFIRMED' || statusUpper === 'PAID' ? 'Confirmed' :
            statusUpper === 'SHIPPED' ? 'In Transit' :
                statusUpper === 'COMPLETED' ? 'Delivered' :
                    statusUpper === 'CANCELED' || statusUpper === 'CANCELLED' ? 'Cancelled' : order.status;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"
                onClick={onClose}
            ></div>

            {/* Dialog Card */}
            <div className="animate-[fadeInUp_0.5s_ease-out] group relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-[#f7f8f6] dark:bg-[#182111] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all dark:shadow-black/50 border border-black/5 dark:border-white/5">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                {/* Dialog Header */}
                <div className="flex flex-col items-center border-b border-black/5 dark:border-white/5 bg-gradient-to-b from-white/50 to-transparent px-8 pb-6 pt-10 text-center dark:from-white/5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#6d974e] dark:text-[#54ae13]/80">
                        Your Journey&apos;s Echoes
                    </h3>
                    <h1 className="font-display text-3xl font-light tracking-tight text-[#131b0e] dark:text-white sm:text-4xl">
                        ORDER #{order.id.slice(0, 8).toUpperCase()}
                    </h1>

                    {/* Status Badge */}
                    <div className="mt-4 flex items-center gap-2 rounded-full border border-[#54ae13]/20 bg-[#54ae13]/5 px-4 py-1.5 dark:border-[#54ae13]/30 dark:bg-[#54ae13]/10">
                        <span className="relative flex h-2 w-2">
                            {['SHIPPED', 'PENDING', 'PAID', 'CONFIRMED'].includes(statusUpper) && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#54ae13] opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusUpper === 'CANCELED' || statusUpper === 'CANCELLED' ? 'bg-red-500' : 'bg-[#54ae13]'}`}></span>
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#131b0e] dark:text-white">
                            {statusLabel}
                        </span>
                    </div>
                </div>

                {/* Products Section (Scrollable) */}
                <div className="scrollbar-hide max-h-[320px] overflow-y-auto px-6 py-2 sm:px-10">
                    {order.items.map((item, index) => (
                        <div key={index} className="group/item flex items-center justify-between border-b border-black/5 py-6 transition-colors hover:bg-white/40 dark:border-white/5 dark:hover:bg-white/5 last:border-0 text-left w-full">
                            <div className="flex items-center gap-5 w-full">
                                <div className="relative aspect-square size-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 shadow-sm dark:bg-gray-800">
                                    <ProductImage
                                        src={item.image}
                                        alt={item.title || 'Product Image'}
                                        className="h-full w-full object-cover object-center transition-transform duration-700 group-hover/item:scale-110"
                                    />
                                </div>
                                <div className="flex flex-col justify-center flex-grow pr-4">
                                    <p className="line-clamp-1 font-display text-sm font-medium uppercase tracking-wide text-[#131b0e] dark:text-white">
                                        {item.title}
                                    </p>
                                    <p className="mt-1 font-display text-xs font-light tracking-wide text-[#6d974e] dark:text-gray-400">
                                        Qty: {item.quantity} {item.variant_name ? `| ${item.variant_name}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <p className="font-display text-sm font-normal text-[#131b0e] dark:text-white whitespace-nowrap">
                                    {formatPrice(item.price * item.quantity)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer / Info Grid */}
                <div className="bg-gray-50/50 px-8 py-8 dark:bg-white/[0.02]">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 text-left">
                        {/* Shipping Info */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[#6d974e] dark:text-gray-500">
                                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Shipping To</span>
                            </div>
                            <div className="pl-6">
                                <p className="font-display text-sm font-medium text-[#131b0e] dark:text-white">
                                    {order.shipping_info?.name || 'Guest Customer'}
                                </p>
                                <p className="font-display text-sm font-light leading-relaxed text-gray-600 dark:text-gray-400">
                                    {order.shipping_info?.address}, {order.shipping_info?.city}
                                </p>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[#6d974e] dark:text-gray-500">
                                <span className="material-symbols-outlined text-[16px]">payments</span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Payment</span>
                            </div>
                            <div className="pl-6">
                                <div className="flex items-baseline gap-3">
                                    <p className="font-display text-xl font-light text-[#131b0e] dark:text-white">{formatPrice(order.total)}</p>
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isPaid ? 'bg-[#131b0e] text-white dark:bg-[#54ae13] dark:text-[#131b0e]' : 'bg-gray-200 text-gray-500'}`}>
                                        {isPaid ? 'Paid' : 'Unpaid'}
                                    </span>
                                </div>
                                <p className="mt-1 font-display text-xs font-light text-gray-500 dark:text-gray-400">
                                    {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-6 dark:border-white/5">
                        <button
                            onClick={onClose}
                            className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-[#131b0e] dark:hover:text-white"
                        >
                            Close
                        </button>
                        <button className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-[#131b0e] py-3 pl-6 pr-5 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-[#54ae13] hover:text-[#131b0e] dark:bg-white dark:text-[#131b0e] dark:hover:bg-[#54ae13]">
                            <span>View Full Details</span>
                            <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
