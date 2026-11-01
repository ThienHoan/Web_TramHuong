"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?:
    | "fade-up"
    | "fade-in"
    | "slide-in-right"
    | "slide-in-left"
    | "zoom-in"
    | "fade-left"
    | "fade-right";
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export default function ScrollReveal({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  duration = 600,
  threshold = 0.12,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.reveal = "visible";
          if (once) observer.disconnect();
        } else if (!once || element.dataset.reveal !== "visible") {
          element.dataset.reveal = "pending";
        }
      },
      { threshold },
    );
    const sync = () => {
      observer.disconnect();
      element.dataset.reveal = "visible";
      if (!preference.matches) observer.observe(element);
    };
    sync();
    preference.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
    };
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${className}`}
      data-animation={animation}
      style={
        {
          "--reveal-duration": `${duration}ms`,
          "--reveal-delay": `${Math.min(delay, 240)}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
