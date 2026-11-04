"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Clock3,
  CircleDollarSign,
  Package,
  ShoppingBag,
  MessageSquare,
  Truck,
  RefreshCw,
} from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { adminMoney } from "@/components/admin/admin-format";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { adminFetch, ListResult } from "@/components/admin/use-admin-list";
import { StatusBadge } from "@/components/admin/AdminStatusBadge";
import { SearchConsolePanel } from "@/components/admin/SearchConsolePanel";
import { PagespeedPanel } from "@/components/admin/PagespeedPanel";
import { LocalGa4TestPanel } from "@/components/analytics/LocalGa4TestPanel";

const DashboardCharts = dynamic(
  () => import("@/components/admin/DashboardCharts"),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> },
);
export interface Operations {
  awaitingPayment: number;
  paidOrders: number;
  newContacts: number;
  outOfStock: number;
  lowStock: number;
}

export default function AdminDashboard() {
  const [range, setRange] = useState("7d");
  const locale = useLocale();
  const en = locale === "en";
  const t = (vi: string, english: string) => (en ? english : vi);
  const { session } = useAuth();
  const token = session?.access_token || "";
  const { data, isLoading, error, retry } = useAnalytics(range);
  const formatPrice = (value: number) => adminMoney(value, locale);
  const operations = useSWR<Operations>(
    token ? ["/admin/operations", token] : null,
    ([path, accessToken]: [string, string]) =>
      adminFetch<Operations>(path, accessToken),
  );
  const recent = useSWR<ListResult>(
    token ? ["/admin/resources/orders?limit=5&page=1", token] : null,
    ([path, accessToken]: [string, string]) =>
      adminFetch<ListResult>(path, accessToken),
  );
  const tasks = [
    {
      label: t("Đơn cần giao", "Ready to ship"),
      value: operations.data?.paidOrders,
      icon: Truck,
      href: "/admin/orders?status=PAID",
    },
    {
      label: t("Chờ thanh toán", "Awaiting payment"),
      value: operations.data?.awaitingPayment,
      icon: Clock3,
      href: "/admin/orders?status=AWAITING_PAYMENT",
    },
    {
      label: t("Sắp hết hàng", "Low inventory"),
      value: operations.data?.lowStock,
      icon: Package,
      href: "/admin/products?stock=low&status=active",
    },
    {
      label: t("Liên hệ chưa đọc", "Unread messages"),
      value: operations.data?.newContacts,
      icon: MessageSquare,
      href: "/admin/contacts?status=new",
    },
  ];
  return (
    <section className="admin-page admin-dashboard">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            THIÊN PHÚC / {t("TỔNG QUAN", "OVERVIEW")}
          </span>
          <h1>{t("Nhịp kinh doanh", "Business overview")}</h1>
          <p>
            {t(
              "Theo dõi kết quả và những việc cần xử lý trong cửa hàng.",
              "Monitor performance and keep store operations on track.",
            )}
          </p>
        </div>
        <div className="admin-heading-actions">
          <Button
            variant="outline"
            onClick={() => {
              void retry();
              void operations.mutate();
              void recent.mutate();
            }}
            disabled={isLoading}
          >
            <RefreshCw size={15} />
            {t("Làm mới", "Refresh")}
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              {t("Thêm sản phẩm", "Add product")}
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
      </header>
      <div className="admin-section-title">
        <h2>{t("Cần xử lý", "Your work queue")}</h2>
        <span>{t("Toàn cửa hàng · hiện tại", "Storewide · current")}</span>
      </div>
      {operations.error ? (
        <div role="alert" className="admin-inline-error">
          {t(
            "Chưa tải được số liệu vận hành.",
            "Unable to load the work queue.",
          )}{" "}
          <button
            className="underline"
            onClick={() => void operations.mutate()}
          >
            {t("Thử lại", "Retry")}
          </button>
        </div>
      ) : (
        <div className="admin-task-grid">
          {tasks.map(({ label, value, icon: Icon, href }) => (
            <Link href={href} key={href}>
              <span className="admin-task-icon">
                <Icon size={18} />
              </span>
              <div>
                <span>{label}</span>
                <strong>
                  {value === undefined ? "—" : value.toLocaleString(locale)}
                </strong>
              </div>
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </div>
      )}
      <div className="admin-section-title admin-period-heading">
        <h2>{t("Hiệu quả bán hàng", "Sales performance")}</h2>
        <div
          className="admin-range-selector"
          role="group"
          aria-label={t("Khoảng thống kê", "Report period")}
        >
          {["7d", "30d", "all"].map((value) => (
            <button
              key={value}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {value === "7d"
                ? t("7 ngày", "7 days")
                : value === "30d"
                  ? t("30 ngày", "30 days")
                  : t("Tất cả", "All time")}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="admin-state admin-list-card" role="alert">
          <h2>{t("Không thể tải báo cáo", "Unable to load report")}</h2>
          <p>{error.message}</p>
          <Button variant="outline" onClick={() => void retry()}>
            {t("Thử lại", "Retry")}
          </Button>
        </div>
      ) : (
        <>
          <div className="admin-metric-strip">
            {[
              {
                label: t("Doanh thu ghi nhận", "Recorded revenue"),
                value: data ? formatPrice(data.summary.totalRevenue) : "—",
                icon: CircleDollarSign,
              },
              {
                label: t("Đơn hàng trong kỳ", "Orders in period"),
                value: data
                  ? data.summary.totalOrders.toLocaleString(locale)
                  : "—",
                icon: ShoppingBag,
              },
              {
                label: t(
                  "Đơn chờ xác nhận trong kỳ",
                  "Pending confirmation in period",
                ),
                value: data
                  ? data.summary.pendingOrders.toLocaleString(locale)
                  : "—",
                icon: Clock3,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <div>
                  <span>{label}</span>
                  <Icon size={17} />
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-36 mt-3" />
                ) : (
                  <strong>{value}</strong>
                )}
              </div>
            ))}
          </div>
          {data && !isLoading ? (
            <DashboardCharts data={data} />
          ) : (
            <Skeleton className="h-80 w-full mt-5" />
          )}
        </>
      )}
      <div className="admin-bottom-grid">
        <div className="admin-list-card">
          <div className="admin-widget-heading">
            <h2>{t("Đơn hàng mới nhất", "Latest orders")}</h2>
            <Link href="/admin/orders">
              {t("Tất cả đơn", "All orders")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {recent.error ? (
            <div className="admin-state" role="alert">
              <p>
                {t(
                  "Không thể tải đơn hàng mới.",
                  "Unable to load recent orders.",
                )}
              </p>
              <Button variant="outline" onClick={() => void recent.mutate()}>
                {t("Thử lại", "Retry")}
              </Button>
            </div>
          ) : recent.isLoading ? (
            <Skeleton className="h-60 m-5" />
          ) : recent.data?.data.length ? (
            <div className="admin-recent-orders">
              {recent.data.data.map((order) => (
                <Link key={order.id} href={"/admin/orders/" + order.id}>
                  <span className="admin-order-avatar">
                    <ShoppingBag size={17} />
                  </span>
                  <div>
                    <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                    <span>
                      {order.shipping_info?.full_name ||
                        order.shipping_info?.name ||
                        t("Khách vãng lai", "Guest")}
                    </span>
                  </div>
                  <StatusBadge value={order.status || "PENDING"} en={en} />
                  <strong className="admin-numeric">
                    {formatPrice(Number(order.total || 0))}
                  </strong>
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-state">
              <p>{t("Chưa có đơn hàng.", "No orders yet.")}</p>
            </div>
          )}
        </div>
        <div className="admin-list-card">
          <div className="admin-widget-heading">
            <h2>{t("Sản phẩm bán tốt", "Best sellers")}</h2>
            <span>{t("Theo kỳ đã chọn", "Selected period")}</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-60 m-5" />
          ) : data?.topProducts.length ? (
            <div className="admin-best-sellers">
              {data.topProducts.map((product, index) => (
                <div key={product.name + index}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {product.quantity} {t("sản phẩm đã bán", "units sold")}
                    </span>
                  </div>
                  <strong className="admin-numeric">
                    {formatPrice(product.revenue)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-state">
              <p>
                {t("Chưa có doanh số trong kỳ.", "No sales in this period.")}
              </p>
            </div>
          )}
        </div>
      </div>
      <SearchConsolePanel token={token} />
      <PagespeedPanel token={token} />
      <LocalGa4TestPanel token={token} />
      <p className="admin-list-footnote">
        {t(
          "Số liệu bán hàng theo kỳ được chọn. Hàng chờ xử lý phản ánh toàn bộ cửa hàng.",
          "Sales reflect the selected period. Work queues cover the entire store.",
        )}
      </p>
    </section>
  );
}
