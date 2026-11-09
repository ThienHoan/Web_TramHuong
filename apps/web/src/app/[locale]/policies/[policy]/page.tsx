import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileClock,
  Mail,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { BrandLockup } from "@/components/brand/BrandIdentity";
import { LegalLinks } from "@/components/legal/LegalLinks";
import {
  POLICY_KEYS,
  POLICY_TITLES,
  policySections,
  LEGAL_POLICY_VERSION,
  LEGAL_POLICY_IS_DRAFT,
  SHOP_CONTACT,
  type PolicyKey,
} from "@/lib/legal";

export const metadata: Metadata = {
  robots: { index: !LEGAL_POLICY_IS_DRAFT, follow: true },
};
const descriptions: Record<PolicyKey, { vi: string; en: string }> = {
  privacy: {
    vi: "Thông tin bạn chia sẻ, cách chúng tôi sử dụng và những lựa chọn thuộc về bạn.",
    en: "The information you share, how it is used, and the choices that stay yours.",
  },
  terms: {
    vi: "Những điều cần biết trước khi hoàn tất một đơn hàng tại Thiên Phúc.",
    en: "What to know before placing your order with Thiên Phúc.",
  },
  shipping: {
    vi: "Thông tin về giao nhận, chi phí và phương thức thanh toán cho đơn hàng.",
    en: "A guide to delivery, charges and payment options for your order.",
  },
  returns: {
    vi: "Cách gửi yêu cầu khi sản phẩm hoặc trải nghiệm nhận hàng cần được hỗ trợ.",
    en: "How to ask for help when a product or delivery needs our attention.",
  },
  rights: {
    vi: "Một đầu mối để trao đổi về dữ liệu cá nhân, đơn hàng và quyền lợi của bạn.",
    en: "A place to ask about your personal data, orders and customer rights.",
  },
};

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ locale: string; policy: string }>;
}) {
  const { locale, policy } = await params;
  if (!(POLICY_KEYS as readonly string[]).includes(policy)) notFound();
  const key = policy as PolicyKey,
    en = locale === "en",
    lang = en ? "en" : "vi";
  const sections = policySections(key, en);
  const nextKey =
    POLICY_KEYS[(POLICY_KEYS.indexOf(key) + 1) % POLICY_KEYS.length];
  const title = POLICY_TITLES[key][lang];
  return (
    <div className="legal-policy-page" data-locale={lang}>
      {!en && (
        <header className="legal-masthead">
          <Link href="/" aria-label="Thiên Phúc · Về cửa hàng">
            <BrandLockup compact />
          </Link>
          <Link href="/" className="legal-store-link">
            Về cửa hàng
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </header>
      )}
      <main className="legal-policy-container">
        <nav
          aria-label={en ? "Breadcrumb" : "Đường dẫn"}
          className="legal-breadcrumb"
        >
          <Link href="/">{en ? "The store" : "Cửa hàng"}</Link>
          <span aria-hidden="true">/</span>
          <span>{en ? "Customer care" : "Thông tin khách hàng"}</span>
        </nav>
        <header className="legal-policy-hero">
          <div>
            <p className="legal-eyebrow">
              THIÊN PHÚC · {en ? "HERE FOR YOU" : "ĐỒNG HÀNH CÙNG BẠN"}
            </p>
            <h1>{title}</h1>
            <p className="legal-policy-intro">{descriptions[key][lang]}</p>
          </div>
          <div className="legal-document-meta">
            <p>{en ? "Document status" : "Trạng thái tài liệu"}</p>
            <span>
              <FileClock size={16} aria-hidden="true" />
              {LEGAL_POLICY_IS_DRAFT
                ? en
                  ? "Draft for review"
                  : "Bản nháp đang rà soát"
                : en
                  ? "In effect"
                  : "Đang áp dụng"}
            </span>
            <small>
              {en ? "Version" : "Phiên bản"} {LEGAL_POLICY_VERSION}
            </small>
          </div>
        </header>
        <details className="legal-mobile-navigation">
          <summary>
            <span>
              {en ? "Browse policies" : "Các chính sách"}
              <strong>{title}</strong>
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <LegalLinks variant="sidebar" currentPolicy={key} />
        </details>
        <div className="legal-policy-layout">
          <aside
            className="legal-policy-sidebar"
            aria-label={en ? "Policy navigation" : "Điều hướng chính sách"}
          >
            <div className="legal-policy-sticky">
              <p className="legal-side-label">
                {en ? "Customer information" : "Thông tin khách hàng"}
              </p>
              <LegalLinks variant="sidebar" currentPolicy={key} />
              <div className="legal-policy-help">
                <Mail size={20} strokeWidth={1.5} aria-hidden="true" />
                <h2>{en ? "Need a little help?" : "Bạn cần trao đổi thêm?"}</h2>
                <p>
                  {en
                    ? "We are here to listen and help you find the right information."
                    : "Thiên Phúc sẵn sàng lắng nghe và hỗ trợ bạn tìm đúng thông tin."}
                </p>
                <Link href="/contact">
                  {en ? "Contact the store" : "Liên hệ cửa hàng"}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </aside>
          <article className="legal-policy-article" aria-label={title}>
            {LEGAL_POLICY_IS_DRAFT && (
              <div className="legal-draft-notice" role="note">
                <FileClock size={20} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h2>{en ? "Before you read" : "Trước khi bạn đọc"}</h2>
                  <p>
                    {en
                      ? "Draft for local review. Business details, retention periods and commercial conditions are awaiting seller approval. This draft is not approved for commercial launch."
                      : "Bản nháp để rà soát trên localhost. Thông tin chủ thể bán hàng, thời hạn lưu dữ liệu và điều kiện thương mại đang chờ chủ cửa hàng xác nhận. Chưa phê duyệt để mở bán chính thức."}
                  </p>
                </div>
              </div>
            )}
            <nav
              className="legal-contents"
              aria-label={en ? "On this page" : "Nội dung trang"}
            >
              <p>{en ? "On this page" : "Nội dung trang"}</p>
              <ol>
                {sections.map((section, index) => (
                  <li key={section.title}>
                    <a href={`#section-${index + 1}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            {sections.map((section, index) => (
              <section
                key={section.title}
                id={`section-${index + 1}`}
                className="legal-reading-section"
              >
                <header>
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2>{section.title}</h2>
                </header>
                <div>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
            <div className="legal-reading-contact">
              <span>
                {en
                  ? "Questions about this policy?"
                  : "Bạn có câu hỏi về chính sách?"}
              </span>
              <a href={`mailto:${SHOP_CONTACT.email}`}>
                {SHOP_CONTACT.email}
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
            <nav
              className="legal-next-policy"
              aria-label={en ? "Continue reading" : "Đọc tiếp"}
            >
              <Link href="/" className="legal-back-link">
                <ArrowLeft size={15} aria-hidden="true" />
                {en ? "Back to the store" : "Về cửa hàng"}
              </Link>
              <Link href={`/policies/${nextKey}`}>
                <span>
                  <small>{en ? "Next policy" : "Chính sách tiếp theo"}</small>
                  {POLICY_TITLES[nextKey][lang]}
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </nav>
          </article>
        </div>
      </main>
      <footer className="legal-page-footer">
        <span>
          Thiên Phúc · {en ? "Vietnamese agarwood" : "Trầm hương Việt"}
        </span>
        <span>{en ? "Huế, Vietnam" : "Huế, Việt Nam"}</span>
      </footer>
    </div>
  );
}
