"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { buildUrl, fetchWithAuth } from "@/services/base-http";

type Option = { id: string; name: string };

export interface ShippingDestination {
  provinceId: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
}

// Saved profiles can use longer official names, such as "Thành phố Hồ Chí Minh".
const comparable = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/^(thanh pho|tinh|tp\.?)\s+/, "")
    .trim();
const findByName = (options: Option[], name?: string) =>
  name ? options.find((o) => comparable(o.name) === comparable(name)) : undefined;

export default function ShippingAddressFields({
  idPrefix,
  value,
  suggested,
  provinceError,
  wardError,
  onChange,
  onUnavailable,
}: {
  idPrefix: string;
  value: ShippingDestination;
  /** Names from a saved address, matched against GHN's lists once they load. */
  suggested?: { province?: string; ward?: string };
  provinceError?: string;
  wardError?: string;
  onChange: (next: ShippingDestination) => void;
  /** Reports whether the address lists could not be loaded. */
  onUnavailable?: (unavailable: boolean) => void;
}) {
  const en = useLocale() === "en";
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [wards, setWards] = useState<{ provinceId: string; options: Option[] }>({
    provinceId: "",
    options: [],
  });
  const [wardsLoading, setWardsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Suggestions only fill an untouched form; they never override a customer's choice.
  const touched = useRef(false);

  useEffect(() => {
    let live = true;
    fetchWithAuth<Option[]>(buildUrl("/shipping/addresses/provinces"))
      .then((data) => {
        if (live) setProvinces(data);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!value.provinceId) return;
    let live = true;
    setWardsLoading(true);
    fetchWithAuth<Option[]>(
      buildUrl("/shipping/addresses/wards", { provinceId: value.provinceId }),
    )
      .then((options) => {
        if (live) setWards({ provinceId: value.provinceId, options });
      })
      .catch(() => {
        if (live) setFailed(true);
      })
      .finally(() => {
        if (live) setWardsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [value.provinceId, attempt]);

  useEffect(() => {
    onUnavailable?.(failed);
    // Only a change in availability needs reporting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  useEffect(() => {
    if (!provinces.length || provinces.some((p) => p.id === value.provinceId))
      return;
    const match = touched.current ? undefined : findByName(provinces, suggested?.province);
    if (match || value.provinceId)
      onChange({
        provinceId: match?.id || "",
        provinceName: match?.name || "",
        wardCode: "",
        wardName: "",
      });
    // The parent recreates onChange on each render; these values decide the correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinces, value.provinceId, suggested?.province]);

  const wardOptions = wards.provinceId === value.provinceId ? wards.options : [];
  useEffect(() => {
    if (!wardOptions.length || wardOptions.some((w) => w.id === value.wardCode))
      return;
    const match = touched.current ? undefined : findByName(wardOptions, suggested?.ward);
    if (match || value.wardCode)
      onChange({ ...value, wardCode: match?.id || "", wardName: match?.name || "" });
    // The parent recreates onChange and value on each render; these decide the correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards, value.provinceId, value.wardCode, suggested?.ward]);

  const retry = () => {
    setFailed(false);
    setAttempt((current) => current + 1);
  };
  const selectProvince = (id: string) => {
    touched.current = true;
    onChange({
      provinceId: id,
      provinceName: provinces.find((p) => p.id === id)?.name || "",
      wardCode: "",
      wardName: "",
    });
  };
  const selectWard = (code: string) => {
    touched.current = true;
    onChange({
      ...value,
      wardCode: code,
      wardName: wardOptions.find((w) => w.id === code)?.name || "",
    });
  };
  const provinceId = `${idPrefix}-province`,
    wardId = `${idPrefix}-ward`;

  return (
    <>
      <div className="checkout-field">
        <label htmlFor={provinceId}>{en ? "Province / city" : "Tỉnh / thành"}</label>
        <select
          id={provinceId}
          autoComplete="shipping address-level1"
          required
          value={value.provinceId}
          onChange={(e) => selectProvince(e.target.value)}
          disabled={!provinces.length}
          aria-invalid={!!provinceError}
          aria-describedby={provinceError ? `${provinceId}-error` : undefined}
        >
          <option value="">
            {provinces.length
              ? en
                ? "Select province / city"
                : "Chọn tỉnh / thành"
              : en
                ? "Loading…"
                : "Đang tải…"}
          </option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {provinceError && (
          <p className="checkout-field-error" id={`${provinceId}-error`} role="alert">
            {provinceError}
          </p>
        )}
      </div>
      <div className="checkout-field">
        <label htmlFor={wardId}>{en ? "Ward / commune" : "Phường / xã"}</label>
        <select
          id={wardId}
          autoComplete="shipping address-level2"
          required
          value={value.wardCode}
          onChange={(e) => selectWard(e.target.value)}
          disabled={!value.provinceId || wardsLoading}
          aria-invalid={!!wardError}
          aria-describedby={wardError ? `${wardId}-error` : undefined}
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
          {wardOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {wardError && (
          <p className="checkout-field-error" id={`${wardId}-error`} role="alert">
            {wardError}
          </p>
        )}
      </div>
      {failed && (
        <div className="checkout-field checkout-field-full">
          <p className="checkout-field-error" role="alert">
            {en
              ? "We couldn't load the address list."
              : "Chưa tải được danh sách địa chỉ. Bạn có thể thử lại, hoặc tiếp tục để chọn nhận tại cửa hàng."}
          </p>
          <button type="button" className="checkout-edit-link" onClick={retry}>
            {en ? "Try again" : "Thử lại"}
          </button>
        </div>
      )}
    </>
  );
}
