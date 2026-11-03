"use client";
export default function LogisticsReport({
  metrics,
  en,
}: {
  metrics: Record<string, unknown>;
  en: boolean;
}) {
  const rows = [
    ["returnRate", "Tỷ lệ chuyển hoàn", "Return rate", "percent"],
    ["onTimeRate", "Giao đúng dự kiến", "On-time delivery", "percent"],
    [
      "averageDeliveryHours",
      "Thời gian giao trung bình",
      "Average delivery time",
      "hours",
    ],
    [
      "averageQuotedCost",
      "Phí báo giá trung bình",
      "Average quoted fee",
      "money",
    ],
    [
      "averageActualCost",
      "Phí GHN ghi nhận trung bình",
      "Average GHN-reported fee",
      "money",
    ],
    [
      "quotedActualDifference",
      "Chênh lệch phí GHN / báo giá",
      "Reported / quoted fee variance",
      "money",
    ],
    [
      "codOutstanding",
      "COD chưa xác nhận qua ngân hàng",
      "COD awaiting bank confirmation",
      "money",
    ],
    [
      "codDiscrepancies",
      "COD cần kiểm tra đối soát",
      "COD reconciliation review",
      "number",
    ],
    [
      "manualAttention",
      "Vận đơn cần xử lý",
      "Shipments needing attention",
      "number",
    ],
  ];
  const format = (value: unknown, type: string) =>
    typeof value !== "number" || !Number.isFinite(value)
      ? "—"
      : type === "percent"
        ? `${(value * 100).toFixed(1)}%`
        : type === "hours"
          ? `${value.toFixed(1)} ${en ? "hours" : "giờ"}`
          : `${Math.round(value).toLocaleString(en ? "en-US" : "vi-VN")}${type === "money" ? " ₫" : ""}`;
  return (
    <section className="my-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 font-semibold">
          {en ? "Delivery & reconciliation" : "Giao hàng và đối soát"}
        </h2>
        <dl className="divide-y">
          {rows.map(([key, vi, eng, type]) => (
            <div
              className="flex items-start justify-between gap-4 py-3 text-sm"
              key={key}
            >
              <dt className="text-muted-foreground">{en ? eng : vi}</dt>
              <dd className="shrink-0 text-right font-medium tabular-nums">
                {format(metrics[key], type)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {en
            ? "Carrier-reported costs can change. Delivery confirmation is separate from bank receipts."
            : "Phí GHN ghi nhận có thể thay đổi. Giao hàng thành công được theo dõi riêng với tiền nhận qua ngân hàng."}
        </p>
      </div>
      <div className="grid gap-5">
        {[
          ["byProvince", "Theo tỉnh/thành", "By province"],
          ["byWarehouse", "Theo kho lấy hàng", "By warehouse"],
        ].map(([key, vi, eng]) => {
          const groups =
            metrics[key] && typeof metrics[key] === "object"
              ? Object.entries(
                  metrics[key] as Record<
                    string,
                    { name?: string; shipments: number; cost: number }
                  >,
                )
              : [];
          return (
            <div
              key={key}
              className="relative overflow-x-auto rounded-xl border bg-white p-5"
            >
              <h2 className="mb-4 font-semibold">{en ? eng : vi}</h2>
              {groups.length ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2">
                        {en ? "Origin / region" : "Kho / khu vực"}
                      </th>
                      <th className="py-2 text-right">
                        {en ? "Shipments" : "Vận đơn"}
                      </th>
                      <th className="py-2 text-right">
                        {en ? "Quoted cost" : "Phí báo giá"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([id, g]) => (
                      <tr key={id} className="border-b last:border-0">
                        <td className="py-3">{g.name || id}</td>
                        <td className="py-3 text-right tabular-nums">
                          {g.shipments}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {format(g.cost, "money")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {en
                    ? "No data in this period."
                    : "Chưa có dữ liệu trong khoảng thời gian này."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
