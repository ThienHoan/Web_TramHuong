"use client";
import { LegalConsent } from '@/components/legal/LegalConsent';
import { legalAcceptance, SHOP_CONTACT } from '@/lib/legal';
import { useAnalyticsTracker } from '@/components/analytics/AnalyticsProvider';
import { cartAnalyticsItems } from '@/lib/ga4/contract';

import { useCart } from "@/components/providers/CartProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { createOrder, setAccessToken } from "@/lib/api-client";
import { Link, useRouter } from "@/i18n/routing";
import { useState, useEffect } from "react";
import TraditionalHeader from "@/components/traditional/TraditionalHeader";
import TraditionalFooter from "@/components/traditional/TraditionalFooter";
import { ProcessingOrderOverlay } from "@/components/ui/ProcessingOrderOverlay";
import {
  CheckoutCard,
  CheckoutLayout,
  CheckoutNotice,
  CheckoutPrimaryButton,
  CheckoutSummary,
  PaymentOptions,
} from "@/components/checkout/CheckoutUI";

import ShippingQuotePanel, {
  type ShippingSelection,
} from "@/components/checkout/ShippingQuotePanel";

export default function PaymentSelectPage() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [shippingSelection, setShippingSelection] = useState<ShippingSelection>(
    { enabled: false, ready: false, quote: null },
  );
  const { items, total, clearCart } = useCart();
  const analytics = useAnalyticsTracker();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  interface ShippingInfo {
    name: string;
    phone: string;
    email?: string;
    city?: string;
    address?: string;
    full_address?: string;
  }
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "sepay" | "showroom"
  >("cod");
  const [error, setError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  const isFreeShipping = (shippingSelection.quote?.subtotal ?? total) >= 300000;
  // Showroom pickup = free shipping
  const shippingFee =
    paymentMethod === "showroom"
      ? 0
      : (shippingSelection.quote?.customerFee ?? (isFreeShipping ? 0 : 30000));
  const finalTotal =
    paymentMethod !== "showroom" && shippingSelection.quote
      ? shippingSelection.quote.total
      : Math.max(0, total - voucherDiscount) + shippingFee;

  // Load shipping info from localStorage
  useEffect(() => {
    // Prevent redirect if we are in the middle of processing an order
    // When handlePlaceOrder runs, it sets loading=true, then clears cart.
    // Clearing cart updates 'total', which triggers this effect.
    // If we don't check loading, it sees empty localStorage (removed in handlePlaceOrder) and breaks.
    if (loading) return;

    const storedInfo = localStorage.getItem("checkout_shipping_info");
    const storedVoucher = localStorage.getItem("checkout_voucher_code");

    if (storedInfo) {
      try {
        const parsed: unknown = JSON.parse(storedInfo);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("name" in parsed) ||
          !("phone" in parsed)
        )
          throw new Error("Invalid recipient");
        setShippingInfo(parsed as ShippingInfo);
      } catch {
        localStorage.removeItem("checkout_shipping_info");
        router.push("/checkout");
      }
    } else {
      router.push("/checkout");
    }

    if (storedVoucher) {
      setVoucherCode(storedVoucher);
      // Verify voucher again to get discount amount
      // Use centralized API client
      import("@/lib/api-client").then(({ validateVoucher }) => {
        validateVoucher(storedVoucher, total)
          .then((data) => {
            if (data.discountAmount) {
              setVoucherDiscount(data.discountAmount);
            }
          })
          .catch((e) => {
            console.error("Voucher validation failed on payment page:", e);
            // If invalid, set discount to 0.
            setVoucherDiscount(0);
          });
      });
    }
  }, [router, total, loading]);

  const handlePlaceOrder = async () => {
    if (!termsAccepted) return;
    setError(null);
    if (!shippingInfo) {
      router.push("/checkout");
      return;
    }

    if (
      paymentMethod !== "showroom" &&
      shippingSelection.enabled &&
      (!shippingSelection.quote ||
        Date.parse(shippingSelection.quote.expiresAt) <= Date.now())
    ) {
      setError("Vui lòng tính lại phí vận chuyển trước khi đặt hàng.");
      return;
    }
    analytics?.track('add_payment_info', { payment_type: paymentMethod, items: cartAnalyticsItems(items) });
    setLoading(true);
    try {
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }

      const orderItems = items.map((i) => ({
        productId: i.id,
        quantity: i.quantity,
        variantId: i.variantId || undefined,
        variantName: i.variantName || undefined,
      }));

      // Use showroom address if selected
      const finalShippingInfo =
        paymentMethod === "showroom"
          ? {
              ...shippingInfo,
              full_address:
                SHOP_CONTACT.address,
              city: "Hồ Chí Minh", // Override specifically for showroom context if needed, or keep user's just for contact?
              // Actually, backend needs shipping info. It's better to keep user contact info but set address to showroom.
              // However, shipping_info usually implies WHERE to ship.
              // Let's explicitly set the address to the showroom address so it's clear in the order record.
            }
          : shippingInfo;

      const fullShippingInfo: {
        name: string;
        phone: string;
        city: string;
        address: string;
        email: string;
      } = {
        name: shippingInfo.name,
        phone: shippingInfo.phone,
        city:
          shippingSelection.quote?.provinceName ||
          finalShippingInfo?.city ||
          "",
        address:
          finalShippingInfo?.full_address || finalShippingInfo?.address || "", // Handle both structures if needed
        email: shippingInfo.email || "",
      };

      // If showroom, we might want to override the full address construction logic from previous step
      if (paymentMethod === "showroom") {
        fullShippingInfo.address =
          SHOP_CONTACT.address;
        fullShippingInfo.city = "Thành phố Huế";
      } else {
        // Ensure we use the full address constructed in previous step, with proper fallback
        fullShippingInfo.address =
          shippingInfo.full_address || shippingInfo.address || "";
      }

      const order = await createOrder({
        legalAcceptance: legalAcceptance(),
        shippingQuoteReference:
          paymentMethod === "showroom"
            ? undefined
            : shippingSelection.quote?.reference,
        items: orderItems,
        shipping_info: fullShippingInfo,
        paymentMethod,
        voucherCode: voucherCode || undefined,
      }, session?.user.id || null);

      clearCart();

      // Only remove local storage info if strictly one-time, but user might want to re-order?
      // Better to clear it to avoid stale data on next visit
      localStorage.removeItem("checkout_shipping_info");
      localStorage.removeItem("is_guest_checkout");
      localStorage.removeItem("checkout_voucher_code");

      if (paymentMethod === "cod" || paymentMethod === "showroom") {
        router.push(`/checkout/success?id=${order.id}`);
      } else {
        router.push(`/checkout/payment?id=${order.id}`);
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage =
        e instanceof Error ? e.message : "Đặt hàng thất bại. Vui lòng thử lại.";
      setError(errorMessage);
      setLoading(false); // Only stop loading on error
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const needsQuote =
    paymentMethod !== "showroom" &&
    shippingSelection.enabled &&
    !shippingSelection.quote;
  const quotePending =
    paymentMethod !== "showroom" && (!shippingSelection.ready || needsQuote);
  return (
    <div className="atelier-page">
      <ProcessingOrderOverlay isVisible={loading} />
      <TraditionalHeader />
      <CheckoutLayout
        stage={2}
        summary={
          <CheckoutSummary
            items={items}
            subtotal={shippingSelection.quote?.subtotal ?? total}
            discount={
              shippingSelection.quote?.voucherDiscount ?? voucherDiscount
            }
            shipping={quotePending ? null : shippingFee}
            total={
              quotePending ? Math.max(0, total - voucherDiscount) : finalTotal
            }
            estimated={quotePending}
            hint={
              quotePending
                ? "Hoàn tất địa chỉ và tính phí giao hàng để có thể đặt hàng."
                : paymentMethod === "sepay"
                  ? "Mã QR thanh toán sẽ xuất hiện sau khi bạn đặt hàng."
                  : "Kiểm tra thông tin bên dưới trước khi xác nhận."
            }
            action={
              <CheckoutPrimaryButton
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  loading || !items.length || !shippingInfo || quotePending || !termsAccepted
                }
              >
                {loading
                  ? "Đang đặt hàng…"
                  : paymentMethod === "sepay"
                    ? "Đặt hàng & xem mã QR"
                    : paymentMethod === "showroom"
                      ? "Đặt hàng nhận tại cửa hàng"
                      : "Đặt hàng · thanh toán khi nhận"}
              </CheckoutPrimaryButton>
            }
          >
            <LegalConsent purpose="order" checked={termsAccepted} onChange={setTermsAccepted} disabled={loading} />
            {voucherCode && voucherDiscount > 0 && (
              <p className="checkout-form-note">
                Mã ưu đãi đã áp dụng: <strong>{voucherCode}</strong>
              </p>
            )}
          </CheckoutSummary>
        }
      >
        {error && <CheckoutNotice>{error}</CheckoutNotice>}
        <CheckoutCard
          title="Người nhận"
          description="Thông tin bạn đã nhập ở bước trước."
        >
          <div className="checkout-recipient">
            <div>
              <strong>{shippingInfo?.name || "Đang tải thông tin…"}</strong>
              <p>
                {shippingInfo?.phone}
                <br />
                {shippingInfo?.full_address || shippingInfo?.address}
              </p>
            </div>
            <Link href="/checkout" className="checkout-edit-link">
              Chỉnh sửa
            </Link>
          </div>
        </CheckoutCard>
        <CheckoutCard
          number="02"
          title="Cách nhận hàng & thanh toán"
          description="Chọn trước để phí giao hàng được tính đúng theo đơn của bạn."
        >
          <PaymentOptions
            value={paymentMethod}
            onChange={setPaymentMethod}
            allowPickup
            disabled={loading}
          />
        </CheckoutCard>
        {paymentMethod === "showroom" ? (
          <CheckoutCard number="03" title="Nhận tại cửa hàng">
            <p className="checkout-form-note">
              Không tính phí giao hàng. Cửa hàng sẽ liên hệ xác nhận thông tin
              và lịch nhận đơn.
            </p>
          </CheckoutCard>
        ) : (
          <CheckoutCard
            number="03"
            title={
              shippingSelection.enabled
                ? "Địa chỉ giao hàng & vận chuyển"
                : "Giao hàng đến bạn"
            }
            description={
              shippingSelection.enabled
                ? "Chọn tỉnh/thành và phường/xã để hoàn tất địa chỉ nhận."
                : "Phí giao hàng hiển thị trong tổng đơn bên cạnh."
            }
          >
            {shippingInfo && (
              <ShippingQuotePanel
                items={items}
                recipient={{
                  name: shippingInfo.name,
                  phone: shippingInfo.phone,
                  address:
                    shippingInfo.full_address || shippingInfo.address || "",
                }}
                paymentMethod={paymentMethod}
                voucherCode={voucherCode || undefined}
                onChange={setShippingSelection}
              />
            )}
          </CheckoutCard>
        )}
      </CheckoutLayout>
      <TraditionalFooter />
    </div>
  );
}
