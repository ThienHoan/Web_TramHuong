import type { Metadata } from "next";
import ExperienceLab from "@/components/experience-lab/ExperienceLab";
import type { PreviewMode } from "@/components/experience-lab/types";

export const metadata: Metadata = {
  title: "Ba trải nghiệm 3D | Thiên Phúc",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mau?: string }>;
}) {
  const { mau } = await searchParams;
  const initialMode: PreviewMode =
    mau === "ritual" || mau === "gallery" ? mau : "bracelet";
  return <ExperienceLab initialMode={initialMode} />;
}
