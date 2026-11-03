"use client";
import { use, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Folder,
  Users,
  BookOpen,
  MessageSquare,
  Ticket,
  Truck,
  ArrowUpRight,
  Menu,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { BrandLockup } from "@/components/brand/BrandIdentity";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import "./admin.css";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const en = locale === "en";
  const pathname = usePathname();
  const { loading, role, session, profile, signOut } = useAuth();
  const [mobile, setMobile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const tabs = [
    {name:en?'Logistics':'Giao hàng',href:'/admin/shipping',icon:Truck,group:1},
    {
      name: en ? "Overview" : "Tổng quan",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      group: 0,
    },
    {
      name: en ? "Orders" : "Đơn hàng",
      href: "/admin/orders",
      icon: ShoppingBag,
      group: 1,
    },
    {
      name: en ? "Products" : "Sản phẩm",
      href: "/admin/products",
      icon: Package,
      group: 1,
    },
    {
      name: en ? "Categories" : "Danh mục",
      href: "/admin/categories",
      icon: Folder,
      group: 1,
    },
    {
      name: en ? "Customers" : "Khách hàng",
      href: "/admin/users",
      icon: Users,
      group: 1,
    },
    {
      name: en ? "Journal" : "Bài viết",
      href: "/admin/blog",
      icon: BookOpen,
      group: 2,
    },
    {
      name: en ? "Messages" : "Liên hệ",
      href: "/admin/contacts",
      icon: MessageSquare,
      group: 2,
    },
    {
      name: en ? "Discounts" : "Mã giảm giá",
      href: "/admin/vouchers",
      icon: Ticket,
      group: 2,
    },
  ].filter((tab) => role === "ADMIN" || tab.href !== "/admin/dashboard");
  const current =
    tabs.find((tab) => pathname.includes(tab.href))?.name ||
    (en ? "Administration" : "Quản trị");
  const navigation = (
    <>
      <Link
        className="admin-brand"
        href={role === "ADMIN" ? "/admin/dashboard" : "/admin/orders"}
        onClick={() => setMobile(false)}
      >
        <BrandLockup inverse compact locale={locale} />
      </Link>
      <div className="admin-store-tag">
        <span />
        {en ? "Store workspace" : "Không gian cửa hàng"}
      </div>
      <nav aria-label={en ? "Administration" : "Điều hướng quản trị"}>
        {[0, 1, 2].map((group) => (
          <div className="admin-nav-group" key={group}>
            {group > 0 && (
              <p>
                {group === 1
                  ? en
                    ? "COMMERCE"
                    : "KINH DOANH"
                  : en
                    ? "CONTENT & CARE"
                    : "NỘI DUNG & CHĂM SÓC"}
              </p>
            )}
            {tabs
              .filter((tab) => tab.group === group)
              .map(({ name, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobile(false)}
                  aria-current={pathname.includes(href) ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {pathname.includes(href) && <ChevronRight size={14} />}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link href="/" target="_blank" rel="noopener noreferrer">
          {en ? "View storefront" : "Xem cửa hàng"}
          <ArrowUpRight size={16} />
        </Link>
        <div className="admin-sidebar-account">
          <span className="admin-sidebar-avatar">
            {(profile?.full_name || profile?.email || "A")
              .charAt(0)
              .toUpperCase()}
          </span>
          <div>
            <strong>{profile?.full_name || profile?.email || "Admin"}</strong>
            <span>
              {role === "ADMIN"
                ? en
                  ? "Administrator"
                  : "Quản trị viên"
                : en
                  ? "Staff"
                  : "Nhân viên"}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            disabled={signingOut}
            aria-label={en ? "Sign out" : "Đăng xuất"}
            onClick={async () => {
              setSigningOut(true);
              try {
                await signOut();
              } finally {
                setSigningOut(false);
              }
            }}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </>
  );
  if (loading)
    return (
      <div className="admin-workspace-loading">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-72 w-full" />
        <span role="status">
          {en ? "Loading account…" : "Đang tải tài khoản…"}
        </span>
      </div>
    );
  if (!session || (role !== "ADMIN" && role !== "STAFF"))
    return (
      <div className="admin-workspace-loading" role="alert">
        <ShieldCheck size={32} />
        <h1>{en ? "Admin access required" : "Bạn cần quyền quản trị"}</h1>
        <Button asChild>
          <Link href="/login">{en ? "Sign in" : "Đăng nhập"}</Link>
        </Button>
      </div>
    );
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">{navigation}</aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <Button
              className="admin-mobile-toggle"
              size="icon"
              variant="ghost"
              onClick={() => setMobile(true)}
              aria-label={en ? "Open navigation" : "Mở điều hướng"}
            >
              <Menu size={20} />
            </Button>
            <span>{en ? "Workspace" : "Không gian quản trị"}</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-access-label">
              <ShieldCheck size={14} />
              {role === "ADMIN" ? "Admin" : "Staff"}
            </span>
            <Link
              href={pathname.replace(/^\/(vi|en)/, "") || "/admin/dashboard"}
              locale={en ? "vi" : "en"}
              className="admin-language"
              aria-label={en ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh"}
            >
              {en ? "VI" : "EN"}
            </Link>
          </div>
        </header>
        <main className="admin-route-content">{children}</main>
        <footer className="admin-workspace-footer">
          <span>Thiên Phúc</span>
          <span>
            {en
              ? "Agarwood · Store operations"
              : "Trầm hương Việt · Quản trị cửa hàng"}
          </span>
        </footer>
      </div>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent
          side="left"
          className="admin-mobile-sidebar w-[280px] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{en ? "Navigation" : "Điều hướng"}</SheetTitle>
            <SheetDescription>
              {en ? "Store management" : "Quản lý cửa hàng"}
            </SheetDescription>
          </SheetHeader>
          {navigation}
        </SheetContent>
      </Sheet>
    </div>
  );
}
