
'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import { useState } from 'react';

export default function Header() {
    const { user, role, profile, signOut } = useAuth();
    const { count } = useCart();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    // Check if we are on the homepage
    const isHome = pathname === '/' || pathname === '/en' || pathname === '/vi';

    // Theme classes based on route
    const headerClass = isHome
        ? "fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md text-zen-900 border-b border-zen-200/50 transition-colors duration-300"
        : "fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md text-white border-b border-white/10 transition-colors duration-300";

    const linkHoverClass = isHome
        ? "hover:text-zen-secondary transition-colors"
        : "hover:text-amber-400 transition-colors";

    return (
        <header className={headerClass}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo / Home */}
                <Link href="/" className="text-xl font-bold tracking-widest uppercase font-zen-display">
                    Tram Huong
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex gap-8 text-sm font-light font-zen-sans tracking-wide">
                    <Link href="/products" className={linkHoverClass}>Products</Link>
                    <Link href="/contact" className={linkHoverClass}>Contact</Link>
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-6">
                    {/* Wishlist */}
                    <Link href="/account/wishlist" className={`relative ${isHome ? 'hover:text-zen-secondary' : 'hover:text-red-500'} transition-colors`} title="My Wishlist">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                    </Link>

                    {/* Cart */}
                    <Link href="/checkout" className={`relative ${linkHoverClass}`}>
                        Cart ({count})
                    </Link>

                    {/* Auth */}
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className={`flex items-center gap-2 ${linkHoverClass} text-sm`}
                            >
                                <span>{profile?.full_name || user.email?.split('@')[0]}</span>
                                {role === 'ADMIN' && <span className="text-[10px] bg-red-600 text-white px-1 rounded">ADMIN</span>}
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white text-black text-sm rounded shadow-lg py-1 border border-gray-100">
                                    <Link href="/account/profile" className="block px-4 py-2 hover:bg-gray-100">My Profile</Link>
                                    <Link href="/account/reviews" className="block px-4 py-2 hover:bg-gray-100">My Reviews</Link>
                                    <Link href="/account/orders" className="block px-4 py-2 hover:bg-gray-100">My Orders</Link>
                                    {(role === 'ADMIN' || role === 'STAFF') && (
                                        <Link href="/admin/dashboard" className="block px-4 py-2 hover:bg-gray-100 text-red-600 font-bold">Admin Dashboard</Link>
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
                        <Link href="/login" className={`text-sm border ${isHome ? 'border-zen-900/30' : 'border-white/30'} px-4 py-1.5 rounded hover:bg-zen-secondary hover:text-white transition-colors`}>
                            Login
                        </Link>
                    )}

                    {/* Lang Switcher (Strict Theme Coupling) */}
                    <Link href={pathname} locale="vi" className={`text-xs opacity-50 hover:opacity-100 uppercase font-bold border ${isHome ? 'border-zen-900/30' : 'border-white/30'} px-2 py-1 rounded`}>
                        VI
                    </Link>
                </div>
            </div>
        </header>
    );
}
