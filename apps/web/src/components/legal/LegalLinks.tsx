"use client";

import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { POLICY_KEYS, POLICY_TITLES, type PolicyKey } from "@/lib/legal";

export function LegalLinks({
  variant = "footer",
  currentPolicy,
}: {
  variant?: "footer" | "sidebar";
  currentPolicy?: PolicyKey;
}) {
  const en = useLocale() === "en";
  const sidebar = variant === "sidebar";
  return (
    <nav
      aria-label={
        en ? "Policies and customer rights" : "Chính sách và quyền khách hàng"
      }
      className={sidebar ? "legal-policy-nav" : "legal-footer-links"}
    >
      {!sidebar && (
        <p className="legal-footer-links-label">
          {en ? "Policies & your rights" : "Chính sách & quyền khách hàng"}
        </p>
      )}
      <ul>
        {POLICY_KEYS.map((key, index) => (
          <li key={key}>
            <Link
              href={`/policies/${key}`}
              aria-current={currentPolicy === key ? "page" : undefined}
            >
              {sidebar && (
                <span className="legal-policy-nav-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <span>{POLICY_TITLES[key][en ? "en" : "vi"]}</span>
              {sidebar ? (
                <ChevronRight size={14} aria-hidden="true" />
              ) : (
                <ArrowUpRight size={13} aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
