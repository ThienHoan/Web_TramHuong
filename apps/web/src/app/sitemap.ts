import type { MetadataRoute } from 'next';
import { getProductsPaginated, getPosts, getCategories } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/seo';

const locales = ['vi', 'en'];
const validDate = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value) : undefined;
const alternates = (path: string) => ({ languages: {
  ...Object.fromEntries(locales.map(locale => [locale, absoluteUrl(`/${locale}${path}`)])),
  'x-default': absoluteUrl(`/vi${path}`),
} });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of ['', '/products', '/blog', '/contact', '/partnership']) {
      entries.push({ url: absoluteUrl(`/${locale}${path}`), alternates: alternates(path) });
    }
    const categories = await getCategories(locale);
    const populated = new Set<string>();
    const seen = new Set<string>();
    for (let page = 1; ; page++) {
      const { data, meta } = await getProductsPaginated(locale, { limit: 100, page });
      const fresh = data.filter(product => !seen.has(product.id));
      for (const product of fresh) {
        seen.add(product.id);
        if (product.is_active === false) continue;
        if (product.category_id) populated.add(product.category_id);
        if (product.category?.id) populated.add(product.category.id);
        entries.push({
          url: absoluteUrl(`/${locale}/products/${product.slug}`),
          lastModified: validDate(product.updated_at), images: product.images?.map(absoluteUrl),
          alternates: alternates(`/products/${product.slug}`),
        });
      }
      if (!fresh.length || page >= (meta?.last_page || 1)) break;
    }
    for (const category of categories.filter(category => category.is_active && populated.has(category.id))) {
      entries.push({ url: absoluteUrl(`/${locale}/products/category/${category.slug}`), alternates: alternates(`/products/category/${category.slug}`) });
    }
  }
  // Posts currently have a single Vietnamese body; do not submit duplicate English URLs.
  const seenPosts = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, meta } = await getPosts({ status: 'published', limit: 100, page });
    const fresh = data.filter(post => !seenPosts.has(post.id));
    for (const post of fresh) {
      seenPosts.add(post.id);
      entries.push({ url: absoluteUrl(`/vi/blog/${post.slug}`), lastModified: validDate(post.published_at || post.created_at) });
    }
    if (!fresh.length || page >= (meta.totalPages || 1)) break;
  }
  return entries;
}
