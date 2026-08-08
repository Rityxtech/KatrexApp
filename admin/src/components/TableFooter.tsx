export default function TableFooter() {
  return (
    <div className="p-container-padding bg-surface-container-high border-t border-subtle flex flex-col md:flex-row justify-between items-center gap-stack-base h-auto md:h-12 z-10">
      <div className="flex items-center gap-gutter text-body-sm text-on-surface-variant">
        <span className="hidden md:inline">Selected: 0 users</span>
        <button className="px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-[11px] font-bold hover:text-status-danger transition-colors">
          BLOCK SELECTED
        </button>
        <button className="px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-[11px] font-bold hover:text-status-danger transition-colors">
          DELETE
        </button>
      </div>
      <div className="flex items-center gap-stack-base">
        <span className="text-body-sm text-on-surface-variant mr-4">
          Showing 1-25 of 12,482
        </span>
        <nav className="flex gap-1">
          <button className="w-8 h-8 flex items-center justify-center border border-subtle bg-surface-container-low rounded-md text-on-surface-variant hover:bg-surface-container transition-colors material-symbols-outlined">
            chevron_left
          </button>
          <button className="w-8 h-8 flex items-center justify-center border border-secondary bg-primary-container rounded-md text-secondary font-bold text-body-sm">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center border border-subtle bg-surface-container-low rounded-md text-on-surface-variant hover:bg-surface-container transition-colors text-body-sm font-bold">
            2
          </button>
          <button className="w-8 h-8 flex items-center justify-center border border-subtle bg-surface-container-low rounded-md text-on-surface-variant hover:bg-surface-container transition-colors text-body-sm font-bold">
            3
          </button>
          <span className="w-8 h-8 flex items-center justify-center text-outline-variant">
            ...
          </span>
          <button className="w-8 h-8 flex items-center justify-center border border-subtle bg-surface-container-low rounded-md text-on-surface-variant hover:bg-surface-container transition-colors text-body-sm font-bold">
            500
          </button>
          <button className="w-8 h-8 flex items-center justify-center border border-subtle bg-surface-container-low rounded-md text-on-surface-variant hover:bg-surface-container transition-colors material-symbols-outlined">
            chevron_right
          </button>
        </nav>
      </div>
    </div>
  );
}
