"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import "./pagination.css";

interface PaginationProps {
  meta: { page: number; last_page: number; total: number; limit: number };
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  disabled?: boolean;
  locale?: string;
}
export default function Pagination({
  meta,
  onPageChange,
  onLimitChange,
  disabled = false,
  locale = "vi",
}: PaginationProps) {
  const en = locale === "en";
  const last = Math.max(1, meta.last_page);
  const start = meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const end = Math.min(meta.page * meta.limit, meta.total);
  const left = Math.max(1, Math.min(meta.page - 2, last - 4));
  const pages = Array.from({ length: Math.min(5, last) }, (_, i) => left + i);
  if (!meta.total && !onLimitChange) return null;
  return (
    <div className="admin-pagination">
      <p aria-live="polite">
        {en ? "Showing" : "Hiển thị"}{" "}
        <strong>
          {start}–{end}
        </strong>{" "}
        {en ? "of" : "trong"}{" "}
        <strong>{meta.total.toLocaleString(locale)}</strong>{" "}
        {en ? "results" : "kết quả"}
      </p>
      <div className="admin-pagination-controls">
        {onLimitChange && (
          <div className="admin-page-size">
            <span id="pagination-limit-label">
              {en ? "Rows per page" : "Số dòng"}
            </span>
            <Select
              value={String(meta.limit)}
              onValueChange={(value) => onLimitChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger
                aria-labelledby="pagination-limit-label"
                className="w-20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <nav aria-label={en ? "Pagination" : "Phân trang"}>
          <Button
            size="icon"
            variant="outline"
            aria-label={en ? "Previous page" : "Trang trước"}
            disabled={disabled || meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          {left > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                disabled={disabled}
                onClick={() => onPageChange(1)}
              >
                1
              </Button>
              {left > 2 && <span className="admin-page-ellipsis">…</span>}
            </>
          )}
          {pages.map((page) => (
            <Button
              size="icon"
              variant={page === meta.page ? "default" : "ghost"}
              key={page}
              disabled={disabled}
              aria-label={`${en ? "Page" : "Trang"} ${page}`}
              aria-current={page === meta.page ? "page" : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}
          {pages.at(-1)! < last && (
            <>
              {pages.at(-1)! < last - 1 && (
                <span className="admin-page-ellipsis">…</span>
              )}
              <Button
                size="icon"
                variant="ghost"
                disabled={disabled}
                onClick={() => onPageChange(last)}
              >
                {last}
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="outline"
            aria-label={en ? "Next page" : "Trang sau"}
            disabled={disabled || meta.page >= last}
            onClick={() => onPageChange(meta.page + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </nav>
      </div>
    </div>
  );
}
