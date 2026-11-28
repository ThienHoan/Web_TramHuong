"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  Link as LinkIcon,
  ImageIcon,
  Eye,
  Code,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { sanitizePostHtml } from "@/lib/sanitize-post";
import { blogText, readingMinutes } from "@/lib/blog";
import { useAdminText } from "@/components/admin/AdminForm";

export default function BlogEditor({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const { t } = useAdminText();
  const ref = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const [source, setSource] = useState(false);
  const [insert, setInsert] = useState<"link" | "image">();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current)
      ref.current.innerHTML = sanitizePostHtml(value);
  }, [value, source]);
  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };
  const rememberSelection = () => {
    const current = window.getSelection();
    if (current?.rangeCount && ref.current?.contains(current.anchorNode))
      selection.current = current.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    ref.current?.focus();
    if (
      selection.current &&
      ref.current?.contains(selection.current.commonAncestorContainer)
    ) {
      const current = window.getSelection();
      current?.removeAllRanges();
      current?.addRange(selection.current);
    }
  };
  const command = (name: string, argument?: string) => {
    restore();
    // Native editing retains browser undo/redo; all output is sanitized before preview/render.
    document.execCommand(name, false, argument);
    emit();
    rememberSelection();
  };
  const handleToolbarAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    const { action, argument } = event.currentTarget.dataset;
    if (action) command(action, argument);
  };
  const toolbar = [
    {
      name: t("Tiêu đề H2", "Heading H2"),
      icon: Heading2,
      action: "formatBlock",
      argument: "h2",
    },
    { name: t("In đậm", "Bold"), icon: Bold, action: "bold" },
    { name: t("In nghiêng", "Italic"), icon: Italic, action: "italic" },
    { name: t("Danh sách", "List"), icon: List, action: "insertUnorderedList" },
    { name: t("Hoàn tác", "Undo"), icon: Undo2, action: "undo" },
    { name: t("Làm lại", "Redo"), icon: Redo2, action: "redo" },
  ];
  return (
    <div className="blog-rich-editor">
      <div
        className="blog-editor-toolbar"
        role="toolbar"
        aria-label={t("Định dạng nội dung", "Content formatting")}
      >
        {!source &&
          toolbar.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={disabled}
              title={item.name}
              aria-label={item.name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleToolbarAction}
              data-action={item.action}
              data-argument={item.argument}
            >
              <item.icon size={17} />
            </button>
          ))}
        {!source && (
          <>
            <button
              type="button"
              disabled={disabled}
              title={t("Chèn liên kết", "Insert link")}
              aria-label={t("Chèn liên kết", "Insert link")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                rememberSelection();
                setInsert("link");
                setUrl("");
                setError("");
              }}
            >
              <LinkIcon size={17} />
            </button>
            <button
              type="button"
              disabled={disabled}
              title={t("Chèn ảnh", "Insert image")}
              aria-label={t("Chèn ảnh", "Insert image")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                rememberSelection();
                setInsert("image");
                setUrl("");
                setAlt("");
                setError("");
              }}
            >
              <ImageIcon size={17} />
            </button>
          </>
        )}
        <button
          type="button"
          disabled={disabled}
          title={
            source
              ? t("Soạn trực quan", "Visual editor")
              : t("Sửa HTML", "Edit HTML")
          }
          aria-label={
            source
              ? t("Soạn trực quan", "Visual editor")
              : t("Sửa HTML", "Edit HTML")
          }
          className={source ? "active" : ""}
          onClick={() => setSource(!source)}
        >
          {source ? <Eye size={17} /> : <Code size={17} />}
        </button>
      </div>
      {source ? (
        <textarea
          id="post-body"
          aria-label={t("Nội dung HTML", "HTML content")}
          aria-invalid={invalid}
          value={value}
          rows={16}
          disabled={disabled}
          className="blog-editor-source"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div
          id="post-body"
          ref={ref}
          className="blog-editor-content"
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-label={t("Nội dung bài viết", "Post content")}
          aria-multiline="true"
          aria-invalid={invalid}
          tabIndex={0}
          onInput={emit}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
          onPaste={(event) => {
            event.preventDefault();
            command("insertText", event.clipboardData.getData("text/plain"));
          }}
          onDrop={(event) => event.preventDefault()}
        />
      )}
      <div className="blog-editor-stats">
        <span>
          {blogText(value).split(/\s+/).filter(Boolean).length}{" "}
          {t("từ", "words")} · {readingMinutes(value)}{" "}
          {t("phút đọc", "min read")}
        </span>
        <span>
          {t("H1 đã được dùng cho tiêu đề bài.", "The post title is the H1.")}
        </span>
      </div>
      <Dialog
        open={!!insert}
        onOpenChange={(open) => {
          if (!open) setInsert(undefined);
        }}
      >
        <DialogContent className="admin-dialog" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {insert === "image"
                ? t("Chèn ảnh trong bài", "Insert content image")
                : t("Chèn liên kết", "Insert link")}
            </DialogTitle>
          </DialogHeader>
          <div className="admin-field">
            <label htmlFor="editor-url">{t("Địa chỉ URL", "URL")}</label>
            <Input
              id="editor-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              aria-invalid={!!error}
            />
          </div>
          {insert === "image" && (
            <div className="admin-field">
              <label htmlFor="editor-image-alt">
                {t("Mô tả ảnh", "Image description")}
              </label>
              <Input
                id="editor-image-alt"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                maxLength={250}
              />
              <p>
                {t(
                  "Mô tả ngắn nội dung ảnh để người đọc và công cụ tìm kiếm hiểu.",
                  "Briefly describe the image for readers and search engines.",
                )}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="blog-editor-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInsert(undefined)}
            >
              {t("Huỷ", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const trimmed = url.trim();
                if (
                  !/^(https?:\/\/|\/(?!\/)|#)/i.test(trimmed) ||
                  (insert === "image" && !alt.trim())
                ) {
                  setError(
                    t(
                      "Nhập URL hợp lệ và mô tả ảnh nếu chèn ảnh.",
                      "Enter a valid URL and an image description when inserting an image.",
                    ),
                  );
                  return;
                }
                if (insert === "image") {
                  const img = document.createElement("img");
                  img.src = trimmed;
                  img.alt = alt.trim();
                  command("insertHTML", img.outerHTML);
                } else {
                  restore();
                  if (window.getSelection()?.isCollapsed) {
                    const a = document.createElement("a");
                    a.href = trimmed;
                    a.textContent = trimmed;
                    command("insertHTML", a.outerHTML);
                  } else command("createLink", trimmed);
                }
                setInsert(undefined);
              }}
            >
              {t("Chèn", "Insert")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
