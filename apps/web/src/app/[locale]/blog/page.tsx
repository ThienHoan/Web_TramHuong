import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPosts } from "@/lib/api-client";
import { Link } from "@/i18n/routing";
import { ShopHeader, ShopFooter } from "@/components/layout/ShopChrome";
import { BlogCard, BlogCover } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  blogCategory,
  blogDate,
  blogUrl,
  readingMinutes,
  BLOG_CATEGORIES,
} from "@/lib/blog";
import "@/components/blog/blog.css";

type Query = { page?: string; category?: string; search?: string };
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
};
function filters(query: Query) {
  const page = Number(query.page);
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    category: BLOG_CATEGORIES.some((item) => item.id === query.category)
      ? query.category
      : undefined,
    search:
      typeof query.search === "string"
        ? query.search.trim().slice(0, 150)
        : undefined,
  };
}

const fetchList = cache((page: number, category?: string, search?: string) =>
  getPosts({ page, category, search, limit: 10, status: "published" }),
);

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const f = filters(await searchParams);
  const result = await fetchList(f.page, f.category, f.search);
  const title =
    locale === "en"
      ? "Agarwood journal: knowledge, culture & care"
      : "Thư viện trầm hương: Kiến thức, văn hóa & cách dùng";
  const description =
    locale === "en"
      ? "Explore Vietnamese agarwood, how to use and care for incense, and stories from Thien Phuc in Hue. Articles are currently available in Vietnamese."
      : "Tìm hiểu trầm hương, cách chọn, sử dụng và bảo quản; khám phá những câu chuyện về văn hóa thưởng trầm cùng Thiên Phúc tại Huế.";
  const path = `/${locale}${blogUrl(f)}`;
  return {
    title: `${title}${f.page > 1 ? ` · ${locale === "en" ? "Page" : "Trang"} ${f.page}` : ""}`,
    description,
    alternates: {
      canonical: path,
      languages: {
        vi: `/vi${blogUrl(f)}`,
        en: `/en${blogUrl(f)}`,
        "x-default": `/vi${blogUrl(f)}`,
      },
    },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      images: ["/brand/social-card.png"],
    },
    robots:
      f.search || f.category || result.error || result.data.length === 0
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function BlogListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const en = locale === "en";
  const f = filters(await searchParams);
  const {
    data: posts,
    meta,
    error,
  } = await fetchList(f.page, f.category, f.search);
  if (!error && f.page > meta.totalPages) notFound();
  const featured =
    f.page === 1 && !f.search && !f.category
      ? posts.find((post) => post.is_featured) || posts[0]
      : undefined;
  const list = posts.filter((post) => post.id !== featured?.id);
  const pages = Array.from(
    new Set(
      [1, meta.totalPages, f.page - 1, f.page, f.page + 1].filter(
        (page) => page > 0 && page <= meta.totalPages,
      ),
    ),
  ).sort((a, b) => a - b);
  return (
    <div className="journal-page">
      <ShopHeader />
      <main className="journal-main">
        <nav
          className="journal-breadcrumb"
          aria-label={en ? "Breadcrumb" : "Đường dẫn"}
        >
          <Link href="/">{en ? "Home" : "Trang chủ"}</Link>
          <ChevronRight size={12} />
          <span>{en ? "Journal" : "Thư viện"}</span>
        </nav>
        <header className="journal-intro">
          <span className="journal-label">
            {en ? "The agarwood journal" : "Thư viện hương trầm"}
          </span>
          <h1>
            {en
              ? "Stories of scent. A Vietnamese heritage."
              : "Chuyện hương. Nếp Việt."}
          </h1>
          <p>
            {en
              ? "Agarwood knowledge, everyday rituals and stories from Hue."
              : "Kiến thức trầm hương, cách thưởng hương và những câu chuyện từ Huế."}
          </p>
          {en && (
            <p className="journal-language-note">
              Stories are currently written in Vietnamese.
            </p>
          )}
        </header>
        <BlogFilters
          key={`${f.category || ""}:${f.search || ""}`}
          category={f.category}
          search={f.search}
        />
        {error ? (
          <div className="journal-empty" role="alert">
            <h2>
              {en ? "Stories could not be loaded" : "Chưa tải được bài viết"}
            </h2>
            <p>
              {en
                ? "Please try again in a moment."
                : "Kiểm tra kết nối và thử lại sau ít phút."}
            </p>
            <Link className="journal-button" href={blogUrl(f)}>
              {en ? "Try again" : "Thử lại"}
            </Link>
          </div>
        ) : (
          <>
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="journal-featured"
              >
                <BlogCover post={featured} priority />
                <div className="journal-featured-copy">
                  <span className="journal-label">
                    {en ? "Featured story" : "Câu chuyện nổi bật"}
                  </span>
                  <h2 lang="vi">{featured.title}</h2>
                  {featured.excerpt && <p lang="vi">{featured.excerpt}</p>}
                  <div className="journal-meta">
                    <span>{blogCategory(featured.category, locale)}</span>
                    <span aria-hidden="true">·</span>
                    <time
                      dateTime={featured.published_at || featured.created_at}
                    >
                      {blogDate(
                        featured.published_at || featured.created_at,
                        locale,
                      )}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span>
                      {readingMinutes(featured.content)}{" "}
                      {en ? "min read" : "phút đọc"}
                    </span>
                  </div>
                  <span className="journal-text-link">
                    {en ? "Read the story" : "Đọc câu chuyện"}
                  </span>
                </div>
              </Link>
            )}
            <section
              className="journal-list-section"
              aria-labelledby="journal-list-title"
            >
              <div className="journal-section-heading">
                <h2 id="journal-list-title">
                  {f.search
                    ? en
                      ? `Results for “${f.search}”`
                      : `Kết quả cho “${f.search}”`
                    : f.category
                      ? blogCategory(f.category, locale)
                      : en
                        ? "New in the journal"
                        : "Mới trong thư viện"}
                </h2>
                <span className="journal-meta">
                  {meta.totalItems}{" "}
                  {en
                    ? meta.totalItems === 1
                      ? "story"
                      : "stories"
                    : "bài viết"}
                </span>
              </div>
              {posts.length === 0 ? (
                <div className="journal-empty">
                  <h2>
                    {en ? "No matching stories" : "Chưa tìm thấy bài phù hợp"}
                  </h2>
                  <p>
                    {en
                      ? "Try another search or browse all stories."
                      : "Thử từ khóa khác hoặc xem tất cả bài viết."}
                  </p>
                  <Link className="journal-button" href="/blog">
                    {en ? "All stories" : "Xem tất cả bài viết"}
                  </Link>
                </div>
              ) : list.length > 0 ? (
                <div className="journal-grid">
                  {list.map((post) => (
                    <BlogCard key={post.id} post={post} locale={locale} />
                  ))}
                </div>
              ) : (
                <p className="journal-meta">
                  {en
                    ? "More stories will be added to the journal."
                    : "Các bài mới sẽ tiếp tục được cập nhật trong thư viện."}
                </p>
              )}
            </section>
            {meta.totalPages > 1 && (
              <nav
                className="journal-pagination"
                aria-label={en ? "Journal pages" : "Phân trang bài viết"}
              >
                {f.page > 1 && (
                  <Link
                    rel="prev"
                    href={blogUrl({ ...f, page: f.page - 1 })}
                    aria-label={en ? "Previous page" : "Trang trước"}
                  >
                    <ChevronLeft size={18} />
                  </Link>
                )}
                {pages.map((page, i) => (
                  <span key={page}>
                    {i > 0 && page - pages[i - 1] > 1 && (
                      <span className="journal-page-gap">…</span>
                    )}
                    <Link
                      href={blogUrl({ ...f, page })}
                      aria-current={page === f.page ? "page" : undefined}
                      aria-label={`${en ? "Page" : "Trang"} ${page}`}
                    >
                      {page}
                    </Link>
                  </span>
                ))}
                {f.page < meta.totalPages && (
                  <Link
                    rel="next"
                    href={blogUrl({ ...f, page: f.page + 1 })}
                    aria-label={en ? "Next page" : "Trang sau"}
                  >
                    <ChevronRight size={18} />
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </main>
      <ShopFooter />
    </div>
  );
}
