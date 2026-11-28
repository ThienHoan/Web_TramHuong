"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { Check, CircleAlert, Eye, Save, Upload, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/providers/AuthProvider";
import { createPost, updatePost, getPostBySlug } from "@/lib/api-client";
import type { BlogPost } from "@/types/blog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminCheck,
  AdminField,
  AdminForm,
  AdminFormLoading,
  AdminFormPage,
  AdminFormSection,
  useAdminText,
} from "@/components/admin/AdminForm";
import BlogEditor from "@/components/admin/BlogEditor";
import {
  BLOG_CATEGORIES,
  blogDescription,
  blogSearchTitle,
  blogSeoChecks,
  blogSlug,
  blogText,
} from "@/lib/blog";
import { prepareBlogArticle } from "@/lib/blog-article";
import { sanitizePostHtml } from "@/lib/sanitize-post";
import { uploadProductImage, validateImageFile } from "@/lib/upload";
import { shrinkImageIfNeeded } from "@/lib/shrink-image";
import { SITE_URL } from "@/lib/seo";
import "@/components/admin/blog-admin.css";
import "@/components/blog/blog.css";

type Fields = Pick<
  BlogPost,
  | "title"
  | "slug"
  | "content"
  | "excerpt"
  | "category"
  | "cover_image"
  | "status"
  | "is_featured"
  | "seo_title"
  | "seo_description"
>;
const defaults: Fields = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  cover_image: "",
  status: "draft",
  category: "knowledge",
  is_featured: false,
  seo_title: "",
  seo_description: "",
};
function fields(post: BlogPost): Fields {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [
      key,
      post[key as keyof BlogPost] ?? defaults[key as keyof Fields],
    ]),
  ) as Fields;
}

export default function AdminBlogEditPage() {
  const id = useParams().id as string;
  const isNew = id === "new";
  const { t, locale } = useAdminText();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const hydrated = useRef<string | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<BlogPost>();
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Fields>({ defaultValues: defaults });
  const values = useWatch({ control });
  const {
    data: post,
    isLoading,
    error,
    mutate,
  } = useSWR(
    !isNew && session ? ["blog-editor", id] : null,
    async () => {
      const result = await getPostBySlug(id, true);
      if (!result.data) throw new Error(result.error);
      return result.data;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  useEffect(() => {
    if (isNew && hydrated.current !== "new") {
      reset(defaults);
      setOriginal(undefined);
      hydrated.current = "new";
    } else if (post && hydrated.current !== post.id) {
      reset(fields(post));
      setOriginal(post);
      hydrated.current = post.id;
    }
  }, [isNew, post, reset]);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const save = async (data: Fields, publish = false) => {
    try {
      const payload = {
        ...data,
        title: data.title.trim(),
        slug: original?.published_at
          ? original.slug
          : blogSlug(data.slug || data.title),
        content: sanitizePostHtml(data.content || ""),
        status: publish ? ("published" as const) : data.status,
      };
      const saved = isNew
        ? await createPost(payload)
        : await updatePost(id, payload);
      reset(fields(saved));
      setOriginal(saved);
      hydrated.current = saved.id;
      toast.success(
        publish
          ? t("Đã xuất bản bài viết", "Post published")
          : t("Đã lưu bài viết", "Post saved"),
      );
      if (isNew) router.replace(`/admin/blog/${saved.id}`);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "";
      toast.error(
        /duplicate|unique/i.test(message)
          ? t(
              "Đường dẫn này đã có bài khác sử dụng.",
              "Another post already uses this URL.",
            )
          : message ||
              t(
                "Chưa lưu được bài viết. Nội dung vẫn còn ở đây.",
                "Could not save. Your content is still here.",
              ),
      );
    }
  };
  if (authLoading || (!isNew && (isLoading || (!error && !post))))
    return <AdminFormLoading />;
  if (error)
    return (
      <div className="blog-admin-state" role="alert">
        <h1>{t("Chưa tải được bài viết", "Post could not be loaded")}</h1>
        <p>
          {t(
            "Thử tải lại để tiếp tục chỉnh sửa.",
            "Try again to continue editing.",
          )}
        </p>
        <Button variant="outline" onClick={() => mutate()}>
          {t("Thử lại", "Try again")}
        </Button>
      </div>
    );
  const busy = isSubmitting || uploading;
  const checks = blogSeoChecks(values);
  const handle = values.slug || blogSlug(values.title || "");
  return (
    <AdminFormPage
      backHref="/admin/blog"
      backLabel={t("Bài viết", "Journal")}
      title={
        isNew
          ? t("Viết bài mới", "Write a post")
          : t("Soạn bài viết", "Edit post")
      }
      description={t(
        "Nội dung rõ ràng, thông tin SEO đủ trước khi xuất bản.",
        "Write clearly and prepare your search metadata before publishing.",
      )}
    >
      <div className="blog-editor-top-actions">
        <span aria-live="polite">
          {isDirty
            ? t("Có thay đổi chưa lưu", "Unsaved changes")
            : t("Không có thay đổi chưa lưu", "No unsaved changes")}
        </span>
        <Button
          variant="outline"
          type="button"
          disabled={busy}
          onClick={() => setPreview(true)}
        >
          <Eye size={16} />
          {t("Xem trước", "Preview")}
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={busy}
          onClick={() => {
            void handleSubmit((data) => save(data))();
          }}
        >
          <Save size={16} />
          {values.status !== "draft"
            ? t("Lưu thay đổi", "Save changes")
            : t("Lưu nháp", "Save draft")}
        </Button>
      </div>
      <AdminForm
        onSubmit={(event) => {
          void handleSubmit((data) => save(data))(event);
        }}
        busy={busy}
        actions={
          <footer className="blog-editor-actions">
            <p>
              {values.status === "published"
                ? t(
                    "Bài đã xuất bản đang hiển thị với khách.",
                    "Published posts are visible to customers.",
                  )
                : t(
                    "Bài chưa xuất bản không hiển thị với khách.",
                    "Unpublished posts are not visible to customers.",
                  )}
            </p>
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => router.push("/admin/blog")}
              >
                {t("Về danh sách", "Back to posts")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  void handleSubmit((data) => save(data, true))();
                }}
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {values.status === "published"
                  ? t("Cập nhật bài viết", "Update post")
                  : t("Xuất bản bài viết", "Publish post")}
              </Button>
            </div>
          </footer>
        }
        side={
          <>
            <AdminFormSection
              id="post-publishing"
              title={t("Xuất bản", "Publishing")}
            >
              <AdminField id="post-status" label={t("Trạng thái", "Status")}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="post-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="admin-menu">
                        <SelectItem value="draft">
                          {t("Bản nháp", "Draft")}
                        </SelectItem>
                        <SelectItem value="published">
                          {t("Đã xuất bản", "Published")}
                        </SelectItem>
                        <SelectItem value="archived">
                          {t("Lưu trữ", "Archived")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </AdminField>
              <AdminField
                id="post-category"
                label={t("Chuyên mục", "Category")}
              >
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="post-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="admin-menu">
                        {BLOG_CATEGORIES.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item[locale === "en" ? "en" : "vi"]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </AdminField>
              <AdminField
                id="post-slug"
                label={t("Đường dẫn bài viết", "Post URL handle")}
                hint={
                  original?.published_at
                    ? t(
                        "Giữ cố định đường dẫn bài đã xuất bản để bảo toàn các liên kết.",
                        "Published URLs stay fixed to preserve existing links.",
                      )
                    : t(
                        "Để trống để tạo từ tiêu đề.",
                        "Leave blank to generate from the title.",
                      )
                }
              >
                <Input
                  id="post-slug"
                  readOnly={!!original?.published_at}
                  maxLength={200}
                  placeholder={blogSlug(values.title || "")}
                  {...register("slug")}
                />
              </AdminField>
              <AdminCheck
                id="post-featured"
                label={t("Bài nổi bật", "Featured story")}
                {...register("is_featured")}
              />
            </AdminFormSection>
            <AdminFormSection
              id="post-cover"
              title={t("Ảnh bìa", "Cover image")}
            >
              {values.cover_image && (
                <div className="blog-editor-cover">
                  <Image
                    src={values.cover_image}
                    alt={
                      values.title || t("Ảnh bìa xem trước", "Cover preview")
                    }
                    width={800}
                    height={450}
                    unoptimized
                  />
                </div>
              )}
              <input
                hidden
                ref={uploadInput}
                type="file"
                aria-hidden="true"
                tabIndex={-1}
                accept="image/jpeg,image/png,image/webp,image/avif"
                aria-label={t("Tải ảnh bìa", "Upload cover image")}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    const prepared = await shrinkImageIfNeeded(file);
                    validateImageFile(prepared);
                    const url = await uploadProductImage(prepared);
                    setValue("cover_image", url, { shouldDirty: true });
                  } catch (failure) {
                    toast.error(
                      failure instanceof Error
                        ? failure.message
                        : t("Tải ảnh thất bại", "Upload failed"),
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => uploadInput.current?.click()}
                >
                  <Upload size={16} />
                  {uploading
                    ? t("Đang tải…", "Uploading…")
                    : t("Chọn ảnh", "Choose image")}
                </Button>
                {values.cover_image && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setValue("cover_image", "", { shouldDirty: true })
                    }
                  >
                    {t("Gỡ ảnh", "Remove")}
                  </Button>
                )}
              </div>
              <AdminField
                id="post-cover-url"
                label={t("Hoặc dùng URL ảnh", "Or use an image URL")}
              >
                <Input
                  id="post-cover-url"
                  type="text"
                  inputMode="url"
                  placeholder="https://…"
                  {...register("cover_image")}
                />
              </AdminField>
            </AdminFormSection>
            <AdminFormSection
              id="post-checklist"
              title={t("Góp ý trước khi đăng", "Before publishing")}
            >
              <ul className="blog-seo-checks">
                {checks.map((item) => (
                  <li key={item.id} className={item.done ? "done" : ""}>
                    {item.done ? (
                      <Check size={16} />
                    ) : (
                      <CircleAlert size={16} />
                    )}
                    <span>{item[locale === "en" ? "en" : "vi"]}</span>
                  </li>
                ))}
              </ul>
              <p className="blog-editor-note">
                {t(
                  "Góp ý biên tập, không phải điểm xếp hạng Google.",
                  "Editorial suggestions, not a Google ranking score.",
                )}
              </p>
            </AdminFormSection>
          </>
        }
      >
        <AdminFormSection
          id="post-content"
          title={t("Nội dung bài viết", "Post content")}
        >
          <AdminField id="post-title" label={t("Tiêu đề", "Title")} required>
            <Input
              id="post-title"
              className="blog-editor-title"
              maxLength={200}
              aria-invalid={!!errors.title}
              {...register("title", { validate: (value) => !!value.trim() })}
            />
            {errors.title && (
              <p className="blog-editor-error" role="alert">
                {t("Vui lòng nhập tiêu đề.", "Title is required.")}
              </p>
            )}
          </AdminField>
          <AdminField
            id="post-excerpt"
            label={t("Mô tả ngắn", "Excerpt")}
            hint={t(
              "Hiển thị ở danh sách bài viết.",
              "Shown in the post list.",
            )}
          >
            <textarea
              id="post-excerpt"
              rows={3}
              maxLength={500}
              {...register("excerpt")}
            />
          </AdminField>
          <AdminField id="post-body" label={t("Nội dung", "Content")} required>
            <Controller
              control={control}
              name="content"
              rules={{ validate: (value) => !!blogText(value) }}
              render={({ field }) => (
                <BlogEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={busy}
                  invalid={!!errors.content}
                />
              )}
            />
            {errors.content && (
              <p role="alert" className="blog-editor-error">
                {t(
                  "Vui lòng viết nội dung trước khi lưu.",
                  "Write some content before saving.",
                )}
              </p>
            )}
          </AdminField>
        </AdminFormSection>
        <AdminFormSection
          id="post-seo"
          title={t("Hiển thị trên tìm kiếm", "Search appearance")}
          description={t(
            "Chỉnh thông tin giúp người đọc nhận ra nội dung bài.",
            "Help readers understand what this post is about.",
          )}
        >
          <AdminField
            id="post-seo-title"
            label={t("Tiêu đề SEO", "SEO title")}
            hint={t(
              "Để trống sẽ dùng tiêu đề bài viết. Viết rõ nội dung, tránh lặp từ khóa.",
              "Leave blank to use the post title. Be specific and avoid repeating keywords.",
            )}
          >
            <Input
              id="post-seo-title"
              maxLength={160}
              {...register("seo_title")}
            />
            <span className="blog-editor-counter">
              {values.seo_title?.length || 0}/160
            </span>
          </AdminField>
          <AdminField
            id="post-seo-description"
            label={t("Mô tả SEO", "SEO description")}
            hint={t(
              "Tóm tắt giá trị của bài bằng một hoặc hai câu. Để trống sẽ dùng mô tả ngắn.",
              "Summarize the value in one or two sentences. Leave blank to use the excerpt.",
            )}
          >
            <textarea
              id="post-seo-description"
              rows={3}
              maxLength={300}
              {...register("seo_description")}
            />
            <span className="blog-editor-counter">
              {values.seo_description?.length || 0}/300
            </span>
          </AdminField>
          <div className="blog-search-preview">
            <p>
              {SITE_URL.replace(/^https?:\/\//, "")} › vi › blog ›{" "}
              {handle || "…"}
            </p>
            <h3>
              {blogSearchTitle(values) || t("Tiêu đề bài viết", "Post title")}
            </h3>
            <p>
              {blogDescription(values) ||
                t(
                  "Mô tả bài viết sẽ xuất hiện ở đây.",
                  "Your description will appear here.",
                )}
            </p>
          </div>
          <p className="blog-editor-note">
            {t(
              "Minh họa cách hiển thị. Google có thể chọn tiêu đề hoặc mô tả khác theo truy vấn.",
              "Preview only. Google may choose a different title or description for a query.",
            )}
          </p>
        </AdminFormSection>
      </AdminForm>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent
          className="admin-dialog blog-preview-dialog"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{t("Xem trước bài viết", "Post preview")}</DialogTitle>
          </DialogHeader>
          <div className="journal-page blog-preview-page">
            <span className="journal-label">
              {
                BLOG_CATEGORIES.find((item) => item.id === values.category)?.[
                  locale === "en" ? "en" : "vi"
                ]
              }
            </span>
            <h2>{values.title || t("Bài chưa có tiêu đề", "Untitled post")}</h2>
            {values.cover_image && (
              <div className="blog-editor-cover">
                <Image
                  src={values.cover_image}
                  alt={values.title || ""}
                  width={800}
                  height={450}
                  unoptimized
                />
              </div>
            )}
            <p>{values.excerpt}</p>
            <div
              className="journal-prose"
              lang="vi"
              dangerouslySetInnerHTML={{
                __html: prepareBlogArticle(values.content).html,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AdminFormPage>
  );
}
