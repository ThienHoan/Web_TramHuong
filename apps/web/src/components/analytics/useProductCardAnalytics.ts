"use client";

import { useEffect, useId, useState } from "react";
import { useAnalyticsSnapshot, useAnalyticsTracker } from "./AnalyticsProvider";

export function useProductCardAnalytics(id: string, price: number) {
  const tracker = useAnalyticsTracker();
  const { mode, consent } = useAnalyticsSnapshot();
  const [element, attach] = useState<HTMLAnchorElement | null>(null);
  const scope = useId();
  useEffect(() => {
    if (
      !element ||
      mode !== "mock" ||
      consent !== "granted" ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
          )
        ) {
          tracker?.track(
            "view_item_list",
            {
              item_list_id: "catalog",
              items: [{ item_id: id, price, quantity: 1 }],
            },
            `${scope}:${id}:${price}`,
          );
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [tracker, mode, consent, id, price, scope, element]);
  return {
    attachProductLink: attach,
    selectProduct: () =>
      tracker?.track("select_item", {
        item_list_id: "catalog",
        items: [{ item_id: id, price, quantity: 1 }],
      }),
  };
}
