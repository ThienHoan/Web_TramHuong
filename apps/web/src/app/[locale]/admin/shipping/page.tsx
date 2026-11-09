"use client";
import { Notice } from '@/components/ui/notice';
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Truck, RefreshCw, Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { buildUrl, fetchWithAuth } from "@/services/base-http";
import { useAuth } from "@/components/providers/AuthProvider";
import ShipmentPreparationDialog from "@/components/admin/ShipmentPreparationDialog";
import LogisticsReport from "@/components/admin/LogisticsReport";
type Row = {
  id: string;
  key: string;
  kind: string;
  state: string;
  order_id: string | null;
  version: number;
  created_at: string;
  data: Record<string, unknown>;
};
const sections = [
  ["shipment", "Vận đơn", "Shipments"],
  ["exception", "Cần xử lý", "Exceptions"],
  ["return", "Hoàn hàng", "Returns"],
  ["cod", "Sổ COD", "COD ledger"],
  ["ticket", "Hỗ trợ", "Support"],
  ["warehouse", "Kho", "Warehouses"],
  ["profile", "Đóng gói", "Packaging"],
  ["inventory", "Tồn kho", "Local stock"],
  ["promotion", "Ưu đãi giao hàng", "Shipping offers"],
  ["inbox", "Webhook", "Webhook"],
  ["action", "Lịch sử thao tác", "Audit"],
];
const fieldMap: Record<string, [string, string, string, boolean?][]> = {
  warehouse: [
    ["name", "Tên kho", "Warehouse name"],
    ["shopId", "GHN ShopId", "GHN ShopId", true],
    ["districtId", "Mã huyện GHN của kho", "Origin GHN district", true],
    ["tareGrams", "Khối lượng vỏ hộp (g)", "Box tare (g)", true],
    ["paddingCm", "Đệm mỗi bên (cm)", "Padding per side (cm)", true],
  ],
  profile: [
    ["productId", "Mã sản phẩm", "Product ID"],
    ["variantId", "Tên biến thể (nếu có)", "Variant name"],
    ["weightGrams", "Khối lượng (g)", "Weight (g)", true],
    ["lengthCm", "Dài (cm)", "Length (cm)", true],
    ["widthCm", "Rộng (cm)", "Width (cm)", true],
    ["heightCm", "Cao (cm)", "Height (cm)", true],
    ["unitCost", "Giá vốn (nếu có)", "Unit cost (optional)", true],
  ],
  inventory: [
    ["warehouseId", "Mã kho", "Warehouse ID"],
    ["productId", "Mã sản phẩm", "Product ID"],
    ["variantId", "Tên biến thể (nếu có)", "Variant name"],
    ["available", "Tồn khả dụng tại kho", "Available local stock", true],
  ],
  promotion: [
    ["name", "Tên ưu đãi", "Offer name"],
    ["minSubtotal", "Giá trị đơn tối thiểu", "Minimum subtotal", true],
    ["maxSubsidy", "Trợ phí tối đa", "Maximum subsidy", true],
    ["minMargin", "Lãi tối thiểu sau ưu đãi", "Minimum remaining margin", true],
  ],
};
const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
// Mirror ConfigureDto's existing bounds; do not silently clamp measured data.
const numericLimits: Record<string, { min: number; max?: number }> = {
  shopId: { min: 1 },
  districtId: { min: 1 },
  tareGrams: { min: 1, max: 50000 },
  paddingCm: { min: 1, max: 20 },
  weightGrams: { min: 1, max: 50000 },
  lengthCm: { min: 1, max: 200 },
  widthCm: { min: 1, max: 200 },
  heightCm: { min: 1, max: 200 },
  unitCost: { min: 0 },
  available: { min: 0 },
  minSubtotal: { min: 0 },
  maxSubsidy: { min: 0 },
  minMargin: { min: 0 },
};
export default function ShippingAdminPage() {
  const en = useLocale() === "en";
  const [preparationOpen, setPreparationOpen] = useState(false),
    [pickShift, setPickShift] = useState<number | undefined>();
  const { role, session } = useAuth();
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]),
    [assignee, setAssignee] = useState("");
  const [recipientName, setRecipientName] = useState(""),
    [recipientPhone, setRecipientPhone] = useState(""),
    [recipientAddress, setRecipientAddress] = useState("");

  const [kind, setKind] = useState("shipment"),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(20),
    [state, setState] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [orderFilter, setOrderFilter] = useState("");
  const [rows, setRows] = useState<Row[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Row | null>(null),
    [checked, setChecked] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [amount, setAmount] = useState(""),
    [proof, setProof] = useState(""),
    [createOrder, setCreateOrder] = useState(""),
    [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<Record<string, string> | null>(null),
    [configRow, setConfigRow] = useState<Row | null>(null);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({}),
    [configError, setConfigError] = useState("");
  const clearConfigErrors = () => {
    setConfigErrors({});
    setConfigError("");
  };
  useEffect(() => {
    setAssignee("");
    setRecipientName("");
    setRecipientPhone("");
    setRecipientAddress("");
    if (selected?.kind !== "exception" || role !== "ADMIN") return;
    let live = true;
    fetchWithAuth<{ id: string; name: string }[]>(
      buildUrl("/admin/shipping/staff"),
    )
      .then((rows) => {
        if (live) setStaff(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (live) setStaff([]);
      });
    return () => {
      live = false;
    };
  }, [selected?.id, selected?.kind, role]);
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetchWithAuth<{ data: Row[]; total: number }>(
        buildUrl("/admin/shipping", {
          kind,
          state: state || undefined,
          page,
          limit,
          orderId:
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              orderFilter,
            )
              ? orderFilter
              : undefined,
          from: from ? `${from}T00:00:00.000+07:00` : undefined,
          to: to ? `${to}T23:59:59.999+07:00` : undefined,
        }),
      );
      setRows(r.data);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load logistics");
    } finally {
      setLoading(false);
    }
  }, [session, kind, state, page, limit, from, to, orderFilter]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = async (path: string, body: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    try {
      const result = await fetchWithAuth<{
        url?: string;
        results?: { orderId: string; success: boolean }[];
      }>(buildUrl(path), {
        method: "POST",
        body: JSON.stringify({ requestId: crypto.randomUUID(), ...body }),
      });
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      setSelected(null);
      setChecked([]);
      await load();
      if (result.results?.some((r) => !r.success))
        setError(
          `${en ? "Handover not completed for" : "Chưa bàn giao được các đơn"}: ${result.results
            .filter((r) => !r.success)
            .map((r) => r.orderId)
            .join(", ")}`,
        );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const configure = async () => {
    if (!config) return;
    const invalid: Record<string, string> = {};
    for (const [key, vi, eng, numeric] of fieldMap[kind] || []) {
      const raw = config[key]?.trim() || "";
      if (!raw) {
        if (!["variantId", "unitCost"].includes(key))
          invalid[key] = en
            ? `Enter ${eng.toLowerCase()}.`
            : `Vui lòng nhập ${vi.toLowerCase()}.`;
        continue;
      }
      if (numeric) {
        const value = Number(raw),
          bounds = numericLimits[key];
        if (
          !Number.isSafeInteger(value) ||
          value < bounds.min ||
          (bounds.max !== undefined && value > bounds.max)
        )
          invalid[key] =
            bounds.max !== undefined
              ? en
                ? `Use a whole number from ${bounds.min} to ${bounds.max}.`
                : `Nhập số nguyên từ ${bounds.min} đến ${bounds.max}.`
              : en
                ? `Use a whole number of at least ${bounds.min}.`
                : `Nhập số nguyên từ ${bounds.min} trở lên.`;
      }
    }
    setConfigErrors(invalid);
    setConfigError("");
    const firstInvalid = Object.keys(invalid)[0];
    if (firstInvalid) {
      document.getElementById(`shipping-config-${firstInvalid}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        kind,
        version: configRow?.version || 0,
        active: config.active !== "false",
      };
      if (configRow?.kind === "warehouse" || configRow?.kind === "promotion")
        body.id = configRow.key.split(":")[1];
      for (const [key, , , numeric] of fieldMap[kind] || [])
        if (config[key]?.trim())
          body[key] = numeric ? Number(config[key]) : config[key].trim();
      await fetchWithAuth(buildUrl("/admin/shipping/configure"), {
        method: "POST",
        body: JSON.stringify(body),
      });
      setConfig(null);
      await load();
    } catch (e) {
      setConfigError(
        e instanceof Error
          ? e.message
          : en
            ? "Configuration failed"
            : "Chưa lưu được cấu hình. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  const metric = async () => {
    setError("");
    try {
      setMetrics(
        await fetchWithAuth<Record<string, unknown>>(
          buildUrl("/admin/shipping/analytics", {
            from: `${from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}T00:00:00+07:00`,
            to: `${to || new Date().toISOString().slice(0, 10)}T23:59:59.999+07:00`,
            state: kind === "shipment" ? state || undefined : undefined,
          }),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report unavailable");
    }
  };
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="flex items-center gap-2 text-sm">
            <Truck size={18} />
            {en ? "Store operations" : "Vận hành cửa hàng"}
          </span>
          <h1>{en ? "Smart Logistics" : "Quản lý giao hàng"}</h1>
          <p>
            {en
              ? "Shipments, exceptions and reconciliation in one workspace."
              : "Theo dõi vận đơn, xử lý ngoại lệ và đối soát tại một nơi."}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          {en ? "Refresh" : "Làm mới"}
        </Button>
      </div>
      <div className="my-5 flex flex-wrap gap-2">
        {sections
          .filter(
            (s) => role === "ADMIN" || !["cod", "promotion"].includes(s[0]),
          )
          .map((s) => (
            <Button
              key={s[0]}
              size="sm"
              variant={kind === s[0] ? "default" : "outline"}
              onClick={() => {
                setKind(s[0]);
                setPage(1);
                setState("");
                setChecked([]);
                setMetrics(null);
              }}
            >
              {s[en ? 2 : 1]}
            </Button>
          ))}
      </div>
      <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          {en ? "Status" : "Trạng thái"}
          <Input
            value={state}
            placeholder="DELIVERY_FAILED"
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-sm">
          {en ? "Order ID" : "Mã đơn hàng"}
          <Input
            value={orderFilter}
            onChange={(e) => {
              setOrderFilter(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-sm">
          {en ? "From" : "Từ ngày"}
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-sm">
          {en ? "To" : "Đến ngày"}
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="flex items-end">
          <Button variant="outline" onClick={metric}>
            {en ? "View report" : "Xem báo cáo"}
          </Button>
        </div>
      </div>
      {metrics && (
        <div className="my-4 grid gap-3 sm:grid-cols-4">
          {[
            ["totalShipments", "Vận đơn", "Shipments"],
            ["delivered", "Đã giao", "Delivered"],
            ["failed", "Giao thất bại", "Failed"],
            ["shippingSubsidy", "Tổng trợ phí", "Subsidy"],
          ].map(([k, vi, eng]) => (
            <div key={k} className="rounded-xl border bg-white p-4">
              <p className="text-sm text-muted-foreground">{en ? eng : vi}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {text(metrics[k]) || "—"}
              </p>
            </div>
          ))}
        </div>
      )}
      {metrics && <LogisticsReport metrics={metrics} en={en} />}
      {error && (
        <Notice tone="error" className="my-4">{error}</Notice>
      )}
      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total} {en ? "records" : "bản ghi"}
        </p>
        <div className="flex w-full min-w-0 flex-wrap gap-2 lg:w-auto">
          {kind === "shipment" && (
            <>
              <Input
                className="w-full min-w-0 sm:w-72"
                aria-label={en ? "Order to fulfill" : "Đơn cần giao"}
                value={createOrder}
                placeholder={en ? "Order UUID" : "Mã đơn UUID"}
                onChange={(e) => setCreateOrder(e.target.value)}
              />
              <Button
                disabled={busy || !createOrder}
                onClick={() =>
                  run(`/admin/shipping/shipments/${createOrder}`, { pickShift })
                }
              >
                <Plus size={16} />
                {en ? "Create shipment" : "Tạo vận đơn"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !createOrder}
                onClick={() => setPreparationOpen(true)}
              >
                {en ? "Prepare existing order" : "Chuẩn bị đơn đã có"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !checked.length}
                onClick={() =>
                  run("/admin/shipping/labels", { orderIds: checked })
                }
              >
                {en ? "Print selected" : "In đã chọn"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !checked.length}
                onClick={() =>
                  run("/admin/shipping/pickup/batch-handover", {
                    orderIds: checked,
                  })
                }
              >
                {en ? "Hand over selected" : "Bàn giao đã chọn"}
              </Button>
            </>
          )}
          {fieldMap[kind] && role === "ADMIN" && (
            <Button
              onClick={() => {
                clearConfigErrors();
                setConfigRow(null);
                setConfig({ active: "true" });
              }}
            >
              <Plus size={16} />
              {en ? "Add configuration" : "Thêm cấu hình"}
            </Button>
          )}
        </div>
      </div>
      <div className="relative max-w-full overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {kind === "shipment" && (
                <th className="p-4">
                  <span className="sr-only">{en ? "Select" : "Chọn"}</span>
                </th>
              )}
              <th className="p-4">{en ? "Record" : "Bản ghi"}</th>
              <th className="p-4">{en ? "Order / origin" : "Đơn / nguồn"}</th>
              <th className="p-4">{en ? "Status" : "Trạng thái"}</th>
              <th className="p-4">{en ? "Created" : "Tạo lúc"}</th>
              <th className="p-4">
                <span className="sr-only">{en ? "Details" : "Chi tiết"}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-8 text-center" colSpan={6}>
                  {en ? "Loading…" : "Đang tải…"}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="p-12 text-center text-muted-foreground"
                  colSpan={6}
                >
                  {en
                    ? "No matching records."
                    : "Chưa có dữ liệu phù hợp với bộ lọc."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-muted/20"
                >
                  {kind === "shipment" && (
                    <td className="p-4">
                      <input
                        type="checkbox"
                        aria-label={`${en ? "Select" : "Chọn"} ${r.order_id}`}
                        checked={checked.includes(r.order_id || "")}
                        onChange={(e) =>
                          setChecked((prev) =>
                            e.target.checked
                              ? [...prev, r.order_id!]
                              : prev.filter((id) => id !== r.order_id),
                          )
                        }
                      />
                    </td>
                  )}
                  <td className="p-4 font-medium">
                    {text(r.data.name) ||
                      text(r.data.trackingCode) ||
                      text(r.data.type) ||
                      text(r.data.category) ||
                      r.id.slice(0, 8)}
                  </td>
                  <td
                    className="max-w-64 truncate p-4 font-mono text-xs"
                    title={r.order_id || r.key}
                  >
                    {r.order_id || r.key}
                  </td>
                  <td className="p-4">
                    <span className="rounded-md border px-2 py-1 text-xs">
                      {r.state}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-4 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(
                      en ? "en-GB" : "vi-VN",
                    )}
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (fieldMap[kind]) {
                          clearConfigErrors();
                          setConfigRow(r);
                          setConfig(
                            Object.fromEntries(
                              Object.entries(r.data).map(([k, v]) => [
                                k,
                                text(v) || String(v),
                              ]),
                            ),
                          );
                        } else {
                          setSelected(r);
                          setNote("");
                          setAmount("");
                          setProof("");
                        }
                      }}
                    >
                      {en ? "Open" : "Mở"}
                      <ArrowUpRight size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <label>
          {en ? "Rows" : "Số dòng"}{" "}
          <select
            className="rounded-md border p-2"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            {en ? "Previous" : "Trước"}
          </Button>
          <span>
            {page} / {Math.max(1, Math.ceil(total / limit))}
          </span>
          <Button
            variant="outline"
            disabled={page * limit >= total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {en ? "Next" : "Tiếp"}
          </Button>
        </div>
      </div>
      <ShipmentPreparationDialog
        open={preparationOpen}
        orderId={createOrder}
        onClose={() => setPreparationOpen(false)}
        onPrepared={setPickShift}
      />
      <Dialog
        open={!!config}
        onOpenChange={(open) => {
          if (!open) {
            setConfig(null);
            clearConfigErrors();
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {configRow
                ? en
                  ? "Edit configuration"
                  : "Sửa cấu hình"
                : en
                  ? "New configuration"
                  : "Cấu hình mới"}
            </DialogTitle>
            <DialogDescription>
              {en
                ? "Use measured values and verified GHN origin codes."
                : "Nhập thông số đo thực tế và mã GHN đã xác minh."}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void configure();
            }}
            className="grid max-h-[65vh] gap-3 overflow-y-auto sm:grid-cols-2"
          >
            {(fieldMap[kind] || []).map(([k, vi, eng, numeric]) => (
              <div key={k} className="grid content-start gap-2">
                <Label htmlFor={`shipping-config-${k}`}>{en ? eng : vi}</Label>
                <Input
                  id={`shipping-config-${k}`}
                  type={numeric ? "number" : "text"}
                  required={!["variantId", "unitCost"].includes(k)}
                  min={numeric ? numericLimits[k].min : undefined}
                  max={numeric ? numericLimits[k].max : undefined}
                  step={numeric ? 1 : undefined}
                  maxLength={numeric ? undefined : 150}
                  aria-invalid={!!configErrors[k]}
                  aria-describedby={
                    configErrors[k]
                      ? `shipping-config-${k}-error`
                      : k === "paddingCm"
                        ? "shipping-padding-help"
                        : undefined
                  }
                  value={config?.[k] || ""}
                  onChange={(e) => {
                    setConfig((prev) => ({ ...prev, [k]: e.target.value }));
                    setConfigErrors((prev) => ({ ...prev, [k]: "" }));
                    setConfigError("");
                  }}
                />
                {k === "paddingCm" && (
                  <p
                    id="shipping-padding-help"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {en
                      ? "Padding thickness on each side of the box: 1–20 cm, in whole centimetres."
                      : "Độ dày lớp đệm ở mỗi bên hộp: 1–20 cm, nhập số nguyên."}
                  </p>
                )}
                {configErrors[k] && (
                  <p
                    id={`shipping-config-${k}-error`}
                    role="alert"
                    className="text-sm font-normal text-destructive"
                  >
                    {configErrors[k]}
                  </p>
                )}
              </div>
            ))}
            <Label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={config?.active !== "false"}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    active: String(e.target.checked),
                  }))
                }
              />
              {en ? "Active" : "Đang hoạt động"}
            </Label>
            {configError && (
              <Notice tone="error" className="sm:col-span-2">{configError}</Notice>
            )}
            <Button type="submit" disabled={busy} className="sm:col-span-2">
              {en ? "Save" : "Lưu cấu hình"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {en ? "Operational details" : "Chi tiết xử lý"}
            </DialogTitle>
            <DialogDescription>
              {selected?.order_id || selected?.id}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-3">
              <p>{selected.state}</p>
              {text(selected.data.description) && (
                <p className="text-sm">{text(selected.data.description)}</p>
              )}
              <Label>
                {en
                  ? "Reason / inspection / reply"
                  : "Lý do / kiểm tra / phản hồi"}
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Label>
              {selected.kind === "exception" && role === "ADMIN" && (
                <div className="grid gap-2">
                  <Label className="grid gap-2">
                    {en ? "Assign to staff" : "Giao nhân viên xử lý"}
                    <select
                      className="rounded-md border p-2"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                    >
                      <option value="">—</option>
                      {staff.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Button
                    variant="outline"
                    disabled={busy || !assignee}
                    onClick={() =>
                      run(`/admin/shipping/exceptions/${selected.id}/assign`, {
                        assigneeId: assignee,
                      })
                    }
                  >
                    {en ? "Assign" : "Giao xử lý"}
                  </Button>
                </div>
              )}
              {selected.kind === "shipment" && (
                <div className="grid gap-3">
                  <Label className="grid gap-2">
                    {en
                      ? "Updated recipient name (optional)"
                      : "Tên người nhận mới (tuỳ chọn)"}
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </Label>
                  <Label className="grid gap-2">
                    {en
                      ? "Updated phone (optional)"
                      : "Số điện thoại mới (tuỳ chọn)"}
                    <Input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </Label>
                  <Label className="grid gap-2">
                    {en
                      ? "Updated street address (optional)"
                      : "Địa chỉ chi tiết mới (tuỳ chọn)"}
                    <Input
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                    />
                  </Label>
                  <Button
                    variant="outline"
                    disabled={
                      busy ||
                      (!recipientName && !recipientPhone && !recipientAddress)
                    }
                    onClick={() =>
                      run(
                        `/admin/shipping/shipments/${selected.order_id}/details`,
                        {
                          recipientName: recipientName || undefined,
                          recipientPhone: recipientPhone || undefined,
                          recipientAddress: recipientAddress || undefined,
                        },
                      )
                    }
                  >
                    {en ? "Update recipient" : "Cập nhật người nhận"}
                  </Button>
                  {role === "ADMIN" && (
                    <>
                      <Label className="grid gap-2">
                        {en ? "New COD amount" : "Số tiền thu hộ mới"}
                        <Input
                          type="number"
                          min={0}
                          max={5000000}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </Label>
                      <Button
                        variant="outline"
                        disabled={busy || amount === ""}
                        onClick={() =>
                          run(
                            `/admin/shipping/shipments/${selected.order_id}/action`,
                            { action: "updateCod", amount: Number(amount) },
                          )
                        }
                      >
                        {en ? "Approve COD change" : "Duyệt thay đổi thu hộ"}
                      </Button>
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {selected.kind === "shipment" && (
                  <>
                    {["refresh", "prepare", "handover"].map((a) => (
                      <Button
                        key={a}
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(
                            a === "refresh"
                              ? `/admin/shipping/shipments/${selected.order_id}/refresh`
                              : `/admin/shipping/pickup/${selected.order_id}/${a}`,
                          )
                        }
                      >
                        {a === "refresh"
                          ? en
                            ? "Sync"
                            : "Đồng bộ"
                          : a === "prepare"
                            ? en
                              ? "Prepared"
                              : "Đã soạn hàng"
                            : en
                              ? "Handed over"
                              : "Đã bàn giao"}
                      </Button>
                    ))}
                    {["cancel", "redeliver", "update"].map((a) => (
                      <Button
                        key={a}
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(
                            `/admin/shipping/shipments/${selected.order_id}/action`,
                            { action: a, note },
                          )
                        }
                      >
                        {a === "cancel"
                          ? en
                            ? "Cancel shipment"
                            : "Hủy vận đơn"
                          : a === "redeliver"
                            ? en
                              ? "Redeliver"
                              : "Giao lại"
                            : en
                              ? "Update note"
                              : "Sửa ghi chú"}
                      </Button>
                    ))}
                  </>
                )}
                {selected.kind === "exception" && role === "ADMIN" && (
                  <Button
                    disabled={busy || !note}
                    onClick={() =>
                      run(`/admin/shipping/exceptions/${selected.id}/resolve`, {
                        note,
                      })
                    }
                  >
                    {en ? "Resolve with evidence" : "Đóng kèm ghi nhận"}
                  </Button>
                )}
                {selected.kind === "return" &&
                  role === "ADMIN" &&
                  ["approve", "reject", "receive"].map((d) => (
                    <Button
                      key={d}
                      variant="outline"
                      disabled={busy || !note}
                      onClick={() =>
                        run(`/admin/shipping/returns/${selected.id}/review`, {
                          decision: d,
                          note,
                        })
                      }
                    >
                      {d === "approve"
                        ? en
                          ? "Approve"
                          : "Duyệt"
                        : d === "reject"
                          ? en
                            ? "Reject"
                            : "Từ chối"
                          : en
                            ? "Receive & inspect"
                            : "Nhận và kiểm tra"}
                    </Button>
                  ))}
                {selected.kind === "ticket" &&
                  role === "ADMIN" &&
                  ["send", "reply", "refresh", "note"].map((operation) => (
                    <Button
                      key={operation}
                      disabled={busy}
                      variant="outline"
                      onClick={() =>
                        run(`/admin/shipping/tickets/${selected.id}/action`, {
                          operation,
                          note: note || undefined,
                        })
                      }
                    >
                      {operation === "send"
                        ? en
                          ? "Send to GHN"
                          : "Gửi GHN"
                        : operation === "reply"
                          ? en
                            ? "Reply"
                            : "Phản hồi"
                          : en
                            ? operation === "note"
                              ? "Internal note"
                              : "Refresh ticket"
                            : operation === "note"
                              ? "Ghi chú nội bộ"
                              : "Cập nhật ticket"}
                    </Button>
                  ))}
                {selected.kind === "inbox" &&
                  selected.state === "DEAD" &&
                  role === "ADMIN" && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        run(`/admin/shipping/inbox/${selected.id}/retry`)
                      }
                    >
                      {en ? "Retry event" : "Xử lý lại sự kiện"}
                    </Button>
                  )}
              </div>
              {selected.kind === "cod" && role === "ADMIN" && (
                <>
                  <Label>
                    {en ? "Amount (VND)" : "Số tiền (VND)"}
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Label>
                  <Label>
                    {en
                      ? "Bank transaction / evidence"
                      : "Mã giao dịch ngân hàng / chứng cứ"}
                    <Input
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                    />
                  </Label>
                  <Button
                    disabled={busy || !amount || !proof}
                    onClick={() =>
                      run(`/admin/shipping/cod/${selected.order_id}`, {
                        type: "bank_confirmed",
                        amount: Number(amount),
                        proof,
                      })
                    }
                  >
                    {en
                      ? "Confirm bank receipt"
                      : "Xác nhận đã nhận qua ngân hàng"}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
