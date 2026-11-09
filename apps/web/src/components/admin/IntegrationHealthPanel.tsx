"use client";
import { Notice } from '@/components/ui/notice';
import { useId } from "react";
import { useLocale } from "next-intl";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./AdminStatusBadge";
import {
  fetchIntegrationHealth,
  type IntegrationHealth,
} from "@/lib/integration-health";

type Provider = IntegrationHealth["providers"][number]["provider"];
type Metrics = IntegrationHealth["providers"][number]["metrics"];
const COPY: Record<Provider, { name: string; vi: string; en: string }> = {
  ghn: {
    name: "GHN",
    vi: "Kiểm tra báo giá, vận đơn, callback và đối soát COD trên staging.",
    en: "Accept staging quotes, fulfillment, callbacks and COD reconciliation.",
  },
  resend: {
    name: "Resend",
    vi: "Đã có hàng đợi thông báo mô phỏng. Mặc định dùng SMTP; còn thiếu kết nối Resend thật và ghi sự kiện cùng giao dịch gốc.",
    en: "Durable mock notifications are available. SMTP is the default; live Resend and original-transaction event hooks remain open.",
  },
  gemini: {
    name: "Gemini",
    vi: "Advisor mới dùng catalog và mô phỏng; cần xác minh quota, dữ liệu và kết nối mô hình thật.",
    en: "New advisor uses catalog fallback and mock selection. Live model, quota and data policy remain open.",
  },
  pgvector: {
    name: "Supabase pgvector",
    vi: "Đo chất lượng tìm kiếm từ khóa trước khi chọn vector và chi phí embedding.",
    en: "Benchmark keyword relevance before choosing vectors and an embedding budget.",
  },
  cloudinary: {
    name: "Cloudinary",
    vi: "Đã đo 12 ảnh tại máy. Cần đo CDN và tốc độ trang thực tế trước khi quyết định chuyển; kho ảnh hiện tại tiếp tục hoạt động.",
    en: "Twelve images benchmarked locally. CDN and real page-speed measurements are still needed; existing storage remains active.",
  },
  google: {
    name: "Google Sign-In",
    vi: "Tái sử dụng Supabase; cần kiểm tra cấu hình OAuth và liên kết tài khoản trùng email.",
    en: "Reuses Supabase. Verify hosted OAuth settings and same-email account linking.",
  },
  ga4: {
    name: "GA4",
    vi: "Đã xác nhận 8 sự kiện trên stream thử. Attribution, tham số sản phẩm và purchase còn mở.",
    en: "Eight test-stream event names accepted. Attribution, item parameters and purchase remain open.",
  },
  search_console: {
    name: "Search Console",
    vi: "Cần property đã xác minh, OAuth chỉ đọc và đồng bộ có lưu trữ.",
    en: "Needs verified property, read-only OAuth and durable synchronization.",
  },
  merchant: {
    name: "Merchant API",
    vi: "Đã có preview và hàng đợi thay đổi mô phỏng. Đồng bộ thật còn cần kết nối Google, quyền tài khoản và kiểm soát gửi đồng thời.",
    en: "Preview and a durable mock delta queue are available. Live sync still needs Google transport, account rights and concurrent-delivery controls.",
  },
  pagespeed: {
    name: "PageSpeed Insights",
    vi: "Cần URL công khai được duyệt, quota dự án và lưu lịch sử phép đo thật.",
    en: "Needs approved public URLs, project quota and durable live audit history.",
  },
  turnstile: {
    name: "Cloudflare Turnstile",
    vi: "Cần widget, hostname, keys và kiểm tra xác thực server với Cloudflare thật.",
    en: "Needs widget, hostname, keys and live server-verification acceptance.",
  },
};

// Counts from the TEST DB mock stores only; labelled as such in the footer.
function MetricsList({
  metrics,
  t,
  when,
}: {
  metrics: Metrics;
  t: (vi: string, en: string) => string;
  when: (iso: string) => string;
}) {
  const alert = metrics.quotaAlert;
  const quotaText =
    metrics.quotaUsed === null
      ? null
      : `${metrics.quotaUsed}${metrics.quotaLimit !== null ? "/" + metrics.quotaLimit : ""} ${
          metrics.quotaMetric === "emails" ? "email" : t("lượt", "requests")
        }`;
  // "Last success" is only tracked for stores with history (available); a
  // live-only provider would otherwise wrongly read "None yet".
  const items: [string, string, boolean?][] = metrics.available
    ? [
        [
          t("Thành công gần nhất", "Last success"),
          metrics.lastSuccessAt
            ? when(metrics.lastSuccessAt)
            : t("Chưa có", "None yet"),
        ],
      ]
    : [];
  if (quotaText)
    items.push([
      t("Hạn mức hôm nay (UTC)", "Quota today (UTC)"),
      quotaText +
        (alert === "exhausted"
          ? t(" · đã hết", " · exhausted")
          : alert && alert !== "ok"
            ? ` · ≥${alert.slice(5)}%`
            : ""),
      alert === "exhausted" || alert === "warn_95",
    ]);
  if (metrics.backlog)
    items.push(
      [
        t("Không thành công, 7 ngày", "Not accepted, 7 days"),
        metrics.failRate === null
          ? t("Chưa có lượt kết thúc", "No finished attempts")
          : `${Math.round(metrics.failRate * 1000) / 10}%`,
      ],
      [
        t("Hàng đợi", "Queue"),
        t(
          `chờ ${metrics.backlog.queued} · đang gửi ${metrics.backlog.working} · nhận ${metrics.backlog.accepted} · chưa rõ ${metrics.backlog.unknown} · hỏng ${metrics.backlog.dead}`,
          `queued ${metrics.backlog.queued} · working ${metrics.backlog.working} · accepted ${metrics.backlog.accepted} · unknown ${metrics.backlog.unknown} · dead ${metrics.backlog.dead}`,
        ),
      ],
    );
  if (metrics.inflight !== null)
    items.push([
      t("Sản phẩm đang gửi", "Products in flight"),
      String(metrics.inflight),
    ]);
  if (metrics.lastErrorCode)
    items.push([t("Lỗi gần nhất", "Last error"), metrics.lastErrorCode, true]);
  if (metrics.liveUsage) {
    const u = metrics.liveUsage;
    items.push([
      t("Lời gọi thật hôm nay (UTC)", "Real calls today (UTC)"),
      t(
        `${u.requestsUsed}/${u.requestsLimit} lượt · ${u.tokensUsed}/${u.tokensLimit} token`,
        `${u.requestsUsed}/${u.requestsLimit} requests · ${u.tokensUsed}/${u.tokensLimit} tokens`,
      ) +
        (u.alert === "exhausted"
          ? t(" · đã hết", " · exhausted")
          : u.alert !== "ok"
            ? ` · ≥${u.alert.slice(5)}%`
            : ""),
      u.alert === "exhausted" || u.alert === "warn_95",
    ]);
  }
  return (
    <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
      {items.map(([label, value, warn]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd
            className={`min-w-0 break-words ${warn ? "font-medium text-red-700" : ""}`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function IntegrationHealthPanel({
  token,
  isAdmin,
}: {
  token: string;
  isAdmin: boolean;
}) {
  const id = useId(),
    en = useLocale() === "en";
  const t = (vi: string, english: string) => (en ? english : vi);
  const when = (iso: string) =>
    new Date(iso).toLocaleString(en ? "en-GB" : "vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    token && isAdmin ? ["integration-health", token] : null,
    ([, accessToken]: [string, string]) => fetchIntegrationHealth(accessToken),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  if (!token || !isAdmin) return null;
  const mode = (value: IntegrationHealth["providers"][number]["mode"]) =>
    ({
      disabled: t("Đang tắt", "Off"),
      mock: t("Mô phỏng", "Mock"),
      blocked: t("Bị chặn", "Blocked"),
      existing_shipping_policy: t("Cấu hình GHN riêng", "Existing GHN policy"),
    })[value];
  return (
    <section
      className="admin-list-card min-w-0"
      aria-labelledby={id}
      aria-busy={isValidating}
    >
      <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div className="min-w-0 space-y-2">
          <h2 id={id} className="text-base font-semibold">
            {t("Kết nối dịch vụ", "Service connections")}
          </h2>
          <p className="max-w-prose text-pretty text-sm text-muted-foreground">
            {t(
              "Trạng thái cấu hình và điều kiện còn thiếu của 11 tích hợp. Hệ thống chưa được xác nhận sẵn sàng chạy thật.",
              "Configuration and remaining requirements for 11 integrations. Live release is not yet certified.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11! min-h-11! shrink-0 md:h-10! md:min-h-10!"
          disabled={isValidating}
          onClick={() => void mutate()}
        >
          {t("Làm mới", "Refresh")}
        </Button>
      </header>
      {error ? (
        <div className="space-y-3 p-4 sm:p-5">
          <Notice tone="error">
            {t(
              "Chưa tải được trạng thái kết nối. Hãy kiểm tra phiên admin và thử lại.",
              "Unable to load connection status. Check your admin session and retry.",
            )}
          </Notice>
          <Button
            variant="outline"
            className="h-11! min-h-11! md:h-10! md:min-h-10!"
            onClick={() => void mutate()}
          >
            {t("Thử lại", "Retry")}
          </Button>
        </div>
      ) : isLoading || !data ? (
        <div className="space-y-4 p-4 sm:p-5" role="status">
          <span className="sr-only">
            {t("Đang tải trạng thái kết nối", "Loading connection status")}
          </span>
          {Array.from({ length: 11 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full sm:h-20" />
          ))}
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {data.providers.map((provider) => (
              <li
                key={provider.provider}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:p-5"
              >
                <div className="min-w-0 space-y-2 [&_.admin-status]:text-xs!">
                  <h3 className="font-medium">
                    {COPY[provider.provider].name}
                  </h3>
                  <StatusBadge value={mode(provider.mode)} en={en} />
                </div>
                <div className="min-w-0 space-y-3">
                  <p className="max-w-prose text-pretty text-sm text-muted-foreground">
                    {COPY[provider.provider][en ? "en" : "vi"]}
                  </p>
                  {(provider.metrics.available ||
                    provider.metrics.liveUsage) && (
                    <MetricsList metrics={provider.metrics} t={t} when={when} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <footer className="space-y-2 border-t p-4 text-sm text-muted-foreground sm:p-5">
            <p>
              {data.metricsSource === "test_db_mock"
                ? t(
                    "Số liệu đếm từ DB thử nghiệm ở chế độ mô phỏng (7 ngày, hạn mức theo ngày UTC). Đây không phải số liệu của nhà cung cấp; chưa có chi phí vì mô phỏng không tính phí. Làm mới chỉ đọc DB, không gọi nhà cung cấp.",
                    "Counts from the test DB in mock mode (7 days, quota per UTC day). These are not provider metrics; there is no spend because mock work is not billed. Refresh reads the DB only, no provider calls.",
                  )
                : data.metricsSource === "store_unavailable"
                  ? t(
                      "Không đọc được số liệu vận hành từ DB thử nghiệm (chưa cài hoặc đang tạm dừng). Cấu hình bên trên vẫn đúng.",
                      "Operational metrics could not be read from the test DB (not installed or paused). The configuration above is still current.",
                    )
                  : t(
                      "Chưa có số liệu vận hành về lần thành công gần nhất, quota hay tỷ lệ lỗi. Làm mới chỉ đọc cấu hình, không gọi nhà cung cấp.",
                      "Last-success, quota and failure-rate metrics are unavailable. Refresh reads configuration without provider calls.",
                    )}
            </p>
            {data.liveUsageSource === "test_db" && (
              <p>
                {t(
                  "Dòng “Lời gọi thật” là hạn mức đã giữ trước mỗi lần gọi nhà cung cấp thật (ghi trong DB thử nghiệm); có thể cao hơn mức dùng thực tế.",
                  "“Real calls” rows show budget reserved before each real provider call (stored in the test DB); it can exceed actual usage.",
                )}
              </p>
            )}
            {data.liveUsageSource === "unavailable" && (
              <p role="status">
                {t(
                  "Không đọc được hạn mức lời gọi thật; số liệu mô phỏng bên trên vẫn đúng.",
                  "Real-call budget could not be read; the mock figures above are still current.",
                )}
              </p>
            )}
            {data.metricsObservedAt && (
              <p>
                {t("Đọc số liệu lúc ", "Metrics read at ")}
                {when(data.metricsObservedAt)} (UTC+7)
              </p>
            )}
            <p>
              {t(
                "Các cờ mới chưa quản lý Google đăng nhập và kho ảnh hiện tại. Chat sản phẩm dùng catalog và chính sách advisor.",
                "New integration flags do not yet control Google login or existing image storage. Product chat uses catalog and advisor policy.",
              )}
            </p>
            <p>
              {t("Đọc cấu hình lúc ", "Configuration read at ")}
              {new Date(data.observedAt).toLocaleString(
                en ? "en-GB" : "vi-VN",
                { timeZone: "Asia/Ho_Chi_Minh" },
              )}{" "}
              (UTC+7)
            </p>
          </footer>
        </>
      )}
    </section>
  );
}
