import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'vi' ? 'Hợp tác cùng Thiên Phúc Huế' : 'Partner with Thien Phuc Hue', description: locale === 'vi' ? 'Trao đổi cơ hội hợp tác, phân phối và quà tặng trầm hương cùng Thiên Phúc tại Huế.' : 'Partner with Thien Phuc Hue',  };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
