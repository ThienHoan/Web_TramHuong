"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import "lenis/dist/lenis.css";

export default function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    if (/\/(admin|checkout|account)(\/|$)/.test(pathname)) return;
    const preference = window.matchMedia(
      "(prefers-reduced-motion: reduce), (pointer: coarse)",
    );
    let lenis: Lenis | undefined;
    let frame = 0;
    const syncModal = () => {
      if (
        document.body.hasAttribute("data-scroll-locked") ||
        document.body.style.overflow === "hidden"
      )
        lenis?.stop();
      else lenis?.start();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = undefined;
    };
    const start = () => {
      stop();
      if (preference.matches) return;
      lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential easing
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1,
        allowNestedScroll: true,
        prevent: (node) =>
          node.closest('[role="dialog"], [data-lenis-prevent]') !== null,
      });
      syncModal();

      function raf(time: number) {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      }

      frame = requestAnimationFrame(raf);
    };
    start();
    const modalObserver = new MutationObserver(syncModal);
    modalObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style"],
    });
    preference.addEventListener("change", start);

    return () => {
      modalObserver.disconnect();
      preference.removeEventListener("change", start);
      stop();
    };
  }, [pathname]);

  return null;
}
