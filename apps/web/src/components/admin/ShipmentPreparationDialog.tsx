"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { buildUrl, fetchWithAuth } from "@/services/base-http";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Option = { id: string; name: string };
export default function ShipmentPreparationDialog({
  open,
  orderId,
  onClose,
  onPrepared,
}: {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onPrepared: (shift: number | undefined) => void;
}) {
  const en = useLocale() === "en";
  const [warehouses, setWarehouses] = useState<Option[]>([]),
    [provinces, setProvinces] = useState<Option[]>([]),
    [wards, setWards] = useState<Option[]>([]),
    [shifts, setShifts] = useState<{ id: number; title: string }[]>([]);
  const [warehouse, setWarehouse] = useState(""),
    [province, setProvince] = useState(""),
    [ward, setWard] = useState(""),
    [shift, setShift] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setError("");
    Promise.all([
      fetchWithAuth<{
        data: { key: string; data: { name: string; active: boolean } }[];
      }>(
        buildUrl("/admin/shipping", {
          kind: "warehouse",
          state: "ACTIVE",
          limit: 100,
        }),
      ),
      fetchWithAuth<Option[]>(buildUrl("/shipping/addresses/provinces")),
    ])
      .then(([w, p]) => {
        if (live) {
          setWarehouses(
            w.data
              .filter((r) => r.data.active)
              .map((r) => ({ id: r.key.slice(10), name: r.data.name })),
          );
          setProvinces(p);
          setWarehouse(w.data[0]?.key.slice(10) || "");
        }
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Unavailable");
      });
    return () => {
      live = false;
    };
  }, [open]);
  useEffect(() => {
    setWard("");
    setWards([]);
    if (!province || !open) return;
    let live = true;
    fetchWithAuth<Option[]>(
      buildUrl("/shipping/addresses/wards", { provinceId: province }),
    )
      .then((r) => {
        if (live) setWards(r);
      })
      .catch(() => {
        if (live)
          setError(en ? "Cannot load wards." : "Không tải được phường/xã.");
      });
    return () => {
      live = false;
    };
  }, [province, open, en]);
  useEffect(() => {
    setShifts([]);
    setShift("");
    if (!warehouse || !open) return;
    let live = true;
    fetchWithAuth<{ id: number; title: string }[]>(
      buildUrl(`/admin/shipping/warehouses/${warehouse}/shifts`),
    )
      .then((r) => {
        if (live) setShifts(r);
      })
      .catch(() => {
        if (live)
          setError(
            en ? "Cannot load pickup shifts." : "Không tải được ca lấy hàng.",
          );
      });
    return () => {
      live = false;
    };
  }, [warehouse, open, en]);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await fetchWithAuth(
        buildUrl(`/admin/shipping/orders/${orderId}/prepare`),
        {
          method: "POST",
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            warehouseId: warehouse,
            destination: {
              scheme: "two_level",
              provinceId: Number(province),
              wardCode: ward,
            },
          }),
        },
      );
      onPrepared(shift ? Number(shift) : undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preparation failed");
    } finally {
      setBusy(false);
    }
  };
  const selectClass =
    "mt-2 w-full rounded-md border bg-transparent px-3 py-2 text-sm font-normal";
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {en ? "Prepare an existing order" : "Chuẩn bị giao đơn đã có"}
          </DialogTitle>
          <DialogDescription>
            {en
              ? "Verify the destination and measured packaging. Existing prices and payment stay unchanged."
              : "Xác minh địa chỉ và thông số đóng gói. Giá trị đơn và thanh toán được giữ nguyên."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="font-mono text-xs">{orderId}</p>
          <Label className="grid items-start gap-2">
            {en ? "Origin warehouse" : "Kho lấy hàng"}
            <select
              required
              className={selectClass}
              aria-label={en ? "Origin warehouse" : "Kho lấy hàng"}
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <option value="">—</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Label>
          <Label className="grid items-start gap-2">
            {en ? "Province / city" : "Tỉnh / thành"}
            <select
              required
              className={selectClass}
              aria-label={en ? "Province / city" : "Tỉnh / thành"}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">—</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Label>
          <Label className="grid items-start gap-2">
            {en ? "Ward / commune" : "Phường / xã"}
            <select
              required
              disabled={!province}
              className={selectClass}
              aria-label={en ? "Ward / commune" : "Phường / xã"}
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            >
              <option value="">—</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Label>
          <Label className="grid items-start gap-2">
            {en ? "Pickup shift" : "Ca lấy hàng"}
            <select
              className={selectClass}
              aria-label={en ? "Pickup shift" : "Ca lấy hàng"}
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="">
                {en ? "Earliest available" : "Ca sớm nhất khả dụng"}
              </option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy
              ? en
                ? "Validating…"
                : "Đang kiểm tra…"
              : en
                ? "Validate and prepare"
                : "Kiểm tra và chuẩn bị"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
