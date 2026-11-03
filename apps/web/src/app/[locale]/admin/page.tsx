"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/providers/AuthProvider";
export default function AdminHome() {
  const { role } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (role)
      router.replace(role === "ADMIN" ? "/admin/dashboard" : "/admin/orders");
  }, [role, router]);
  return (
    <div className="admin-state" role="status">
      Thiên Phúc · Đang mở trang quản trị…
    </div>
  );
}
