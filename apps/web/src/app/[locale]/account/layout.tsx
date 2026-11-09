import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="atelier-page atelier-account">{children}</div>;
}
