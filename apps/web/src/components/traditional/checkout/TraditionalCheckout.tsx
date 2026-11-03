"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { getProfile, setAccessToken, validateVoucher } from "@/lib/api-client";
import { Link, useRouter } from "@/i18n/routing";
import TraditionalHeader from "@/components/traditional/TraditionalHeader";
import TraditionalFooter from "@/components/traditional/TraditionalFooter";
import GuestCheckoutForm, { type GuestSubmitData } from "./GuestCheckoutForm";
import { useShippingAvailability } from "@/hooks/useShippingAvailability";
import {
  CheckoutCard,
  CheckoutLayout,
  CheckoutNotice,
  CheckoutPrimaryButton,
  CheckoutSummary,
  CheckoutVoucher,
} from "@/components/checkout/CheckoutUI";

export default function TraditionalCheckout() {
  const ghnCheckout = useShippingAvailability();
  const { items, total, updateQuantity, removeItem } = useCart();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [initialInfo, setInitialInfo] = useState<Partial<GuestSubmitData>>({});
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [voucherCode, setVoucherCode] = useState(""),
    [verifyingVoucher, setVerifyingVoucher] = useState(false),
    [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    subtotal: number;
  } | null>(null);
  useEffect(() => {
    try {
      const raw: unknown = JSON.parse(
        localStorage.getItem("checkout_shipping_info") || "null",
      );
      if (raw && typeof raw === "object") {
        const info = raw as Record<string, unknown>,
          field = (key: string) =>
            typeof info[key] === "string" ? (info[key] as string) : "";
        setInitialInfo({
          name: field("name"),
          phone: field("phone"),
          address: field("address") || field("full_address"),
          province: field("province") || field("city"),
          district: field("district"),
          ward: field("ward"),
        });
      }
      const savedVoucher = localStorage.getItem("checkout_voucher_code") || "";
      setVoucherCode(savedVoucher);
      if (savedVoucher)
        setAppliedVoucher({
          code: savedVoucher,
          discountAmount: 0,
          subtotal: -1,
        });
    } catch {
      localStorage.removeItem("checkout_shipping_info");
    }
  }, []);
  useEffect(() => {
    if (!session?.access_token) return;
    let live = true;
    setAccessToken(session.access_token);
    getProfile()
      .then((profile) => {
        if (!live || !profile) return;
        setInitialInfo((current) => ({
          ...current,
          name: current.name || profile.full_name || "",
          phone: current.phone || profile.phone_number || "",
          address: current.address || profile.street_address || "",
          province: current.province || profile.province || "",
          district: current.district || profile.district || "",
          ward: current.ward || profile.ward || "",
        }));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [session?.access_token]);
  const appliedCode = appliedVoucher?.code;
  useEffect(() => {
    if (!items.length || !appliedVoucher || appliedVoucher.subtotal === total)
      return;
    let live = true;
    validateVoucher(appliedVoucher.code, total)
      .then((data) => {
        if (live)
          setAppliedVoucher({
            code: data.voucher?.code || appliedVoucher.code,
            discountAmount: data.discountAmount ?? data.discount ?? 0,
            subtotal: total,
          });
      })
      .catch(() => {
        if (live) {
          setAppliedVoucher(null);
          setVoucherError("Mã ưu đãi không còn áp dụng cho giỏ hàng này.");
        }
      });
    return () => {
      live = false;
    };
    // The code and cart total identify the voucher revalidation request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, appliedCode, items.length]);
  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVerifyingVoucher(true);
    setVoucherError("");
    try {
      const data = await validateVoucher(voucherCode.trim(), total);
      setAppliedVoucher({
        code: data.voucher?.code || voucherCode.trim(),
        discountAmount: data.discountAmount ?? data.discount ?? 0,
        subtotal: total,
      });
    } catch (e) {
      setAppliedVoucher(null);
      setVoucherError(
        e instanceof Error ? e.message : "Chưa áp dụng được mã ưu đãi.",
      );
    } finally {
      setVerifyingVoucher(false);
    }
  };
  const continueCheckout = (data: GuestSubmitData) => {
    setLoading(true);
    setError("");
    try {
      localStorage.setItem(
        "checkout_shipping_info",
        JSON.stringify({
          ...data,
          city: data.province,
          email: session?.user.email || "",
        }),
      );
      if (appliedVoucher)
        localStorage.setItem("checkout_voucher_code", appliedVoucher.code);
      else localStorage.removeItem("checkout_voucher_code");
      if (!session) localStorage.setItem("is_guest_checkout", "true");
      else localStorage.removeItem("is_guest_checkout");
      router.push("/checkout/payment_select");
    } catch {
      setError("Chưa lưu được thông tin. Vui lòng thử lại.");
      setLoading(false);
    }
  };
  const discount = appliedVoucher?.discountAmount || 0,
    shipping = ghnCheckout ? null : total >= 300000 ? 0 : 30000;
  return (
    <div className="atelier-page">
      <TraditionalHeader />
      <CheckoutLayout
        stage={1}
        summary={
          <CheckoutSummary
            items={items}
            subtotal={total}
            discount={discount}
            shipping={shipping}
            total={Math.max(0, total - discount) + (shipping || 0)}
            estimated={ghnCheckout}
            onQuantityChange={updateQuantity}
            onRemove={removeItem}
            hint={
              ghnCheckout
                ? "Phí giao hàng sẽ được xác nhận ở bước tiếp theo, trước khi bạn đặt hàng."
                : "Kiểm tra lại sản phẩm và thông tin trước khi tiếp tục."
            }
            action={
              items.length ? (
                <CheckoutPrimaryButton
                  type="submit"
                  form="checkout-recipient-form"
                  disabled={
                    loading ||
                    verifyingVoucher ||
                    (!!appliedVoucher && appliedVoucher.subtotal !== total)
                  }
                >
                  {loading
                    ? "Đang tiếp tục…"
                    : "Tiếp tục: giao hàng & thanh toán"}
                </CheckoutPrimaryButton>
              ) : undefined
            }
          >
            <CheckoutVoucher
              code={voucherCode}
              onCodeChange={setVoucherCode}
              onApply={applyVoucher}
              appliedCode={appliedVoucher?.code}
              busy={
                verifyingVoucher ||
                (!!appliedVoucher && appliedVoucher.subtotal !== total)
              }
              error={voucherError}
              onRemove={() => {
                setAppliedVoucher(null);
                setVoucherCode("");
                setVerifyingVoucher(false);
                localStorage.removeItem("checkout_voucher_code");
              }}
            />
          </CheckoutSummary>
        }
      >
        {error && <CheckoutNotice>{error}</CheckoutNotice>}
        {!items.length ? (
          <CheckoutCard title="Giỏ hàng đang trống">
            <div className="checkout-empty">
              <p>Chọn một phẩm trầm để bắt đầu đơn hàng của bạn.</p>
              <Link href="/products" className="checkout-edit-link">
                Khám phá sản phẩm
              </Link>
            </div>
          </CheckoutCard>
        ) : (
          <>
            {!authLoading && !session && (
              <div className="checkout-login-note">
                <span>Bạn có thể đặt hàng không cần tài khoản.</span>
                <Link href="/login?redirect=/checkout">
                  Đăng nhập nếu đã có tài khoản
                </Link>
              </div>
            )}
            <CheckoutCard
              number="01"
              title="Thông tin người nhận"
              description="Cho chúng tôi biết tên, số liên hệ và địa chỉ chi tiết của bạn."
            >
              <GuestCheckoutForm
                showSubmit={false}
                onSubmit={continueCheckout}
                requireLegacyAddress={!ghnCheckout}
                initialValues={initialInfo}
                busy={
                  loading ||
                  verifyingVoucher ||
                  (!!appliedVoucher && appliedVoucher.subtotal !== total)
                }
              />
            </CheckoutCard>
          </>
        )}
      </CheckoutLayout>
      <TraditionalFooter />
    </div>
  );
}
