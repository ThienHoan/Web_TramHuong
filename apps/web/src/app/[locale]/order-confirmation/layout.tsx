import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'vi' ? 'Xác nhận đơn hàng' : 'Order confirmation', description: locale === 'vi' ? 'Thông tin xác nhận và mã tra cứu đơn hàng của bạn.' : 'Order confirmation', robots: { index: false, follow: false }, };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
