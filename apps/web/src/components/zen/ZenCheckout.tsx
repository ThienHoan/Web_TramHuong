"use client";
import { useShippingPolicy, flatRateFee } from "@/hooks/useShippingAvailability";
import { LegalConsent } from '@/components/legal/LegalConsent';
import { legalAcceptance } from '@/lib/legal';
import { beginCheckoutAttempt } from '@/lib/checkout-attempt';
import { useAnalyticsView, useAnalyticsTracker } from '@/components/analytics/AnalyticsProvider';
import { cartAnalyticsItems } from '@/lib/ga4/contract';

import { useState } from "react";
import { ContactProtection } from "@/components/contact/ContactProtection";
import { useContactProtection } from "@/hooks/useContactProtection";
import { useCart } from "@/components/providers/CartProvider";
import { Link, useRouter } from "@/i18n/routing";
import ZenFooter from "@/components/zen/ZenFooter";
import { createOrder } from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import LocationSelector from '@/components/checkout/LocationSelector';
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
  email: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  shippingProvinceId: string;
  shippingWardCode: string;
}

import ShippingQuotePanel, {
  type ShippingSelection,
} from "@/components/checkout/ShippingQuotePanel";
import ShippingAddressFields from "@/components/checkout/ShippingAddressFields";

import { useShippingAvailability } from "@/hooks/useShippingAvailability";

export default function ZenCheckout() {
  const { data: shippingPolicy, error: policyError, mutate: retryPolicy } = useShippingPolicy();
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
    email: "",
    address: "",
    province: "",
    district: "",
    ward: "",
    shippingProvinceId: "",
    shippingWardCode: "",
  });

  // Calculations
  const fallbackFee = flatRateFee(shippingPolicy, total);
  const shippingFee =
    shippingSelection.quote?.customerFee ?? (fallbackFee ?? 0);
  const finalTotal = shippingSelection.quote?.total ?? total + shippingFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [id]: value }));
  };

  const handleContinueToPayment = () => {
    // Basic Validation
    if (
      !shippingInfo.fullName ||
      !shippingInfo.phone ||
      !shippingInfo.address ||
      (ghnCheckout === false &&
        (!shippingInfo.province ||
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
    if (shippingInfo.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email.trim())) { setCheckoutError("Enter a valid email address or leave it empty."); return; }
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
    if (isSubmitting || !shippingPolicy) return;
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
          email: shippingInfo.email.trim() || user?.email || undefined,
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
      : !shippingPolicy || !shippingSelection.ready ||
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
            shipping={quotePending || (!shippingSelection.quote && fallbackFee === null) ? null : shippingFee}
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
        {policyError && <CheckoutNotice>Cannot load delivery fees. <button type="button" className="underline min-h-11" onClick={() => void retryPolicy()}>Try again</button></CheckoutNotice>}
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
                    <label htmlFor="email">Email (optional)</label>
                    <Input id="email" type="email" autoComplete="email" maxLength={254} value={shippingInfo.email} onChange={handleInputChange} aria-describedby="zen-email-help" />
                    <p id="zen-email-help" className="checkout-field-help">For your order confirmation and lookup code.</p>
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
                  {ghnCheckout === false && <LocationSelector initialProvince={shippingInfo.province} initialWard={shippingInfo.ward} onLocationChange={location => setShippingInfo(prev => ({ ...prev, province: location.province, district: location.district, ward: location.ward }))} />}
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
