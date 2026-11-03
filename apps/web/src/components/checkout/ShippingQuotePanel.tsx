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
  paymentMethod: string;
  voucherCode?: string;
  onChange: (value: ShippingSelection) => void;
}
export default function ShippingQuotePanel({
  items,
  recipient,
  paymentMethod,
  voucherCode,
  onChange,
}: Props) {
  const en = useLocale() === "en";
  const { formatPrice } = useCurrency();
  const [ready, setReady] = useState(false),
    [wardsLoading, setWardsLoading] = useState(false);
  const [enabled, setEnabled] = useState(false),
    [provinces, setProvinces] = useState<Option[]>([]),
    [wards, setWards] = useState<Option[]>([]);
  const [province, setProvince] = useState(""),
    [ward, setWard] = useState(""),
    [warehouse, setWarehouse] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [quote, setQuote] = useState<ShippingSelection["quote"]>(null);
  const generation = useRef(0);
  const fingerprint = JSON.stringify([
    items.map((i) => [i.id, i.variantId, i.quantity]),
    recipient,
    paymentMethod,
    voucherCode,
    province,
    ward,
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
          return Promise.all([
            fetchWithAuth<Option[]>(buildUrl("/shipping/addresses/provinces")),
            fetchWithAuth<Option[]>(buildUrl("/shipping/warehouses")),
          ]).then(([p, w]) => {
            if (live) {
              setProvinces(p);
              setWarehouse(w[0]?.id || "");
              if (!w.length)
                setError(
                  en
                    ? "Delivery is not available right now. Please contact the store."
                    : "Cửa hàng chưa thể báo phí giao hàng. Vui lòng liên hệ hỗ trợ.",
                );
            }
          });
      })
      .catch(() => {
        if (live)
          setError(
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
    generation.current++;
    setLoading(false);
    setQuote(null);
    onChange({ enabled, ready, quote: null });
  }, [fingerprint, enabled, ready, onChange]);
  useEffect(() => {
    setWard("");
    setWards([]);
    if (!province || !enabled) return;
    setWardsLoading(true);
    let live = true;
    fetchWithAuth<Option[]>(
      buildUrl("/shipping/addresses/wards", { provinceId: province }),
    )
      .then((data) => {
        if (live) setWards(data);
      })
      .catch(() => {
        if (live)
          setError(en ? "Cannot load wards." : "Không thể tải phường/xã.");
      })
      .finally(() => {
        if (live) setWardsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [province, enabled, en]);
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
          className={error ? "checkout-error" : "checkout-form-note"}
          role={error ? "alert" : "status"}
        >
          {error ||
            (en
              ? "Loading delivery options…"
              : "Đang tải thông tin giao hàng…")}
        </p>
      </section>
    );
  if (!enabled) return null;
  const calculate = async () => {
    setError("");
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
      setError(
        en
          ? "Enter your name, a valid Vietnamese phone number and street address first."
          : "Điền họ tên, số điện thoại Việt Nam hợp lệ và địa chỉ chi tiết trước.",
      );
      return;
    }
    if (!province || !ward || !warehouse) {
      setError(
        en
          ? "Select a province and ward. If delivery is unavailable, please contact the store."
          : "Chọn tỉnh/thành và phường/xã. Nếu chưa có tuyến giao, vui lòng liên hệ cửa hàng.",
      );
      return;
    }
    const run = ++generation.current;
    setLoading(true);
    setQuote(null);
    onChange({ enabled: true, ready: true, quote: null });
    try {
      const result = await fetchWithAuth<
        NonNullable<ShippingSelection["quote"]>
      >(buildUrl("/shipping/quote"), {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            variantId: i.variantId || undefined,
          })),
          destination: {
            scheme: "two_level",
            provinceId: Number(province),
            wardCode: ward,
          },
          warehouseId: warehouse,
          recipient: normalizedRecipient,
          paymentMethod: paymentMethod === "sepay" ? "sepay" : "cod",
          voucherCode: voucherCode || undefined,
        }),
      });
      if (run !== generation.current) return;
      const next = {
        ...result,
        provinceName: provinces.find((p) => p.id === province)!.name,
      };
      setQuote(next);
      onChange({ enabled: true, ready: true, quote: next });
    } catch (e) {
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
    } finally {
      if (run === generation.current) setLoading(false);
    }
  };

  return (
    <section
      className="checkout-delivery"
      aria-label={en ? "Shipping quote" : "Báo giá vận chuyển"}
      aria-busy={loading}
    >
      <div className="checkout-fields">
        <div className="checkout-field">
          <label htmlFor="shipping-province">
            {en ? "Province / city" : "Tỉnh / thành"}
          </label>
          <select
            id="shipping-province"
            aria-label={en ? "Province / city" : "Tỉnh / thành"}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={!provinces.length}
          >
            <option value="">
              {en ? "Select province / city" : "Chọn tỉnh / thành"}
            </option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="checkout-field">
          <label htmlFor="shipping-ward">
            {en ? "Ward / commune" : "Phường / xã"}
          </label>
          <select
            id="shipping-ward"
            aria-label={en ? "Ward / commune" : "Phường / xã"}
            disabled={!province || wardsLoading}
            value={ward}
            onChange={(e) => setWard(e.target.value)}
          >
            <option value="">
              {wardsLoading
                ? en
                  ? "Loading…"
                  : "Đang tải…"
                : en
                  ? "Select ward / commune"
                  : "Chọn phường / xã"}
            </option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="checkout-carrier">
        <span className="checkout-carrier-mark">GHN</span>
        <div>
          <strong>
            {en ? "Giao Hàng Nhanh · GHN" : "Giao Hàng Nhanh · GHN"}
          </strong>
          <p>
            {en
              ? "Your delivery partner"
              : "Đơn vị vận chuyển đơn hàng của bạn"}
          </p>
        </div>
        <Check size={18} />
      </div>
      <button
        type="button"
        disabled={loading || !province || !ward || !warehouse}
        onClick={calculate}
        className="checkout-quote-button"
      >
        {loading
          ? en
            ? "Calculating delivery…"
            : "Đang tính phí…"
          : quote
            ? en
              ? "Calculate again"
              : "Tính lại phí giao hàng"
            : en
              ? "Calculate delivery"
              : "Tính phí giao hàng"}
      </button>
      {error && (
        <p role="alert" className="checkout-error">
          {error}
        </p>
      )}
      {quote ? (
        <>
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
          <p className="checkout-form-note">
            {en
              ? "Changing your details, items or payment method requires a new quote."
              : "Nếu đổi địa chỉ, sản phẩm hoặc cách thanh toán, hãy tính lại phí."}
          </p>
        </>
      ) : (
        <p className="checkout-form-note">
          {en
            ? "Select your destination and calculate delivery to see the final total."
            : "Chọn địa chỉ và tính phí để xem tổng tiền chính xác trước khi đặt hàng."}
        </p>
      )}
    </section>
  );
}
