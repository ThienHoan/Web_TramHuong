'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLocale } from 'next-intl';
import { useWishlist } from '@/components/providers/WishlistProvider';

import ZenSearchOverlay from '@/components/zen/ZenSearchOverlay';

export default function TraditionalHeader() {
    const t = useTranslations('HomePage');
    const { items } = useCart();
    const { items: wishlistItems } = useWishlist();
    const { user, profile, role, signOut } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    const handleSearchClick = () => {
        setIsSearchOpen(true);
        setIsMenuOpen(false); // Close mobile menu if open
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleLocale = () => {
        const nextLocale = locale === 'en' ? 'vi' : 'en';
        router.replace(pathname, { locale: nextLocale });
    };

    return (
        <>
            <ZenSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} locale={locale} />
            <header className={`sticky top-0 z-50 w-full transition-all duration-300 border-b border-trad-border-warm font-display ${scrolled ? 'bg-trad-bg-light/95 backdrop-blur-md shadow-sm' : 'bg-trad-bg-light/95'}`}>
                <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3">
                            <div className="flex items-center gap-3 shrink-0 group cursor-pointer">
                                <div className="size-12 text-primary flex items-center justify-center bg-surface-accent rounded-full border border-accent-gold/30 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-3xl">spa</span>
                                </div>
                                <div>
                                    <h1 className="font-display text-2xl font-bold leading-none tracking-tight text-primary-dark">Thiên Phúc</h1>
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-text-main font-bold mt-0.5">Trầm Hương Việt</p>
                                </div>
                            </div>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-10">
                            {[
                                { href: '/', label: 'Trang Chủ' },
                                { href: '/products', label: 'Sản Phẩm' },

                                { href: '/blog', label: 'Thư Viện Hương Trầm' },
                                { href: '/partnership', label: 'Hợp Tác' },
                                { href: '/contact', label: 'Liên Hệ' },
                                { href: '/order-lookup', label: 'Tra Cứu Đơn' },
                            ].map(({ href, label }) => {
                                const isActive = href === '/' ? pathname === href : pathname.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        className={`relative text-base font-medium transition-colors hover:text-trad-primary ${isActive ? 'text-trad-primary font-bold' : 'text-trad-text-main'
                                            }`}
                                        href={href}
                                    >
                                        {label}
                                        {isActive && (
                                            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-trad-primary rounded-full animate-fade-in"></span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            {/* Search Input Trigger */}
                            <button onClick={handleSearchClick} className="relative hidden lg:block group">
                                <div className="pl-10 pr-4 py-2 bg-trad-bg-warm border border-trad-border-warm rounded-full text-sm text-left w-64 text-trad-text-muted/70 cursor-pointer group-hover:border-trad-primary transition-colors">
                                    Tìm kiếm...
                                </div>
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-trad-text-muted !text-[18px] group-hover:text-trad-primary transition-colors">search</span>
                            </button>

                            {/* Wishlist */}
                            <Link href="/account/wishlist" className="relative p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full hidden sm:block" title="Danh sách yêu thích">
                                <span className="material-symbols-outlined">favorite</span>
                                {wishlistItems.size > 0 && (
                                    <span className="absolute top-1 right-0.5 h-3 w-3 bg-trad-primary rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold">{wishlistItems.size}</span>
                                )}
                            </Link>

                            {/* Cart */}
                            <Link href="/checkout" className="relative p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full">
                                <span className="material-symbols-outlined">shopping_cart</span>
                                <span className="absolute top-1 right-0.5 h-3 w-3 bg-trad-primary rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold">{items.length > 0 && items.length}</span>
                            </Link>

                            {/* User Menu / Login */}
                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-trad-bg-warm transition-colors border border-transparent hover:border-trad-border-warm"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-trad-primary/10 flex items-center justify-center text-trad-primary">
                                            <span className="material-symbols-outlined !text-[20px]">person</span>
                                        </div>
                                        <span className="text-sm font-medium text-trad-text-main hidden xl:block max-w-[100px] truncate">
                                            {profile?.full_name || user.email?.split('@')[0]}
                                        </span>
                                    </button>

                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-trad-border-warm rounded-xl shadow-lg py-2 animate-fade-in z-50">
                                            <div className="px-4 py-2 border-b border-trad-border-warm mb-2">
                                                <p className="text-sm font-bold text-trad-text-main truncate">{profile?.full_name || 'Khách hàng'}</p>
                                                <p className="text-xs text-trad-text-muted truncate">{user.email}</p>
                                            </div>
                                            <Link href="/account/profile" className="block px-4 py-2 text-sm text-trad-text-main hover:bg-trad-bg-warm hover:text-trad-primary transition-colors">Tài khoản của tôi</Link>
                                            <Link href="/account/orders" className="block px-4 py-2 text-sm text-trad-text-main hover:bg-trad-bg-warm hover:text-trad-primary transition-colors">Đơn hàng</Link>
                                            <Link href="/account/wishlist" className="block px-4 py-2 text-sm text-trad-text-main hover:bg-trad-bg-warm hover:text-trad-primary transition-colors">Yêu thích</Link>
                                            {(role === 'ADMIN' || role === 'STAFF') && (
                                                <Link href="/admin/dashboard" className="block px-4 py-2 text-sm text-trad-red-900 font-bold hover:bg-trad-bg-warm transition-colors">Trang quản trị</Link>
                                            )}
                                            <div className="border-t border-trad-border-warm mt-2 pt-2">
                                                <button
                                                    onClick={() => signOut()}
                                                    className="block w-full text-left px-4 py-2 text-sm text-trad-text-muted hover:text-trad-red-900 hover:bg-trad-bg-warm transition-colors"
                                                >
                                                    Đăng xuất
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login" className="p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full" title="Đăng nhập">
                                    <span className="material-symbols-outlined">login</span>
                                </Link>
                            )}

                            {/* Language Switcher */}
                            <button
                                onClick={toggleLocale}
                                className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full border border-trad-border-warm text-xs font-bold text-trad-text-muted hover:text-trad-primary hover:border-trad-primary transition-all uppercase"
                            >
                                {locale}
                            </button>

                            {/* Mobile Menu Button - Optimized Hit Area */}
                            <button
                                className="md:hidden p-3 -mr-2 text-trad-text-main hover:bg-trad-bg-warm rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                aria-label="Menu"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="absolute top-20 left-0 w-full bg-trad-bg-light border-b border-trad-border-warm p-4 md:hidden shadow-lg animate-fade-in-down h-[calc(100vh-80px)] overflow-y-auto">
                        <nav className="flex flex-col gap-4">
                            {/* Mobile Search */}
                            <button onClick={handleSearchClick} className="relative w-full mb-2 group">
                                <div className="w-full pl-10 pr-4 py-3 bg-trad-bg-warm border border-trad-border-warm rounded-lg text-base text-left text-trad-text-muted/70 group-hover:border-trad-primary transition-colors">
                                    Tìm kiếm sản phẩm...
                                </div>
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-trad-text-muted !text-[20px] group-hover:text-trad-primary">search</span>
                            </button>

                            <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
                            <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/products" onClick={() => setIsMenuOpen(false)}>Sản phẩm</Link>
                            <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/order-lookup" onClick={() => setIsMenuOpen(false)}>Tra Cứu Đơn</Link>
                            <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/blog" onClick={() => setIsMenuOpen(false)}>Thư Viện Hương Trầm</Link>
                            <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/partnership" onClick={() => setIsMenuOpen(false)}>Hợp Tác</Link>
                            <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/contact" onClick={() => setIsMenuOpen(false)}>Liên hệ</Link>

                            {/* Mobile Actions */}
                            <div className="pt-4 flex flex-col gap-4">
                                {user ? (
                                    <>
                                        <div className="flex items-center gap-3 p-3 bg-trad-bg-warm rounded-lg">
                                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-trad-primary">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-trad-text-main">{profile?.full_name}</p>
                                                <p className="text-xs text-trad-text-muted">{user.email}</p>
                                            </div>
                                        </div>
                                        <Link href="/account/profile" className="flex items-center gap-3 text-trad-text-main px-2" onClick={() => setIsMenuOpen(false)}>
                                            <span className="material-symbols-outlined text-[20px]">manage_accounts</span> Tài khoản
                                        </Link>
                                        <Link href="/account/orders" className="flex items-center gap-3 text-trad-text-main px-2" onClick={() => setIsMenuOpen(false)}>
                                            <span className="material-symbols-outlined text-[20px]">shopping_bag</span> Đơn hàng
                                        </Link>
                                        <Link href="/account/wishlist" className="flex items-center gap-3 text-trad-text-main px-2" onClick={() => setIsMenuOpen(false)}>
                                            <span className="material-symbols-outlined text-[20px]">favorite</span> Yêu thích
                                            {wishlistItems.size > 0 && <span className="bg-trad-red-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">{wishlistItems.size}</span>}
                                        </Link>
                                        <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="flex items-center gap-3 text-trad-red-900 px-2 font-medium text-left">
                                            <span className="material-symbols-outlined text-[20px]">logout</span> Đăng xuất
                                        </button>
                                    </>
                                ) : (
                                    <Link href="/login" className="w-full bg-trad-primary text-white font-bold py-3 rounded-lg text-center shadow-md hover:bg-trad-primary-dark transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        Đăng nhập
                                    </Link>
                                )}

                                <div className="flex justify-between items-center px-2 pt-2 border-t border-trad-border-warm/50">
                                    <span className="text-trad-text-muted text-sm">Ngôn ngữ</span>
                                    <button onClick={toggleLocale} className="flex items-center gap-2 text-trad-primary font-bold uppercase border border-trad-primary px-3 py-1 rounded-full text-xs">
                                        <span className="material-symbols-outlined text-[16px]">language</span> {locale}
                                    </button>
                                </div>
                            </div>
                        </nav>
                    </div>
                )}
            </header>
        </>
    );
}
