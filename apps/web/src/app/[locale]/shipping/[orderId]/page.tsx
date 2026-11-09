"use client";
import { Notice } from '@/components/ui/notice';
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { buildUrl, fetchWithAuth, getHeaders } from "@/services/base-http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TraditionalHeader from "@/components/traditional/TraditionalHeader";
import TraditionalFooter from "@/components/traditional/TraditionalFooter";
import ZenFooter from "@/components/zen/ZenFooter";
import { PackageCheck, RefreshCw, Truck } from "lucide-react";
type Tracking = {
  state: string;
  trackingCode: string | null;
  eta: string | null;
  updatedAt: string;
  milestones: { state: string; at: string }[];
  notifications?: { id: string; state: string; at: string }[];
  supportRequests?: {
    id: string;
    state: string;
    category: string;
    createdAt: string;
  }[];
};
const stateNames: Record<string, [string, string]> = {
  SHIPMENT_PENDING: ["Đang chuẩn bị vận đơn", "Preparing shipment"],
  SHIPMENT_CREATED: ["Đã tạo vận đơn", "Shipment created"],
  PICKUP_PENDING: ["Chờ lấy hàng", "Awaiting pickup"],
  IN_TRANSIT: ["Đang vận chuyển", "In transit"],
  OUT_FOR_DELIVERY: ["Đang giao đến bạn", "Out for delivery"],
  DELIVERED: ["Đã giao hàng", "Delivered"],
  DELIVERY_FAILED: ["Giao hàng chưa thành công", "Delivery attempt failed"],
  RETURN_REQUESTED: ["Đang xử lý hoàn hàng", "Return requested"],
  RETURNING: ["Đang chuyển hoàn", "Returning"],
  RETURNED: ["Đã hoàn hàng", "Returned"],
  CANCELLED: ["Đã hủy vận đơn", "Cancelled"],
  MANUAL_REVIEW: ["Cửa hàng đang kiểm tra", "Store review in progress"],
};
export default function ShipmentTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const locale = useLocale(),
    en = locale === "en";
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<Tracking | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [sending, setSending] = useState(false),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState("Tư vấn"),
    [files, setFiles] = useState<File[]>([]),
    [notice, setNotice] = useState("");
  const label = (state: string) =>
    stateNames[state]?.[en ? 1 : 0] ||
    (en ? "Delivery update" : "Cập nhật giao hàng");
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setData(
        await fetchWithAuth<Tracking>(buildUrl(`/shipping/track/${orderId}`)),
      );
      setError("");
    } catch {
      setError(
        en
          ? "Tracking is not available for this order."
          : "Chưa có thông tin vận chuyển hoặc bạn không có quyền xem đơn này.",
      );
    } finally {
      setLoading(false);
    }
  }, [session, orderId, en]);
  useEffect(() => {
    void load();
    if (!session) return;
    const channel = supabase
      .channel(`tracking:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipping_tracking",
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const focus = () => {
      void load();
    };
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      void supabase.removeChannel(channel);
    };
  }, [load, orderId, session]);
  const support = async (isReturn: boolean) => {
    setSending(true);
    setNotice("");
    try {
      const ticket = await fetchWithAuth<{ id: string }>(
        buildUrl(isReturn ? "/shipping/returns" : "/shipping/support"),
        {
          method: "POST",
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            orderId,
            category,
            description,
          }),
        },
      );
      if (!isReturn && files.length) {
        const form = new FormData();
        for (const file of files) form.append("files", file);
        const headers = getHeaders() as Record<string, string>;
        delete headers["Content-Type"];
        const response = await fetch(
          buildUrl(`/shipping/support/${ticket.id}/evidence`),
          { method: "POST", headers, body: form },
        );
        if (!response.ok)
          throw new Error(
            en
              ? "Request saved, but photos could not be uploaded."
              : "Đã lưu yêu cầu, nhưng chưa tải được ảnh.",
          );
      }
      setNotice(
        en
          ? "Your request has been saved. The store will review it."
          : "Đã ghi nhận yêu cầu. Cửa hàng sẽ kiểm tra và phản hồi.",
      );
      setDescription("");
      setFiles([]);
      void load();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : en
            ? "Please try again."
            : "Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <div
      className={
        en
          ? "bg-zen-50 text-zen-900 min-h-screen"
          : "atelier-page bg-trad-bg-light text-trad-text-main min-h-screen"
      }
    >
      {!en && <TraditionalHeader />}
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-32">
        <Link
          href="/account/orders"
          className="text-sm underline underline-offset-4"
        >
          {en ? "Your orders" : "Đơn hàng của bạn"}
        </Link>
        <div className="my-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[.18em] opacity-60">
              Thiên Phúc · GHN
            </p>
            <h1 className="font-serif text-4xl md:text-5xl">
              {en ? "Your order’s journey" : "Hành trình đơn hàng"}
            </h1>
          </div>
          <Button variant="outline" disabled={loading} onClick={load}>
            <RefreshCw size={16} />
            {en ? "Refresh" : "Cập nhật"}
          </Button>
        </div>
        {authLoading ? (
          <p>{en ? "Loading…" : "Đang tải…"}</p>
        ) : !session ? (
          <div className="border p-6">
            <p>
              {en
                ? "Sign in to securely view your delivery."
                : "Đăng nhập để xem thông tin giao hàng của bạn."}
            </p>
            <Link href="/login" className="mt-3 inline-block underline">
              {en ? "Sign in" : "Đăng nhập"}
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <Notice tone="warning" className="my-4">{error}</Notice>
            )}
            {data && (
              <>
                <section className="grid gap-8 border-y border-current/20 py-8 md:grid-cols-[1.4fr_1fr]">
                  <div>
                    <Truck size={28} strokeWidth={1.25} />
                    <h2 className="my-3 font-serif text-3xl">
                      {label(data.state)}
                    </h2>
                    <p className="text-sm opacity-70">
                      {en ? "Tracking code" : "Mã vận đơn"}:{" "}
                      <span className="font-mono">
                        {data.trackingCode || "—"}
                      </span>
                    </p>
                    <p className="mt-2 text-sm opacity-70">
                      {en ? "Last updated" : "Cập nhật"}:{" "}
                      {new Date(data.updatedAt).toLocaleString(
                        en ? "en-GB" : "vi-VN",
                      )}
                    </p>
                  </div>
                  <div className="self-center">
                    <p className="text-sm opacity-70">
                      {en ? "Estimated arrival" : "Dự kiến nhận hàng"}
                    </p>
                    <p className="my-2 font-serif text-2xl">
                      {data.eta
                        ? new Date(data.eta).toLocaleDateString(
                            en ? "en-GB" : "vi-VN",
                            { day: "numeric", month: "long", year: "numeric" },
                          )
                        : en
                          ? "Awaiting carrier estimate"
                          : "Chờ nhà vận chuyển cập nhật"}
                    </p>
                    <p className="text-xs opacity-60">
                      {en
                        ? "Estimates may change with carrier updates."
                        : "Thời gian dự kiến có thể thay đổi theo cập nhật của nhà vận chuyển."}
                    </p>
                  </div>
                </section>
                <section className="my-10">
                  <h2 className="mb-6 font-serif text-2xl">
                    {en ? "Delivery milestones" : "Các mốc vận chuyển"}
                  </h2>
                  {data.milestones.length ? (
                    <ol className="ml-3 border-l border-current/20">
                      {data.milestones.map((m, i) => (
                        <li key={`${m.at}-${i}`} className="relative pb-7 pl-8">
                          <span className="absolute -left-2 flex size-4 items-center justify-center rounded-full bg-current">
                            <span className="size-1 rounded-full bg-white" />
                          </span>
                          <p className="font-medium">{label(m.state)}</p>
                          <p className="mt-1 text-sm opacity-60">
                            {new Date(m.at).toLocaleString(
                              en ? "en-GB" : "vi-VN",
                            )}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm opacity-70">
                      {en
                        ? "The carrier has not provided any milestones yet."
                        : "Nhà vận chuyển chưa cung cấp mốc hành trình."}
                    </p>
                  )}
                </section>
                <section className="border-t border-current/20 pt-8">
                  <div className="flex items-center gap-2">
                    <PackageCheck size={20} />
                    <h2 className="font-serif text-2xl">
                      {en
                        ? "Need help with delivery?"
                        : "Bạn cần hỗ trợ giao hàng?"}
                    </h2>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void support(false);
                    }}
                    className="mt-5 grid gap-4"
                  >
                    <Label className="grid items-start gap-2">
                      {en ? "Topic" : "Nội dung cần hỗ trợ"}
                      <select
                        className="mt-2 w-full border border-current/20 bg-transparent p-3 font-normal"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {[
                          ["Tư vấn", "General enquiry"],
                          ["Khiếu nại", "Damaged parcel or complaint"],
                          [
                            "Hối Giao/Lấy/Trả hàng",
                            "Delayed delivery / pickup / return",
                          ],
                          [
                            "Thay đổi thông tin",
                            "Address or contact correction",
                          ],
                        ].map(([c, eng]) => (
                          <option key={c} value={c}>
                            {en ? eng : c}
                          </option>
                        ))}
                      </select>
                    </Label>
                    <Label className="grid items-start gap-2">
                      {en ? "Describe the issue" : "Mô tả vấn đề"}
                      <textarea
                        required
                        maxLength={2000}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-2 min-h-28 w-full border border-current/20 bg-transparent p-3 font-normal"
                      />
                    </Label>
                    <Label className="grid items-start gap-2">
                      {en
                        ? "Evidence photos (up to 3 JPEG/PNG, 2MB each)"
                        : "Ảnh minh chứng (tối đa 3 ảnh JPEG/PNG, mỗi ảnh 2MB)"}
                      <Input
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        onChange={(e) =>
                          setFiles([...(e.target.files || [])].slice(0, 3))
                        }
                      />
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={sending || !description.trim()}
                        type="submit"
                      >
                        {en ? "Send support request" : "Gửi yêu cầu hỗ trợ"}
                      </Button>
                      <Button
                        disabled={sending || !description.trim()}
                        type="button"
                        variant="outline"
                        onClick={() => support(true)}
                      >
                        {en
                          ? "Request return review"
                          : "Yêu cầu xem xét hoàn hàng"}
                      </Button>
                    </div>
                    {notice && (
                      <p role="status" className="text-sm">
                        {notice}
                      </p>
                    )}
                  </form>
                  {!!data.supportRequests?.length && (
                    <div className="mt-8 border-t border-current/20 pt-6">
                      <h3 className="font-serif text-xl">
                        {en
                          ? "Your support requests"
                          : "Yêu cầu hỗ trợ của bạn"}
                      </h3>
                      <ul className="mt-3 divide-y divide-current/10">
                        {data.supportRequests.map((t) => (
                          <li
                            key={t.id}
                            className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                          >
                            <span>
                              {new Date(t.createdAt).toLocaleDateString(
                                en ? "en-GB" : "vi-VN",
                              )}
                            </span>
                            <span>
                              {(
                                {
                                  OPEN: en
                                    ? "Awaiting store review"
                                    : "Chờ cửa hàng xử lý",
                                  SENT: en ? "Sent to carrier" : "Đã gửi GHN",
                                  CLOSED: en ? "Closed" : "Đã đóng",
                                } as Record<string, string>
                              )[t.state] || (en ? "In progress" : "Đang xử lý")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
      {en ? <ZenFooter /> : <TraditionalFooter />}
    </div>
  );
}
