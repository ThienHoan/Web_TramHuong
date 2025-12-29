'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import { useState } from 'react';

export default function ZenHeader({ locale }: { locale: string }) {
    const { user, role, profile, signOut } = useAuth();
    const { count } = useCart();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="fixed w-full z-50 bg-zen-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zen-200/50 dark:border-zinc-800 transition-colors duration-300">
            <div className="max-w-[1920px] mx-auto px-6 lg:px-12 h-24 flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <Link href="/" className="text-2xl tracking-[0.2em] font-zen-display uppercase font-light text-zen-900 dark:text-white">
                        Tram Huong
                    </Link>
                    <div className="hidden lg:flex items-center space-x-10 pl-8 border-l border-zen-200 dark:border-zinc-800 h-8">
                        <Link href="/products" className="text-[11px] uppercase tracking-superwide font-light text-zen-800 hover:text-zen-primary transition-colors dark:text-gray-300">Shop</Link>
                        <Link href="/about" className="text-[11px] uppercase tracking-superwide font-light text-zen-800 hover:text-zen-primary transition-colors dark:text-gray-300">Our Story</Link>
                        <Link href="/blog" className="text-[11px] uppercase tracking-superwide font-light text-zen-800 hover:text-zen-primary transition-colors dark:text-gray-300">Journal</Link>
                    </div>
                </div>
                <div className="flex items-center space-x-8 text-zen-800 dark:text-gray-300">
                    <Link href="/search" className="hover:text-zen-primary transition-colors hidden sm:block">
                        <span className="material-symbols-outlined font-light text-[22px]">search</span>
                    </Link>

                    <Link href="/checkout" className="hover:text-zen-primary transition-colors relative">
                        <span className="material-symbols-outlined font-light text-[22px]">shopping_bag</span>
                        {count > 0 && (
                            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-zen-secondary rounded-full"></span>
                        )}
                    </Link>

                    <Link href={pathname} locale="vi" className="text-[11px] uppercase tracking-widest font-light hover:text-zen-primary transition-colors border border-zen-200 dark:border-zinc-700 px-2 py-1 rounded-sm">
                        VI
                    </Link>

                    {/* Auth / Menu Logic */}
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="hover:text-zen-primary transition-colors lg:hidden"
                        >
                            <span className="material-symbols-outlined font-light text-[22px]">menu</span>
                        </button>

                        {/* Desktop Auth */}
                        <div className="hidden lg:block relative">
                            {user ? (
                                <button onClick={() => setMenuOpen(!menuOpen)} className="hover:text-zen-primary transition-colors">
                                    <span className="material-symbols-outlined font-light text-[22px]">person</span>
                                </button>
                            ) : (
                                <Link href="/login" className="hover:text-zen-primary transition-colors text-[11px] uppercase tracking-widest font-light">Login</Link>
                            )}
                        </div>

                        {/* Dropdown Menu (Mobile + Desktop) */}
                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 text-zen-900 dark:text-white text-sm rounded-sm shadow-xl py-2 border border-zen-100 dark:border-zinc-800">
                                {/* Mobile Links */}
                                <div className="lg:hidden border-b border-zen-100 dark:border-zinc-800 mb-2 pb-2">
                                    <Link href="/products" className="block px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 font-light uppercase tracking-wide text-xs">Shop</Link>
                                    <Link href="/about" className="block px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 font-light uppercase tracking-wide text-xs">Our Story</Link>
                                    <Link href="/blog" className="block px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 font-light uppercase tracking-wide text-xs">Journal</Link>
                                </div>

                                {user ? (
                                    <>
                                        <div className="px-6 py-2 text-xs text-zen-400 uppercase tracking-widest">{profile?.full_name || user.email}</div>
                                        <Link href="/account/profile" className="block px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 font-light uppercase tracking-wide text-xs">My Profile</Link>
                                        <Link href="/account/orders" className="block px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 font-light uppercase tracking-wide text-xs">My Orders</Link>
                                        <button onClick={() => signOut()} className="block w-full text-left px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 text-red-500 font-light uppercase tracking-wide text-xs border-t border-zen-100 dark:border-zinc-800 mt-2 pt-2">Sign Out</button>
                                    </>
                                ) : (
                                    <Link href="/login" className="block px-6 py-2 hover:bg-zen-50 dark:hover:bg-zinc-800 font-light uppercase tracking-wide text-xs lg:hidden">Login</Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
