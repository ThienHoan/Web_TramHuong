import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getPostBySlug, getPosts } from "@/lib/api-client";
import { Link } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";
import {
  blogCategory,
  blogDate,
  blogDescription,
  blogSearchTitle,
  readingMinutes,
} from "@/lib/blog";
import { prepareBlogArticle } from "@/lib/blog-article";
import { ShopHeader, ShopFooter } from "@/components/layout/ShopChrome";
import { BlogCard, BlogCover } from "@/components/blog/BlogCard";
import { ArticleToc } from "@/components/blog/ArticleToc";
import BlogPostingJsonLd from "@/components/seo/BlogPostingJsonLd";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import "@/components/blog/blog.css";

type Props = { params: Promise<{ slug: string; locale: string }> };
const fetchPost = cache((slug: string) => getPostBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await fetchPost(slug);
  if (!post || post.status !== "published")
    return {
      title: "Bài viết không tồn tại",
      robots: { index: false, follow: false },
    };
  const title = blogSearchTitle(post);
  const description = blogDescription(post);
  const url = absoluteUrl(`/vi/blog/${post.slug}`);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: { vi: url, "x-default": url } },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      locale: "vi_VN",
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at || post.published_at,
      authors: [post.author?.full_name || "Thiên Phúc"],
      section: blogCategory(post.category),
      images: [
        {
          url: absoluteUrl(post.cover_image || "/brand/social-card.png"),
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(post.cover_image || "/brand/social-card.png")],
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const en = locale === "en";
  const { data: post } = await fetchPost(slug);
  if (!post || post.status !== "published") notFound();
  // Public ID aliases resolve to one permanent URL, rather than producing duplicates.
  if (slug !== post.slug) permanentRedirect(`/${locale}/blog/${post.slug}`);
  const relatedResult = await getPosts({
    category: post.category,
    limit: 5,
    status: "published",
  });
  const related = relatedResult.data
    .filter((item) => item.id !== post.id)
    .slice(0, 3);
  const article = prepareBlogArticle(post.content);
  const published = post.published_at || post.created_at;
  const updated =
    post.updated_at &&
    new Date(post.updated_at).getTime() - new Date(published).getTime() >
      86400000
      ? post.updated_at
      : undefined;
  return (
    <div className="journal-page">
      <ShopHeader />
      <BlogPostingJsonLd post={post} />
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: "Thiên Phúc", item: `/${locale}` },
          { name: en ? "Journal" : "Thư viện", item: `/${locale}/blog` },
          { name: post.title, item: `/vi/blog/${post.slug}` },
        ]}
      />
      <main className="journal-main">
        <nav
          className="journal-breadcrumb"
          aria-label={en ? "Breadcrumb" : "Đường dẫn"}
        >
          <Link href="/">{en ? "Home" : "Trang chủ"}</Link>
          <ChevronRight size={12} />
          <Link href="/blog">{en ? "Journal" : "Thư viện"}</Link>
          <ChevronRight size={12} />
          <span>{blogCategory(post.category, locale)}</span>
        </nav>
        <article className="journal-article">
          <header className="journal-article-heading">
            <div className="journal-article-title">
              <Link
                className="journal-label"
                href={`/blog?category=${encodeURIComponent(post.category || "knowledge")}`}
              >
                {blogCategory(post.category, locale)}
              </Link>
              <h1 lang="vi">{post.title}</h1>
              {post.excerpt && (
                <p className="journal-article-excerpt" lang="vi">
                  {post.excerpt}
                </p>
              )}
              <div className="journal-meta">
                <span>{post.author?.full_name || "Thiên Phúc"}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={published}>{blogDate(published, locale)}</time>
                <span aria-hidden="true">·</span>
                <span>
                  {readingMinutes(post.content)} {en ? "min read" : "phút đọc"}
                </span>
              </div>
              {updated && (
                <p className="journal-meta journal-updated">
                  {en ? "Updated" : "Cập nhật"}{" "}
                  <time dateTime={updated}>{blogDate(updated, locale)}</time>
                </p>
              )}
              {en && (
                <p className="journal-language-note">
                  This article is currently available in Vietnamese.
                </p>
              )}
            </div>
            <BlogCover post={post} priority />
          </header>
          <div
            className={`journal-reading-grid ${related.length ? "" : "journal-reading-solo"}`}
          >
            <div className="journal-reading-main">
              <ArticleToc headings={article.headings} locale={locale} />
              <div
                className="journal-prose"
                lang="vi"
                dangerouslySetInnerHTML={{ __html: article.html }}
              />
              <div className="journal-byline">
                <strong>{post.author?.full_name || "Thiên Phúc"}</strong>
                <p>
                  {en
                    ? "Vietnamese agarwood, crafted and shared from Hue."
                    : "Trầm hương Việt, những câu chuyện và nếp thưởng hương từ Huế."}
                </p>
              </div>
              <Link className="journal-text-link" href="/blog">
                {en ? "Back to the journal" : "Về thư viện bài viết"}
              </Link>
            </div>
            {related.length > 0 && (
              <aside
                className="journal-reading-aside"
                aria-labelledby="related-aside-title"
              >
                <h2 id="related-aside-title">
                  {en ? "You may also enjoy" : "Có thể bạn quan tâm"}
                </h2>
                {related.slice(0, 2).map((item) => (
                  <BlogCard key={item.id} post={item} locale={locale} compact />
                ))}
              </aside>
            )}
          </div>
        </article>
        {related.length > 0 && (
          <section className="journal-related" aria-labelledby="related-title">
            <div className="journal-section-heading">
              <h2 id="related-title">
                {en ? "Read more in the journal" : "Đọc thêm trong thư viện"}
              </h2>
              <Link className="journal-text-link" href="/blog">
                {en ? "All stories" : "Tất cả bài viết"}
              </Link>
            </div>
            <div className="journal-grid">
              {related.map((item) => (
                <BlogCard key={item.id} post={item} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </main>
      <ShopFooter />
    </div>
  );
}
