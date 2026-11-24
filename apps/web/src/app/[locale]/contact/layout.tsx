import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'vi' ? 'Liên hệ Thiên Phúc Huế' : 'Contact Thien Phuc Hue', description: locale === 'vi' ? 'Liên hệ Trầm Hương Thiên Phúc Huế: địa chỉ cửa hàng, số điện thoại, giờ mở cửa và tư vấn sản phẩm.' : 'Contact Thien Phuc Hue',  };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
