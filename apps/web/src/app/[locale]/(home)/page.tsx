import type { Metadata } from 'next';
import { getProducts, getPosts, getCategories } from '@/lib/api-client';
import dynamic from 'next/dynamic';
import { linkableCategories } from '@/lib/stocked-categories';

// Dynamic import for code splitting - only load the theme user needs
const ZenHome = dynamic(() => import('@/components/zen/ZenHome'));
const TraditionalHome = dynamic(() => import('@/components/traditional/TraditionalHome'));

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [products, blogResponse, allCategories] = await Promise.all([
    getProducts(locale, { limit: 12 }),
    locale === 'vi' ? getPosts({ limit: 3, status: 'published' }) : Promise.resolve(null),
    getCategories(locale),
  ]);
  const posts = blogResponse?.data || [];
  const categories = await linkableCategories(locale, allCategories);

  if (locale === 'vi') {
    return <TraditionalHome products={products} posts={posts} categories={categories} />;
  }

  return <ZenHome products={products} categories={categories} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'vi' ? 'Trầm hương Huế Thiên Phúc — Nụ trầm, nhang trầm, quà tặng' : 'Thiên Phúc Hue — Vietnamese Agarwood & Incense';
  const description = locale === 'vi'
    ? 'Trầm hương Thiên Phúc tại 153 Lý Thái Tổ, Huế: nụ trầm, thanh trầm xông và quà tặng. Xem ảnh thật, giá bán, đặt hàng không cần tài khoản, giao toàn quốc.'
    : 'Explore agarwood cones, incense and gifts at Thien Phuc in Hue. View product photos and prices, ask for advice and order without an account.';
  return { title: { absolute: title }, description, openGraph: { title, description, url: `/${locale}` }, twitter: { title, description } };
}
