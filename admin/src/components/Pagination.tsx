"use client";

import { useState, useEffect, useMemo } from "react";

interface UsePaginationOptions {
  pageSize: number;
  resetKey?: string | number;
}

/**
 * Hook that paginates an array of items.
 * Returns the current page slice, page info, and controls.
 */
export function usePagination<T>(items: T[], { pageSize, resetKey }: UsePaginationOptions) {
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever the reset key changes or data reloads
  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  const pagedItems = useMemo(() => {
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    pageCount,
    pageSize,
    pagedItems,
    totalItems: items.length,
    start: safePage * pageSize + 1,
    end: Math.min((safePage + 1) * pageSize, items.length),
  };
}

interface PaginationProps {
  page: number;
  pageCount: number;
  totalItems: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  itemName: string;
}

/**
 * Reusable pagination footer matching the UserTable style.
 */
export default function Pagination({
  page,
  pageCount,
  totalItems,
  start,
  end,
  onPageChange,
  itemName,
}: PaginationProps) {
  if (totalItems === 0) return null;

  // Show at most 5 page buttons with ellipsis
  const maxButtons = 5;
  let buttons: (number | "...")[] = [];
  if (pageCount <= maxButtons + 2) {
    buttons = Array.from({ length: pageCount }, (_, i) => i);
  } else {
    const left = Math.max(0, page - 2);
    const right = Math.min(pageCount - 1, page + 2);
    if (left > 0) buttons.push(0);
    if (left > 1) buttons.push("...");
    for (let i = left; i <= right; i++) buttons.push(i);
    if (right < pageCount - 2) buttons.push("...");
    if (right < pageCount - 1) buttons.push(pageCount - 1);
  }

  return (
    <div className="p-container-padding bg-surface-container-high border-t border-subtle flex flex-col md:flex-row justify-between items-center gap-stack-base h-auto md:h-12 z-10">
      <span className="text-body-sm text-on-surface-variant">
        Showing {start}–{end} of {totalItems} {itemName}{totalItems !== 1 ? "s" : ""}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${page === 0 ? "cursor-not-allowed opacity-40" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          {buttons.map((btn, i) =>
            btn === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-on-surface-variant">…</span>
            ) : (
              <button
                key={btn}
                onClick={() => onPageChange(btn)}
                className={`h-7 w-7 rounded text-[11px] font-bold transition-colors ${btn === page ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
              >
                {btn + 1}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
            disabled={page === pageCount - 1}
            className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${page === pageCount - 1 ? "cursor-not-allowed opacity-40" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
            aria-label="Next page"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
