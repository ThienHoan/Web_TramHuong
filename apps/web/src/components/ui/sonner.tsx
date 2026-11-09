"use client"

import type { CSSProperties } from "react"
import { Loader2Icon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { STATUS_ICONS } from "@/components/ui/notice"
import "./status.css"

const { success: Success, error: Failure, warning: Warning, info: Information } = STATUS_ICONS

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-center"
    closeButton
    duration={4500}
    visibleToasts={3}
    style={{ "--width": "400px" } as CSSProperties}
    icons={{
      success: <Success />,
      error: <Failure />,
      warning: <Warning />,
      info: <Information />,
      loading: <Loader2Icon className="animate-spin" />,
    }}
    {...props}
  />
)

export { Toaster }
