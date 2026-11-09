"use client";

import { Notice } from '@/components/ui/notice';
import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductImage from "@/components/ui/ProductImage";
import type { CartItem } from "@/components/providers/CartProvider";
import { useCurrency } from "@/hooks/useCurrency";
import "./checkout.css";

export function CheckoutLayout({
  stage,
  children,
  summary,
}: {
  stage: 1 | 2;
  children: ReactNode;
  summary: ReactNode;
}) {
  const en = useLocale() === "en";
  return (
    <main
      className="checkout-experience"
      data-skin={en ? "zen" : "traditional"}
    >
      <div className="checkout-container">
        <Link href="/cart" className="checkout-back">
          <ArrowLeft size={15} />
          {en ? "Back to your bag" : "Quay lại giỏ hàng"}
        </Link>
        <header className="checkout-heading">
          <div>
            <p className="checkout-eyebrow">
              THIÊN PHÚC · {en ? "CHECKOUT" : "THANH TOÁN"}
            </p>
            <h1>{en ? "Complete your order" : "Hoàn tất đơn hàng"}</h1>
            <p>
              {en
                ? "Your details, delivery and payment — one clear step at a time."
                : "Thông tin rõ ràng. Giao hàng thuận tiện. An tâm đặt mua."}
            </p>
          </div>
          <ol
            className="checkout-progress"
            aria-label={en ? "Checkout progress" : "Các bước thanh toán"}
          >
            {[
              en ? "Recipient details" : "Thông tin người nhận",
              en ? "Delivery & payment" : "Giao hàng & thanh toán",
            ].map((label, index) => (
              <li
                key={label}
                aria-current={stage === index + 1 ? "step" : undefined}
                data-active={stage >= index + 1}
              >
                <span>
                  {stage > index + 1 ? <Check size={14} /> : index + 1}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </header>
        <div className="checkout-columns">
          <div className="checkout-content">{children}</div>
          <aside
            className="checkout-aside"
            aria-label={en ? "Order summary" : "Tóm tắt đơn hàng"}
          >
            {summary}
          </aside>
        </div>
      </div>
    </main>
  );
}

export function CheckoutCard({
  title,
  description,
  number,
  children,
}: {
  title: string;
  description?: string;
  number?: string;
  children: ReactNode;
}) {
  return (
    <section className="checkout-card">
      <header className="checkout-card-heading">
        {number && <span className="checkout-section-number">{number}</span>}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="checkout-card-body">{children}</div>
    </section>
  );
}

export function CheckoutNotice({ children }: { children: ReactNode }) {
  return (
    <Notice tone="error">{children}</Notice>
  );
}

export function CheckoutSummary({
  items,
  subtotal,
  discount = 0,
  shipping,
  total,
  estimated = false,
  onQuantityChange,
  onRemove,
  children,
  action,
  hint,
}: {
  items: CartItem[];
  subtotal: number;
  discount?: number;
  shipping: number | null;
  total: number;
  estimated?: boolean;
  onQuantityChange?: (key: string, quantity: number) => void;
  onRemove?: (key: string) => void;
  children?: ReactNode;
  action?: ReactNode;
  hint?: string;
}) {
  const en = useLocale() === "en",
    { formatPrice } = useCurrency();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section className="checkout-card checkout-summary">
      <header className="checkout-card-heading">
        <ShoppingBag size={20} strokeWidth={1.5} />
        <h2>{en ? "Your order" : "Đơn hàng của bạn"}</h2>
        <span className="checkout-count">{count}</span>
      </header>
      <div className="checkout-items">
        {items.length ? (
          items.map((item) => (
            <div className="checkout-item" key={item.key}>
              <div className="checkout-item-image">
                <ProductImage
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="checkout-item-info">
                <p>{item.title}</p>
                {item.variantName && <span>{item.variantName}</span>}
                {onQuantityChange ? (
                  <div className="checkout-quantity">
                    <button
                      type="button"
                      aria-label={
                        en
                          ? `Decrease ${item.title}`
                          : `Giảm số lượng ${item.title}`
                      }
                      disabled={item.quantity <= 1}
                      onClick={() =>
                        onQuantityChange(item.key, item.quantity - 1)
                      }
                    >
                      <Minus size={13} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={
                        en
                          ? `Increase ${item.title}`
                          : `Tăng số lượng ${item.title}`
                      }
                      onClick={() =>
                        onQuantityChange(item.key, item.quantity + 1)
                      }
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                ) : (
                  <span>
                    {en ? "Qty" : "Số lượng"}: {item.quantity}
                  </span>
                )}
              </div>
              <div className="checkout-item-price">
                <strong>{formatPrice(item.price * item.quantity)}</strong>
                {onRemove && (
                  <button
                    type="button"
                    aria-label={
                      en ? `Remove ${item.title}` : `Xóa ${item.title}`
                    }
                    onClick={() => onRemove(item.key)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="checkout-muted">
            {en ? "Your bag is empty." : "Giỏ hàng đang trống."}
          </p>
        )}
      </div>
      {children && <div className="checkout-summary-extra">{children}</div>}
      <div className="checkout-totals">
        <dl>
          <div>
            <dt>{en ? "Subtotal" : "Tiền sản phẩm"}</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div>
              <dt>{en ? "Voucher discount" : "Giảm giá từ voucher"}</dt>
              <dd className="checkout-saving">−{formatPrice(discount)}</dd>
            </div>
          )}
          <div>
            <dt>{en ? "Delivery" : "Phí giao hàng"}</dt>
            <dd>
              {shipping === null ? (
                <span className="checkout-muted">
                  {en ? "Not calculated yet" : "Chưa tính phí"}
                </span>
              ) : shipping === 0 ? (
                <span className="checkout-saving">
                  {en ? "Free" : "Miễn phí"}
                </span>
              ) : (
                formatPrice(shipping)
              )}
            </dd>
          </div>
        </dl>
        <div className="checkout-grand-total">
          <span>
            {estimated
              ? en
                ? "Estimated total"
                : "Tạm tính"
              : en
                ? "Total"
                : "Tổng thanh toán"}
          </span>
          <strong>{formatPrice(total)}</strong>
        </div>
        {en && !estimated && (
          <p className="checkout-summary-hint">
            Order total in VND:{" "}
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(total)}
          </p>
        )}
        {hint && <p className="checkout-summary-hint">{hint}</p>}
        {action && <div className="checkout-order-action">{action}</div>}
      </div>
    </section>
  );
}

export function CheckoutVoucher({
  code,
  onCodeChange,
  onApply,
  onRemove,
  appliedCode,
  error,
  busy,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  appliedCode?: string;
  error?: string;
  busy?: boolean;
}) {
  const en = useLocale() === "en";
  return (
    <div className="checkout-voucher">
      <label htmlFor="checkout-voucher">
        {en ? "Have a voucher?" : "Bạn có mã ưu đãi?"}
      </label>
      {appliedCode ? (
        <div className="checkout-voucher-applied">
          <span>
            <Check size={15} />
            {appliedCode}
          </span>
          <button type="button" onClick={onRemove}>
            {en ? "Remove" : "Bỏ mã"}
          </button>
        </div>
      ) : (
        <div className="checkout-voucher-entry">
          <Input
            id="checkout-voucher"
            value={code}
            placeholder={en ? "Enter code" : "Nhập mã ưu đãi"}
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || !code.trim()}
            onClick={onApply}
          >
            {busy ? "…" : en ? "Apply" : "Áp dụng"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="checkout-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export type CheckoutPaymentMethod = "cod" | "sepay" | "showroom";
export function PaymentOptions({
  value,
  onChange,
  allowPickup = false,
  disabled = false,
}: {
  value: CheckoutPaymentMethod;
  onChange: (value: CheckoutPaymentMethod) => void;
  allowPickup?: boolean;
  disabled?: boolean;
}) {
  const en = useLocale() === "en";
  const options = [
    {
      value: "cod" as const,
      icon: Truck,
      title: en ? "Pay on delivery" : "Thanh toán khi nhận hàng",
      description: en
        ? "Pay the courier when your order arrives."
        : "Thanh toán cho nhân viên giao hàng khi nhận đơn.",
    },
    {
      value: "sepay" as const,
      icon: CreditCard,
      title: en ? "Bank transfer · SePay" : "Chuyển khoản ngân hàng · SePay",
      description: en
        ? "See your payment QR code and transfer details after placing your order."
        : "Nhận mã QR và hướng dẫn chuyển khoản sau khi đặt hàng.",
    },
    ...(allowPickup
      ? [
          {
            value: "showroom" as const,
            icon: Store,
            title: en ? "Collect in store" : "Nhận tại cửa hàng",
            description: en
              ? "No delivery fee. The store will confirm collection details."
              : "Miễn phí giao hàng. Cửa hàng liên hệ xác nhận thông tin nhận.",
          },
        ]
      : []),
  ];
  return (
    <fieldset
      className="checkout-payment-options"
      aria-label={en ? "Payment method" : "Phương thức thanh toán"}
      disabled={disabled}
    >
      {options.map((option) => (
        <label
          className="checkout-payment-option"
          data-selected={value === option.value}
          key={option.value}
        >
          <input
            type="radio"
            name="checkout-payment-method"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <option.icon size={21} strokeWidth={1.5} />
          <span>
            <strong>{option.title}</strong>
            <span>{option.description}</span>
          </span>
          {value === option.value && (
            <Check size={17} className="checkout-option-check" />
          )}
        </label>
      ))}
    </fieldset>
  );
}

export function CheckoutPrimaryButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button {...props} className={`checkout-primary ${props.className || ""}`}>
      {children}
      <ArrowRight size={17} />
    </Button>
  );
}
