import { ORDER_STATUS } from "./admin-resources";

export function StatusBadge({
  value,
  en = false,
}: {
  value: string;
  en?: boolean;
}) {
  const positive = [
    "PAID",
    "COMPLETED",
    "published",
    "active",
    "paid",
    "replied",
  ].includes(value);
  const warning = [
    "PENDING",
    "AWAITING_PAYMENT",
    "draft",
    "new",
    "scheduled",
    "pending",
  ].includes(value);
  const negative = [
    "CANCELED",
    "EXPIRED",
    "expired",
    "exhausted",
    "banned",
    "failed",
  ].includes(value);
  return (
    <span
      className={`admin-status ${positive ? "is-positive" : warning ? "is-warning" : negative ? "is-negative" : "is-neutral"}`}
    >
      <span aria-hidden="true" />
      {ORDER_STATUS[value]?.[en ? 1 : 0] || value}
    </span>
  );
}
