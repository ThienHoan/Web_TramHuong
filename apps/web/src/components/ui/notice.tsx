import type { ComponentProps } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import "./status.css";

export type NoticeTone = "success" | "error" | "warning" | "info";

/** Shared with the toasts so a given status always shows the same icon. */
export const STATUS_ICONS = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
} as const;

/** In-page message that stays visible. Use toast() for messages that can disappear on their own. */
export function Notice({
  tone = "info",
  className,
  children,
  ...props
}: ComponentProps<"div"> & { tone?: NoticeTone }) {
  const Icon = STATUS_ICONS[tone];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      data-tone={tone}
      className={cn("status-notice", className)}
      {...props}
    >
      <Icon aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
