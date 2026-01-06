import { getProducts, getPosts } from '@/lib/api-client';
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
  const products = await getProducts(locale);
  // Fetch blog posts (only published ones ideally, but admin API might return all, filtering if needed)
  const blogResponse = await getPosts({ limit: 4 });
  const posts = blogResponse?.data || [];

  // Basic filtering for "Featured" could happen here or inside components
  // For now, passing all products allows the components to decide layout.

  if (locale === 'vi') {
    return <TraditionalHome products={products} posts={posts} />;
  }

  return <ZenHome products={products} posts={posts} />;
}
