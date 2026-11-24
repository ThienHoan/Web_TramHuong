import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'vi' ? 'Tra cứu đơn hàng' : 'Track your order', description: locale === 'vi' ? 'Tra cứu trạng thái đơn hàng Thiên Phúc bằng mã đơn và số điện thoại hoặc email.' : 'Track your order', robots: { index: false, follow: false }, };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
