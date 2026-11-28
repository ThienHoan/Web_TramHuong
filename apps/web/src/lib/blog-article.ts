import { sanitizePostHtml } from "@/lib/sanitize-post";
import { blogSlug, blogText } from "@/lib/blog";

export function prepareBlogArticle(content = "") {
  const headings: { id: string; text: string; level: number }[] = [];
  const html = sanitizePostHtml(content)
    .replace(/<(\/?)(h1)\b/gi, "<$1h2")
    .replace(/<(h[23])>([\s\S]*?)<\/\1>/gi, (_, tag: string, body: string) => {
      const text = blogText(body);
      const id = `article-${blogSlug(text) || "section"}-${headings.length + 1}`;
      headings.push({ id, text, level: Number(tag[1]) });
      return `<${tag} id="${id}">${body}</${tag}>`;
    })
    .replace(/<img\b([^>]*)>/gi, '<img$1 loading="lazy" decoding="async">');
  return { html, headings };
}
