import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="atelier-page atelier-account">{children}</div>;
}
