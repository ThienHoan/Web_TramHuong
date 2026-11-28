import type { BlogPost } from '@/types/blog';
import { absoluteUrl, SITE_URL } from '@/lib/seo';
import { blogDescription, blogText } from '@/lib/blog';

export default function BlogPostingJsonLd({ post }: { post: BlogPost }) {
  const data = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.title,
    description: blogDescription(post),
    inLanguage: 'vi-VN',
    wordCount: blogText(post.content).split(/\s+/).filter(Boolean).length,
    url: absoluteUrl(`/vi/blog/${post.slug}`),
    image: post.cover_image ? absoluteUrl(post.cover_image) : undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: post.author?.full_name ? { '@type': 'Person', name: post.author.full_name } : { '@type': 'Organization', name: 'Thiên Phúc', url: SITE_URL },
    publisher: { '@id': `${SITE_URL}/#store` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/vi/blog/${post.slug}`) },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
