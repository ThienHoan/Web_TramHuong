"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Search, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { BLOG_CATEGORIES, blogUrl } from "@/lib/blog";

export function BlogFilters({
  category,
  search,
}: {
  category?: string;
  search?: string;
}) {
  const en = useLocale() === "en";
  const router = useRouter();
  const [value, setValue] = useState(search || "");
  const [pending, startTransition] = useTransition();
  return (
    <div className="journal-filters" aria-busy={pending}>
      <nav
        className="journal-categories"
        aria-label={en ? "Journal categories" : "Chuyên mục bài viết"}
      >
        {[{ id: "", vi: "Tất cả", en: "All stories" }, ...BLOG_CATEGORIES].map(
          (item) => (
            <Link
              key={item.id}
              href={blogUrl({ category: item.id, search })}
              className="journal-chip"
              aria-current={(category || "") === item.id ? "page" : undefined}
            >
              {item[en ? "en" : "vi"]}
            </Link>
          ),
        )}
      </nav>
      <form
        className="journal-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() =>
            router.push(blogUrl({ category, search: value.trim() })),
          );
        }}
      >
        <label className="sr-only" htmlFor="journal-search">
          {en ? "Search stories" : "Tìm bài viết"}
        </label>
        <Search aria-hidden="true" size={18} />
        <input
          id="journal-search"
          type="search"
          value={value}
          maxLength={150}
          onChange={(e) => setValue(e.target.value)}
          placeholder={en ? "Search stories…" : "Tìm bài viết…"}
        />
        {value && (
          <button
            type="button"
            className="journal-search-clear"
            aria-label={en ? "Clear search" : "Xoá tìm kiếm"}
            onClick={() => {
              setValue("");
              startTransition(() => router.push(blogUrl({ category })));
            }}
          >
            <X size={16} />
          </button>
        )}
        <button
          className="journal-search-submit"
          type="submit"
          disabled={pending}
        >
          {pending ? (en ? "Searching…" : "Đang tìm…") : en ? "Search" : "Tìm"}
        </button>
      </form>
    </div>
  );
}
