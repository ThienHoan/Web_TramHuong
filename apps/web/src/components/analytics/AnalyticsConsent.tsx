"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useAnalyticsSnapshot,
  useAnalyticsTracker,
  useLocalDebugPolicy,
} from "./AnalyticsProvider";

export function AnalyticsConsent() {
  const snapshot = useAnalyticsSnapshot();
  const tracker = useAnalyticsTracker();
  const localDebug = useLocalDebugPolicy();
  const vi = useLocale() === "vi";
  const [editing, setEditing] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  if (snapshot.mode !== "mock") return null;
  const color = vi
    ? "border-trad-border-warm bg-trad-bg-light text-trad-text-main"
    : "border-zen-green-200 bg-zen-green-50 text-zen-green-text";
  const choose = (choice: "granted" | "denied") => {
    const saved = tracker?.setConsent(choice) ?? false;
    setSaveFailed(!saved);
    setEditing(!saved);
  };
  if (!editing && snapshot.consent !== "unknown" && !saveFailed)
    return (
      <div className="mx-auto max-w-7xl px-4 py-3">
        <Button
          variant="link"
          type="button"
          onClick={() => setEditing(true)}
          className="h-11 px-0 text-inherit underline underline-offset-4"
        >
          {vi ? "Quyền riêng tư phân tích" : "Analytics privacy preferences"}
        </Button>
      </div>
    );
  return (
    <section
      aria-labelledby="analytics-consent-heading"
      className={`mx-4 my-4 rounded-xl border p-4 sm:mx-auto sm:max-w-7xl sm:p-5 ${color}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <h2 id="analytics-consent-heading" className="text-base font-medium">
            {vi ? "Bạn chọn cách chia sẻ" : "You choose what to share"}
          </h2>
          <p className="text-sm leading-relaxed">
            {localDebug?.funnelEnabled
              ? vi
                ? "Khi đồng ý và ADMIN chủ động bật phiên thử, lượt xem sản phẩm, thao tác giỏ hàng và các bước checkout mới sẽ gửi tới Google Analytics thử nghiệm. Chỉ gửi mã sản phẩm, giá, số lượng và lựa chọn giao hàng/thanh toán theo nhóm; không gửi thông tin liên hệ, đơn hàng hoặc purchase. Thu hồi đồng ý sẽ dừng phiên. Từ chối không ảnh hưởng việc mua hàng."
                : "With consent and an explicitly started ADMIN test session, new product views, cart actions and checkout steps are sent to test Google Analytics. Only product IDs, prices, quantities and delivery/payment categories are sent; no contact details, orders or purchases. Withdrawing consent stops the session. You can shop without accepting."
              : localDebug
                ? vi
                  ? "Khi đồng ý, bạn có thể chủ động bấm nút kiểm tra để gửi một sự kiện thử tới Google Analytics. Các thao tác mua sắm vẫn được thử nghiệm tại máy; đơn đã thanh toán có thể được ghi ở máy chủ thử nghiệm. Từ chối không ảnh hưởng việc mua hàng."
                  : "With consent, you can manually send a test event to Google Analytics. Shopping actions remain local tests; paid purchases may be recorded on the test server. You can shop without accepting."
                : vi
                  ? "Khi đồng ý, lượt xem và thao tác mua sắm được dùng để thử nghiệm phân tích. Đơn đã thanh toán có thể được ghi nhận ở máy chủ thử nghiệm. Chưa gửi dữ liệu đến Google. Từ chối không ảnh hưởng việc mua hàng."
                  : "With your permission, views and shopping actions are used to test analytics. Paid purchases may be recorded on the test server. Nothing is sent to Google. You can shop without accepting."}
          </p>
          <p className="text-xs">
            {vi
              ? "Bạn có thể đổi lựa chọn tại “Quyền riêng tư phân tích” ở cuối trang."
              : "You can change this using “Analytics privacy preferences” at the bottom of the page."}
          </p>
          {snapshot.privacySignal && (
            <p role="status" className="text-sm">
              {vi
                ? "Trang đang tôn trọng yêu cầu không theo dõi của trình duyệt."
                : "Your browser’s do-not-track preference is being respected."}
            </p>
          )}
          {saveFailed && (
            <p role="alert" className="text-sm">
              {vi
                ? "Chưa lưu được lựa chọn. Phân tích vẫn tắt."
                : "Your preference could not be saved. Analytics remains off."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => choose("denied")}
            className="h-11 min-w-32 bg-white text-stone-800 shadow-none"
          >
            {vi ? "Từ chối" : "Decline"}
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={snapshot.privacySignal}
            onClick={() => choose("granted")}
            className="h-11 min-w-32 bg-white text-stone-800 shadow-none"
          >
            {vi ? "Đồng ý" : "Accept"}
          </Button>
        </div>
      </div>
    </section>
  );
}
