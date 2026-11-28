import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { blogCategory, blogDate, readingMinutes } from "@/lib/blog";
import type { BlogPost } from "@/types/blog";

export function BlogCover({
  post,
  priority = false,
}: {
  post: BlogPost;
  priority?: boolean;
}) {
  return (
    <div
      className={`journal-image ${post.cover_image ? "" : "journal-image-empty"}`}
    >
      {post.cover_image ? (
        <Image
          src={post.cover_image}
          alt={post.title}
          fill
          unoptimized
          priority={priority}
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
        />
      ) : (
        <ImageIcon aria-label="Chưa có ảnh bìa" size={28} />
      )}
    </div>
  );
}

export function BlogCard({
  post,
  locale,
  compact = false,
}: {
  post: BlogPost;
  locale: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`journal-card ${compact ? "journal-card-compact" : ""}`}
    >
      <BlogCover post={post} />
      <div className="journal-card-copy">
        <span className="journal-label">
          {blogCategory(post.category, locale)}
        </span>
        <h3 lang="vi">{post.title}</h3>
        {!compact && post.excerpt && <p lang="vi">{post.excerpt}</p>}
        <div className="journal-meta">
          <time dateTime={post.published_at || post.created_at}>
            {blogDate(post.published_at || post.created_at, locale)}
          </time>
          <span aria-hidden="true">·</span>
          <span>
            {readingMinutes(post.content)}{" "}
            {locale === "en" ? "min read" : "phút đọc"}
          </span>
        </div>
      </div>
    </Link>
  );
}
