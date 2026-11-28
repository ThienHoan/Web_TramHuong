"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function ArticleToc({
  headings,
  locale,
}: {
  headings: { id: string; text: string; level: number }[];
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  if (headings.length < 2) return null;
  return (
    <nav
      className={`journal-toc ${open ? "is-open" : ""}`}
      aria-label={locale === "en" ? "On this page" : "Mục lục bài viết"}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="article-toc-items"
        onClick={() => setOpen(!open)}
      >
        {locale === "en" ? "On this page" : "Trong bài viết"}
        <ChevronDown size={18} />
      </button>
      <div id="article-toc-items" className="journal-toc-items">
        {headings.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            lang="vi"
            className={item.level === 3 ? "journal-toc-sub" : ""}
          >
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
