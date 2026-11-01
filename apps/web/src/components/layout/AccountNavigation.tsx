"use client";

import { Link, usePathname } from "@/i18n/routing";
import { UserRound, ShoppingBag, Heart, MessageSquare } from "lucide-react";
import { useLocale } from "next-intl";

export default function AccountNavigation() {
  const pathname = usePathname();
  const en = useLocale() !== "vi";
  const items = [
    { href: "/account/profile", label: en ? "My details" : "Thông tin của bạn", icon: UserRound },
    { href: "/account/orders", label: en ? "Orders" : "Đơn hàng", icon: ShoppingBag },
    { href: "/account/wishlist", label: en ? "Saved pieces" : "Phẩm vật yêu thích", icon: Heart },
    { href: "/account/reviews", label: en ? "Reviews" : "Đánh giá", icon: MessageSquare },
  ];
  return <nav className="atelier-account-nav" aria-label={en ? "Your account" : "Tài khoản của bạn"}>
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}><Icon size={17} />{label}</Link>)}
  </nav>;
}
