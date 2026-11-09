"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { buildUrl, fetchWithAuth } from "@/services/base-http";
import { useCurrency } from "@/hooks/useCurrency";
import { Check } from "lucide-react";
import "./checkout.css";
type Option = { id: string; name: string };
export interface ShippingSelection {
  enabled: boolean;
  ready?: boolean;
  quote: null | {
    subtotal: number;
    voucherDiscount: number;
    reference: string;
    customerFee: number;
    actualFee: number;
    total: number;
    eta: string | null;
    expiresAt: string;
    provinceName: string;
  };
}
interface Props {
  items: { id: string; quantity: number; variantId?: string | null }[];
  recipient: { name: string; phone: string; address: string };
  /** Chosen with the recipient details in step 1; null if that address is incomplete. */
  destination: { provinceId: string; provinceName: string; wardCode: string } | null;
  paymentMethod: string;
  voucherCode?: string;
  onChange: (value: ShippingSelection) => void;
}
export default function ShippingQuotePanel({
  items,
  recipient,
  destination,
  paymentMethod,
  voucherCode,
  onChange,
}: Props) {
  const en = useLocale() === "en";
  const { formatPrice } = useCurrency();
  const [ready, setReady] = useState(false),
    [enabled, setEnabled] = useState(false),
    [warehouse, setWarehouse] = useState(""),
    [loading, setLoading] = useState(false),
    [setupError, setSetupError] = useState(""),
    [error, setError] = useState(""),
    [quote, setQuote] = useState<ShippingSelection["quote"]>(null),
    [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const fingerprint = JSON.stringify([
    items.map((i) => [i.id, i.variantId, i.quantity]),
    recipient,
    destination,
    paymentMethod,
    voucherCode,
    warehouse,
  ]);
  useEffect(() => {
    let live = true;
    fetchWithAuth<{ checkoutEnabled: boolean }>(buildUrl("/shipping/status"))
      .then((status) => {
        if (!live) return;
        setReady(true);
        setEnabled(status.checkoutEnabled);
        onChange({ enabled: status.checkoutEnabled, ready: true, quote: null });
        if (status.checkoutEnabled)
          return fetchWithAuth<Option[]>(buildUrl("/shipping/warehouses")).then(
            (w) => {
              if (live) {
                setWarehouse(w[0]?.id || "");
                if (!w.length)
                  setSetupError(
                    en
                      ? "Delivery is not available right now. Please contact the store."
                      : "Cửa hàng chưa thể báo phí giao hàng. Vui lòng liên hệ hỗ trợ.",
                  );
              }
            },
          );
      })
      .catch(() => {
        if (live)
          setSetupError(
            en
              ? "Shipping is temporarily unavailable."
              : "Chưa tải được dịch vụ vận chuyển.",
          );
      });
    return () => {
      live = false;
    };
  }, [en, onChange]);
  useEffect(() => {
    const run = ++generation.current;
    setError("");
    setQuote(null);
    onChange({ enabled, ready, quote: null });
    if (
      !enabled ||
      !warehouse ||
      !destination ||
      !items.length ||
      paymentMethod === "showroom"
    ) {
      setLoading(false);
      return;
    }
    const normalizedRecipient = {
      name: recipient.name.trim(),
      phone: recipient.phone.replace(/\s/g, ""),
      address: recipient.address.trim(),
    };
    if (
      !normalizedRecipient.name ||
      !normalizedRecipient.address ||
      !/^(0\d{9}|\+84\d{9})$/.test(normalizedRecipient.phone)
    ) {
      setLoading(false);
      setError(
        en
          ? "Enter your name, a valid Vietnamese phone number and street address first."
          : "Điền họ tên, số điện thoại Việt Nam hợp lệ và địa chỉ chi tiết trước.",
      );
      return;
    }
    setLoading(true);
    fetchWithAuth<NonNullable<ShippingSelection["quote"]>>(
      buildUrl("/shipping/quote"),
      {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            variantId: i.variantId || undefined,
          })),
          destination: {
            scheme: "two_level",
            provinceId: Number(destination.provinceId),
            wardCode: destination.wardCode,
          },
          warehouseId: warehouse,
          recipient: normalizedRecipient,
          paymentMethod: paymentMethod === "sepay" ? "sepay" : "cod",
          voucherCode: voucherCode || undefined,
        }),
      },
    )
      .then((result) => {
        if (run !== generation.current) return;
        const next = { ...result, provinceName: destination.provinceName };
        setQuote(next);
        onChange({ enabled: true, ready: true, quote: next });
      })
      .catch((e: unknown) => {
        if (run === generation.current)
          setError(
            e instanceof Error && e.message.includes("MEASURED_PACKAGE")
              ? en
                ? "This item needs a delivery review. Please contact the store."
                : "Sản phẩm cần được cửa hàng kiểm tra thông tin đóng gói. Vui lòng liên hệ hỗ trợ."
              : en
                ? "Cannot calculate delivery. Check your details or try again shortly."
                : "Chưa tính được phí giao hàng. Kiểm tra thông tin hoặc thử lại sau.",
          );
      })
      .finally(() => {
        if (run === generation.current) setLoading(false);
      });
    // The fingerprint covers every value this request sends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, enabled, ready, attempt, onChange]);
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(
      () => {
        setQuote(null);
        onChange({ enabled, ready, quote: null });
        setError(
          en
            ? "Quote expired. Please calculate again."
            : "Báo giá đã hết hạn. Vui lòng tính lại.",
        );
      },
      Math.max(0, Date.parse(quote.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [quote, enabled, ready, onChange, en]);
  if (paymentMethod === "showroom") return null;
  if (!ready)
    return (
      <section aria-label={en ? "Shipping quote" : "Báo giá vận chuyển"}>
        <p
          className={setupError ? "checkout-error" : "checkout-form-note"}
          role={setupError ? "alert" : "status"}
        >
          {setupError ||
            (en
              ? "Loading delivery options…"
              : "Đang tải thông tin giao hàng…")}
        </p>
      </section>
    );
  if (!enabled) return null;
  const message =
    setupError ||
    error ||
    (destination
      ? ""
      : en
        ? "Your province and ward are missing. Edit your details to add them."
        : "Chưa có đủ tỉnh/thành và phường/xã. Bấm Chỉnh sửa ở phần người nhận để bổ sung.");

  return (
    <section
      className="checkout-delivery"
      aria-label={en ? "Shipping quote" : "Báo giá vận chuyển"}
      aria-busy={loading}
    >
      <div className="checkout-carrier">
        <span className="checkout-carrier-mark">GHN</span>
        <div>
          <strong>Giao Hàng Nhanh · GHN</strong>
          <p>
            {en
              ? "Your delivery partner"
              : "Đơn vị vận chuyển đơn hàng của bạn"}
          </p>
        </div>
        <Check size={18} />
      </div>
      {loading && (
        <p className="checkout-form-note">
          {en ? "Calculating delivery…" : "Đang tính phí giao hàng…"}
        </p>
      )}
      {message && (
        <p role="alert" className="checkout-error">
          {message}
        </p>
      )}
      {error && destination && warehouse && (
        <button
          type="button"
          onClick={() => setAttempt((current) => current + 1)}
          className="checkout-quote-button"
        >
          {en ? "Calculate again" : "Tính lại phí giao hàng"}
        </button>
      )}
      {quote && (
        <div role="status" className="checkout-quote-result">
          <div>
            <span>{en ? "Delivery fee" : "Phí giao hàng"}</span>
            <strong>
              {quote.customerFee === 0
                ? en
                  ? "Free delivery"
                  : "Miễn phí giao hàng"
                : formatPrice(quote.customerFee)}
            </strong>
          </div>
          {quote.eta && (
            <div>
              <span>{en ? "Estimated arrival" : "Dự kiến nhận hàng"}</span>
              <strong>
                {new Date(quote.eta).toLocaleDateString(
                  en ? "en-GB" : "vi-VN",
                  { day: "numeric", month: "short" },
                )}
              </strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
