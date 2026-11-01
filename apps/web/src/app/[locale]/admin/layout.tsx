"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { use } from "react";
import { LayoutDashboard, ShoppingBag, Package, Folder, Users, BookOpen, MessageSquare, Ticket, ArrowUpRight } from "lucide-react";
import { LotusIcon } from "@/components/icons/BrandIcons";

export default function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const en = locale !== "vi";
  const pathname = usePathname();
  const tabs = [
    { name: en ? "Overview" : "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: en ? "Orders" : "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
    { name: en ? "Products" : "Sản phẩm", href: "/admin/products", icon: Package },
    { name: en ? "Categories" : "Danh mục", href: "/admin/categories", icon: Folder },
    { name: en ? "Customers" : "Khách hàng", href: "/admin/users", icon: Users },
    { name: en ? "Journal" : "Bài viết", href: "/admin/blog", icon: BookOpen },
    { name: en ? "Messages" : "Liên hệ", href: "/admin/contacts", icon: MessageSquare },
    { name: en ? "Vouchers" : "Mã ưu đãi", href: "/admin/vouchers", icon: Ticket },
  ];
  return <div className="atelier-admin">
    <aside className="atelier-admin-sidebar">
      <Link href="/"><LotusIcon size={30} />Thiên Phúc</Link>
      <p>{en ? "Store management" : "Quản lý cửa hàng"}</p>
      <nav aria-label={en ? "Administration" : "Điều hướng quản trị"}>{tabs.map(({ name, href, icon: Icon }) =>
        <Link key={href} href={href} aria-current={pathname.includes(href) ? "page" : undefined}><Icon size={18} />{name}</Link>
      )}</nav>
    </aside>
    <main className="atelier-admin-content">
      <div className="atelier-admin-topline"><span>{en ? "THIEN PHUC / WORKSPACE" : "THIÊN PHÚC / KHÔNG GIAN QUẢN TRỊ"}</span><Link href="/">{en ? "View store" : "Xem cửa hàng"} <ArrowUpRight size={13} className="inline" /></Link></div>
      {children}
    </main>
  </div>;
}
