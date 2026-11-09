"use client";
/* eslint-disable @next/next/no-img-element -- Catalog thumbnails are external user assets with variable origins. */

import { refreshCatalog } from "@/app/actions/catalog";
import { Notice } from '@/components/ui/notice';
import { productThumbnail } from "@/lib/product-image-url";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookmarkPlus,
  Check,
  ChevronRight,
  Ellipsis,
  Eye,
  FilePenLine,
  ListFilter,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "./AdminStatusBadge";
import { adminMoney } from "@/components/admin/admin-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AdminRow,
  Choice,
  NEXT_STATUS,
  ORDER_STATUS,
  RESOURCES,
  Resource,
  Text,
  voucherStatus,
} from "./admin-resources";
import {
  adminFetch,
  ListResult,
  ListState,
  useAdminList,
} from "./use-admin-list";

const CatalogImportDialog = dynamic(() => import("./CatalogImportDialog"), {
  ssr: false,
});

type Action = {
  label: string;
  description: string;
  destructive?: boolean;
  run: () => Promise<void>;
};
type SavedView = { name: string; filters: ListState };

export default function AdminResourcePage({
  resource,
}: {
  resource: Resource;
}) {
  const list = useAdminList(resource);
  const { state, update, query, token, locale, selected, setSelected } = list;
  const { user, role } = useAuth();
  const en = locale === "en";
  const t = (vi: string, english: string) => (en ? english : vi);
  const text = (label: Text) => label[en ? 1 : 0];
  const config = RESOURCES[resource];
  const formatPrice = (value: number) => adminMoney(value, locale);
  const { mutate: mutateCache } = useSWRConfig();
  const [quick, setQuick] = useState<AdminRow | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [saved, setSaved] = useState<SavedView[]>([]);
  const storageKey = `thien-phuc-admin:${user?.id}:${resource}`;
  const { data: categories, error: categoryError } = useSWR<ListResult>(
    resource === "products" && token
      ? ["/admin/resources/categories?limit=500&page=1&locale=" + locale, token]
      : null,
    ([path, accessToken]: [string, string]) =>
      adminFetch<ListResult>(path, accessToken),
    { revalidateOnFocus: false },
  );
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      if (Array.isArray(value))
        setSaved(
          value
            .filter(
              (v): v is SavedView =>
                typeof v?.name === "string" &&
                v.filters &&
                typeof v.filters === "object",
            )
            .slice(0, 8),
        );
    } catch {
      setSaved([]);
    }
  }, [storageKey]);
  const rows = list.error ? [] : list.data?.data || [];
  const total = list.data?.meta.total || 0;
  const currentPage = Number(state.page) || 1;
  const limit = Number(state.limit) || 20;
  const loading = !list.ready || list.isLoading;
  const refreshing = list.isValidating;
  const titleOf = (row: AdminRow) =>
    row.translations?.find((v) => v.locale === locale)?.title ||
    row.translations?.find((v) => v.locale === locale)?.name ||
    row.translations?.[0]?.title ||
    row.translations?.[0]?.name ||
    row.title ||
    row.full_name ||
    row.code ||
    row.slug ||
    row.email ||
    row.id;
  const date = (value?: string) =>
    value && Number.isFinite(new Date(value).getTime())
      ? new Intl.DateTimeFormat(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(new Date(value))
      : "—";
  const statusOf = (row: AdminRow) =>
    resource === "vouchers"
      ? voucherStatus(row)
      : resource === "users"
        ? row.is_banned
          ? "banned"
          : "active"
        : resource === "products" || resource === "categories"
          ? row.is_active
            ? "active"
            : "archived"
          : row.status || "draft";
  const detailsHref = (row: AdminRow) => `/admin/${config.route}/${row.id}`;
  const refresh = async () => {
    if (resource === "products" || resource === "categories")
      await refreshCatalog().catch(() => undefined);
    await list.mutate();
    await mutateCache(
      (key) =>
        Array.isArray(key) &&
        typeof key[0] === "string" &&
        key[0].startsWith("/admin/operations"),
    );
  };
  const request = (
    label: string,
    description: string,
    path: string,
    method: string,
    body?: object,
    destructive = false,
  ) =>
    setAction({
      label,
      description,
      destructive,
      run: async () => {
        await adminFetch(path, token, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        setQuick(null);
        setSelected([]);
        await refresh();
      },
    });
  const confirm = async () => {
    if (!action || busy) return;
    setBusy(true);
    try {
      await action.run();
      toast.success(t("Đã cập nhật thành công.", "Updated successfully."));
      setAction(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("Không thể cập nhật.", "Update failed."),
      );
    } finally {
      setBusy(false);
    }
  };
  const persistViews = (views: SavedView[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(views));
      setSaved(views);
      return true;
    } catch {
      toast.error(
        t(
          "Trình duyệt không thể lưu bộ lọc.",
          "Browser storage is unavailable.",
        ),
      );
      return false;
    }
  };
  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const { page: _page, ...filters } = state;
    void _page;
    const next = [
      ...saved.filter((v) => v.name !== name),
      { name, filters },
    ].slice(-8);
    if (persistViews(next)) {
      setSaveOpen(false);
      setViewName("");
      toast.success(
        t("Đã lưu bộ lọc trên trình duyệt này.", "View saved in this browser."),
      );
    }
  };
  const clearFilters = () => {
    list.debouncedSearch.cancel();
    update({}, true);
  };
  const applyView = (filters: ListState) => {
    list.debouncedSearch.cancel();
    update(filters, true);
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await adminFetch<{ csv: string; count: number }>(
        `/admin/resources/${resource}/export?${query}`,
        token,
      );
      const url = URL.createObjectURL(
        new Blob(["\ufeff" + result.csv], { type: "text/csv;charset=utf-8;" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `thien-phuc-${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(
        t(
          `Đã xuất ${result.count} kết quả.`,
          `Exported ${result.count} records.`,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };
  const filterChoices = (key: string, options: Choice[]) =>
    key === "category" && resource === "products"
      ? (categories?.data || []).map((row) => ({
          value: row.id,
          label: [titleOf(row), titleOf(row)] as Text,
        }))
      : options;
  const filterLabel = (key: string, value: string) => {
    if (key === "search") return `${t("Tìm", "Search")}: ${value}`;
    if (key === "from" || key === "to")
      return `${key === "from" ? t("Từ", "From") : t("Đến", "To")}: ${value}`;
    const f = config.filters.find((item) => item.key === key);
    return `${f ? text(f.label) : key}: ${f ? text(filterChoices(key, f.options).find((o) => o.value === value)?.label || [value, value]) : value}`;
  };
  const filters = Object.entries(state).filter(
    ([key, value]) =>
      !["page", "limit", "sort", "locale"].includes(key) && value,
  );
  const roleLabel = (value?: string) =>
    value === "ADMIN"
      ? t("Quản trị viên", "Administrator")
      : value === "STAFF"
        ? t("Nhân viên", "Staff")
        : t("Khách hàng", "Customer");
  const openQuick = (row: AdminRow) => setQuick(row);
  const small = (value?: string) => (
    <span className="admin-subtext">{value || "—"}</span>
  );
  const cells = (row: AdminRow) => {
    const name = titleOf(row);
    const primary = (
      <button className="admin-record-title" onClick={() => openQuick(row)}>
        {name}
      </button>
    );
    const badge = <StatusBadge value={statusOf(row)} en={en} />;
    if (resource === "orders")
      return (
        <>
          <TableCell>
            <button
              className="admin-record-title admin-mono"
              onClick={() => openQuick(row)}
            >
              #{row.id.slice(0, 8).toUpperCase()}
            </button>
            {small(date(row.created_at))}
          </TableCell>
          <TableCell>
            <span className="admin-cell-title">
              {row.shipping_info?.full_name ||
                row.shipping_info?.name ||
                t("Khách vãng lai", "Guest")}
            </span>
            {small(row.shipping_info?.phone || row.shipping_info?.email)}
          </TableCell>
          <TableCell>{badge}</TableCell>
          <TableCell>
            <StatusBadge value={row.payment_status || "pending"} en={en} />
          </TableCell>
          <TableCell className="admin-numeric">
            {formatPrice(Number(row.total || 0))}
          </TableCell>
        </>
      );
    if (resource === "products")
      return (
        <>
          <TableCell>
            <div className="admin-product-cell">
              {row.images?.[0] ? (
                <img
                  src={productThumbnail(row.images[0])}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                />
              ) : (
                <span className="admin-product-placeholder">
                  <Package size={18} />
                </span>
              )}
              <div>
                {primary}
                {small("/" + row.slug)}
              </div>
            </div>
          </TableCell>
          <TableCell>
            {typeof row.category === "object" ? row.category?.slug : "—"}
          </TableCell>
          <TableCell className="admin-numeric">
            {formatPrice(Number(row.price || 0))}
          </TableCell>
          <TableCell>
            <span
              className={`admin-stock ${Number(row.quantity) <= 0 ? "is-out" : Number(row.quantity) < 10 ? "is-low" : ""}`}
            >
              {row.quantity ?? 0} {t("sản phẩm", "units")}
            </span>
            {Number(row.quantity) < 10 &&
              small(
                Number(row.quantity) <= 0
                  ? t("Hết hàng", "Out of stock")
                  : t("Cần nhập thêm", "Restock soon"),
              )}
          </TableCell>
          <TableCell>{badge}</TableCell>
        </>
      );
    if (resource === "categories")
      return (
        <>
          <TableCell>{primary}</TableCell>
          <TableCell className="admin-mono">/{row.slug}</TableCell>
          <TableCell>{badge}</TableCell>
          <TableCell>{date(row.created_at)}</TableCell>
        </>
      );
    if (resource === "users")
      return (
        <>
          <TableCell>
            <div className="admin-person">
              <span className="admin-initial">
                {(row.full_name || row.email || "?").charAt(0).toUpperCase()}
              </span>
              <div>
                {primary}
                {row.id === user?.id &&
                  small(t("Tài khoản của bạn", "Your account"))}
              </div>
            </div>
          </TableCell>
          <TableCell>{row.email || "—"}</TableCell>
          <TableCell>{roleLabel(row.role)}</TableCell>
          <TableCell>{badge}</TableCell>
          <TableCell>{date(row.created_at)}</TableCell>
        </>
      );
    if (resource === "posts")
      return (
        <>
          <TableCell>
            {primary}
            {small("/" + row.slug)}
          </TableCell>
          <TableCell>
            {typeof row.category === "string" ? row.category : "—"}
          </TableCell>
          <TableCell>{badge}</TableCell>
          <TableCell>
            {row.is_featured ? (
              <span className="admin-inline">
                <Check size={14} />
                {t("Nổi bật", "Featured")}
              </span>
            ) : (
              "—"
            )}
          </TableCell>
          <TableCell>{date(row.created_at)}</TableCell>
        </>
      );
    if (resource === "contacts")
      return (
        <>
          <TableCell>
            {primary}
            {small(row.email)}
          </TableCell>
          <TableCell>{row.topic || t("Khác", "Other")}</TableCell>
          <TableCell>
            <span className="admin-message-excerpt">{row.message}</span>
          </TableCell>
          <TableCell>{badge}</TableCell>
          <TableCell>{date(row.created_at)}</TableCell>
        </>
      );
    return (
      <>
        <TableCell>
          <button
            className="admin-record-title admin-mono"
            onClick={() => openQuick(row)}
          >
            {row.code}
          </button>
        </TableCell>
        <TableCell className="admin-numeric">
          {row.discount_type === "PERCENTAGE"
            ? `${row.discount_amount}%`
            : formatPrice(Number(row.discount_amount || 0))}
        </TableCell>
        <TableCell>
          {row.usage_count || 0} /{" "}
          {row.usage_limit ?? t("Không giới hạn", "Unlimited")}
        </TableCell>
        <TableCell>{date(row.end_date)}</TableCell>
        <TableCell>{badge}</TableCell>
      </>
    );
  };
  const menu = (row: AdminRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Thao tác với bản ghi", "Record actions")}
          disabled={refreshing}
        >
          <Ellipsis size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="admin-menu">
        <DropdownMenuItem onSelect={() => openQuick(row)}>
          <Eye size={15} />
          {t("Xem nhanh", "Quick view")}
        </DropdownMenuItem>
        {resource !== "contacts" && (
          <DropdownMenuItem asChild>
            <Link href={detailsHref(row)}>
              <FilePenLine size={15} />
              {resource === "orders" || resource === "users"
                ? t("Mở chi tiết", "Open details")
                : t("Chỉnh sửa", "Edit")}
            </Link>
          </DropdownMenuItem>
        )}
        {(resource === "products" ||
          resource === "categories" ||
          resource === "vouchers") && (
          <DropdownMenuItem
            onSelect={() =>
              request(
                row.is_active
                  ? t("Tạm ẩn", "Deactivate")
                  : t("Kích hoạt", "Activate"),
                t(
                  "Thay đổi hiển thị của bản ghi này.",
                  "Change availability for this record.",
                ),
                `/${resource}/${row.id}`,
                "PATCH",
                { is_active: !row.is_active },
              )
            }
          >
            {row.is_active
              ? t("Tạm ẩn / tắt", "Deactivate")
              : t("Kích hoạt lại", "Activate")}
          </DropdownMenuItem>
        )}
        {resource === "contacts" &&
          ["new", "read", "replied"]
            .filter((s) => s !== row.status)
            .map((s) => (
              <DropdownMenuItem
                key={s}
                onSelect={() =>
                  request(
                    text(ORDER_STATUS[s]),
                    t(
                      "Cập nhật trạng thái xử lý liên hệ.",
                      "Update message status.",
                    ),
                    `/contacts/${row.id}`,
                    "PATCH",
                    { status: s },
                  )
                }
              >
                {text(ORDER_STATUS[s])}
              </DropdownMenuItem>
            ))}
        {resource === "users" && role === "ADMIN" && row.id !== user?.id && (
          <DropdownMenuItem
            onSelect={() =>
              request(
                row.is_banned
                  ? t("Mở khóa tài khoản", "Unban account")
                  : t("Khóa tài khoản", "Ban account"),
                row.email || row.full_name || row.id,
                `/users/${row.id}/ban`,
                "PATCH",
                { is_banned: !row.is_banned },
                !row.is_banned,
              )
            }
          >
            {row.is_banned
              ? t("Mở khóa", "Unban")
              : t("Khóa tài khoản", "Ban account")}
          </DropdownMenuItem>
        )}
        {(resource === "posts" || resource === "vouchers") && (
          <DropdownMenuItem
            className="text-red-700"
            onSelect={() =>
              request(
                t("Xóa bản ghi", "Delete record"),
                t(
                  "Bản ghi sẽ bị xóa vĩnh viễn. Bạn có chắc muốn tiếp tục?",
                  "This record will be permanently deleted. Continue?",
                ),
                `/${resource}/${row.id}`,
                "DELETE",
                undefined,
                true,
              )
            }
          >
            <Trash2 size={15} />
            {t("Xóa", "Delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const selectControl = (
    key: string,
    label: string,
    options: Choice[],
    value: string,
    onChange: (value: string) => void,
    all = true,
  ) => (
    <div className={`admin-filter-field filter-${key}`} key={key}>
      <label id={`label-${key}`}>{label}</label>
      <Select
        value={value || "__all"}
        onValueChange={(value) => onChange(value === "__all" ? "" : value)}
      >
        <SelectTrigger
          aria-labelledby={`label-${key}`}
          className="admin-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {all && <SelectItem value="__all">{t("Tất cả", "All")}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {text(o.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <section className="admin-page" aria-busy={loading || refreshing}>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            {t("QUẢN LÝ CỬA HÀNG", "STORE MANAGEMENT")}
          </span>
          <h1>{text(config.title)}</h1>
          <p>{text(config.description)}</p>
        </div>
        <div className="admin-heading-actions">
          {(resource === "products" || resource === "categories") && (
            <CatalogImportDialog resource={resource} onImported={refresh} />
          )}
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={
              exporting || !total || loading || refreshing || !!list.error
            }
          >
            <ArrowDownToLine size={16} />
            {exporting
              ? t("Đang xuất…", "Exporting…")
              : t("Xuất CSV", "Export CSV")}
          </Button>
          {config.create && (
            <Button asChild>
              <Link href={config.create}>
                <Plus size={16} />
                {t("Thêm mới", "Create new")}
              </Link>
            </Button>
          )}
        </div>
      </header>
      <div className="admin-list-card">
        <div className="admin-list-tabs">
          <div role="group" aria-label={t("Lọc nhanh", "Quick filters")}>
            <button
              className={!state.status ? "is-active" : ""}
              onClick={() => update({ status: "" })}
            >
              {t("Tất cả", "All")}
            </button>
            {config.tabs?.map((tab) => (
              <button
                key={tab.value}
                className={state.status === tab.value ? "is-active" : ""}
                onClick={() => update({ status: tab.value })}
              >
                {text(tab.label)}
              </button>
            ))}
          </div>
          <span className="admin-result-count">
            {total.toLocaleString(locale)} {text(config.singular)}
          </span>
        </div>
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={17} aria-hidden="true" />
            <Input
              value={list.search}
              onChange={(e) => {
                list.setSearch(e.target.value);
                list.debouncedSearch(e.target.value);
              }}
              aria-label={text(config.search)}
              placeholder={text(config.search)}
            />
            {list.search && (
              <button
                aria-label={t("Xóa tìm kiếm", "Clear search")}
                onClick={() => {
                  list.debouncedSearch.cancel();
                  list.setSearch("");
                  update({ search: "" });
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={() => setSaveOpen(true)}>
            <BookmarkPlus size={16} />
            {t("Lưu bộ lọc", "Save view")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Làm mới danh sách", "Refresh list")}
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </Button>
        </div>
        <div
          className="admin-filterbar"
          data-filter-count={config.filters.length}
        >
          <span className="admin-filter-icon">
            <SlidersHorizontal size={17} />
            {t("Bộ lọc", "Filters")}
          </span>
          {config.filters.map((f) =>
            selectControl(
              f.key,
              text(f.label),
              filterChoices(f.key, f.options),
              state[f.key],
              (value) => update({ [f.key]: value }),
            ),
          )}
          <div className="admin-filter-field">
            <label htmlFor="admin-from">{t("Từ ngày", "From")}</label>
            <Input
              id="admin-from"
              type="date"
              value={state.from || ""}
              max={state.to || undefined}
              onChange={(e) => update({ from: e.target.value })}
            />
          </div>
          <div className="admin-filter-field">
            <label htmlFor="admin-to">{t("Đến ngày", "To")}</label>
            <Input
              id="admin-to"
              type="date"
              value={state.to || ""}
              min={state.from || undefined}
              onChange={(e) => update({ to: e.target.value })}
            />
          </div>
          {selectControl(
            "sort",
            t("Sắp xếp", "Sort"),
            config.sorts,
            state.sort,
            (value) => update({ sort: value }),
            false,
          )}
        </div>
        {categoryError && (
          <Notice tone="error" className="mx-5 my-2">
            {t(
              "Không thể tải danh mục. Hãy làm mới trang để thử lại.",
              "Unable to load categories. Refresh to retry.",
            )}
          </Notice>
        )}
        {saved.length > 0 && (
          <div className="admin-saved-views">
            <span>{t("Đã lưu:", "Saved:")}</span>
            {saved.map((view, index) => (
              <span key={view.name}>
                <button onClick={() => applyView(view.filters)}>
                  {view.name}
                </button>
                <button
                  aria-label={
                    t("Xóa bộ lọc đã lưu", "Remove saved view") +
                    " " +
                    view.name
                  }
                  onClick={() =>
                    persistViews(saved.filter((_, i) => i !== index))
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {filters.length > 0 && (
          <div className="admin-active-filters">
            <ListFilter size={15} />
            {filters.map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "search") {
                    list.debouncedSearch.cancel();
                    list.setSearch("");
                  }
                  update({ [key]: "" });
                }}
              >
                {filterLabel(key, value)}
                <X size={12} />
              </button>
            ))}
            <button className="admin-clear-filters" onClick={clearFilters}>
              {t("Xóa tất cả", "Clear all")}
            </button>
          </div>
        )}
        {resource === "products" && selected.length > 0 && (
          <div className="admin-bulkbar">
            <strong>
              {selected.length} {t("đã chọn", "selected")}
            </strong>
            {["archive", "restore"].map((value) => (
              <Button
                key={value}
                size="sm"
                variant="outline"
                disabled={refreshing}
                onClick={() =>
                  request(
                    value === "archive"
                      ? t("Ẩn sản phẩm đã chọn", "Hide selected products")
                      : t(
                          "Hiển thị sản phẩm đã chọn",
                          "Show selected products",
                        ),
                    t(
                      `Áp dụng cho ${selected.length} sản phẩm trên trang này.`,
                      `Apply to ${selected.length} products on this page.`,
                    ),
                    "/products/bulk/update",
                    "PATCH",
                    { ids: selected, action: value },
                  )
                }
              >
                {value === "archive"
                  ? t("Tạm ẩn", "Hide")
                  : t("Hiển thị", "Show")}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              {t("Bỏ chọn", "Clear selection")}
            </Button>
          </div>
        )}
        {list.error ? (
          <div className="admin-state" role="alert">
            <RefreshCw size={28} />
            <h2>{t("Không thể tải danh sách", "Unable to load records")}</h2>
            <p>{list.error.message}</p>
            <Button variant="outline" onClick={() => void list.mutate()}>
              {t("Thử lại", "Retry")}
            </Button>
          </div>
        ) : (
          <Table className="admin-data-table">
            <TableHeader>
              <TableRow>
                {resource === "products" && (
                  <TableHead className="admin-check-col">
                    <input
                      type="checkbox"
                      aria-label={t(
                        "Chọn toàn bộ trang hiện tại",
                        "Select current page",
                      )}
                      checked={
                        rows.length > 0 &&
                        rows.every((row) => selected.includes(row.id))
                      }
                      disabled={loading || refreshing}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? rows.map((row) => row.id) : [],
                        )
                      }
                    />
                  </TableHead>
                )}
                {config.columns.map((label, index) => (
                  <TableHead key={index}>{text(label)}</TableHead>
                ))}
                <TableHead className="admin-action-col">
                  <span className="sr-only">{t("Thao tác", "Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i}>
                    {Array.from(
                      {
                        length:
                          config.columns.length +
                          (resource === "products" ? 2 : 1),
                      },
                      (_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full max-w-36" />
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      config.columns.length + (resource === "products" ? 2 : 1)
                    }
                  >
                    <div className="admin-state">
                      <Package size={32} />
                      <h2>
                        {filters.length
                          ? t("Không có kết quả phù hợp", "No matching records")
                          : t("Chưa có dữ liệu", "No records yet")}
                      </h2>
                      <p>
                        {filters.length
                          ? t(
                              "Thử thay đổi từ khóa hoặc bỏ bớt điều kiện lọc.",
                              "Try another search or remove some filters.",
                            )
                          : t(
                              "Các bản ghi mới sẽ xuất hiện tại đây.",
                              "New records will appear here.",
                            )}
                      </p>
                      {filters.length > 0 && (
                        <Button variant="outline" onClick={clearFilters}>
                          {t("Xóa bộ lọc", "Clear filters")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-selected={selected.includes(row.id) || undefined}
                  >
                    {resource === "products" && (
                      <TableCell className="admin-check-col">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          disabled={refreshing}
                          aria-label={t("Chọn", "Select") + " " + titleOf(row)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, row.id]
                                : selected.filter((id) => id !== row.id),
                            )
                          }
                        />
                      </TableCell>
                    )}
                    {cells(row)}
                    <TableCell className="admin-action-col">
                      {menu(row)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {!list.error && (
          <Pagination
            meta={{
              page: currentPage,
              limit,
              total,
              last_page: list.data?.meta.last_page || 1,
            }}
            onPageChange={(page) => update({ page: String(page) })}
            onLimitChange={(value) => update({ limit: String(value) })}
            disabled={loading || refreshing}
            locale={locale}
          />
        )}
      </div>
      <p className="admin-list-footnote">
        {t(
          "Bộ lọc áp dụng trên toàn bộ dữ liệu. Các lựa chọn được giữ trong đường dẫn.",
          "Filters apply to all records. Your selection is preserved in the URL.",
        )}
      </p>
      <Sheet open={!!quick} onOpenChange={(open) => !open && setQuick(null)}>
        <SheetContent className="admin-detail-sheet sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <span className="admin-eyebrow">
              {t("XEM NHANH", "QUICK VIEW")}
            </span>
            <SheetTitle>
              {quick
                ? resource === "orders"
                  ? "#" + quick.id.slice(0, 8).toUpperCase()
                  : titleOf(quick)
                : ""}
            </SheetTitle>
            <SheetDescription>{text(config.description)}</SheetDescription>
          </SheetHeader>
          {quick && (
            <div className="admin-detail-body">
              <div className="admin-detail-meta">
                <StatusBadge value={statusOf(quick)} en={en} />
                <span>{date(quick.created_at)}</span>
              </div>
              {(quick.images?.[0] || quick.cover_image) && (
                <img
                  className="admin-detail-image"
                  src={quick.images?.[0] || quick.cover_image}
                  alt={titleOf(quick)}
                  width={420}
                  height={280}
                />
              )}
              {resource === "contacts" && (
                <>
                  <dl>
                    <dt>{t("Người gửi", "Sender")}</dt>
                    <dd>{quick.full_name}</dd>
                    <dt>Email</dt>
                    <dd>{quick.email}</dd>
                    <dt>{t("Chủ đề", "Topic")}</dt>
                    <dd>{quick.topic || "—"}</dd>
                  </dl>
                  <div className="admin-contact-message">{quick.message}</div>
                  <Button asChild>
                    <a
                      href={`mailto:${quick.email}?subject=${encodeURIComponent(t("Phản hồi: ", "Reply: ") + (quick.topic || ""))}`}
                    >
                      {t("Soạn email phản hồi", "Compose reply")}
                      <ArrowUpRight size={15} />
                    </a>
                  </Button>
                  <div className="admin-detail-actions">
                    {["read", "replied"]
                      .filter((value) => value !== quick.status)
                      .map((value) => (
                        <Button
                          key={value}
                          variant="outline"
                          onClick={() =>
                            request(
                              text(ORDER_STATUS[value]),
                              t(
                                "Xác nhận cập nhật trạng thái liên hệ.",
                                "Confirm message status change.",
                              ),
                              `/contacts/${quick.id}`,
                              "PATCH",
                              { status: value },
                            )
                          }
                        >
                          {text(ORDER_STATUS[value])}
                        </Button>
                      ))}
                  </div>
                </>
              )}
              {resource === "orders" && (
                <>
                  <dl>
                    <dt>{t("Khách hàng", "Customer")}</dt>
                    <dd>
                      {quick.shipping_info?.full_name ||
                        quick.shipping_info?.name ||
                        "—"}
                    </dd>
                    <dt>{t("Liên hệ", "Contact")}</dt>
                    <dd>
                      {quick.shipping_info?.phone ||
                        quick.shipping_info?.email ||
                        "—"}
                    </dd>
                    <dt>{t("Địa chỉ", "Address")}</dt>
                    <dd>{quick.shipping_info?.address || "—"}</dd>
                    <dt>{t("Tổng tiền", "Total")}</dt>
                    <dd>{formatPrice(Number(quick.total || 0))}</dd>
                  </dl>
                  {quick.items?.length ? (
                    <div className="admin-order-items">
                      <h3>{t("Sản phẩm trong đơn", "Order items")}</h3>
                      {quick.items.map((item, index) => (
                        <div key={index}>
                          <span>
                            {item.title ||
                              item.name ||
                              t("Sản phẩm", "Product")}
                          </span>
                          <strong>× {item.quantity || 0}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <h3>{t("Chuyển trạng thái", "Next step")}</h3>
                  <div className="admin-detail-actions">
                    {(NEXT_STATUS[quick.status || ""] || []).map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        onClick={() =>
                          request(
                            text(ORDER_STATUS[status]),
                            t(
                              "Trạng thái và tồn kho liên quan sẽ được cập nhật trong một giao dịch.",
                              "The order and related inventory will update in one transaction.",
                            ),
                            `/orders/${quick.id}/status`,
                            "PATCH",
                            { status },
                            status === "CANCELED",
                          )
                        }
                      >
                        {text(ORDER_STATUS[status])}
                        <ChevronRight size={14} />
                      </Button>
                    ))}
                    {!(NEXT_STATUS[quick.status || ""] || []).length && (
                      <p className="admin-subtext">
                        {t(
                          "Đơn đã ở trạng thái kết thúc.",
                          "This order is in a final state.",
                        )}
                      </p>
                    )}
                  </div>
                </>
              )}
              {resource === "users" && (
                <>
                  <dl>
                    <dt>Email</dt>
                    <dd>{quick.email}</dd>
                    <dt>{t("Vai trò", "Role")}</dt>
                    <dd>{roleLabel(quick.role)}</dd>
                  </dl>
                  {role === "ADMIN" &&
                    quick.id !== user?.id &&
                    selectControl(
                      "change-role",
                      t("Thay đổi vai trò", "Change role"),
                      ["CUSTOMER", "STAFF", "ADMIN"].map((value) => ({
                        value,
                        label: [roleLabel(value), roleLabel(value)],
                      })),
                      quick.role || "CUSTOMER",
                      (value) =>
                        request(
                          t("Cập nhật vai trò", "Update role"),
                          `${titleOf(quick)} → ${roleLabel(value)}`,
                          `/users/${quick.id}/role`,
                          "PATCH",
                          { role: value },
                        ),
                      false,
                    )}
                </>
              )}
              {resource === "products" && (
                <dl>
                  <dt>{t("Giá bán", "Price")}</dt>
                  <dd>{formatPrice(Number(quick.price || 0))}</dd>
                  <dt>{t("Tồn kho", "Inventory")}</dt>
                  <dd>{quick.quantity || 0}</dd>
                  <dt>{t("Đường dẫn", "Slug")}</dt>
                  <dd>{quick.slug}</dd>
                </dl>
              )}
              {resource === "vouchers" && (
                <dl>
                  <dt>{t("Giá trị giảm", "Discount")}</dt>
                  <dd>
                    {quick.discount_type === "PERCENTAGE"
                      ? `${quick.discount_amount}%`
                      : formatPrice(Number(quick.discount_amount || 0))}
                  </dd>
                  <dt>{t("Lượt dùng", "Usage")}</dt>
                  <dd>
                    {quick.usage_count || 0} / {quick.usage_limit ?? "∞"}
                  </dd>
                  <dt>{t("Thời gian", "Validity")}</dt>
                  <dd>
                    {date(quick.start_date)} – {date(quick.end_date)}
                  </dd>
                </dl>
              )}
              {resource === "posts" && (
                <p className="admin-contact-message">
                  {quick.excerpt || t("Chưa có mô tả ngắn.", "No excerpt yet.")}
                </p>
              )}
              {resource === "categories" && (
                <dl>
                  <dt>{t("Đường dẫn", "Slug")}</dt>
                  <dd>/{quick.slug}</dd>
                </dl>
              )}
              {resource !== "contacts" && (
                <Button asChild>
                  <Link href={detailsHref(quick)}>
                    {resource === "orders" || resource === "users"
                      ? t("Mở trang chi tiết", "Open details")
                      : t("Chỉnh sửa", "Edit")}
                    <ArrowUpRight size={15} />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={!!action}
        onOpenChange={(open) => !open && !busy && setAction(null)}
      >
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>{action?.label}</DialogTitle>
            <DialogDescription>{action?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAction(null)}
              disabled={busy}
            >
              {t("Hủy", "Cancel")}
            </Button>
            <Button
              variant={action?.destructive ? "destructive" : "default"}
              onClick={confirm}
              disabled={busy}
            >
              {busy ? t("Đang xử lý…", "Working…") : t("Xác nhận", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>
              {t("Lưu bộ lọc thường dùng", "Save a view")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Lưu tối đa 8 bộ lọc cho tài khoản trên trình duyệt này.",
                "Save up to 8 views for your account in this browser.",
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveView();
            }}
          >
            <label htmlFor="view-name">{t("Tên bộ lọc", "View name")}</label>
            <Input
              id="view-name"
              value={viewName}
              maxLength={40}
              onChange={(e) => setViewName(e.target.value)}
              placeholder={t(
                "Ví dụ: Đơn cần giao hôm nay",
                "Example: Ready to ship",
              )}
            />
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveOpen(false)}
              >
                {t("Hủy", "Cancel")}
              </Button>
              <Button type="submit" disabled={!viewName.trim()}>
                {t("Lưu bộ lọc", "Save view")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
