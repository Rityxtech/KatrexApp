"use client";

interface Props {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedCount: number;
  onBulkBlock: () => void;
  onBulkDelete: () => void;
  bulkLoading: boolean;
}

export default function TableFooter({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  selectedCount,
  onBulkBlock,
  onBulkDelete,
  bulkLoading,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalItems);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);
  // Show max 5 page buttons around current page
  const visiblePages = pageNumbers.slice(
    Math.max(0, currentPage - 2),
    Math.min(totalPages, currentPage + 3)
  );

  return (
    <div className="px-container-padding py-2 bg-surface-container-low border-t border-subtle flex flex-col md:flex-row justify-between items-center gap-2">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          Showing {start}-{end} of {totalItems.toLocaleString()}
        </span>
        {selectedCount > 0 && (
          <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded">
            {selectedCount} selected
          </span>
        )}
        {selectedCount > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={onBulkBlock}
              disabled={bulkLoading}
              className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant border border-subtle rounded text-[10px] font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              BLOCK SELECTED
            </button>
            <button
              onClick={onBulkDelete}
              disabled={bulkLoading}
              className="px-2 py-0.5 bg-surface-container-high text-status-danger border border-subtle rounded text-[10px] font-bold hover:bg-status-danger/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              DELETE
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>
        {visiblePages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${
              currentPage === p
                ? "bg-secondary text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
          disabled={currentPage >= totalPages - 1}
          className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
