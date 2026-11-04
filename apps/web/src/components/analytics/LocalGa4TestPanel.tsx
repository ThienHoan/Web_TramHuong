"use client";
import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  useAnalyticsSnapshot,
  useAnalyticsTracker,
  useLocalDebugPolicy,
  useLocalFunnelSession,
} from "./AnalyticsProvider";
import type { LocalFunnelStopReason } from "@/lib/ga4/local-funnel";
import { sendLocalDebugEvent } from "@/lib/ga4/local-debug";
export function LocalGa4TestPanel({ token }: { token: string }) {
  const vi = useLocale() === "vi",
    policy = useLocalDebugPolicy(),
    tracker = useAnalyticsTracker();
  const snapshot = useAnalyticsSnapshot();
  const [result, setResult] = useState<
      "accepted" | "unknown" | "blocked" | null
    >(null),
    [attempted, setAttempted] = useState(false),
    [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  if (!policy || !token) return null;
  const send = async () => {
    if (!tracker || attempted || !tracker.isCollecting()) return;
    setAttempted(true);
    setBusy(true);
    active.current = new AbortController();
    const value = await sendLocalDebugEvent(
      tracker,
      token,
      active.current.signal,
    );
    if (!active.current.signal.aborted) {
      setResult(value);
      setBusy(false);
    }
  };
  return (
    <section
      className="admin-list-card min-w-0 space-y-3 p-5"
      aria-label={vi ? "Kiểm tra GA4 thật" : "Real GA4 test"}
    >
      <h2 className="font-semibold">
        {policy.fixture
          ? vi
            ? "Kiểm thử giao diện GA4 · Transport giả"
            : "GA4 UI test · Fake transport"
          : vi
            ? "Kiểm tra GA4 thật trên localhost"
            : "Real GA4 localhost test"}
      </h2>
      <p>
        {vi ? "Luồng Test: " : "Test stream: "}
        {policy.measurementId}
      </p>
      <p>
        {policy.fixture
          ? vi
            ? "Transport giả: nút dưới chỉ gửi một sự kiện local_test_action tới máy chủ thử nghiệm, không gọi Google. Phiên funnel riêng bên dưới cũng dùng transport giả."
            : "Fake transport: the button sends local_test_action only to the test server, not Google. The separate funnel session below also uses fake transport."
          : vi
            ? "Sau khi bạn đồng ý ở phần quyền riêng tư, nút dưới gửi một sự kiện local_test_action thật tới Google. Không gửi đơn hàng hoặc purchase. Các sự kiện mua sắm chỉ gửi khi bạn bật phiên thử riêng bên dưới."
            : "After you grant analytics consent, this button sends one real local_test_action to Google. No orders or purchases. Shopping events are sent only if you start the separate test session below."}
      </p>
      <Button
        variant="outline"
        disabled={
          busy ||
          attempted ||
          snapshot.consent !== "granted" ||
          snapshot.privacySignal
        }
        onClick={() => void send()}
      >
        {busy
          ? vi
            ? "Đang gửi…"
            : "Sending…"
          : vi
            ? "Gửi một sự kiện GA4 test"
            : "Send one GA4 test event"}
      </Button>
      {snapshot.consent !== "granted" && (
        <p role="status">
          {vi
            ? "Cần đồng ý ở mục Quyền riêng tư phân tích trước."
            : "Grant analytics consent first in privacy preferences."}
        </p>
      )}
      {policy.funnelEnabled && (
        <LocalFunnelControls token={token} fixture={policy.fixture === true} />
      )}
      {result && (
        <p role="status">
          {result === "accepted"
            ? policy.fixture
              ? vi
                ? "Transport giả đã nhận; chưa gọi Google."
                : "Fake transport accepted; no Google request."
              : vi
                ? "Google đã nhận HTTP thành công. Hãy mở DebugView để xác nhận local_test_action; phản hồi này chưa chứng minh sự kiện đã vào báo cáo."
                : "Google accepted the HTTP request. Open DebugView to verify local_test_action; ingestion is not yet confirmed."
            : result === "blocked"
              ? vi
                ? "Consent đã bị chặn hoặc thay đổi."
                : "Consent was blocked or changed."
              : vi
                ? "Chưa xác định kết quả. Không tự gửi lại để tránh trùng sự kiện."
                : "Outcome unknown. No automatic resend to avoid duplicates."}
        </p>
      )}
    </section>
  );
}

const STOP_MESSAGES: Record<LocalFunnelStopReason, readonly [string, string]> =
  {
    manual: ["Bạn đã dừng phiên thử.", "You stopped this test session."],
    consent: [
      "Phiên đã dừng vì lựa chọn đồng ý đã thay đổi hoặc hết hạn.",
      "Stopped because analytics consent changed or expired.",
    ],
    expired: [
      "Phiên đã hết thời hạn 15 phút.",
      "This session reached its 15-minute time limit.",
    ],
    auth: [
      "Phiên đã dừng vì tài khoản hoặc quyền truy cập đã thay đổi.",
      "Stopped because the account or access permission changed.",
    ],
    disabled: [
      "Máy chủ hiện không cho phép phiên thử. Kiểm tra cấu hình trước khi bật lại.",
      "The server currently disables this test. Check configuration before starting again.",
    ],
    session_limit: [
      "Phiên này đã đạt 20 lần gửi và được dừng theo giới hạn.",
      "This session reached its 20-attempt limit and stopped.",
    ],
    server_limit: [
      "Đợt kiểm thử trên máy chủ đã dùng hết lượt gửi. Bật lại nút hoặc tải lại trang không cấp thêm lượt. Cần người vận hành mở đợt mới.",
      "The server test run has exhausted its send budget. Restarting this button or reloading does not add attempts. An operator must open a new test run.",
    ],
    quota: [
      "Đã chạm giới hạn tần suất hoặc số lượt của máy chủ. Phiên đã dừng; không tự gửi lại.",
      "The server rate or daily quota was reached. Session stopped; no automatic resend.",
    ],
    busy: [
      "Máy chủ đang xử lý lượt thử khác. Phiên đã dừng; không tự gửi lại.",
      "The server is processing another test. Session stopped; no automatic resend.",
    ],
    rejected: [
      "Máy chủ đã từ chối dữ liệu thử. Phiên đã dừng.",
      "The server rejected the test payload. Session stopped.",
    ],
    network: [
      "Kết nối bị lỗi hoặc hết thời gian chờ. Kết quả có thể chưa rõ; phiên đã dừng và không tự gửi lại.",
      "Connection failed or timed out. Outcome may be unknown; session stopped without automatic resend.",
    ],
    unknown: [
      "Chưa xác định kết quả từ máy chủ. Phiên đã dừng để tránh gửi trùng.",
      "Server outcome is unknown. Session stopped to avoid duplicate sends.",
    ],
  };

function LocalFunnelControls({
  token,
  fixture,
}: {
  token: string;
  fixture: boolean;
}) {
  const vi = useLocale() === "vi";
  const session = useLocalFunnelSession();
  if (!session) throw new Error("AnalyticsProvider is required");
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );
  const consent = useAnalyticsSnapshot();
  return (
    <div
      className="space-y-3 border-t pt-3"
      aria-label={vi ? "Phiên thử funnel" : "Funnel test session"}
    >
      <h3 className="font-semibold">
        {vi
          ? "Thử sự kiện xem sản phẩm → giỏ hàng → checkout"
          : "Test product views → cart → checkout"}
      </h3>
      <p>
        {fixture
          ? vi
            ? "Transport giả: thao tác mới trong phiên được gửi tới máy chủ thử nghiệm; không gọi Google."
            : "Fake transport: new session actions go to the test server; no Google calls."
          : vi
            ? "Bật phiên sẽ tự gửi các thao tác mới tới Google thử nghiệm trong tối đa 15 phút / 20 lần gửi. Không gửi lại lịch sử cũ; không gửi purchase."
            : "Starting sends new actions to test Google Analytics for up to 15 minutes / 20 attempts. No history replay or purchases."}
      </p>
      <Button
        variant="outline"
        disabled={
          !state.active &&
          (consent.consent !== "granted" ||
            consent.privacySignal ||
            state.stopReason === "server_limit")
        }
        onClick={() => {
          if (state.active) session.stop();
          else session.start(token);
        }}
      >
        {state.active
          ? vi
            ? "Dừng phiên thử"
            : "Stop test session"
          : vi
            ? "Bật phiên thử funnel"
            : "Start funnel test session"}
      </Button>
      <p role="status">
        {vi ? "Phiên: " : "Session: "}
        {state.active
          ? vi
            ? "đang bật"
            : "active"
          : vi
            ? "đã tắt"
            : "off"} · {vi ? "Đã thử" : "Attempted"}: {state.attempted} ·{" "}
        {fixture
          ? vi
            ? "Transport giả nhận"
            : "Fake transport accepted"
          : vi
            ? "Google nhận HTTP"
            : "Google HTTP accepted"}
        : {state.accepted} · {vi ? "Chưa rõ" : "Unknown"}: {state.unknown} ·{" "}
        {vi ? "Bỏ qua" : "Dropped"}: {state.dropped} ·{" "}
        {vi ? "Bị chặn" : "Blocked"}: {state.blocked}
      </p>
      {state.sessionId !== null && (
        <p>
          {vi ? "Mã phiên: " : "Session ID: "}
          <strong>{state.sessionId}</strong> —{" "}
          {vi
            ? "đối chiếu với ga_session_id trong DebugView."
            : "match ga_session_id in DebugView."}
        </p>
      )}
      {state.stopReason && (
        <p
          role={
            [
              "server_limit",
              "quota",
              "busy",
              "network",
              "unknown",
              "rejected",
            ].includes(state.stopReason)
              ? "alert"
              : "status"
          }
        >
          {STOP_MESSAGES[state.stopReason][vi ? 0 : 1]}
        </p>
      )}
      <p className="text-sm">
        {vi
          ? "Bộ đếm chỉ xác nhận HTTP; cần DebugView để xác nhận từng sự kiện đã vào GA4. Tải lại trang hoặc thu hồi consent sẽ dừng phiên."
          : "Counters confirm HTTP only; verify each event in DebugView. Reloading or withdrawing consent stops the session."}
      </p>
    </div>
  );
}
