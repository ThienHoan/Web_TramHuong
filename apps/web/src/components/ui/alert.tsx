import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group relative overflow-hidden rounded-xl border flex flex-col sm:flex-row items-start sm:items-center transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
  {
    variants: {
      variant: {
        default: "bg-[#f0f9ff] dark:bg-[#1a2c38] border-sky-100 dark:border-sky-900/50",
        destructive: "bg-paper dark:bg-[#2c241b] border-stone-100 dark:border-stone-800",
        success: "bg-paper dark:bg-[#2c241b] border-stone-100 dark:border-stone-800",
        warning: "bg-paper dark:bg-[#2c241b] border-stone-100 dark:border-stone-800",
      },
      size: {
        default: "p-5 sm:p-6 gap-5",
        sm: "p-3 gap-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
  title?: string;
  onClose?: () => void;
}

function Alert({
  className,
  variant = "default",
  size = "default",
  title,
  children,
  onClose,
  ...props
}: AlertProps) {

  const config = {
    default: {
      icon: "local_cafe",
      title: "Lời Nhắn",
      iconWrapper: "bg-white dark:bg-sky-900/40 border-sky-200 dark:border-sky-700/50 shadow-sm",
      iconColor: "text-sky-700 dark:text-sky-300",
      bloom: null,
      bar: null,
      blob: "absolute -top-6 -right-6 w-16 h-16 bg-sky-200/50 dark:bg-sky-700/30 rounded-full blur-xl pointer-events-none",
      titleDecoration: "after:bg-sky-200 dark:after:bg-sky-700" // Fallback title hint
    },
    destructive: {
      icon: "cloud_off",
      title: "Trắc Trở",
      iconWrapper: "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30",
      iconColor: "text-rose-700 dark:text-rose-400",
      bloom: "bg-rose-500/10",
      bar: "bg-rose-700/80",
      blob: null,
      titleDecoration: "after:bg-rose-200 dark:after:bg-rose-800"
    },
    success: {
      icon: "spa",
      title: "Tin Lành",
      iconWrapper: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30",
      iconColor: "text-emerald-700 dark:text-emerald-400",
      bloom: "bg-emerald-500/10",
      bar: "bg-emerald-600/80",
      blob: null,
      titleDecoration: "after:bg-emerald-200 dark:after:bg-emerald-800"
    },
    warning: {
      icon: "flare",
      title: "Lưu Tâm",
      iconWrapper: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/30",
      iconColor: "text-primary dark:text-orange-400",
      bloom: "bg-orange-500/10",
      bar: "bg-primary/80",
      blob: null,
      titleDecoration: "after:bg-orange-200 dark:after:bg-orange-800"
    }
  };

  const isSmall = size === 'sm';
  // Safe fallback
  const currentVariant = variant || "default";
  // @ts-ignore
  let { icon, title: defaultTitle, iconWrapper, iconColor, bloom, bar, blob, titleDecoration } = config[currentVariant] || config.default;
  const displayTitle = title || defaultTitle;

  // Minimal tweaks
  if (isSmall) {
    blob = null;
    bloom = null;
    // bar = null; // Keep bar for accent? Maybe thin it?
  }

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    >
      {/* Texture Overlay */}
      {!isSmall && <div className="absolute inset-0 bg-texture-paper opacity-40 mix-blend-overlay pointer-events-none" />}

      {/* Decorative Elements */}
      {bar && <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", bar, isSmall && "w-1")} />}
      {blob && <div className={cn("absolute -top-6 -right-6 w-16 h-16 bg-sky-200/50 dark:bg-sky-700/30 rounded-full blur-xl pointer-events-none")} />}

      {/* Content Wrapper */}
      <div className={cn("alert-content relative w-full z-10 grid gap-x-5 items-center", isSmall ? "gap-x-3 grid-cols-[auto_1fr]" : "grid-cols-[auto_1fr] items-start")}>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "absolute text-trad-text-muted/60 hover:text-trad-text-main transition-colors p-1.5 rounded-full hover:bg-black/5 z-20",
              "hidden sm:block",
              isSmall ? "right-1 top-1" : "right-2 top-2"
            )}
            type="button"
            title="Đóng"
          >
            <span className="material-symbols-outlined text-[16px] font-bold leading-none block">close</span>
          </button>
        )}

        {/* Icon Section (Row 1, Col 1) */}
        <div className="flex-shrink-0 relative row-start-1 col-start-1 h-full flex items-center">
          <div className={cn(
            "rounded-full flex items-center justify-center border",
            isSmall ? "w-8 h-8" : "w-14 h-14",
            iconWrapper
          )}>
            <span className={cn("material-symbols-outlined", iconColor, isSmall ? "text-[18px]" : "text-3xl")} style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
              {icon}
            </span>
          </div>
          {/* Bloom Effect */}
          {bloom && (
            <div className={cn(
              "absolute -inset-2 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              bloom
            )} />
          )}
        </div>

        {/* Text Container */}
        <div className={cn("col-start-2 row-start-1 flex flex-col justify-center", isSmall ? "gap-0.5" : "")}>
          {/* Title */}
          <AlertTitle className={cn(titleDecoration, isSmall ? "text-sm mb-0 after:hidden" : "")}>
            {displayTitle}
          </AlertTitle>

          {/* Description */}
          <div className={cn("text-stone-700 dark:text-stone-300", isSmall ? "text-xs" : "text-sm sm:text-base")}>
            {children}
          </div>
        </div>

      </div>
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-lg font-bold leading-tight flex items-center gap-2 mb-1 text-[#1b140d] dark:text-[#e8e6e3]",
        "after:content-[''] after:inline-block after:h-px after:w-8 after:rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-base leading-relaxed opacity-90",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
