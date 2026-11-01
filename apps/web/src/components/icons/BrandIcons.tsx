import { forwardRef, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";

// Original 24px drawings. Same stroke grammar as the functional Lucide set.
function brandIcon(name: string, drawing: ReactNode) {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(
    (
      { size = 24, strokeWidth = 1.65, className = "", children, ...props },
      ref,
    ) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={`brand-icon ${className}`}
        {...props}
      >
        {drawing}
        {children}
      </svg>
    ),
  );
  Icon.displayName = name;
  return Icon;
}

export const LotusIcon = brandIcon(
  "LotusIcon",
  <>
    <path d="M12 18C7 15 8 8 12 3c4 5 5 12 0 15Z" />
    <path d="M9 17C5 17 3 13 3 8c4 1 6 3 6.5 6M15 17c4 0 6-4 6-9-4 1-6 3-6.5 6M5 19c4 3 10 3 14 0" />
  </>,
);
export const AgarwoodIcon = brandIcon(
  "AgarwoodIcon",
  <>
    <path d="m7 3 11 2 2 14-12 2L4 8 7 3Z" />
    <path d="M9 6c-3 5 5 7 2 12M13 6c-2 4 5 6 3 11M7 11l1 6M17 10l1 4" />
  </>,
);
export const IncenseBurnerIcon = brandIcon(
  "IncenseBurnerIcon",
  <>
    <path d="M12 2c-2 2 2 2 0 4M7 9c1-4 9-4 10 0M5 10h14M6 12c0 7 12 7 12 0M8 18l-1 3M16 18l1 3" />
    <path d="M9 14h.01M12 15h.01M15 14h.01" />
  </>,
);
export const IncenseConeIcon = brandIcon(
  "IncenseConeIcon",
  <>
    <path d="M12 2c-2 2 2 2 0 4M7 18l4-10a1.1 1.1 0 0 1 2 0l4 10M9 14l2 1M10 11l2 1" />
    <ellipse cx="12" cy="19" rx="8" ry="2" />
  </>,
);
