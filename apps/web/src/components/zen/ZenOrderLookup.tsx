'use client';

import { useState, useEffect } from 'react';
import { lookupOrder } from '@/lib/api-client';
import ZenHeader from '@/components/zen/ZenHeader';
import Link from 'next/link';
import { toast } from 'sonner';
// import ZenOrderSuccess from '@/components/zen/ZenOrderSuccess'; // No longer used as full page
import ZenOrderLookupDialog from '@/components/zen/ZenOrderLookupDialog';
import { Order } from '@/types/order';
import { useLocale } from 'next-intl';
import ZenFooter from './ZenFooter';
import { useSearchParams } from 'next/navigation';

export default function ZenOrderLookup() {
    const locale = useLocale();
    const searchParams = useSearchParams();
    const [orderCode, setOrderCode] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setOrderCode(code);
        }
    }, [searchParams]);

    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Order | null>(null);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let query = emailOrPhone.trim();

        // Normalize phone number if it's not an email
        if (!query.includes('@')) {
            // Remove spaces
            query = query.replace(/\s/g, '');
            // Convert 0 or 84 prefix to +84 to match DB
            if (query.startsWith('0')) {
                query = '+84' + query.slice(1);
            } else if (query.startsWith('84')) {
                query = '+' + query;
            } else if (!query.startsWith('+')) {
                // If no prefix, assume +84 (optional, but safer for local numbers entered without 0)
                query = '+84' + query;
            }
        }

        try {
            // Verify order exists first
            const data = await lookupOrder(orderCode, query);
            setResult(data as unknown as Order); // Cast to Order type
        } catch (err: unknown) {
            let message = 'Cannot find order details. Please check your information.';
            if (err instanceof Error) message = err.message;
            else if (typeof err === 'object' && err !== null && 'message' in err) message = (err as { message: string }).message;

            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // Close dialog handler - Unused for now
    // const handleCloseDialog = () => {
    //     setResult(null);
    // };

    return (
        <div className="bg-[#fafcf8] dark:bg-[#131b0e] font-display text-[#131b0e] antialiased selection:bg-[#54ae13]/20 selection:text-[#54ae13] min-h-screen flex flex-col transition-colors duration-500">
            {/* Lookup Result Dialog */}
            {result && (
                <ZenOrderLookupDialog
                    isOpen={!!result}
                    onClose={() => setResult(null)}
                    order={result}
                />
            )}
            {/* Top Navigation */}
            <ZenHeader locale={locale} />

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center px-4 py-32 relative overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-gradient-to-br from-[#54ae13]/5 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-gradient-to-tl from-[#54ae13]/10 to-transparent rounded-full blur-[80px] pointer-events-none"></div>

                {/* Content Card */}
                <div className="relative w-full max-w-lg bg-[#ffffff] dark:bg-[#1c2615] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#ecf3e7] dark:border-[#3d800e]/30 p-8 md:p-12 animate-[fadeInUp_1s_ease-out_forwards]">
                    {/* Visual Header */}
                    <div className="flex flex-col items-center text-center mb-10 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-[#fafcf8] dark:bg-[#131b0e] flex items-center justify-center mb-2 border border-[#ecf3e7] dark:border-[#3d800e]/30">
                            <span className="material-symbols-outlined text-[#54ae13] text-3xl opacity-80">explore</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-light tracking-widest text-[#131b0e] dark:text-white uppercase">
                            Trace Your<br />Journey
                        </h1>
                        <div className="w-12 h-[1px] bg-[#54ae13]/40 my-4"></div>
                        <p className="text-[#5f6e58] dark:text-[#5f6e58]/80 text-xs font-medium tracking-widest uppercase max-w-[280px]">
                            Enter your details below to find your order status
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLookup} className="space-y-6">
                        {/* Order ID Input */}
                        <div className="space-y-2 group">
                            <label className="block text-xs font-semibold text-[#131b0e] dark:text-white tracking-widest uppercase pl-1 transition-colors group-focus-within:text-[#54ae13]" htmlFor="order_id">
                                Order ID
                            </label>
                            <div className="relative">
                                <input
                                    className="block w-full h-12 px-4 bg-[#fafcf8] dark:bg-[#131b0e] border border-[#ecf3e7] dark:border-[#3d800e]/30 rounded-lg text-[#131b0e] dark:text-white placeholder-[#5f6e58]/50 focus:border-[#54ae13] focus:ring-0 focus:outline-none transition-all font-light tracking-wide text-sm"
                                    id="order_id"
                                    placeholder="e.g. ZEN-8821"
                                    type="text"
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value)}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#5f6e58]/40">
                                    <span className="material-symbols-outlined text-sm">tag</span>
                                </div>
                            </div>
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2 group">
                            <label className="block text-xs font-semibold text-[#131b0e] dark:text-white tracking-widest uppercase pl-1 transition-colors group-focus-within:text-[#54ae13]" htmlFor="email">
                                Email Address or Phone
                            </label>
                            <div className="relative">
                                <input
                                    className="block w-full h-12 px-4 bg-[#fafcf8] dark:bg-[#131b0e] border border-[#ecf3e7] dark:border-[#3d800e]/30 rounded-lg text-[#131b0e] dark:text-white placeholder-[#5f6e58]/50 focus:border-[#54ae13] focus:ring-0 focus:outline-none transition-all font-light tracking-wide text-sm"
                                    id="email"
                                    placeholder="name@example.com"
                                    type="text"
                                    value={emailOrPhone}
                                    onChange={(e) => setEmailOrPhone(e.target.value)}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#5f6e58]/40">
                                    <span className="material-symbols-outlined text-sm">mail</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-4 bg-white hover:bg-[#3d800e] text-[#54ae13] rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#54ae13]/20 hover:shadow-[#54ae13]/30 group overflow-hidden relative"
                        >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
                            <span className="text-sm font-bold tracking-[0.15em] uppercase flex items-center gap-2">
                                {loading ? 'Searching...' : 'Lookup Journey'}
                                {!loading && <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_forward</span>}
                            </span>
                        </button>
                    </form>

                    {/* Footer Help */}
                    <div className="mt-8 text-center">
                        <p className="text-xs text-[#5f6e58] tracking-wide">
                            Cannot find your order?
                            <Link href="/contact" className="text-[#131b0e] dark:text-white font-semibold border-b border-[#131b0e]/20 dark:border-white/20 hover:border-[#54ae13] hover:text-[#54ae13] transition-all pb-[1px] uppercase tracking-wider ml-1">
                                Contact Concierge
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            <ZenFooter />
        </div>
    );
}
