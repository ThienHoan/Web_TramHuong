"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { firstAvailableVariant, productStock, variantKey } from "@/lib/commerce";
import Image from "next/image";
import { ArrowUpRight, Eye, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { ProductPrice } from "@/components/ui/ProductPrice";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WishlistButton from "@/components/product/WishlistButton";
import { useCart } from "@/components/providers/CartProvider";
import { useProductDiscount } from "@/hooks/useProductDiscount";
import type { Product } from "@/types/product";

export function ProductQuickView({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const en = useLocale() !== "vi";
  const t = (vi: string, english: string) => en ? english : vi;
  const [variantIndex, setVariantIndex] = useState(firstAvailableVariant(product));
  const [adding, setAdding] = useState(false);
  const variant = product.variants?.[variantIndex];
  const key = variant ? variantKey(variant, variantIndex) : undefined;
  const { addItem, items } = useCart();
  const { finalPrice, originalPrice, savings } = useProductDiscount(
    product,
    variant ? Number(variant.price) : undefined,
  );
  const title =
    product.translation?.title || product.title || "Trầm hương Thiên Phúc";
  const cartQuantity = items.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
  const variantQuantity = items.filter(item => item.productId === product.id && (item.variantId || "") === (key || "")).reduce((sum, item) => sum + item.quantity, 0);
  const available = product.is_active !== false && Math.min(productStock(product, variant) - variantQuantity, productStock(product) - cartQuantity) > 0;

  const addToCart = async () => {
    if (!available || adding) return;
    setAdding(true);
    try {
      await addItem({
        id: product.id,
        slug: product.slug,
        title,
        price: finalPrice,
        original_price: originalPrice,
        discount_amount: savings,
        image: product.images?.[0] || "/placeholder.png",
        variantId: key,
        variantName: variant?.name,
        quantity: 1,
      });
      toast.success(t("Đã thêm vào giỏ hàng", "Added to your cart"), { description: title });
      onClose();
    } catch {
      toast.error(t("Chưa thể thêm sản phẩm. Vui lòng thử lại.", "Could not add this item. Please try again."));
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="tp-quick-image">
        <Image
          src={product.images?.[0] || "/placeholder.png"}
          alt={title}
          fill
          sizes="(max-width: 767px) 90vw, 600px"
        />
      </div>
      <div className="tp-quick-copy">
        <p className="tp-eyebrow">THIÊN PHÚC · {t("TUYỂN CHỌN", "COLLECTION")}</p>
        <DialogTitle className="tp-quick-title">{title}</DialogTitle>
        <DialogDescription className="tp-quick-description">
          {product.translation?.short_description ||
            t("Khám phá sắc hương và những chi tiết của sản phẩm trầm hương Thiên Phúc.", "Explore the details of this Thien Phuc agarwood product.")}
        </DialogDescription>
        <ProductPrice
          product={product}
          variantPrice={variant ? Number(variant.price) : undefined}
          size="lg"
        />
        {!!product.variants?.length && (
          <label className="tp-variant-label">
            {t("Lựa chọn sản phẩm", "Choose an option")}
            <select
              value={variantIndex}
              onChange={(e) => setVariantIndex(Number(e.target.value))}
            >
              {product.variants.map((v, index) => (
                <option key={index} value={index}>
                  {v.name ||
                    Object.values(v.attributes || {}).join(" · ") ||
                    v.sku}
                  {productStock(product, v) <= 0 ? t(" — Hết hàng", " — Sold out") : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="tp-button"
          onClick={addToCart}
          disabled={!available || adding}
        >
          {adding
            ? t("Đang thêm…", "Adding…")
            : available
              ? t("Thêm vào giỏ hàng", "Add to cart")
              : t("Tạm hết hàng", "Currently unavailable")}
        </button>
        <Link
          href={`/products/${product.slug}`}
          className="tp-text-link"
          onClick={onClose}
        >
          {t("Xem chi tiết sản phẩm", "View product details")} <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}

export default function HomeProducts({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Product | null>(null);
  const featured = [...products]
    .filter((p) => p.is_active)
    .sort((a, b) => Number(!!b.is_featured) - Number(!!a.is_featured))
    .slice(0, 4);
  return (
    <section
      className="tp-products tp-section"
      aria-labelledby="products-heading"
    >
      <div className="tp-container">
        <div className="tp-section-heading">
          <div>
            <p className="tp-eyebrow">NHỮNG PHẨM VẬT ĐƯỢC TUYỂN CHỌN</p>
            <h2 id="products-heading">
              Mang hương lành
              <br />
              <em>về bên mình.</em>
            </h2>
          </div>
          <Link href="/products" className="tp-text-link">
            Khám phá tất cả <ArrowUpRight size={18} />
          </Link>
        </div>
        {featured.length ? (
          <div className="tp-product-grid">
            {featured.map((product) => {
              const title =
                product.translation?.title ||
                product.title ||
                "Trầm hương Thiên Phúc";
              return (
                <article className="tp-product-card" key={product.id}>
                  <div className="tp-product-image">
                    <Link
                      href={`/products/${product.slug}`}
                      aria-label={`Xem ${title}`}
                    >
                      <Image
                        src={product.images?.[0] || "/placeholder.png"}
                        alt={title}
                        fill
                        sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 23vw"
                      />
                      {product.images?.[1] && (
                        <Image
                          className="tp-product-second"
                          src={product.images[1]}
                          alt=""
                          fill
                          sizes="(max-width: 639px) 90vw, 23vw"
                        />
                      )}
                    </Link>
                    <WishlistButton
                      productId={product.id}
                      className="tp-product-wishlist"
                    />
                    <button
                      className="tp-quick-trigger"
                      onClick={() => setSelected(product)}
                    >
                      <Eye size={16} /> Xem nhanh
                    </button>
                  </div>
                  <div className="tp-product-meta">
                    <p>
                      {product.category?.translation?.name ||
                        "Trầm hương Thiên Phúc"}
                    </p>
                    <h3>
                      <Link href={`/products/${product.slug}`}>{title}</Link>
                    </h3>
                    <ProductPrice product={product} size="sm" />
                    <button
                      className="tp-product-open"
                      onClick={() => setSelected(product)}
                      aria-label={`Lựa chọn ${title}`}
                    >
                      <ShoppingBag size={19} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="tp-products-empty">
            <ShoppingBag size={28} />
            <p>Bộ sưu tập đang được cập nhật.</p>
            <Link href="/contact" className="tp-text-link">
              Liên hệ để được tư vấn <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="tp-quick-view">
          {selected && (
            <ProductQuickView
              key={selected.id}
              product={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
