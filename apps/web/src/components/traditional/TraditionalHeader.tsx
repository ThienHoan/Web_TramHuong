"use client";

import { useState, useEffect } from "react";

import { Link, useRouter, usePathname } from "@/i18n/routing";
import { BrandLockup } from "@/components/brand/BrandIdentity";
import TraditionalCartDrawer from "./TraditionalCartDrawer";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocale } from "next-intl";
import { useWishlist } from "@/components/providers/WishlistProvider";

import ZenSearchOverlay from "@/components/zen/ZenSearchOverlay";
import TopBar from "@/components/layout/TopBar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { motion, useScroll } from "framer-motion";
import { AppIcon } from "@/components/icons/AppIcon";

export default function TraditionalHeader() {
  // const t = useTranslations('HomePage');
  const { items: wishlistItems } = useWishlist();
  const { user, profile, role, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { scrollYProgress } = useScroll();

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setIsMenuOpen(false); // Close mobile menu if open
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "vi" : "en";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <TopBar />
      <ZenSearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        locale={locale}
      />
      <header
        className={`atelier-header sticky top-0 z-50 w-full transition-all duration-300 border-b border-trad-border-warm font-display ${scrolled ? "bg-trad-bg-light/95 backdrop-blur-md" : "bg-trad-bg-light/95"}`}
      >
        <motion.div
          className="tp-scroll-progress"
          style={{ scaleX: scrollYProgress }}
          aria-hidden="true"
        />
        <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="atelier-brand" aria-label="Thiên Phúc — Trang chủ"><BrandLockup /></Link>

            {/* Desktop Nav */}
            <nav className="tp-desktop-nav items-center gap-5">
              {[
                { href: "/", label: "Trang chủ" },
                { href: "/products", label: "Bộ sưu tập" },

                { href: "/blog", label: "Chuyện hương trầm" },
                { href: "/partnership", label: "Hợp tác" },
                { href: "/contact", label: "Liên hệ" },
                { href: "/order-lookup", label: "Tra cứu đơn" },
              ].map(({ href, label }) => {
                const isActive =
                  href === "/" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    className={`relative text-xs font-medium transition-colors hover:text-trad-primary ${
                      isActive
                        ? "text-trad-primary font-bold"
                        : "text-trad-text-main"
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
              <button
                onClick={handleSearchClick}
                className="tp-search-trigger relative group"
                aria-label="Tìm kiếm sản phẩm"
              >
                <div className="pl-10 pr-4 py-2 bg-trad-bg-warm border border-trad-border-warm rounded-full text-sm text-left w-40 text-trad-text-muted/70 cursor-pointer group-hover:border-trad-primary transition-colors">
                  Tìm kiếm...
                </div>
                <AppIcon name="search" className="absolute left-3 top-2.5 text-trad-text-muted !text-[18px] group-hover:text-trad-primary transition-colors" />
              </button>

              {/* Wishlist */}
              <Link
                href="/account/wishlist"
                className="relative p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full hidden sm:block"
                title="Danh sách yêu thích"
              >
                <AppIcon name="favorite" className="" />
                {wishlistItems.size > 0 && (
                  <span className="absolute top-1 right-0.5 h-3 w-3 bg-trad-primary rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold">
                    {wishlistItems.size}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <TraditionalCartDrawer />

              {/* User Menu / Login */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-trad-bg-warm transition-colors border border-transparent hover:border-trad-border-warm"
                  >
                    <div className="h-8 w-8 rounded-full bg-trad-primary/10 flex items-center justify-center text-trad-primary">
                      <AppIcon name="person" className="!text-[20px]" />
                    </div>
                    <span className="text-sm font-medium text-trad-text-main hidden xl:block max-w-[100px] truncate">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-trad-border-warm rounded-xl shadow-lg py-2 animate-fade-in z-50">
                      <div className="px-4 py-2 border-b border-trad-border-warm mb-2">
                        <p className="text-sm font-bold text-trad-text-main truncate">
                          {profile?.full_name || "Khách hàng"}
                        </p>
                        <p className="text-xs text-trad-text-muted truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/account/profile"
                        className="block px-4 py-2 text-sm text-trad-text-main hover:bg-trad-bg-warm hover:text-trad-primary transition-colors"
                      >
                        Tài khoản của tôi
                      </Link>
                      <Link
                        href="/account/orders"
                        className="block px-4 py-2 text-sm text-trad-text-main hover:bg-trad-bg-warm hover:text-trad-primary transition-colors"
                      >
                        Đơn hàng
                      </Link>
                      <Link
                        href="/account/wishlist"
                        className="block px-4 py-2 text-sm text-trad-text-main hover:bg-trad-bg-warm hover:text-trad-primary transition-colors"
                      >
                        Yêu thích
                      </Link>
                      {(role === "ADMIN" || role === "STAFF") && (
                        <Link
                          href="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-trad-red-900 font-bold hover:bg-trad-bg-warm transition-colors"
                        >
                          Trang quản trị
                        </Link>
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
                <Link
                  href="/login"
                  className="p-2 text-trad-text-main hover:text-trad-primary transition-colors hover:bg-trad-bg-warm rounded-full"
                  title="Đăng nhập"
                >
                  <AppIcon name="login" className="" />
                </Link>
              )}

              {/* Language Switcher */}
              <button
                onClick={toggleLocale}
                aria-label="Chuyển ngôn ngữ"
                className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full border border-trad-border-warm text-xs font-bold text-trad-text-muted hover:text-trad-primary hover:border-trad-primary transition-all uppercase"
              >
                {locale}
              </button>

              {/* Mobile Menu Button - Optimized Hit Area */}
              <SheetTrigger asChild>
                <button
                  className="tp-mobile-menu-button p-3 -mr-2 text-trad-text-main hover:bg-trad-bg-warm rounded-full transition-colors items-center justify-center min-w-[44px] min-h-[44px]"
                  aria-label="Menu"
                  aria-expanded={isMenuOpen}
                  aria-controls="traditional-mobile-menu"
                >
                  <AppIcon name="menu" className="" />
                </button>
              </SheetTrigger>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <SheetContent
            side="left"
            id="traditional-mobile-menu"
            data-lenis-prevent
            className="tp-nav-drawer bg-trad-bg-light overflow-y-auto"
          >
            <SheetTitle className="font-serif text-2xl">
              Khám phá Thiên Phúc
            </SheetTitle>
            <SheetDescription className="sr-only">
              Điều hướng website và tài khoản
            </SheetDescription>
            <nav className="flex flex-col gap-4">
              {/* Mobile Search */}
              <button
                onClick={handleSearchClick}
                className="relative w-full mb-2 group"
              >
                <div className="w-full pl-10 pr-4 py-3 bg-trad-bg-warm border border-trad-border-warm rounded-lg text-base text-left text-trad-text-muted/70 group-hover:border-trad-primary transition-colors">
                  Tìm kiếm sản phẩm...
                </div>
                <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-trad-text-muted !text-[20px] group-hover:text-trad-primary" />
              </button>

              <Link
                className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50"
                href="/"
                onClick={() => setIsMenuOpen(false)}
              >
                Trang chủ
              </Link>
              <Link
                className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50"
                href="/products"
                onClick={() => setIsMenuOpen(false)}
              >
                Sản phẩm
              </Link>
              <Link
                className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50"
                href="/order-lookup"
                onClick={() => setIsMenuOpen(false)}
              >
                Tra Cứu Đơn
              </Link>
              <Link
                className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50"
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
              >
                Thư Viện Hương Trầm
              </Link>
              <Link
                className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50"
                href="/partnership"
                onClick={() => setIsMenuOpen(false)}
              >
                Hợp Tác
              </Link>
              <Link
                className="text-trad-text-main hover:text-trad-primary font-medium py-3 border-b border-trad-border-warm/50"
                href="/contact"
                onClick={() => setIsMenuOpen(false)}
              >
                Liên hệ
              </Link>

              {/* Mobile Actions */}
              <div className="pt-4 flex flex-col gap-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-trad-bg-warm rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-trad-primary">
                        <AppIcon name="person" className="" />
                      </div>
                      <div>
                        <p className="font-bold text-trad-text-main">
                          {profile?.full_name}
                        </p>
                        <p className="text-xs text-trad-text-muted">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/account/profile"
                      className="flex items-center gap-3 text-trad-text-main px-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <AppIcon name="manage_accounts" className="text-[20px]" />{" "}
                      Tài khoản
                    </Link>
                    <Link
                      href="/account/orders"
                      className="flex items-center gap-3 text-trad-text-main px-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <AppIcon name="shopping_bag" className="text-[20px]" />{" "}
                      Đơn hàng
                    </Link>
                    <Link
                      href="/account/wishlist"
                      className="flex items-center gap-3 text-trad-text-main px-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <AppIcon name="favorite" className="text-[20px]" />{" "}
                      Yêu thích
                      {wishlistItems.size > 0 && (
                        <span className="bg-trad-red-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                          {wishlistItems.size}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 text-trad-red-900 px-2 font-medium text-left"
                    >
                      <AppIcon name="logout" className="text-[20px]" />{" "}
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="w-full bg-trad-primary text-white font-bold py-3 rounded-lg text-center shadow-md hover:bg-trad-primary-dark transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                )}

                <div className="flex justify-between items-center px-2 pt-2 border-t border-trad-border-warm/50">
                  <span className="text-trad-text-muted text-sm">Ngôn ngữ</span>
                  <button
                    onClick={toggleLocale}
                    className="flex items-center gap-2 text-trad-primary font-bold uppercase border border-trad-primary px-3 py-1 rounded-full text-xs"
                  >
                    <AppIcon name="language" className="text-[16px]" />{" "}
                    {locale}
                  </button>
                </div>
              </div>
            </nav>
          </SheetContent>
        )}
      </header>
    </Sheet>
  );
}
