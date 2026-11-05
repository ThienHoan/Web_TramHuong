"use client";

import { Check, ArrowUpRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

export function LegalConsent({
  purpose,
  checked,
  onChange,
  disabled = false,
}: {
  purpose: "contact" | "order" | "account" | "partnership";
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const en = useLocale() === "en";
  const label =
    purpose === "partnership"
      ? en
        ? "I agree to the use of my contact details, region and partnership information to respond to this proposal."
        : "Tôi đồng ý sử dụng thông tin liên hệ, khu vực và nội dung hợp tác để phản hồi đề nghị này."
      : purpose === "contact"
        ? en
          ? "I agree to the use of my name, email and message to respond to this request."
          : "Tôi đồng ý sử dụng họ tên, email và lời nhắn để phản hồi yêu cầu này."
        : purpose === "account"
          ? en
            ? "I agree to the processing of my email and profile to create and manage my account."
            : "Tôi đồng ý xử lý email và hồ sơ để tạo, quản lý tài khoản."
          : en
            ? "I have reviewed my order and agree to the sale terms and processing of recipient details to fulfil it."
            : "Tôi đã kiểm tra đơn, đồng ý điều kiện giao dịch và xử lý thông tin người nhận để thực hiện đơn hàng.";
  return (
    <div
      className="legal-consent"
      data-checked={checked}
      data-disabled={disabled}
    >
      <label htmlFor={`legal-${purpose}`} className="legal-consent-choice">
        <span className="legal-consent-control">
          <input
            id={`legal-${purpose}`}
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            disabled={disabled}
            required
            aria-describedby={`legal-${purpose}-note`}
            className="legal-consent-input"
          />
          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span>{label}</span>
      </label>
      <div className="legal-consent-details">
        <div className="legal-consent-links">
          <Link
            href="/policies/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            {en ? "Read the privacy notice" : "Đọc chính sách dữ liệu"}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          {purpose === "order" && (
            <>
              <Link
                href="/policies/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                {en ? "Sale terms" : "Điều kiện giao dịch"}
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link
                href="/policies/returns"
                target="_blank"
                rel="noopener noreferrer"
              >
                {en ? "Returns" : "Đổi trả"}
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
        <p id={`legal-${purpose}-note`} className="legal-consent-note">
          {en
            ? "This does not subscribe you to marketing or optional analytics."
            : "Không bao gồm nhận quảng cáo hoặc phân tích tùy chọn."}
        </p>
        <p className="legal-consent-draft">
          <span aria-hidden="true" />
          {en
            ? "Policy drafts are awaiting seller approval."
            : "Bản nháp chính sách đang chờ cửa hàng phê duyệt."}
        </p>
      </div>
    </div>
  );
}
