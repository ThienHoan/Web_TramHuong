"use client";

import { Link } from "@/i18n/routing";
import ProductImage from "../ui/ProductImage";
import { ProductPrice } from "@/components/ui/ProductPrice";
import { useProductDiscount } from "@/hooks/useProductDiscount";
import WishlistButton from "@/components/product/WishlistButton";
import { ArrowUpRight } from "lucide-react";
import { Product } from "@/types/product";

export default function TraditionalProductCard({ product }: { product: Product }) {
  const { isActive, discountPercent } = useProductDiscount(product);
  const title = product.translation?.title || product.title || "Trầm hương Thiên Phúc";
  return <article className="atelier-product group relative w-full flex flex-col">
    <div className="atelier-product-image relative overflow-hidden">
      <Link href={`/products/${product.slug}`} className="block h-full" aria-label={`Xem ${title}`}>
        <ProductImage src={product.images?.[0] || "/placeholder.png"} alt={title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      </Link>
      <div className="absolute right-3 top-3"><WishlistButton productId={product.id} /></div>
      {isActive && <span className="absolute top-3 left-3 bg-[#fffdf8] px-3 py-1.5 text-[11px] text-[#59402e]">−{discountPercent}%</span>}
    </div>
    <div className="atelier-product-copy">
      <p className="text-[10px] uppercase tracking-[.14em] text-trad-text-muted mb-2">{product.category?.translation?.name || "Tuyển chọn Thiên Phúc"}</p>
      <h3><Link href={`/products/${product.slug}`}>{title}</Link></h3>
      <div className="flex justify-between items-center gap-3 mt-4"><ProductPrice product={product} size="md" theme="traditional" /><Link href={`/products/${product.slug}`} aria-label={`Khám phá ${title}`} className="p-2 border border-trad-border-warm"><ArrowUpRight size={18} /></Link></div>
    </div>
  </article>;
}
