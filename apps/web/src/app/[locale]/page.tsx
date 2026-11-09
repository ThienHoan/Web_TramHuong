import { getProducts, getPosts, getCategories } from '@/lib/api-client';
import dynamic from 'next/dynamic';

// Dynamic import for code splitting - only load the theme user needs
const ZenHome = dynamic(() => import('@/components/zen/ZenHome'));
const TraditionalHome = dynamic(() => import('@/components/traditional/TraditionalHome'));

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [products, blogResponse, categories] = await Promise.all([
    getProducts(locale, { limit: 12 }),
    locale === 'vi' ? getPosts({ limit: 3, status: 'published' }) : Promise.resolve(null),
    getCategories(locale),
  ]);
  const posts = blogResponse?.data || [];

  if (locale === 'vi') {
    return <TraditionalHome products={products} posts={posts} categories={categories} />;
  }

  return <ZenHome products={products} categories={categories} />;
}
