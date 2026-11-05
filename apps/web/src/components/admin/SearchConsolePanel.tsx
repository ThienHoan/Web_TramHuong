"use client";
import { useState } from "react";
import useSWR from "swr";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchSearchConsole } from "@/lib/search-console";

export function SearchConsolePanel({ token }: { token: string }) {
  const en = useLocale() === "en";
  const t = (vi: string, english: string) => (en ? english : vi);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR(
    token ? ["search-console-summary", token] : null,
    ([, accessToken]: [string, string]) => fetchSearchConsole(accessToken),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  if (!token || data?.mode === "disabled") return null;
  const sync = async () => {
    setBusy(true);
    setSyncError(null);
    try {
      await mutate(await fetchSearchConsole(token, true), {
        revalidate: false,
      });
    } catch (error: unknown) {
      setSyncError(
        error instanceof Error && error.message === "LIMIT"
          ? t(
              "Đã chạm giới hạn thử nghiệm. Hãy đợi rồi thử lại.",
              "Mock limit reached. Wait before retrying.",
            )
          : error instanceof Error && error.message === "AUTH"
            ? t(
                "Phiên quản trị không còn hợp lệ. Hãy đăng nhập lại.",
                "Admin session unavailable. Sign in again.",
              )
            : t(
                "Đồng bộ thất bại. Báo cáo trước được giữ nguyên.",
                "Sync failed. The previous report is preserved.",
              ),
      );
    } finally {
      setBusy(false);
    }
  };
  const percent = (n: number) =>
    new Intl.NumberFormat(en ? "en" : "vi", {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(n);
  return (
    <section
      className="admin-list-card min-w-0"
      aria-label={t("Search Console mẫu", "Search Console sample")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <h2 className="font-semibold">
            Search Console · {t("Mẫu", "Sample")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Dữ liệu giả tại máy · Lịch tự động đang tắt",
              "Local synthetic data · Scheduled job disabled",
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!data || data.mode !== "mock" || busy || data.syncing}
          onClick={() => void sync()}
        >
          {busy
            ? t("Đang đồng bộ…", "Syncing…")
            : t("Đồng bộ mẫu", "Sync sample")}
        </Button>
      </div>
      <div className="space-y-4 p-5 text-sm" aria-busy={busy || isLoading}>
        {isLoading && (
          <p role="status">
            {t("Đang tải trạng thái SEO…", "Loading SEO status…")}
          </p>
        )}
        {error && (
          <p role="alert">
            {t(
              "Không tải được SEO. Kiểm tra phiên admin và API, rồi thử lại.",
              "Cannot load SEO. Check admin session and API, then retry.",
            )}{" "}
            <Button variant="link" onClick={() => void mutate()}>
              {t("Thử lại", "Retry")}
            </Button>
          </p>
        )}
        {syncError && <p role="alert">{syncError}</p>}
        {data?.lastError && !syncError && (
          <p role="status">
            {t(
              "Lần đồng bộ trước thất bại; dữ liệu thành công gần nhất được giữ lại.",
              "Last sync failed; the last successful data is retained.",
            )}
          </p>
        )}
        {data?.mode === "blocked" && (
          <p>
            {t(
              "Chưa cho phép chạy ở môi trường này. Chưa xác nhận property/OAuth chỉ đọc.",
              "Execution is blocked in this environment. Verified property/readonly OAuth is pending.",
            )}
          </p>
        )}
        {data?.mode === "mock" && (
          <>
            <p>
              {data.persistence === "database"
                ? t(
                    "Chưa xác nhận property/OAuth. Dữ liệu mẫu được lưu trong DB thử nghiệm, giữ lại sau khi khởi động lại server.",
                    "Verified property/OAuth is pending. Sample data is stored in the test DB and survives server restarts.",
                  )
                : t(
                    "Chưa xác nhận property/OAuth. Dữ liệu chỉ lưu trong RAM, sẽ mất khi khởi động lại server.",
                    "Verified property/OAuth is pending. Data is in RAM and clears on server restart.",
                  )}
            </p>
            <p role="status">
              {t("Cập nhật thành công: ", "Last successful sync: ")}
              {data.lastSyncedAt
                ? new Date(data.lastSyncedAt).toLocaleString(en ? "en" : "vi")
                : t("Chưa đồng bộ", "Never synced")}
              {data.freshness === "stale" &&
                t(" · Đã cũ hơn 26 giờ", " · Older than 26 hours")}
            </p>
            {data.window && (
              <>
                <p>
                  {data.window.startDate} → {data.window.endDate} ·
                  America/Los_Angeles ·{" "}
                  {t("Ngày dữ liệu mới nhất: ", "Latest data date: ")}
                  {data.latestDataDate ?? "—"}
                </p>
                <p>
                  {t(
                    "Chỉ gồm top rows đã nhận, không phải tổng của website. CTR/vị trí là tham khảo; ngày thiếu dữ liệu không được tính là 0.",
                    "Returned top rows only, not website totals. CTR/position are indicative; missing dates are not zero.",
                  )}
                </p>
                {data.missingDates.length > 0 && (
                  <p>
                    {t("Ngày không có dữ liệu: ", "Dates without data: ")}
                    {data.missingDates.join(", ")}
                  </p>
                )}
                {data.truncatedDates.length > 0 && (
                  <p>
                    {t(
                      "Đã chạm giới hạn 200 dòng/ngày ở ",
                      "Reached the 200 rows/day cap on ",
                    )}
                    {data.truncatedDates.join(", ")}
                  </p>
                )}
                {!data.comparisonComplete && (
                  <p>
                    {t(
                      "Kỳ so sánh chưa đủ dữ liệu; không suy diễn tăng/giảm từ ngày thiếu hoặc dòng bị cắt.",
                      "Comparison is incomplete; no changes inferred from missing or capped days.",
                    )}
                  </p>
                )}
                <h3 className="font-medium">
                  {t(
                    "Truy vấn · 7 ngày gần nhất trong kỳ",
                    "Queries · Latest 7 days in the window",
                  )}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Truy vấn", "Query")}</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>{t("Vị trí", "Position")}</TableHead>
                      <TableHead>Δ clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.queries.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="whitespace-normal">
                          {row.key}
                        </TableCell>
                        <TableCell>{row.clicks}</TableCell>
                        <TableCell>{row.impressions}</TableCell>
                        <TableCell>{percent(row.ctr)}</TableCell>
                        <TableCell>{row.position?.toFixed(1) ?? "—"}</TableCell>
                        <TableCell>{row.clickChange ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!data.queries.length && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          {t(
                            "Không có dòng trong kỳ, chưa thể kết luận lưu lượng.",
                            "No rows in this window; traffic is unknown.",
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <details>
                  <summary className="cursor-pointer font-medium">
                    {t(
                      "Trang sản phẩm nhiều hiển thị, CTR thấp",
                      "Product pages with impressions and low CTR",
                    )}{" "}
                    ({data.opportunities.length})
                  </summary>
                  <ul className="mt-3 space-y-3">
                    {data.opportunities.map((row) => (
                      <li className="break-words" key={row.key}>
                        <span>{new URL(row.key).pathname}</span>
                        <br />
                        <span>
                          {row.impressions} impressions · {row.clicks} clicks ·
                          CTR {percent(row.ctr)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!data.opportunities.length && (
                    <p className="mt-3">
                      {t(
                        "Chưa có trang đạt ngưỡng mẫu: 500 hiển thị, CTR dưới 2%.",
                        "No pages meet the sample threshold: 500 impressions and CTR below 2%.",
                      )}
                    </p>
                  )}
                </details>
                <p className="text-muted-foreground">
                  {t(
                    "Chưa gán URL cho Zen/Traditional; ngôn ngữ URL không được coi là giao diện.",
                    "Zen/Traditional URLs are not mapped; URL language does not identify the theme.",
                  )}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
