"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useCart } from "@/components/providers/CartProvider";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useLocale } from "next-intl";

export default function TraditionalCartDrawer() {
  const en = useLocale() === "en";
  const [open, setOpen] = useState(false);
  const { items, count, total, removeItem, updateQuantity } = useCart();
  const { formatPrice } = useCurrency();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative min-h-11 min-w-11 flex items-center justify-center rounded-full text-trad-text-main hover:bg-trad-bg-warm"
          aria-label={
            en ? `Open cart, ${count} items` : `Mở giỏ hàng, ${count} sản phẩm`
          }
        >
          <ShoppingBag size={21} />
          {count > 0 && (
            <span className="absolute right-0 top-0 rounded-full bg-trad-primary px-1.5 text-[10px] leading-4 text-white">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="tp-cart-drawer" data-lenis-prevent>
        <div className="tp-cart-heading">
          <SheetTitle className="font-serif text-3xl">
            {en ? "Your shopping bag" : "Giỏ hàng của bạn"}
          </SheetTitle>
          <SheetDescription>
            {count
              ? en
                ? `${count} items selected`
                : `${count} sản phẩm đã chọn`
              : en
                ? "Your next quiet moment awaits."
                : "Một làn hương đang chờ bạn khám phá."}
          </SheetDescription>
        </div>
        {items.length ? (
          <>
            <div className="tp-cart-items">
              {items.map((item) => (
                <article className="tp-cart-item" key={item.key}>
                  <div className="tp-cart-image">
                    <Image
                      src={item.image || "/placeholder.png"}
                      alt={item.title}
                      fill
                      sizes="80px"
                    />
                  </div>
                  <div>
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="font-medium"
                    >
                      {item.title}
                    </Link>
                    {item.variantName && (
                      <p className="text-xs opacity-70">{item.variantName}</p>
                    )}
                    <p className="mt-1 text-sm">{formatPrice(item.price)}</p>
                    <div className="tp-cart-quantity">
                      <button
                        aria-label={`${en ? "Decrease quantity" : "Giảm số lượng"} ${item.title}`}
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateQuantity(item.key, item.quantity - 1)
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`${en ? "Increase quantity" : "Tăng số lượng"} ${item.title}`}
                        onClick={() =>
                          updateQuantity(item.key, item.quantity + 1)
                        }
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        aria-label={`${en ? "Remove" : "Xóa"} ${item.title}`}
                        onClick={() => removeItem(item.key)}
                        className="ml-auto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="tp-cart-summary">
              <div>
                <span>{en ? "Subtotal" : "Tạm tính"}</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p>
                {en
                  ? "Shipping is calculated at checkout."
                  : "Phí vận chuyển được tính khi thanh toán."}
              </p>
              <Link
                href="/checkout"
                className="tp-button"
                onClick={() => setOpen(false)}
              >
                {en ? "Continue to checkout" : "Tiến hành thanh toán"}
              </Link>
            </div>
          </>
        ) : (
          <div className="tp-cart-empty">
            <ShoppingBag size={42} strokeWidth={1} />
            <p>
              {en
                ? "Your shopping bag is empty."
                : "Giỏ hàng của bạn còn trống."}
            </p>
            <Link
              href="/products"
              className="tp-button"
              onClick={() => setOpen(false)}
            >
              {en ? "Discover the collection" : "Khám phá sản phẩm"}
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
