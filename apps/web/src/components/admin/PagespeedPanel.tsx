"use client";
import { Notice } from '@/components/ui/notice';
import { useId, useState } from "react";
import useSWR from "swr";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPagespeed,
  pagespeedTargetId,
  type PagespeedIntent,
} from "@/lib/pagespeed";

export function PagespeedPanel({ token }: { token: string }) {
  const en = useLocale() === "en",
    id = useId();
  const t = (vi: string, english: string) => (en ? english : vi);
  const [targetId, setTargetId] =
    useState<PagespeedIntent["targetId"]>("home_vi");
  const [strategy, setStrategy] =
    useState<PagespeedIntent["strategy"]>("mobile");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    [auditError, setAuditError] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR(
    token ? ["pagespeed-summary", token] : null,
    ([, accessToken]: [string, string]) => fetchPagespeed(accessToken),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const report = data?.reports.find(
    (r) => r.targetId === targetId && r.strategy === strategy,
  );
  const sample = report?.latest;
  const target = data?.targets.find((r) => r.id === targetId);
  if (!token || data?.mode === "disabled") return null;
  const audit = async () => {
    setBusy(true);
    setMessage(null);
    setAuditError(null);
    try {
      const next = await fetchPagespeed(token, { targetId, strategy });
      await mutate(next, { revalidate: false });
      setMessage(
        next.result === "cached"
          ? t(
              "Dùng lại kết quả trong 24 giờ, không đo thêm.",
              "Reused the result within 24 hours; no extra audit.",
            )
          : t("Đã ghi kết quả mẫu.", "Sample result recorded."),
      );
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : "";
      setAuditError(
        code === "LIMIT"
          ? t(
              "Đã chạm giới hạn thử nghiệm. Hãy đợi rồi thử lại.",
              "Mock limit reached. Wait before retrying.",
            )
          : code === "AUTH"
            ? t(
                "Phiên admin không còn hợp lệ. Hãy đăng nhập lại.",
                "Admin session unavailable. Sign in again.",
              )
            : code === "BUSY"
              ? t(
                  "Một phép đo đang chạy. Hãy thử lại sau.",
                  "An audit is already running. Retry later.",
                )
              : t(
                  "Đo thất bại. Kết quả thành công trước được giữ nguyên.",
                  "Audit failed. The previous successful result is retained.",
                ),
      );
    } finally {
      setBusy(false);
    }
  };
  const number = (n: number | null | undefined, unit = "") =>
    n === null || n === undefined
      ? "—"
      : new Intl.NumberFormat(en ? "en" : "vi", {
          maximumFractionDigits: 2,
        }).format(n) + unit;
  const comparisonLabels = {
    no_baseline: t(
      "Chưa có kết quả trước để so sánh.",
      "No previous result to compare.",
    ),
    version_changed: t(
      "Phiên bản Lighthouse thay đổi; không so sánh trực tiếp.",
      "Lighthouse version changed; direct comparison skipped.",
    ),
    baseline_too_old: t(
      "Kết quả trước đã quá 7 ngày; chưa so sánh.",
      "Previous result is older than 7 days; comparison skipped.",
    ),
    partial: t(
      "Thiếu một số chỉ số; chỉ so sánh phần có dữ liệu.",
      "Some metrics are missing; comparison is partial.",
    ),
    comparable: t(
      "So với lần đo trước cùng URL, thiết bị và phiên bản Lighthouse.",
      "Compared with the previous audit of the same URL, device and Lighthouse version.",
    ),
  };
  return (
    <section
      className="admin-list-card min-w-0"
      aria-label={t("PageSpeed mẫu", "PageSpeed sample")}
    >
      <div className="space-y-2 border-b p-5">
        <h2 className="font-semibold">PageSpeed · {t("Mẫu", "Sample")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Dữ liệu giả · Cache 24 giờ · Lịch tự động đang tắt",
            "Synthetic data · 24-hour cache · Scheduled job disabled",
          )}
        </p>
      </div>
      <div className="space-y-4 p-5 text-sm" aria-busy={busy || isLoading}>
        {isLoading && (
          <p role="status">
            {t("Đang tải trạng thái hiệu năng…", "Loading performance status…")}
          </p>
        )}
        {error && (<Notice tone="error">
            {t(
              "Không tải được PageSpeed. Kiểm tra phiên admin/API rồi thử lại.",
              "Cannot load PageSpeed. Check admin session/API and retry.",
            )}{" "}
            <Button variant="link" onClick={() => void mutate()}>
              {t("Thử lại", "Retry")}
            </Button>
          </Notice>)}
        {data?.mode === "blocked" && (
          <p>
            {t(
              "Môi trường này chưa được phép đo. URL công khai và quota project chưa được xác nhận.",
              "Audits are blocked here. Public URLs and project quota are unconfirmed.",
            )}
          </p>
        )}
        {data?.mode === "mock" && (
          <>
            <p>
              {data.persistence === "database"
                ? t(
                    "Chỉ dùng URL mẫu trong danh sách. Giỏ hàng, checkout và trang tài khoản không được đo. Lịch sử mẫu lưu trong DB thử nghiệm, giữ lại sau khi server khởi động lại.",
                    "Only allowlisted sample URLs are used. Cart, checkout and account pages are excluded. Sample history is stored in the test DB and survives server restarts.",
                  )
                : t(
                    "Chỉ dùng URL mẫu trong danh sách. Giỏ hàng, checkout và trang tài khoản không được đo. Lịch sử lưu trong RAM, mất khi server khởi động lại.",
                    "Only allowlisted sample URLs are used. Cart, checkout and account pages are excluded. History is in RAM and clears on server restart.",
                  )}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full min-w-0 space-y-2 sm:w-auto sm:flex-1">
                <label htmlFor={id + "-target"}>
                  {t("Trang mẫu", "Sample page")}
                </label>
                <Select
                  value={targetId}
                  disabled={busy}
                  onValueChange={(value) => {
                    const parsed = pagespeedTargetId.safeParse(value);
                    if (parsed.success) {
                      setTargetId(parsed.data);
                      setMessage(null);
                      setAuditError(null);
                    }
                  }}
                >
                  <SelectTrigger id={id + "-target"} className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.targets.map((target) => (
                      <SelectItem value={target.id} key={target.id}>
                        {target.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor={id + "-strategy"}>
                  {t("Thiết bị", "Device")}
                </label>
                <Select
                  value={strategy}
                  disabled={busy}
                  onValueChange={(value) => {
                    if (value === "mobile" || value === "desktop") {
                      setStrategy(value);
                      setMessage(null);
                      setAuditError(null);
                    }
                  }}
                >
                  <SelectTrigger id={id + "-strategy"} className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={busy || data.running}
                onClick={() => void audit()}
              >
                {busy
                  ? t("Đang đo…", "Auditing…")
                  : t("Đo mẫu", "Audit sample")}
              </Button>
            </div>
            <p className="break-all text-muted-foreground">{target?.url}</p>
            {message && <p role="status">{message}</p>}
            {auditError && <p role="alert">{auditError}</p>}
            {report?.lastError && !auditError && (
              <p role="status">
                {t(
                  "Lần đo trước thất bại; lịch sử thành công được giữ lại.",
                  "Last audit failed; successful history is retained.",
                )}
              </p>
            )}
            {!sample && (
              <p>
                {t(
                  "Chưa đo trang/thiết bị này. Bấm Đo mẫu để tạo báo cáo.",
                  "This page/device has no audit. Select Audit sample to create a report.",
                )}
              </p>
            )}
            {sample && (
              <>
                <p>
                  {t("Thời điểm đo: ", "Measured: ")}
                  {new Date(sample.measuredAt).toLocaleString(
                    en ? "en" : "vi",
                  )}{" "}
                  · Lighthouse {sample.lighthouseVersion} · {strategy}
                  {report?.freshness === "stale" &&
                    t(" · Đã quá 24 giờ", " · Older than 24 hours")}
                </p>
                <h3 className="font-medium">
                  Lighthouse lab · {t("Mẫu", "Sample")}
                </h3>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["Performance", sample.lab.performanceScore],
                      ["Accessibility", sample.lab.accessibilityScore],
                      ["Best practices", sample.lab.bestPracticesScore],
                      ["SEO", sample.lab.seoScore],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-xl tabular-nums">
                        {number(value)}
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          /100
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p>
                  LCP {number(sample.lab.lcpMs, " ms")} · CLS{" "}
                  {number(sample.lab.cls)} · TBT{" "}
                  {number(sample.lab.tbtMs, " ms")}
                </p>
                <p>
                  {t(
                    "Field — chưa có dữ liệu: LCP — · INP — · CLS —. TBT là số đo lab, không thay thế INP. Chưa kết luận đạt Core Web Vitals.",
                    "Field — unavailable: LCP — · INP — · CLS —. TBT is a lab metric and does not replace INP. No Core Web Vitals pass conclusion.",
                  )}
                </p>
                <p>{report && comparisonLabels[report.comparison.status]}</p>
                {!!report?.comparison.alerts.length && (
                  <div role="alert">
                    <p className="font-medium">
                      {t(
                        "Hiệu năng mẫu giảm so với lần trước",
                        "Sample performance regressed",
                      )}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {report.comparison.alerts.map((alert) => (
                        <li key={alert.metric}>
                          {alert.metric}: {number(alert.previous)} →{" "}
                          {number(alert.current)} ·{" "}
                          {t("Ngưỡng cảnh báo: ", "Warning threshold: ")}
                          {number(alert.threshold)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-muted-foreground">
                  {t(
                    "Ngưỡng ứng dụng: giảm điểm ≥ ",
                    "Application thresholds: score drop ≥ ",
                  )}
                  {data.thresholds.performanceScore}; LCP +
                  {data.thresholds.lcpMs} ms; CLS +{data.thresholds.cls}; TBT +
                  {data.thresholds.tbtMs} ms.
                </p>
                <details>
                  <summary className="cursor-pointer font-medium">
                    {t("Lịch sử mẫu", "Sample history")} (
                    {report?.history.length ?? 0}/30)
                  </summary>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Thời điểm", "Time")}</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>LCP ms</TableHead>
                        <TableHead>CLS</TableHead>
                        <TableHead>TBT ms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report?.history
                        .slice()
                        .reverse()
                        .map((row) => (
                          <TableRow key={row.measuredAt}>
                            <TableCell>
                              {new Date(row.measuredAt).toLocaleString(
                                en ? "en" : "vi",
                              )}
                            </TableCell>
                            <TableCell>
                              {number(row.lab.performanceScore)}
                            </TableCell>
                            <TableCell>{number(row.lab.lcpMs)}</TableCell>
                            <TableCell>{number(row.lab.cls)}</TableCell>
                            <TableCell>{number(row.lab.tbtMs)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </details>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
