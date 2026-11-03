"use client";
import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { API_URL } from "@/services/base-http";

type Resource = "products" | "categories";
interface RowData {
  slug: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  category?: string;
  price?: number;
  quantity?: number;
  images: string[];
}
interface PreviewRow {
  row: number;
  data: RowData;
  errors: string[];
  warnings: string[];
  action: "create" | "update" | "skip";
  requestId?: string;
}
interface Preview {
  rows: PreviewRow[];
  configured: boolean;
  configurationMessage?: string;
  summary: { total: number; valid: number; invalid: number; skipped: number };
}
interface RowResult {
  state: "created" | "updated" | "skipped" | "error";
  message?: string;
}
const fileKey = (name: string) => name.normalize("NFC").toLowerCase();
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể thực hiện yêu cầu";

export default function CatalogImportDialog({
  resource,
  onImported,
}: {
  resource: Resource;
  onImported: () => Promise<void>;
}) {
  const { session, role } = useAuth();
  const locale = useLocale();
  const en = locale === "en";
  const t = (vi: string, english: string) => (en ? english : vi);
  const [open, setOpen] = useState(false);
  const [workbook, setWorkbook] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [mode, setMode] = useState("skip");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [results, setResults] = useState<Record<number, RowResult>>({});
  const [stopping, setStopping] = useState(false);
  const [checking, setChecking] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const stop = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const token = session?.access_token || "";
  if (role !== "ADMIN") return null;
  const resetPreview = () => {
    setPreview(null);
    setResults({});
    setError("");
  };
  const request = async (path: string, body?: FormData) => {
    const response = await fetch(
      `${API_URL}/admin/import/${resource}/${path}`,
      {
        method: body ? "POST" : "GET",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        body,
      },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(
        payload?.message || t("Không thể nhập dữ liệu", "Import failed"),
      );
    }
    return response;
  };
  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const response = await request("template");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `thien-phuc-${resource}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };
  const selectWorkbook = (file: File | undefined) => {
    resetPreview();
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".xlsx") ||
      file.size > 2 * 1024 * 1024
    ) {
      setError(
        t("Chọn file .xlsx tối đa 2 MB.", "Choose an .xlsx file up to 2 MB."),
      );
      setWorkbook(null);
      return;
    }
    setWorkbook(file);
  };
  const selectPhotos = (files: FileList | null) => {
    if (!files) return;
    resetPreview();
    const next = new Map(photos.map((file) => [fileKey(file.name), file]));
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (
        file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
          file.type,
        )
      ) {
        rejected.push(file.name);
        continue;
      }
      const old = next.get(fileKey(file.name));
      if (
        old &&
        (old.size !== file.size || old.lastModified !== file.lastModified)
      ) {
        rejected.push(file.name + " (trùng tên / duplicate name)");
        continue;
      }
      next.set(fileKey(file.name), file);
    }
    if (next.size > 1000) {
      setError(
        t("Tối đa 1.000 file ảnh mỗi lần.", "Select up to 1,000 images."),
      );
      return;
    }
    setPhotos([...next.values()]);
    if (rejected.length)
      setError(
        t("Không nhận các file: ", "Files not accepted: ") +
          rejected.slice(0, 10).join(", "),
      );
    if (photoInput.current) photoInput.current.value = "";
  };
  const check = async () => {
    if (!workbook) return;
    setChecking(true);
    setError("");
    setResults({});
    try {
      const data = new FormData();
      data.append("workbook", workbook);
      data.append("mode", mode);
      data.append("filenames", JSON.stringify(photos.map((file) => file.name)));
      const result = (await (await request("preview", data)).json()) as Preview;
      result.rows = result.rows.map((row) => ({
        ...row,
        requestId: crypto.randomUUID(),
      }));
      setPreview(result);
    } catch (error) {
      setError(errorMessage(error));
      setPreview(null);
    } finally {
      setChecking(false);
    }
  };
  const importRows = async () => {
    if (!preview?.configured || running) return;
    setRunning(true);
    setStopping(false);
    setError("");
    stop.current = false;
    const eligible = preview.rows.filter(
      (row) =>
        !row.errors.length &&
        row.action !== "skip" &&
        (!results[row.row] || results[row.row].state === "error"),
    );
    const assets = new Map(photos.map((file) => [fileKey(file.name), file]));
    let success = 0;
    try {
      for (const row of eligible) {
        if (stop.current) break;
        setActiveRow(row.row);
        const body = new FormData();
        body.append("mode", mode);
        body.append("request_id", row.requestId!);
        body.append("row", JSON.stringify(row.data));
        row.data.images.forEach((source) => {
          if (!source.startsWith("https://")) {
            const file = assets.get(fileKey(source));
            if (file) body.append("images", file, file.name);
          }
        });
        try {
          const result = (await (await request("row", body)).json()) as {
            action: "created" | "updated" | "skipped";
          };
          setResults((previous) => ({
            ...previous,
            [row.row]: { state: result.action },
          }));
          success++;
        } catch (error) {
          setResults((previous) => ({
            ...previous,
            [row.row]: { state: "error", message: errorMessage(error) },
          }));
        }
      }
      if (success) {
        try {
          await onImported();
        } catch {
          toast.error(
            t(
              "Đã nhập nhưng chưa tải lại được danh sách. Hãy làm mới trang.",
              "Imported, but the list could not refresh. Reload the page.",
            ),
          );
        }
        toast.success(
          t(`Đã xử lý ${success} dòng.`, `Processed ${success} rows.`),
        );
      }
    } finally {
      setRunning(false);
      setActiveRow(null);
    }
  };
  const valid =
    preview?.rows.filter(
      (row) => !row.errors.length && row.action !== "skip",
    ) || [];
  const completed = Object.values(results).filter(
    (value) => value.state !== "error",
  ).length;
  const failed = Object.values(results).filter(
    (value) => value.state === "error",
  ).length;
  const remaining = valid.filter(
    (row) => !results[row.row] || results[row.row].state === "error",
  ).length;
  const hasResults = Object.keys(results).length > 0;
  const labels: Record<string, string> = {
    create: t("Tạo mới", "Create"),
    update: t("Cập nhật", "Update"),
    skip: t("Bỏ qua", "Skip"),
    created: t("Đã tạo", "Created"),
    updated: t("Đã cập nhật", "Updated"),
    skipped: t("Đã bỏ qua", "Skipped"),
    error: t("Lỗi nhập", "Import failed"),
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet size={16} />
        {t("Nhập Excel", "Import Excel")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!running && !checking) setOpen(value);
        }}
      >
        <DialogContent
          className="admin-dialog admin-import-dialog"
          onEscapeKeyDown={(event) => running && event.preventDefault()}
          onInteractOutside={(event) => running && event.preventDefault()}
        >
          <DialogHeader>
            <span className="admin-eyebrow">
              THIÊN PHÚC / {t("NHẬP HÀNG LOẠT", "BULK IMPORT")}
            </span>
            <DialogTitle>
              {resource === "products"
                ? t("Nhập sản phẩm từ Excel", "Import products from Excel")
                : t("Nhập danh mục từ Excel", "Import categories from Excel")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Tải file mẫu, kiểm tra dữ liệu rồi xác nhận nhập. Xem trước sẽ không ghi dữ liệu.",
                "Download a template, review your rows and confirm. Preview does not save any data.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="admin-import-body">
            <div className="admin-import-guide">
              <div>
                <strong>
                  {t("1. Chuẩn bị dữ liệu", "1. Prepare your data")}
                </strong>
                <p>
                  {t(
                    resource === "products"
                      ? "Mẫu lấy danh mục đang có trên website để chọn trong Excel. Tạo sản phẩm mới có thể để trống slug; cập nhật thì giữ slug cũ."
                      : "Tạo danh mục mới có thể để trống slug để tự tạo từ tên. Xem danh mục đang có trong sheet tham khảo của mẫu.",
                    resource === "products"
                      ? "The template includes current website categories as Excel choices. Leave slug blank for new products; retain the existing slug for updates."
                      : "Leave slug blank to generate it from a new category name. Existing categories are listed in the template reference sheet.",
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                disabled={downloading || running}
              >
                <Download size={15} />
                {downloading
                  ? t("Đang tạo…", "Preparing…")
                  : t("Tải file mẫu", "Download template")}
              </Button>
            </div>
            <div className="admin-import-inputs">
              <div className="admin-import-upload">
                <FileSpreadsheet size={28} />
                <strong>
                  {workbook?.name || t("Chọn file Excel", "Select workbook")}
                </strong>
                <span>{t(".xlsx · tối đa 2 MB", ".xlsx · up to 2 MB")}</span>
                <input
                  ref={input}
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  aria-label={t("File Excel", "Excel workbook")}
                  disabled={running || checking}
                  onChange={(event) => selectWorkbook(event.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (input.current) {
                      input.current.value = "";
                      input.current.click();
                    }
                  }}
                  disabled={running || checking}
                >
                  {t("Chọn file", "Choose file")}
                </Button>
              </div>
              {resource === "products" && (
                <div className="admin-import-upload">
                  <ImagePlus size={28} />
                  <strong>
                    {t("Ảnh từ máy / điện thoại", "Images from your device")}
                  </strong>
                  <span>
                    {t(
                      "Tên file khớp cột anh_1 … anh_5; mỗi ảnh ≤ 5 MB.",
                      "Match filenames in anh_1 … anh_5; up to 5 MB each.",
                    )}
                  </span>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="sr-only"
                    aria-label={t("Chọn ảnh sản phẩm", "Choose product images")}
                    disabled={running || checking}
                    onChange={(event) => selectPhotos(event.target.files)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => photoInput.current?.click()}
                    disabled={running || checking}
                  >
                    {t("Chọn nhiều ảnh", "Choose images")}
                  </Button>
                  <span>
                    {photos.length} {t("ảnh đã chọn", "images selected")}
                  </span>
                </div>
              )}
            </div>
            {photos.length > 0 && (
              <div className="admin-import-files">
                {photos.slice(0, 12).map((file) => (
                  <span key={fileKey(file.name)}>
                    {file.name}
                    <button
                      disabled={running || checking}
                      aria-label={t("Bỏ ảnh ", "Remove image ") + file.name}
                      onClick={() => {
                        setPhotos((previous) =>
                          previous.filter((value) => value !== file),
                        );
                        resetPreview();
                      }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {photos.length > 12 && (
                  <span>
                    +{photos.length - 12} {t("ảnh khác", "more")}
                  </span>
                )}
              </div>
            )}
            {resource === "products" && (
              <p className="admin-import-note">
                {t(
                  "Có thể dùng link HTTPS hoặc link từng ảnh Google Drive có quyền tải. Hệ thống sẽ nén ảnh WebP, tạo ảnh thu nhỏ và lưu về Supabase. Ảnh HEIC cần chuyển sang JPEG trước khi chọn.",
                  "Public HTTPS and downloadable Google Drive image links are supported. Images are optimized to WebP with thumbnails and saved to Supabase. Convert HEIC photos to JPEG first.",
                )}
              </p>
            )}
            <div className="admin-import-mode">
              <div>
                <label id="import-mode-label">
                  {t("Khi slug đã tồn tại", "When the slug already exists")}
                </label>
                <Select
                  value={mode}
                  onValueChange={(value) => {
                    setMode(value);
                    resetPreview();
                  }}
                  disabled={running || checking}
                >
                  <SelectTrigger aria-labelledby="import-mode-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">
                      {t("Bỏ qua bản ghi trùng", "Skip existing records")}
                    </SelectItem>
                    <SelectItem value="update">
                      {t("Cập nhật bản ghi đã có", "Update existing records")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={check}
                disabled={!workbook || checking || running}
              >
                {checking ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <SearchIcon />
                )}
                {checking
                  ? t("Đang kiểm tra…", "Checking…")
                  : t("2. Kiểm tra & xem trước", "2. Validate & preview")}
              </Button>
            </div>
            {mode === "update" && (
              <p className="admin-import-warning">
                {t(
                  "Chế độ cập nhật sẽ ghi đè tên, giá, tồn kho và danh mục. Ảnh, mô tả để trống sẽ giữ nguyên. Biến thể, SEO và các trường khác không thay đổi.",
                  "Update mode replaces names, prices, inventory and category. Empty images/descriptions preserve existing values. Variants, SEO and other fields remain unchanged.",
                )}
              </p>
            )}
            {error && (
              <div className="admin-import-error" role="alert">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}
            {preview && (
              <>
                {!preview.configured && (
                  <div className="admin-import-error" role="alert">
                    <AlertCircle size={17} />
                    <span>
                      {(!en && preview.configurationMessage) ||
                        t(
                          "Chức năng nhập chưa được cấu hình trên database. Cần áp dụng file SQL nhập danh mục trước khi xác nhận.",
                          "Database import is not configured yet. Apply the catalog import migration before confirming.",
                        )}
                    </span>
                  </div>
                )}
                <div className="admin-import-summary">
                  <span>
                    <strong>{preview.summary.total}</strong>
                    {t("Tổng dòng", "Total rows")}
                  </span>
                  <span>
                    <strong>{preview.summary.valid}</strong>
                    {t("Có thể nhập", "Ready")}
                  </span>
                  <span>
                    <strong>{preview.summary.invalid}</strong>
                    {t("Cần sửa", "Needs correction")}
                  </span>
                  <span>
                    <strong>{preview.summary.skipped}</strong>
                    {t("Bỏ qua", "Skip")}
                  </span>
                </div>
                <div
                  className="admin-import-preview"
                  tabIndex={0}
                  role="region"
                  aria-label={t("Xem trước dữ liệu nhập", "Import preview")}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Dòng", "Row")}</th>
                        <th>{t("Tên / Slug", "Name / Slug")}</th>
                        {resource === "products" && (
                          <>
                            <th>{t("Danh mục", "Category")}</th>
                            <th>{t("Giá / Tồn", "Price / Stock")}</th>
                          </>
                        )}
                        <th>{t("Kết quả kiểm tra", "Validation")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => {
                        const result = results[row.row];
                        return (
                          <tr key={row.row}>
                            <td>{row.row}</td>
                            <td>
                              <strong>{row.data.name || "—"}</strong>
                              <span>{row.data.slug}</span>
                            </td>
                            {resource === "products" && (
                              <>
                                <td>{row.data.category || "—"}</td>
                                <td>
                                  {row.data.price?.toLocaleString(locale)} ₫
                                  <span>
                                    {t("Tồn: ", "Stock: ")}
                                    {row.data.quantity}
                                  </span>
                                </td>
                              </>
                            )}
                            <td>
                              {activeRow === row.row ? (
                                <span className="admin-inline">
                                  <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                  />
                                  {t("Đang nhập…", "Importing…")}
                                </span>
                              ) : result ? (
                                <span
                                  className={
                                    result.state === "error"
                                      ? "admin-import-row-error"
                                      : "admin-import-row-success"
                                  }
                                >
                                  {result.state === "error" ? (
                                    <AlertCircle size={13} />
                                  ) : (
                                    <CheckCircle2 size={13} />
                                  )}{" "}
                                  {labels[result.state]}
                                  {result.message && (
                                    <span>{result.message}</span>
                                  )}
                                </span>
                              ) : row.errors.length ? (
                                <span className="admin-import-row-error">
                                  {row.errors.join("; ")}
                                </span>
                              ) : (
                                <span>{labels[row.action]}</span>
                              )}
                              {!result && row.warnings.length > 0 && (
                                <span className="admin-import-row-warning">
                                  {row.warnings.join("; ")}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(running || hasResults) && (
                  <div className="admin-import-progress" role="status">
                    <div>
                      <span>
                        {completed}/{valid.length}{" "}
                        {t("dòng đã xử lý", "rows processed")}
                        {failed > 0 ? ` · ${failed} ${t("lỗi", "failed")}` : ""}
                      </span>
                      {running && (
                        <button
                          disabled={stopping}
                          onClick={() => {
                            stop.current = true;
                            setStopping(true);
                          }}
                        >
                          {stopping
                            ? t("Đang dừng…", "Stopping…")
                            : t(
                                "Dừng sau dòng hiện tại",
                                "Stop after current row",
                              )}
                        </button>
                      )}
                    </div>
                    <progress value={completed} max={valid.length || 1} />
                  </div>
                )}
                <p className="admin-import-note">
                  {t(
                    "Chỉ những dòng hợp lệ mới được nhập. Dòng lỗi sẽ được giữ lại để bạn sửa hoặc thử lại; mỗi dòng được lưu độc lập.",
                    "Only valid rows are imported. Failed rows stay visible for correction or retry; each row saves independently.",
                  )}
                </p>
              </>
            )}
          </div>
          <div className="admin-import-footer">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={running || checking}
            >
              {t("Đóng", "Close")}
            </Button>
            {preview && (
              <Button
                onClick={importRows}
                disabled={
                  !preview.configured || !remaining || running || checking
                }
              >
                {running ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}{" "}
                {running
                  ? t("Đang nhập dữ liệu…", "Importing…")
                  : !remaining
                    ? hasResults
                      ? t("Đã xử lý xong", "Completed")
                      : t("Không có dòng cần nhập", "No rows to import")
                    : t(
                        `3. Xác nhận nhập ${remaining} dòng`,
                        `3. Import ${remaining} rows`,
                      )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function SearchIcon() {
  return <FileSpreadsheet size={15} />;
}
