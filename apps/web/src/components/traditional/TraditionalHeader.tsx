'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLocale } from 'next-intl';

export default function TraditionalHeader() {
    const t = useTranslations('HomePage');
    const { items } = useCart();
    const { user, profile, role, signOut } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const query = formData.get('search')?.toString();
        if (query) {
            router.push(`/products?search=${encodeURIComponent(query)}`);
        }
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
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 border-b border-trad-border-warm ${scrolled ? 'bg-trad-bg-light/95 backdrop-blur-md shadow-sm' : 'bg-trad-bg-light/95'}`}>
            <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="text-trad-primary h-10 w-10 flex items-center justify-center bg-trad-primary/10 rounded-full">
                            <span className="material-symbols-outlined !text-[28px]">spa</span>
                        </div>
                        <h1 className="text-trad-text-main text-2xl font-bold tracking-tight">Trầm Hương Việt</h1>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-10">
                        <Link className="text-trad-text-main hover:text-trad-primary text-base font-medium transition-colors" href="/">Trang chủ</Link>
                        <Link className="text-trad-text-main hover:text-trad-primary text-base font-medium transition-colors" href="/products">Sản phẩm</Link>
                        <Link className="text-trad-text-main hover:text-trad-primary text-base font-medium transition-colors" href="/story">Câu chuyện</Link>
                        <Link className="text-trad-text-main hover:text-trad-primary text-base font-medium transition-colors" href="/contact">Liên hệ</Link>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <form onSubmit={handleSearch} className="relative hidden lg:block">
                            <input name="search" className="pl-10 pr-4 py-2 bg-trad-bg-warm border border-trad-border-warm rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-trad-primary focus:border-trad-primary w-64 placeholder:text-trad-text-muted/70 text-trad-text-main" placeholder="Tìm kiếm..." type="text" />
                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-trad-text-muted !text-[18px]">search</span>
                        </form>

                        {/* Wishlist */}
                        <Link href="/account/wishlist" className="p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full hidden sm:block" title="Danh sách yêu thích">
                            <span className="material-symbols-outlined">favorite</span>
                        </Link>

                        {/* Cart */}
                        <Link href="/cart" className="relative p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full">
                            <span className="material-symbols-outlined">shopping_cart</span>
                            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-trad-primary rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold">{items.length > 0 && items.length}</span>
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

                        <button className="md:hidden p-2 text-trad-text-main hover:bg-trad-bg-warm rounded-full transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="absolute top-20 left-0 w-full bg-trad-bg-light border-b border-trad-border-warm p-4 md:hidden shadow-lg animate-fade-in-down h-[calc(100vh-80px)] overflow-y-auto">
                    <nav className="flex flex-col gap-4">
                        <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
                        <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/products" onClick={() => setIsMenuOpen(false)}>Sản phẩm</Link>
                        <Link className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50" href="/story" onClick={() => setIsMenuOpen(false)}>Câu chuyện</Link>
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
    );
}
