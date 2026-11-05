"use client";

// Copied into the disposable Next app only. No route is added to the real site.
import { useLocale } from "next-intl";
import {
  useAnalyticsSnapshot,
  useAnalyticsTracker,
} from "@/components/analytics/AnalyticsProvider";
import { useCart } from "@/components/providers/CartProvider";
import { cartAnalyticsItems, type FunnelEvent } from "@/lib/ga4/contract";
import { Button } from "@/components/ui/button";
import TraditionalProductCard from "@/components/traditional/TraditionalProductCard";
import ZenProductCard from "@/components/zen/ZenProductCard";
import { Link } from "@/i18n/routing";
import type { Product } from "@/types/product";
import { useEffect, useState } from "react";
import { captureServerPurchase, type PurchaseResult } from "@/lib/ga4/purchase";
import { SearchConsolePanel } from "@/components/admin/SearchConsolePanel";
import { PagespeedPanel } from "@/components/admin/PagespeedPanel";
import { LocalGa4TestPanel } from "@/components/analytics/LocalGa4TestPanel";
import { IntegrationHealthPanel } from "@/components/admin/IntegrationHealthPanel";
import "@/app/[locale]/admin/admin.css";

interface PurchaseFixture {
  source: "fixture";
  orderId: string;
  status: string;
  payment_status: string;
  events: unknown[];
  used: number;
}
async function readPurchaseFixture(): Promise<PurchaseFixture> {
  const response = await fetch("/api/__qa/purchase", { cache: "no-store" });
  if (!response.ok) throw new Error();
  const value = (await response.json()) as PurchaseFixture;
  if (
    value.source !== "fixture" ||
    typeof value.orderId !== "string" ||
    !Array.isArray(value.events)
  )
    throw new Error();
  return value;
}

const product: Product = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "analytics-fixture",
  price: 100000,
  images: ["/brand/mark.svg"],
  stock: 100,
  quantity: 100,
  is_active: true,
  translation: { title: "Sản phẩm mẫu / Sample item" },
  created_at: "2026-11-01",
  updated_at: "2026-11-01",
};
export default function AnalyticsLab() {
  const vi = useLocale() === "vi";
  const snapshot = useAnalyticsSnapshot(),
    tracker = useAnalyticsTracker();
  const { items, addItem, removeItem, updateQuantity } = useCart();
  const [purchase, setPurchase] = useState<PurchaseFixture | null>(null);
  const [receipt, setReceipt] = useState<PurchaseResult | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState(false);
  const [performanceClockMessage, setPerformanceClockMessage] = useState("");
  const advancePerformanceDay = async () => {
    try {
      const response = await fetch("/api/__qa/pagespeed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fixture-control": "1",
        },
        body: JSON.stringify({ advanceDay: true }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { source: string; now: string };
      if (data.source !== "fixture") throw new Error();
      setPerformanceClockMessage(data.now);
    } catch {
      setPerformanceClockMessage(
        vi ? "Không đổi được đồng hồ mẫu." : "Cannot advance fixture clock.",
      );
    }
  };
  useEffect(() => {
    let active = true;
    void readPurchaseFixture()
      .then((value) => {
        if (active) setPurchase(value);
      })
      .catch(() => {
        if (active) setPurchaseError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const changeSource = async (state: "paid" | "pending" | "refunded") => {
    setPurchaseBusy(true);
    setPurchaseError(false);
    setReceipt(null);
    try {
      const response = await fetch("/api/__qa/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fixture-control": "1",
        },
        body: JSON.stringify({ state, fresh: state === "pending" }),
      });
      if (!response.ok) throw new Error();
      setPurchase(await readPurchaseFixture());
    } catch {
      setPurchaseError(true);
    } finally {
      setPurchaseBusy(false);
    }
  };
  const capture = async () => {
    if (!tracker || !purchase) return;
    setPurchaseBusy(true);
    setPurchaseError(false);
    try {
      setReceipt(
        await captureServerPurchase(
          tracker,
          purchase.orderId,
          "purchase-owner-fixture",
        ),
      );
      setPurchase(await readPurchaseFixture());
    } catch {
      setPurchaseError(true);
    } finally {
      setPurchaseBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <div
        className="admin-workspace"
        style={{ display: "block", minHeight: 0 }}
      >
        <IntegrationHealthPanel token="seo-admin-fixture" isAdmin />
      </div>
      <LocalGa4TestPanel token="seo-admin-fixture" />
      <SearchConsolePanel token="seo-admin-fixture" />
      <PagespeedPanel token="seo-admin-fixture" />
      <div className="space-y-2 rounded-md border p-4">
        <p>
          {vi
            ? "Chỉ trong lab: chuyển đồng hồ PageSpeed mẫu sang ngày tiếp theo để thử cache/lịch sử/cảnh báo. Không đổi giờ máy tính."
            : "Lab only: advance the PageSpeed fixture clock by one day to test cache/history/regression. OS time is unchanged."}
        </p>
        <Button variant="outline" onClick={() => void advancePerformanceDay()}>
          {vi ? "PageSpeed mẫu: sang ngày mới" : "PageSpeed fixture: next day"}
        </Button>
        <p role="status">{performanceClockMessage}</p>
      </div>
      <header className="space-y-2">
        <h1 className="text-2xl font-medium">
          {vi ? "Kiểm thử phân tích mua sắm" : "Shopping analytics test"}
        </h1>
        <p>
          {vi
            ? "Phần mua sắm dưới đây dùng database giả, không ghi Supabase hoặc tạo giao dịch thật. Phiên GA4 ở trên có thể chuyển tiếp các thao tác mới nếu bạn chủ động bật; transport giả được ghi rõ khi dùng."
            : "Shopping below uses a fixture database, no Supabase writes or real transactions. The GA4 session above can forward new actions if explicitly started; fake transport is labelled when used."}
        </p>
        <p>
          {vi
            ? "Hãy chọn Đồng ý hoặc Từ chối ở cuối trang rồi thử giỏ hàng."
            : "Choose Accept or Decline below, then try the cart."}
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link
            href="/integration-lab/analytics"
            locale={vi ? "en" : "vi"}
            className="underline"
          >
            {vi ? "Bản Zen / English" : "Traditional / Tiếng Việt"}
          </Link>
          <Link href="/checkout" className="underline">
            {vi ? "Mở checkout mẫu" : "Open sample checkout"}
          </Link>
        </nav>
      </header>
      <p role="status">
        {"Mode: " +
          snapshot.mode +
          " · Consent: " +
          snapshot.consent +
          " · Events: " +
          snapshot.events.length}
      </p>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div>
          {vi ? (
            <TraditionalProductCard product={product} />
          ) : (
            <ZenProductCard product={product} />
          )}
        </div>
        <section className="space-y-4 rounded-xl border border-stone-200 p-4">
          <h2 className="text-lg font-medium">
            {vi ? "Giỏ hàng dùng chung" : "Shared cart"}
          </h2>
          <Button
            variant="outline"
            onClick={() =>
              void addItem({
                id: product.id,
                slug: product.slug,
                title: "Sample",
                price: product.price,
                image: product.images[0],
                quantity: 1,
              })
            }
          >
            {vi ? "Thêm mẫu vào giỏ" : "Add sample to cart"}
          </Button>
          {items.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center gap-3">
              <span>
                {vi ? "Số lượng: " : "Quantity: "}
                {item.quantity}
              </span>
              <Button
                variant="outline"
                onClick={() => updateQuantity(item.key, item.quantity + 1)}
              >
                {vi ? "Tăng một" : "Increase by one"}
              </Button>
              <Button variant="outline" onClick={() => removeItem(item.key)}>
                {vi ? "Xóa khỏi giỏ" : "Remove from cart"}
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                tracker?.track("add_shipping_info", {
                  items: cartAnalyticsItems(items),
                  shipping_tier: "delivery",
                })
              }
            >
              {vi ? "Thử bước giao hàng" : "Test shipping step"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                tracker?.track("add_payment_info", {
                  items: cartAnalyticsItems(items),
                  payment_type: "sepay",
                })
              }
            >
              {vi ? "Thử chọn SePay" : "Test SePay selection"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                tracker?.track("purchase" as FunnelEvent, {
                  items: cartAnalyticsItems(items),
                  payment_status: "paid",
                })
              }
            >
              {vi
                ? "Thử purchase giả — phải bị chặn"
                : "Try fake purchase — must be blocked"}
            </Button>
          </div>
        </section>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {vi ? "Sự kiện mock trong bộ nhớ" : "Mock events in memory"}
        </h2>
        <p className="text-sm">
          {vi
            ? "Đây là sự kiện trước purchase trong bộ nhớ. Receipt purchase server ở phần dưới."
            : "These are in-memory events before purchase. Server purchase receipts are shown below."}
        </p>
        <div className="max-h-72 overflow-auto rounded-xl border border-stone-200 p-4">
          <pre className="whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(snapshot.events, null, 2)}
          </pre>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-stone-200 p-4">
        <h2 className="text-lg font-medium">
          {vi ? "Purchase từ server giả lập" : "Purchase from fixture server"}
        </h2>
        <p className="text-sm">
          {vi
            ? "Nguồn thanh toán và outbox dùng PostgreSQL tại máy. Nút xác nhận dưới đây chỉ sửa dữ liệu giả; không gọi SePay."
            : "Payment source and outbox use local PostgreSQL. The controls below only change fixture data; SePay is never called."}
        </p>
        <p role="status">
          {vi ? "Trạng thái nguồn: " : "Source status: "}
          {purchase?.payment_status ?? "loading"}
          {" · "}
          {vi ? "Số purchase: " : "Purchase count: "}
          {purchase?.events.length ?? 0}
        </p>
        {receipt && (
          <p role="status">
            {vi ? "Kết quả capture: " : "Capture outcome: "}
            {receipt.status}
          </p>
        )}
        {purchaseError && (
          <p role="alert">
            {vi
              ? "Chưa tải được fixture purchase."
              : "Purchase fixture is unavailable."}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={purchaseBusy}
            onClick={() => void changeSource("pending")}
          >
            {vi ? "Tạo đơn mẫu chưa trả tiền" : "New unpaid sample order"}
          </Button>
          <Button
            variant="outline"
            disabled={purchaseBusy}
            onClick={() => void changeSource("paid")}
          >
            {vi
              ? "Giả lập SePay đã xác nhận"
              : "Simulate verified SePay payment"}
          </Button>
          <Button
            variant="outline"
            disabled={purchaseBusy}
            onClick={() => void changeSource("refunded")}
          >
            {vi ? "Giả lập đã hoàn tiền" : "Simulate refunded payment"}
          </Button>
          <Button
            variant="outline"
            disabled={
              purchaseBusy ||
              snapshot.mode !== "mock" ||
              !snapshot.purchaseEnabled ||
              snapshot.consent !== "granted"
            }
            onClick={() => void capture()}
          >
            {vi ? "Ghi purchase từ server" : "Capture server purchase"}
          </Button>
        </div>
        <div className="max-h-72 overflow-auto rounded-xl border border-stone-200 p-4">
          <pre className="whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(purchase?.events ?? [], null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
