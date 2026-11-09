"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CheckoutPrimaryButton } from "@/components/checkout/CheckoutUI";
import TraditionalLocationSelector from "./TraditionalLocationSelector";
import ShippingAddressFields from "@/components/checkout/ShippingAddressFields";

export interface GuestSubmitData {
  name: string;
  phone: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  full_address: string;
  shippingProvinceId?: string;
  shippingWardCode?: string;
}
export default function GuestCheckoutForm({
  onSubmit,
  requireLegacyAddress = true,
  ghnAddress = false,
  initialValues,
  busy = false,
  showSubmit = true,
}: {
  onSubmit: (data: GuestSubmitData) => void;
  requireLegacyAddress?: boolean;
  ghnAddress?: boolean;
  initialValues?: Partial<GuestSubmitData>;
  busy?: boolean;
  showSubmit?: boolean;
}) {
  type Recipient = Omit<GuestSubmitData, "full_address">;
  const [draft, setData] = useState<Partial<Recipient>>({});
  const data: Recipient = {
    name: draft.name ?? initialValues?.name ?? "",
    phone: draft.phone ?? initialValues?.phone ?? "",
    address: draft.address ?? initialValues?.address ?? "",
    province: draft.province ?? initialValues?.province ?? "",
    district: draft.district ?? initialValues?.district ?? "",
    ward: draft.ward ?? initialValues?.ward ?? "",
    shippingProvinceId:
      draft.shippingProvinceId ?? initialValues?.shippingProvinceId ?? "",
    shippingWardCode:
      draft.shippingWardCode ?? initialValues?.shippingWardCode ?? "",
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressUnavailable, setAddressUnavailable] = useState(false);
  const change = (key: "name" | "phone" | "address", value: string) => {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const submit = () => {
    if (busy) return;
    const invalid: Record<string, string> = {},
      phone = data.phone.replace(/\s/g, "");
    if (!data.name.trim()) invalid.name = "Bạn chưa nhập họ tên người nhận.";
    if (!/^(0\d{9}|\+?84\d{9})$/.test(phone))
      invalid.phone = "Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0912 345 678.";
    if (!data.address.trim())
      invalid.address = "Bạn chưa nhập số nhà và tên đường.";
    if (
      requireLegacyAddress &&
      (!data.province || !data.district || !data.ward)
    )
      invalid.location = "Chọn đầy đủ tỉnh/thành, quận/huyện và phường/xã.";
    if (ghnAddress && !addressUnavailable) {
      if (!data.shippingProvinceId)
        invalid.province = "Chọn tỉnh/thành để tính phí giao hàng.";
      else if (!data.shippingWardCode)
        invalid.ward = "Chọn phường/xã để tính phí giao hàng.";
    }
    setErrors(invalid);
    const first = Object.keys(invalid)[0];
    if (first) {
      document.getElementById("guest-" + first)?.focus();
      return;
    }
    onSubmit({
      ...data,
      name: data.name.trim(),
      address: data.address.trim(),
      phone: phone.startsWith("0")
        ? "+84" + phone.slice(1)
        : phone.startsWith("84")
          ? "+" + phone
          : phone,
      full_address: [data.address.trim(), data.ward, data.district, data.province]
        .filter(Boolean)
        .join(", "),
    });
  };
  return (
    <form
      id="checkout-recipient-form"
      className="checkout-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="checkout-fields">
        <div className="checkout-field">
          <label htmlFor="guest-name">Họ và tên người nhận</label>
          <Input
            id="guest-name"
            autoComplete="shipping name"
            required
            maxLength={200}
            value={data.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="Nhập họ và tên"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "guest-name-error" : undefined}
          />
          {errors.name && (
            <p
              className="checkout-field-error"
              id="guest-name-error"
              role="alert"
            >
              {errors.name}
            </p>
          )}
        </div>
        <div className="checkout-field">
          <label htmlFor="guest-phone">Số điện thoại</label>
          <Input
            id="guest-phone"
            type="tel"
            autoComplete="shipping tel"
            required
            value={data.phone}
            onChange={(e) => change("phone", e.target.value)}
            placeholder="0912 345 678"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "guest-phone-error" : undefined}
          />
          {errors.phone && (
            <p
              className="checkout-field-error"
              id="guest-phone-error"
              role="alert"
            >
              {errors.phone}
            </p>
          )}
        </div>
        <div className="checkout-field checkout-field-full">
          <label htmlFor="guest-address">Số nhà, tên đường</label>
          <Input
            id="guest-address"
            autoComplete="shipping address-line1"
            required
            maxLength={900}
            value={data.address}
            onChange={(e) => change("address", e.target.value)}
            placeholder="Số nhà, tên đường, tòa nhà hoặc thôn/xóm"
            aria-invalid={!!errors.address}
            aria-describedby={
              errors.address ? "guest-address-error" : "guest-address-help"
            }
          />
          {errors.address ? (
            <p
              className="checkout-field-error"
              id="guest-address-error"
              role="alert"
            >
              {errors.address}
            </p>
          ) : (
            <p className="checkout-field-help" id="guest-address-help">
              Nhập địa chỉ chi tiết để nhân viên dễ tìm đến bạn.
            </p>
          )}
        </div>
        {ghnAddress && (
          <ShippingAddressFields
            idPrefix="guest"
            value={{
              provinceId: data.shippingProvinceId || "",
              provinceName: data.province,
              wardCode: data.shippingWardCode || "",
              wardName: data.ward,
            }}
            suggested={{
              province: initialValues?.province,
              ward: initialValues?.ward,
            }}
            provinceError={errors.province}
            wardError={errors.ward}
            onUnavailable={setAddressUnavailable}
            onChange={(next) => {
              setData((current) => ({
                ...current,
                province: next.provinceName,
                district: "",
                ward: next.wardName,
                shippingProvinceId: next.provinceId,
                shippingWardCode: next.wardCode,
              }));
              setErrors((current) => ({ ...current, province: "", ward: "" }));
            }}
          />
        )}
        {requireLegacyAddress && (
          <div className="checkout-legacy-location" id="guest-location">
            <TraditionalLocationSelector
              initialProvince={data.province}
              initialDistrict={data.district}
              initialWard={data.ward}
              onLocationChange={(loc) =>
                setData((current) => ({
                  ...current,
                  province: loc.province,
                  district: loc.district,
                  ward: loc.ward,
                }))
              }
            />
            {errors.location && (
              <p className="checkout-field-error" role="alert">
                {errors.location}
              </p>
            )}
          </div>
        )}
      </div>
      {showSubmit && (
        <div className="checkout-form-actions">
          <CheckoutPrimaryButton type="submit" disabled={busy}>
            {busy ? "Đang tiếp tục…" : "Tiếp tục: giao hàng & thanh toán"}
          </CheckoutPrimaryButton>
          <p className="checkout-form-note">
            Bạn có thể kiểm tra phí và chọn cách thanh toán trước khi đặt hàng.
          </p>
        </div>
      )}
    </form>
  );
}
