"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useLocale } from "next-intl";
import { adminMoney } from "@/components/admin/admin-format";
import { AnalyticsData } from "@/lib/analytics";
import { ORDER_STATUS } from "./admin-resources";
const COLORS = [
  "#345c42",
  "#66805e",
  "#9aaf8a",
  "#b99b67",
  "#c2cbb8",
  "#69796d",
  "#9c5d4c",
];
export default function DashboardCharts({ data }: { data: AnalyticsData }) {
  const locale = useLocale();
  const formatPrice = (value: number) => adminMoney(value, locale);
  const en = locale === "en";
  const statuses = data.statusChart.map((row) => ({
    ...row,
    name: ORDER_STATUS[row.name]?.[en ? 1 : 0] || row.name,
  }));
  return (
    <div className="admin-chart-grid">
      <div className="admin-list-card">
        <div className="admin-widget-heading">
          <h2>{en ? "Revenue trend" : "Xu hướng doanh thu"}</h2>
          <span>{en ? "VND" : "Đơn vị: VND"}</span>
        </div>
        <div className="admin-chart-canvas">
          {data.revenueChart.length ? (
            <ResponsiveContainer
              width="100%"
              height={258}
              minWidth={0}
              initialDimension={{ width: 320, height: 258 }}
            >
              <AreaChart
                data={data.revenueChart}
                margin={{ top: 15, right: 12, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#e8ece2"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#71806a" }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  width={55}
                  tick={{ fontSize: 10, fill: "#71806a" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat(locale, {
                      notation: "compact",
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value) => formatPrice(Number(value))}
                  contentStyle={{
                    border: "1px solid #dce4d5",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "none",
                  }}
                />
                <Area
                  name={en ? "Revenue" : "Doanh thu"}
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3c5c3d"
                  fill="#eff4e9"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-chart-empty">
              {en
                ? "No revenue recorded in this period."
                : "Chưa có doanh thu trong kỳ này."}
            </div>
          )}
        </div>
      </div>
      <div className="admin-list-card">
        <div className="admin-widget-heading">
          <h2>{en ? "Order distribution" : "Phân bổ đơn hàng"}</h2>
        </div>
        <div className="admin-status-chart">
          {statuses.length ? (
            <>
              <div className="admin-donut">
                <ResponsiveContainer
                  width="100%"
                  height={170}
                  minWidth={0}
                  initialDimension={{ width: 200, height: 170 }}
                >
                  <PieChart>
                    <Pie
                      data={statuses}
                      dataKey="value"
                      innerRadius={53}
                      outerRadius={75}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {statuses.map((row, i) => (
                        <Cell key={row.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="admin-chart-legend">
                {statuses.map((row, i) => (
                  <div key={row.name}>
                    <span style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{row.name}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="admin-chart-empty">
              {en ? "No orders in this period." : "Chưa có đơn hàng trong kỳ."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
