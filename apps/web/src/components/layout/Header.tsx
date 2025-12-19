
'use client';

import { Link } from '@/i18n/routing';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import { useState } from 'react';

export default function Header({ locale }: { locale: string }) {
    const { user, role, signOut } = useAuth();
    const { count } = useCart();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md text-white border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo / Home */}
                <Link href="/" className="text-xl font-bold tracking-widest uppercase">
                    Tram Huong
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex gap-8 text-sm font-light">
                    <Link href="/zen" className="hover:text-amber-400 transition-colors">Zen</Link>
                    <Link href="/traditional" className="hover:text-amber-400 transition-colors">Traditional</Link>
                    <Link href="/products" className="hover:text-amber-400 transition-colors">Products</Link>
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-6">
                    {/* Cart */}
                    <Link href="/checkout" className="relative hover:text-amber-400 transition-colors">
                        Cart ({count})
                    </Link>

                    {/* Auth */}
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center gap-2 hover:text-amber-400 transition-colors text-sm"
                            >
                                <span>{user.email?.split('@')[0]}</span>
                                {role === 'ADMIN' && <span className="text-[10px] bg-red-600 px-1 rounded">ADMIN</span>}
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white text-black text-sm rounded shadow-lg py-1">
                                    <Link href="/account/orders" className="block px-4 py-2 hover:bg-gray-100">My Orders</Link>
                                    {(role === 'ADMIN' || role === 'STAFF_ORDER') && (
                                        <Link href="/admin/dashboard" className="block px-4 py-2 hover:bg-gray-100 text-red-600">Admin Dashboard</Link>
                                    )}
                                    <button
                                        onClick={() => signOut()}
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 border-t"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="text-sm border border-white/30 px-4 py-1.5 rounded hover:bg-white hover:text-black transition-colors">
                            Login
                        </Link>
                    )}

                    {/* Lang Switcher (Basic) */}
                    <Link href="/" locale={locale === 'en' ? 'vi' : 'en'} className="text-xs opacity-50 hover:opacity-100 uppercase">
                        {locale === 'en' ? 'VI' : 'EN'}
                    </Link>
                </div>
            </div>
        </header>
    );
}
