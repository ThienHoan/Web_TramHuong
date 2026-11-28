import type { BlogPost } from "@/types/blog";

export const BLOG_CATEGORIES = [
  { id: "knowledge", vi: "Kiến thức", en: "Knowledge" },
  { id: "culture", vi: "Văn hóa", en: "Culture" },
  { id: "health", vi: "Đời sống", en: "Everyday rituals" },
] as const;

export function blogCategory(category: string | undefined, locale = "vi") {
  const found = BLOG_CATEGORIES.find((item) => item.id === category);
  return found
    ? found[locale === "en" ? "en" : "vi"]
    : locale === "en"
      ? "Journal"
      : "Thư viện";
}

export function blogText(html = "") {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const point =
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    })
    .replace(
      /&(nbsp|amp|lt|gt|quot|apos|#39);/gi,
      (entity) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
          "&#39;": "'",
        })[entity.toLowerCase()] || entity,
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function blogSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200)
    .replace(/-$/, "");
}

export function readingMinutes(content = "") {
  const words = blogText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function blogDate(value: string | undefined, locale = "vi") {
  return value && !Number.isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "";
}

export function blogUrl(
  options: { page?: number; category?: string; search?: string } = {},
) {
  const query = new URLSearchParams();
  if (options.category) query.set("category", options.category);
  if (options.search) query.set("search", options.search);
  if (options.page && options.page > 1) query.set("page", String(options.page));
  return `/blog${query.size ? `?${query}` : ""}`;
}

export function blogSeoChecks(post: Partial<BlogPost>) {
  return [
    {
      id: "title",
      vi: "Có tiêu đề SEO hoặc tiêu đề bài viết",
      en: "Search title is available",
      done: !!(post.seo_title?.trim() || post.title?.trim()),
    },
    {
      id: "description",
      vi: "Có mô tả SEO hoặc mô tả ngắn",
      en: "Search description is available",
      done: !!(post.seo_description?.trim() || post.excerpt?.trim()),
    },
    {
      id: "cover",
      vi: "Có ảnh bìa bài viết",
      en: "Cover image is available",
      done: !!post.cover_image,
    },
    {
      id: "headings",
      vi: "Chia nội dung bằng các tiêu đề H2",
      en: "Content has H2 headings",
      done: /<h2\b/i.test(post.content || ""),
    },
    {
      id: "links",
      vi: "Thêm liên kết liên quan trong nội dung",
      en: "Add useful links in the content",
      done: /<a\b[^>]*href\s*=/i.test(post.content || ""),
    },
    {
      id: "image-alt",
      vi: "Ảnh trong bài có mô tả thay thế",
      en: "Content images have alternative text",
      done: !(post.content || "")
        .match(/<img\b[^>]*>/gi)
        ?.some((img) => !/\balt\s*=\s*(["'])[^"']+\1/i.test(img)),
    },
  ];
}

export function blogSearchTitle(post: Partial<BlogPost>) {
  return `${post.seo_title?.trim() || post.title?.trim() || ""} | Thiên Phúc`;
}

export function blogDescription(post: Partial<BlogPost>) {
  return blogText(
    post.seo_description?.trim() || post.excerpt?.trim() || post.content,
  ).slice(0, 300);
}

export function blogStatus(status: BlogPost["status"], locale = "vi") {
  if (status === "published")
    return locale === "en" ? "Published" : "Đã xuất bản";
  if (status === "archived") return locale === "en" ? "Archived" : "Lưu trữ";
  return locale === "en" ? "Draft" : "Bản nháp";
}
