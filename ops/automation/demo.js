const labels = {
  "order.created": "Đơn mẫu mới",
  "contact.created": "Liên hệ mẫu mới",
  "monitor.down": "Mất kết nối",
  "monitor.recovered": "Kết nối đã phục hồi",
  "backup.stale": "Sao lưu quá hạn",
  "backup.recovered": "Sao lưu đã phục hồi",
};
const states = {
  QUEUED: "Chờ xử lý",
  WORKING: "Đang xử lý",
  CAPTURED: "Đã ghi nhận tại máy",
  ACCEPTED: "Đầu nhận đã chấp nhận",
  UNKNOWN: "Cần kiểm tra kết quả",
  DEAD: "Cần xử lý lỗi",
};
const sources = {
  api: "API",
  web: "Website",
  database: "Cơ sở dữ liệu",
  backup: "Sao lưu",
};
const byId = (id) => document.getElementById(id);
const time = (value) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
function renderList(id, items, empty) {
  const list = byId(id);
  list.replaceChildren();
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = empty;
    list.append(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li"),
      text = document.createElement("div"),
      title = document.createElement("span"),
      meta = document.createElement("span"),
      status = document.createElement("span");
    title.className = "record-title";
    title.textContent = labels[item.kind] || "Sự kiện";
    meta.className = "record-meta";
    meta.textContent =
      (sources[item.source] || "#" + item.source_id?.slice(0, 8)) +
      " · " +
      time(item.createdAt || item.created_at);
    status.className = "state" + (item.state === "QUEUED" ? " queued" : "");
    status.textContent = states[item.state] || "Chưa xác định";
    text.append(title, meta);
    li.append(text, status);
    list.append(li);
  }
}
function render(data) {
  byId("orders").textContent = data.counts.orders;
  byId("contacts").textContent = data.counts.contacts;
  renderList(
    "queue",
    data.queue,
    "Chưa có sự kiện. Tạo một đơn hoặc liên hệ mẫu để bắt đầu.",
  );
  renderList("alerts", data.alerts, "Chưa có cảnh báo.");
  const health = byId("health");
  health.replaceChildren();
  for (const [key, value] of Object.entries(data.checks)) {
    const span = document.createElement("span");
    span.className = value.down ? "unhealthy" : "healthy";
    span.textContent =
      (sources[key] || key) + ": " + (value.down ? "Mất kết nối" : "Hoạt động");
    health.append(span);
  }
  if (!health.children.length) {
    const span = document.createElement("span");
    span.textContent = "Chưa chạy kiểm tra";
    health.append(span);
  }
  byId("backup-status").textContent = data.backup
    ? "Đã mã hóa & kiểm tra · " + time(data.backup.completedAt)
    : "Chưa có bản sao lưu";
  byId("feedback").className = "";
  byId("feedback").textContent = data.lastMessage;
}
let busy = false;
for (const button of document.querySelectorAll("[data-action]"))
  button.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    for (const control of document.querySelectorAll("button"))
      control.setAttribute("aria-disabled", "true");
    button.setAttribute("aria-busy", "true");
    byId("feedback").textContent = "Đang xử lý tác vụ mẫu…";
    try {
      const response = await fetch("/demo/action/" + button.dataset.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      render(await response.json());
    } catch {
      byId("feedback").className = "error";
      byId("feedback").textContent =
        "Chưa chạy được tác vụ mẫu. Kiểm tra terminal của bản demo rồi thử lại.";
    } finally {
      busy = false;
      for (const control of document.querySelectorAll("button"))
        control.removeAttribute("aria-disabled");
      button.removeAttribute("aria-busy");
    }
  });
fetch("/demo/state")
  .then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  })
  .then(render)
  .catch(() => {
    byId("feedback").className = "error";
    byId("feedback").textContent =
      "Không tải được bản thử. Tải lại trang để thử lại.";
  });
