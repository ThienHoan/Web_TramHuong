import { LotusIcon } from "@/components/icons/BrandIcons";
import { cn } from "@/lib/utils";

export const BRAND = {
  name: "Thiên Phúc",
  descriptor: "Trầm hương Việt",
  signature: "Hương Việt. Nếp an yên.",
  location: "Huế, Việt Nam",
} as const;

export function BrandLockup({
  className,
  inverse = false,
  locale = "vi",
  compact = false,
}: {
  className?: string;
  inverse?: boolean;
  locale?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "brand-lockup",
        inverse && "brand-lockup-inverse",
        compact && "brand-lockup-compact",
        className,
      )}
    >
      <span className="brand-lockup-mark" aria-hidden="true">
        <LotusIcon size={30} />
      </span>
      <span className="brand-lockup-type">
        <span className="brand-lockup-name">{BRAND.name}</span>
        <span className="brand-lockup-descriptor">
          {locale === "vi" ? BRAND.descriptor : "Vietnamese agarwood"}
        </span>
      </span>
    </span>
  );
}

export function BrandSeal({ className }: { className?: string }) {
  return (
    <span
      className={cn("brand-seal", className)}
      role="img"
      aria-label="Thiên Phúc · Trầm hương Việt · Huế"
    >
      <span className="brand-seal-top">THIÊN PHÚC</span>
      <LotusIcon size={32} aria-hidden="true" />
      <span className="brand-seal-bottom">HUẾ · VIỆT NAM</span>
    </span>
  );
}
