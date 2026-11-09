"use client";
import { LegalConsent } from '@/components/legal/LegalConsent';
import { legalAcceptance } from '@/lib/legal';
import { beginCheckoutAttempt } from '@/lib/checkout-attempt';
import { useAnalyticsView, useAnalyticsTracker } from '@/components/analytics/AnalyticsProvider';
import { cartAnalyticsItems } from '@/lib/ga4/contract';

import { useState, useEffect } from "react";
import { ContactProtection } from "@/components/contact/ContactProtection";
import { useContactProtection } from "@/hooks/useContactProtection";
import { useCart } from "@/components/providers/CartProvider";
import { Link, useRouter } from "@/i18n/routing";
import ZenFooter from "@/components/zen/ZenFooter";
import { createOrder } from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import {
  CheckoutCard,
  CheckoutLayout,
  CheckoutNotice,
  CheckoutPrimaryButton,
  CheckoutSummary,
  PaymentOptions,
} from "@/components/checkout/CheckoutUI";

// Local state for shipping info
interface ShippingInfo {
  fullName: string;
  phone: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  shippingProvinceId: string;
  shippingWardCode: string;
}

interface Division {
  code: number;
  name: string;
}

import ShippingQuotePanel, {
  type ShippingSelection,
} from "@/components/checkout/ShippingQuotePanel";
import ShippingAddressFields from "@/components/checkout/ShippingAddressFields";

import { useShippingAvailability } from "@/hooks/useShippingAvailability";

export default function ZenCheckout() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const ghnCheckout = useShippingAvailability();
  const [shippingSelection, setShippingSelection] = useState<ShippingSelection>(
    { enabled: false, ready: false, quote: null },
  );
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const analytics = useAnalyticsTracker();
  useAnalyticsView('begin_checkout', { items: cartAnalyticsItems(items) });
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sepay">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const protection = useContactProtection("checkout");

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: "",
    phone: "",
    address: "",
    province: "",
    district: "",
    ward: "",
    shippingProvinceId: "",
    shippingWardCode: "",
  });

  // Location State
  const [provinces, setProvinces] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<Division[]>([]);
  const [wards, setWards] = useState<Division[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<Division | null>(
    null,
  );
  const [selectedDistrict, setSelectedDistrict] = useState<Division | null>(
    null,
  );
  const [selectedWard, setSelectedWard] = useState<Division | null>(null);

  const [loadingP, setLoadingP] = useState(false);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingW, setLoadingW] = useState(false);

  // Fetch the standard address list only when GHN is not handling delivery
  useEffect(() => {
    if (ghnCheckout !== false) return;
    setLoadingP(true);
    fetch("https://provinces.open-api.vn/api/?depth=1")
      .then((res) => res.json())
      .then((data) => {
        setProvinces(data);
        setLoadingP(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingP(false);
      });
  }, [ghnCheckout]);

  // Fetch Districts
  useEffect(() => {
    if (selectedProvince) {
      setLoadingD(true);
      fetch(
        `https://provinces.open-api.vn/api/p/${selectedProvince.code}?depth=2`,
      )
        .then((res) => res.json())
        .then((data) => {
          setDistricts(data.districts);
          setLoadingD(false);
        });
    } else {
      setDistricts([]);
    }
  }, [selectedProvince]);

  // Fetch Wards
  useEffect(() => {
    if (selectedDistrict) {
      setLoadingW(true);
      fetch(
        `https://provinces.open-api.vn/api/d/${selectedDistrict.code}?depth=2`,
      )
        .then((res) => res.json())
        .then((data) => {
          setWards(data.wards);
          setLoadingW(false);
        });
    } else {
      setWards([]);
    }
  }, [selectedDistrict]);

  // Calculations
  const isFreeShipping = (shippingSelection.quote?.subtotal ?? total) >= 300000;
  const shippingFee =
    shippingSelection.quote?.customerFee ?? (isFreeShipping ? 0 : 30000);
  const finalTotal = shippingSelection.quote?.total ?? total + shippingFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [id]: value }));
  };

  const handleLocationChange = (
    type: "province" | "district" | "ward",
    code: number,
  ) => {
    if (type === "province") {
      const p = provinces.find((i) => i.code === code) || null;
      setSelectedProvince(p);
      setSelectedDistrict(null);
      setSelectedWard(null);
      setWards([]);
      setShippingInfo((prev) => ({
        ...prev,
        province: p?.name || "",
        district: "",
        ward: "",
      }));
    } else if (type === "district") {
      const d = districts.find((i) => i.code === code) || null;
      setSelectedDistrict(d);
      setSelectedWard(null);
      setShippingInfo((prev) => ({
        ...prev,
        district: d?.name || "",
        ward: "",
      }));
    } else if (type === "ward") {
      const w = wards.find((i) => i.code === code) || null;
      setSelectedWard(w);
      setShippingInfo((prev) => ({ ...prev, ward: w?.name || "" }));
    }
  };

  const handleContinueToPayment = () => {
    // Basic Validation
    if (
      !shippingInfo.fullName ||
      !shippingInfo.phone ||
      !shippingInfo.address ||
      (ghnCheckout === false &&
        (!shippingInfo.province ||
          !shippingInfo.district ||
          !shippingInfo.ward)) ||
      (ghnCheckout === true &&
        (!shippingInfo.shippingProvinceId || !shippingInfo.shippingWardCode))
    ) {
      setCheckoutError(
        "Enter the recipient name, phone number and complete delivery address.",
      );
      return;
    }
    if (!/^(0\d{9}|\+?84\d{9})$/.test(shippingInfo.phone.replace(/\s/g, ""))) {
      setCheckoutError("Enter a valid Vietnamese phone number.");
      return;
    }
    setCheckoutError("");
    try { beginCheckoutAttempt(); }
    catch { setCheckoutError('Your browser cannot save this checkout attempt. Allow site storage and try again.'); return; }
    analytics?.track('add_shipping_info', { shipping_tier: 'delivery', items: cartAnalyticsItems(items) });
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sent with both the delivery quote and the order, which must match exactly.
  const deliveryAddress = [
    shippingInfo.address.trim(),
    shippingInfo.ward,
    shippingInfo.district,
    shippingInfo.province,
  ]
    .filter(Boolean)
    .join(", ");

  const handleCompleteOrder = async () => {
    if (!termsAccepted) return;
    if (isSubmitting) return;
    if (
      shippingSelection.enabled &&
      (!shippingSelection.quote ||
        Date.parse(shippingSelection.quote.expiresAt) <= Date.now())
    ) {
      setCheckoutError("Calculate delivery before placing your order.");
      return;
    }
    setCheckoutError("");
    analytics?.track('add_payment_info', { payment_type: paymentMethod, items: cartAnalyticsItems(items) });
    setIsSubmitting(true);

    try {
      const payload = {
        legalAcceptance: legalAcceptance(),
        shippingQuoteReference: shippingSelection.quote?.reference,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          variantId: item.variantId || undefined,
          variantName: item.variantName || undefined,
        })),
        shipping_info: {
          name: shippingInfo.fullName,
          phone: (function (p) {
            // Normalize phone to +84
            p = p.trim().replace(/\s/g, "");
            if (p.startsWith("0")) return "+84" + p.slice(1);
            if (p.startsWith("84")) return "+" + p;
            if (!p.startsWith("+")) return "+84" + p;
            return p;
          })(shippingInfo.phone),
          address: deliveryAddress,
          city: shippingSelection.quote?.provinceName || shippingInfo.province,
          email: user?.email, // Optional
        },
        paymentMethod: paymentMethod,
      };

      const order = await createOrder(
        { ...payload, ...(protection.token ? { turnstileToken: protection.token } : {}) },
        user?.id || null,
      );

      clearCart();

      if (paymentMethod === "sepay") {
        router.push(`/checkout/payment?id=${order.id}`);
      } else {
        // Success - Redirect to Profile/Orders or Thank You
        // alert('Order placed successfully!'); // Removed alert for smoother flow
        router.push(`/order-confirmation/${order.id}`);
      }
    } catch (error: unknown) {
      console.error("Order creation failed:", error);
      const err = error as Error;
      setCheckoutError(
        err.message || "Failed to place order. Please try again.",
      );
      protection.resetToken();
    } finally {
      setIsSubmitting(false);
    }
  };

  const quotePending =
    step === "shipping"
      ? ghnCheckout !== false
      : !shippingSelection.ready ||
        (shippingSelection.enabled && !shippingSelection.quote);
  const editDetails = () => {
    setStep("shipping");
    setShippingSelection({ enabled: ghnCheckout === true, ready: false, quote: null });
    setCheckoutError("");
  };
  return (
    <div className="bg-zen-50 min-h-screen">
      <CheckoutLayout
        stage={step === "shipping" ? 1 : 2}
        summary={
          <CheckoutSummary
            items={items}
            subtotal={shippingSelection.quote?.subtotal ?? total}
            shipping={quotePending ? null : shippingFee}
            total={quotePending ? total : finalTotal}
            estimated={quotePending}
            onQuantityChange={step === "shipping" ? updateQuantity : undefined}
            onRemove={step === "shipping" ? removeItem : undefined}
            hint={
              quotePending
                ? "Delivery is confirmed before you place your order."
                : paymentMethod === "sepay"
                  ? "Your payment QR code appears after you place the order."
                  : "Review your details before confirming."
            }
            action={
              step === "payment" ? (
                <CheckoutPrimaryButton
                  type="button"
                  onClick={handleCompleteOrder}
                  disabled={isSubmitting || quotePending || !items.length || !termsAccepted || !protection.canSubmit}
                >
                  {isSubmitting
                    ? "Placing your order…"
                    : paymentMethod === "sepay"
                      ? "Place order & view payment QR"
                      : "Place order · pay on delivery"}
                </CheckoutPrimaryButton>
              ) : items.length ? (
                <CheckoutPrimaryButton
                  type="submit"
                  form="zen-recipient-form"
                  disabled={ghnCheckout === undefined}
                >
                  Continue to delivery & payment
                </CheckoutPrimaryButton>
              ) : undefined
            }
          >
            {step === "payment" && <LegalConsent purpose="order" checked={termsAccepted} onChange={setTermsAccepted} disabled={isSubmitting} />}
            {step === "payment" && <ContactProtection protection={protection} locale="en" disabled={isSubmitting} quiet />}
          </CheckoutSummary>
        }
      >
        {checkoutError && <CheckoutNotice>{checkoutError}</CheckoutNotice>}
        {!items.length ? (
          <CheckoutCard title="Your bag is empty">
            <div className="checkout-empty">
              <p>Choose an agarwood piece to begin your order.</p>
              <Link href="/products" className="checkout-edit-link">
                Explore the collection
              </Link>
            </div>
          </CheckoutCard>
        ) : step === "shipping" ? (
          <>
            {!user && (
              <div className="checkout-login-note">
                <span>You can check out without an account.</span>
                <Link href="/login?redirect=/checkout">
                  Already a customer? Sign in
                </Link>
              </div>
            )}
            <CheckoutCard
              number="01"
              title="Recipient details"
              description="Tell us who will receive your order and where to find them."
            >
              <p className="mb-4 text-sm leading-relaxed">Recipient details support delivery quotes, fulfilment and order support. When GHN is used, the necessary details are shared with the delivery provider. <Link href="/policies/privacy" className="underline underline-offset-4">How we use this data</Link>.</p>
              <form
                id="zen-recipient-form"
                className="checkout-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleContinueToPayment();
                }}
              >
                <div className="checkout-fields">
                  <div className="checkout-field">
                    <label htmlFor="fullName">Full name</label>
                    <Input
                      id="fullName"
                      autoComplete="shipping name"
                      required
                      maxLength={200}
                      value={shippingInfo.fullName}
                      onChange={handleInputChange}
                      placeholder="Recipient's full name"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="phone">Phone number</label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="shipping tel"
                      required
                      value={shippingInfo.phone}
                      onChange={handleInputChange}
                      placeholder="0912 345 678"
                    />
                  </div>
                  <div className="checkout-field checkout-field-full">
                    <label htmlFor="address">House number & street</label>
                    <Input
                      id="address"
                      autoComplete="shipping address-line1"
                      required
                      maxLength={900}
                      value={shippingInfo.address}
                      onChange={handleInputChange}
                      placeholder="House, street, apartment or village"
                    />
                    <p className="checkout-field-help">
                      Include your house number or building name.
                    </p>
                  </div>
                  {ghnCheckout === true && (
                    <ShippingAddressFields
                      idPrefix="zen"
                      value={{
                        provinceId: shippingInfo.shippingProvinceId,
                        provinceName: shippingInfo.province,
                        wardCode: shippingInfo.shippingWardCode,
                        wardName: shippingInfo.ward,
                      }}
                      onChange={(next) =>
                        setShippingInfo((prev) => ({
                          ...prev,
                          province: next.provinceName,
                          district: "",
                          ward: next.wardName,
                          shippingProvinceId: next.provinceId,
                          shippingWardCode: next.wardCode,
                        }))
                      }
                    />
                  )}
                  {ghnCheckout === false && (
                    <>
                      <div className="checkout-field">
                        <label htmlFor="zen-province">Province / city</label>
                        <select
                          id="zen-province"
                          required
                          value={selectedProvince?.code || ""}
                          disabled={loadingP}
                          onChange={(e) =>
                            handleLocationChange(
                              "province",
                              Number(e.target.value),
                            )
                          }
                        >
                          <option value="">
                            {loadingP ? "Loading…" : "Select province"}
                          </option>
                          {provinces.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="checkout-field">
                        <label htmlFor="zen-district">District</label>
                        <select
                          id="zen-district"
                          required
                          value={selectedDistrict?.code || ""}
                          disabled={!selectedProvince || loadingD}
                          onChange={(e) =>
                            handleLocationChange(
                              "district",
                              Number(e.target.value),
                            )
                          }
                        >
                          <option value="">
                            {loadingD ? "Loading…" : "Select district"}
                          </option>
                          {districts.map((d) => (
                            <option key={d.code} value={d.code}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="checkout-field checkout-field-full">
                        <label htmlFor="zen-ward">Ward / commune</label>
                        <select
                          id="zen-ward"
                          required
                          value={selectedWard?.code || ""}
                          disabled={!selectedDistrict || loadingW}
                          onChange={(e) =>
                            handleLocationChange("ward", Number(e.target.value))
                          }
                        >
                          <option value="">
                            {loadingW ? "Loading…" : "Select ward"}
                          </option>
                          {wards.map((w) => (
                            <option key={w.code} value={w.code}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </CheckoutCard>
          </>
        ) : (
          <>
            <CheckoutCard title="Recipient">
              <div className="checkout-recipient">
                <div>
                  <strong>{shippingInfo.fullName}</strong>
                  <p>
                    {shippingInfo.phone}
                    <br />
                    {deliveryAddress}
                  </p>
                </div>
                <button
                  type="button"
                  className="checkout-edit-link"
                  onClick={editDetails}
                >
                  Edit details
                </button>
              </div>
            </CheckoutCard>
            <CheckoutCard
              number="02"
              title="How would you like to pay?"
              description="Your delivery fee updates with the method you choose."
            >
              <PaymentOptions
                value={paymentMethod}
                onChange={(value) =>
                  setPaymentMethod(value === "sepay" ? "sepay" : "cod")
                }
                disabled={isSubmitting}
              />
            </CheckoutCard>
            <CheckoutCard
              number="03"
              title={
                shippingSelection.enabled
                  ? "Delivery & carrier"
                  : "Delivery"
              }
              description={
                shippingSelection.enabled
                  ? "Calculated from the address you entered."
                  : "Your delivery fee is included in the order summary."
              }
            >
              <ShippingQuotePanel
                items={items}
                recipient={{
                  name: shippingInfo.fullName,
                  phone: shippingInfo.phone,
                  address: deliveryAddress,
                }}
                destination={
                  shippingInfo.shippingProvinceId && shippingInfo.shippingWardCode
                    ? {
                        provinceId: shippingInfo.shippingProvinceId,
                        provinceName: shippingInfo.province,
                        wardCode: shippingInfo.shippingWardCode,
                      }
                    : null
                }
                paymentMethod={paymentMethod}
                onChange={setShippingSelection}
              />
            </CheckoutCard>
          </>
        )}
      </CheckoutLayout>
      <ZenFooter />
    </div>
  );
}
