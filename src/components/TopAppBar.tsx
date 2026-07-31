export default function TopAppBar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface-deep text-primary border-b border-subtle flex justify-between items-center px-gutter h-12">
      <div className="flex items-center gap-stack-base">
        <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high transition-colors p-2 cursor-pointer active:opacity-80">
          menu
        </button>
        <span className="font-headline-lg text-headline-lg font-bold text-secondary">
          KatrexApp Admin
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full border border-subtle">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          <span className="font-label-caps text-on-surface-variant">
            System Online
          </span>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20">
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
