"use client";

import { useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { useDebounce } from "use-debounce";
import {
  FileText,
  Plus,
  Search,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  CircleAlert,
  Eye,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getPosts, deletePost } from "@/lib/api-client";
import { Link } from "@/i18n/routing";
import {
  blogCategory,
  blogStatus,
  blogDate,
  blogSeoChecks,
  BLOG_CATEGORIES,
} from "@/lib/blog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminText } from "@/components/admin/AdminForm";
import { toast } from "sonner";
import type { BlogPost } from "@/types/blog";
import "./blog-admin.css";

function MissingSeo({ post, locale }: { post: BlogPost; locale: string }) {
  const missing = blogSeoChecks(post).filter((check) => !check.done);
  return (
    <span
      className={`blog-admin-seo ${missing.length ? "needs-work" : "ready"}`}
    >
      {missing.length ? <CircleAlert size={14} /> : <Check size={14} />}
      {missing.length
        ? `${missing.length} ${locale === "en" ? "suggestions" : "mục cần bổ sung"}`
        : locale === "en"
          ? "Basics complete"
          : "Đủ mục cơ bản"}
    </span>
  );
}
export default function BlogManager() {
  const { locale, t } = useAdminText();
  const { session, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [term] = useDebounce(search.trim(), 350);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<BlogPost>();
  const {
    data: result,
    isLoading,
    mutate,
    error,
  } = useSWR(
    session ? ["blog-manager", term, status, category, page, sort] : null,
    async () => {
      const value = await getPosts({
        search: term,
        status,
        category: category === "all" ? undefined : category,
        page,
        limit: 12,
        sort,
        admin: true,
      });
      if (value.error) throw new Error(value.error);
      return value;
    },
    { keepPreviousData: true },
  );
  const posts = result?.data || [];
  const selected = posts.find((post) => post.id === selectedId) || posts[0];
  const busy = authLoading || isLoading;
  const meta = result?.meta;
  return (
    <section className="admin-page blog-manager">
      <header className="admin-page-heading">
        <div>
          <h1>{t("Bài viết", "Journal")}</h1>
          <p>
            {t(
              "Soạn nội dung, rà SEO và quản lý xuất bản.",
              "Write stories, review SEO and manage publishing.",
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus size={16} />
            {t("Viết bài", "Write a post")}
          </Link>
        </Button>
      </header>
      <div className="blog-admin-filters">
        <div
          className="blog-admin-tabs"
          aria-label={t("Trạng thái bài viết", "Post status")}
        >
          {[
            ["all", t("Tất cả", "All")],
            ["draft", t("Bản nháp", "Drafts")],
            ["published", t("Đã xuất bản", "Published")],
            ["archived", t("Lưu trữ", "Archived")],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={status === id}
              onClick={() => {
                setStatus(id);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="blog-admin-toolbar">
          <div className="blog-admin-search">
            <Search size={17} aria-hidden="true" />
            <Input
              type="search"
              aria-label={t("Tìm bài viết", "Search posts")}
              placeholder={t("Tìm bài viết…", "Search posts…")}
              value={search}
              maxLength={150}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label={t("Chuyên mục", "Category")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-menu">
              <SelectItem value="all">
                {t("Tất cả chuyên mục", "All categories")}
              </SelectItem>
              {BLOG_CATEGORIES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item[locale === "en" ? "en" : "vi"]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label={t("Sắp xếp", "Sort posts")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-menu">
              <SelectItem value="updated">
                {t("Mới cập nhật", "Recently updated")}
              </SelectItem>
              <SelectItem value="title">
                {t("Tiêu đề A–Z", "Title A–Z")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error ? (
        <div className="blog-admin-state" role="alert">
          <h2>{t("Chưa tải được bài viết", "Posts could not be loaded")}</h2>
          <p>
            {t(
              "Kiểm tra kết nối và thử lại.",
              "Check your connection and try again.",
            )}
          </p>
          <Button variant="outline" onClick={() => mutate()}>
            {t("Thử lại", "Try again")}
          </Button>
        </div>
      ) : busy ? (
        <div
          className="blog-admin-split"
          role="status"
          aria-label={t("Đang tải bài viết", "Loading posts")}
        >
          <div className="blog-admin-panel">
            {[1, 2, 3, 4].map((id) => (
              <Skeleton key={id} className="h-20 m-4" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : !session ? (
        <div className="blog-admin-state">
          <p>
            {t(
              "Vui lòng đăng nhập để quản lý bài viết.",
              "Sign in to manage posts.",
            )}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="blog-admin-state">
          <h2>
            {term || category !== "all" || status !== "all"
              ? t("Chưa tìm thấy bài phù hợp", "No matching posts")
              : t("Chưa có bài viết", "No posts yet")}
          </h2>
          <p>
            {t(
              "Tạo bài mới hoặc thay đổi bộ lọc để tiếp tục.",
              "Create a post or adjust your filters.",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            {(term || category !== "all" || status !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setStatus("all");
                  setPage(1);
                }}
              >
                {t("Xoá lọc", "Clear filters")}
              </Button>
            )}
            <Button asChild>
              <Link href="/admin/blog/new">
                <Plus size={16} />
                {t("Viết bài", "Write a post")}
              </Link>
            </Button>
          </div>
          {page > 1 && (
            <Button variant="outline" onClick={() => setPage(page - 1)}>
              {t("Trang trước", "Previous page")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="blog-admin-split">
            <div
              className="blog-admin-panel blog-admin-list"
              aria-label={t("Danh sách bài viết", "Post list")}
            >
              {posts.map((post) => (
                <button
                  type="button"
                  key={post.id}
                  className={`blog-admin-item ${selected?.id === post.id ? "selected" : ""}`}
                  aria-pressed={selected?.id === post.id}
                  onClick={() => setSelectedId(post.id)}
                >
                  <span className="blog-admin-thumb">
                    {post.cover_image ? (
                      <Image
                        src={post.cover_image}
                        alt=""
                        width={112}
                        height={104}
                        unoptimized
                      />
                    ) : (
                      <ImageIcon size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="blog-admin-item-copy">
                    <strong>{post.title}</strong>
                    <span className="blog-admin-item-meta">
                      <span
                        className={`blog-admin-status ${post.status === "published" ? "published" : ""}`}
                      >
                        {blogStatus(post.status, locale)}
                      </span>
                      <span>
                        {blogDate(post.updated_at || post.created_at, locale)}
                      </span>
                    </span>
                    <MissingSeo post={post} locale={locale} />
                  </span>
                </button>
              ))}
            </div>
            {selected && (
              <section
                className="blog-admin-panel blog-admin-preview"
                aria-label={t("Xem nhanh bài viết", "Post preview")}
                aria-live="polite"
              >
                {selected.cover_image && (
                  <div className="blog-admin-preview-cover">
                    <Image
                      src={selected.cover_image}
                      alt={selected.title}
                      width={800}
                      height={450}
                      unoptimized
                    />
                  </div>
                )}
                <div className="blog-admin-preview-body">
                  <div className="blog-admin-item-meta">
                    <span>{blogCategory(selected.category, locale)}</span>
                    <span
                      className={`blog-admin-status ${selected.status === "published" ? "published" : ""}`}
                    >
                      {blogStatus(selected.status, locale)}
                    </span>
                  </div>
                  <h2>{selected.title}</h2>
                  {selected.excerpt && <p>{selected.excerpt}</p>}
                  <MissingSeo post={selected} locale={locale} />
                  <ul className="blog-seo-checks">
                    {blogSeoChecks(selected)
                      .filter((item) => !item.done)
                      .map((item) => (
                        <li key={item.id}>
                          <CircleAlert size={16} />
                          <span>{item[locale === "en" ? "en" : "vi"]}</span>
                        </li>
                      ))}
                  </ul>
                  <div className="blog-admin-preview-actions">
                    <Button asChild>
                      <Link href={`/admin/blog/${selected.id}`}>
                        <FileText size={16} />
                        {t("Chỉnh sửa bài", "Edit post")}
                      </Link>
                    </Button>
                    {selected.status === "published" && (
                      <Button variant="outline" asChild>
                        <Link href={`/blog/${selected.slug}`}>
                          <Eye size={16} />
                          {t("Xem bài", "View post")}
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="blog-admin-delete"
                      onClick={() => setConfirm(selected)}
                    >
                      <Trash2 size={16} />
                      {t("Xoá", "Delete")}
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>
          <footer className="blog-admin-pagination">
            <span>
              {meta?.totalItems || 0}{" "}
              {locale === "en"
                ? meta?.totalItems === 1
                  ? "post"
                  : "posts"
                : "bài viết"}{" "}
              · {t("Trang", "Page")} {page}/{meta?.totalPages || 1}
            </span>
            <div>
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                aria-label={t("Trang trước", "Previous page")}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= (meta?.totalPages || 1)}
                aria-label={t("Trang sau", "Next page")}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </footer>
        </>
      )}
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirm(undefined);
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>{t("Xoá bài viết?", "Delete this post?")}</DialogTitle>
            <DialogDescription>
              {t(
                "Bài viết sẽ bị xoá và không thể khôi phục.",
                "The post will be deleted permanently.",
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="font-medium">{confirm?.title}</p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setConfirm(undefined)}
            >
              {t("Huỷ", "Cancel")}
            </Button>
            <Button
              className="blog-admin-delete"
              variant="ghost"
              disabled={deleting}
              onClick={async () => {
                if (!confirm) return;
                setDeleting(true);
                try {
                  await deletePost(confirm.id);
                  setConfirm(undefined);
                  setSelectedId(undefined);
                  await mutate();
                  toast.success(t("Đã xoá bài viết", "Post deleted"));
                } catch {
                  toast.error(
                    t("Chưa xoá được bài viết", "Could not delete post"),
                  );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting
                ? t("Đang xoá…", "Deleting…")
                : t("Xoá bài viết", "Delete post")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
