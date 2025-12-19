import { getProducts } from '@/lib/api-client';
import ZenHome from '@/components/zen/ZenHome';
import TraditionalHome from '@/components/traditional/TraditionalHome';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const products = await getProducts(locale);

  // Basic filtering for "Featured" could happen here or inside components
  // For now, passing all products allows the components to decide layout.

  if (locale === 'vi') {
    return <TraditionalHome products={products} />;
  }

  return <ZenHome products={products} />;
}
