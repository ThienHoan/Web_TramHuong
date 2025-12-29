'use client';

import { useState } from 'react';
import { lookupOrder } from '@/lib/api-client';
import ZenHeader from '@/components/zen/ZenHeader';
import Link from 'next/link';
import { toast } from 'sonner';
import ZenOrderSuccess from '@/components/zen/ZenOrderSuccess';
import { Order } from '@/types/order';

export default function ZenOrderLookup() {
    const [orderCode, setOrderCode] = useState('');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Order | null>(null);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Verify order exists first
            const data = await lookupOrder(orderCode, emailOrPhone);
            setResult(data as unknown as Order); // Cast to Order type
        } catch (err: any) {
            toast.error(err.message || 'Cannot find order details. Please check your information.');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return <ZenOrderSuccess order={result} />;
    }

    return (
        <div className="bg-zen-green-50 dark:bg-zen-green-900 font-manrope text-zen-green-text antialiased selection:bg-zen-green-primary/20 selection:text-zen-green-primary min-h-screen flex flex-col transition-colors duration-500">
            {/* Top Navigation */}
            <ZenHeader />

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center px-4 py-32 relative overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-gradient-to-br from-zen-green-primary/5 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-gradient-to-tl from-zen-green-primary/10 to-transparent rounded-full blur-[80px] pointer-events-none"></div>

                {/* Content Card */}
                <div className="relative w-full max-w-lg bg-white dark:bg-[#1c2615] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zen-green-100 dark:border-zen-green-800 p-8 md:p-12 animate-[fadeInUp_1s_ease-out_forwards]">
                    {/* Visual Header */}
                    <div className="flex flex-col items-center text-center mb-10 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-zen-green-50 dark:bg-zen-green-900 flex items-center justify-center mb-2 border border-zen-green-100 dark:border-zen-green-800">
                            <span className="material-symbols-outlined text-zen-green-primary text-3xl opacity-80">explore</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-light tracking-widest text-zen-green-text uppercase">
                            Trace Your<br />Journey
                        </h1>
                        <div className="w-12 h-[1px] bg-zen-green-primary/40 my-4"></div>
                        <p className="text-zen-green-accent/80 text-xs font-medium tracking-widest uppercase max-w-[280px]">
                            Enter your details below to find your order status
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLookup} className="space-y-6">
                        {/* Order ID Input */}
                        <div className="space-y-2 group">
                            <label className="block text-xs font-semibold text-zen-green-text tracking-widest uppercase pl-1 transition-colors group-focus-within:text-zen-green-primary" htmlFor="order_id">
                                Order ID
                            </label>
                            <div className="relative">
                                <input
                                    className="block w-full h-12 px-4 bg-zen-green-50/50 dark:bg-zen-green-900 border border-zen-green-200 dark:border-zen-green-800 rounded-lg text-zen-green-text placeholder-zen-green-text/30 focus:border-zen-green-primary focus:ring-0 focus:outline-none transition-all font-light tracking-wide text-sm"
                                    id="order_id"
                                    placeholder="e.g. ZEN-8821"
                                    type="text"
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value)}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zen-green-text/30">
                                    <span className="material-symbols-outlined text-sm">tag</span>
                                </div>
                            </div>
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2 group">
                            <label className="block text-xs font-semibold text-zen-green-text tracking-widest uppercase pl-1 transition-colors group-focus-within:text-zen-green-primary" htmlFor="email">
                                Email Address or Phone
                            </label>
                            <div className="relative">
                                <input
                                    className="block w-full h-12 px-4 bg-zen-green-50/50 dark:bg-zen-green-900 border border-zen-green-200 dark:border-zen-green-800 rounded-lg text-zen-green-text placeholder-zen-green-text/30 focus:border-zen-green-primary focus:ring-0 focus:outline-none transition-all font-light tracking-wide text-sm"
                                    id="email"
                                    placeholder="name@example.com"
                                    type="text"
                                    value={emailOrPhone}
                                    onChange={(e) => setEmailOrPhone(e.target.value)}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zen-green-text/30">
                                    <span className="material-symbols-outlined text-sm">mail</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-4 bg-zen-green-primary hover:bg-zen-green-primary-dark text-white rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg shadow-zen-green-primary/20 hover:shadow-zen-green-primary/30 group overflow-hidden relative"
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
                        <p className="text-xs text-zen-green-text/60 tracking-wide">
                            Cannot find your order?
                            <Link href="/contact" className="text-zen-green-text font-bold border-b border-zen-green-text/20 hover:border-zen-green-primary hover:text-zen-green-primary transition-all pb-[1px] uppercase tracking-wider ml-1">
                                Contact Concierge
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="w-full py-8 border-t border-zen-green-100 dark:border-zen-green-800 bg-zen-green-50 dark:bg-zen-green-900">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-zen-green-text/60 tracking-widest uppercase">© 2024 Zen Incense. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="text-[10px] text-zen-green-text/60 tracking-widest uppercase hover:text-zen-green-primary transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-[10px] text-zen-green-text/60 tracking-widest uppercase hover:text-zen-green-primary transition-colors">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
