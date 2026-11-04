"use client";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocalFunnelSession } from "./AnalyticsProvider";
// Inside the existing AuthProvider: logout/refresh/account changes close QA.
export function LocalFunnelAuth() {
  const { session, role } = useAuth();
  const funnel = useLocalFunnelSession();
  const token = role === "ADMIN" ? (session?.access_token ?? "") : "";
  useEffect(() => {
    funnel?.authChanged(token);
  }, [funnel, token]);
  return null;
}
