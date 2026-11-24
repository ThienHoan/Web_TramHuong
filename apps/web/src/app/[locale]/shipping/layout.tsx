import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'vi' ? 'Theo dõi giao hàng' : 'Shipment tracking', description: locale === 'vi' ? 'Theo dõi tình trạng giao hàng của đơn hàng Thiên Phúc.' : 'Shipment tracking', robots: { index: false, follow: false }, };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
