export default function WalletOverview() {
  return (
    <>
      {/* Header Info */}
      <div className="py-4 border-b border-outline-variant/30 flex justify-between items-end mb-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">
            Wallet Command Center <span className="text-on-surface-variant font-normal">v3.0.4</span>
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest mt-1">
            Real-time Liquidity &amp; Balance Control
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-surface-container-high border border-subtle font-label-caps text-label-caps hover:bg-surface-bright transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">refresh</span> SYNC ALL
          </button>
          <button className="px-3 py-1.5 bg-secondary text-on-secondary font-label-caps text-label-caps hover:opacity-90 transition-opacity flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">add</span> NEW DISBURSEMENT
          </button>
        </div>
      </div>

      {/* Section 1: Platform Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Main Wallet */}
        <div className="bg-surface-bright border border-subtle p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">account_balance</span>
          </div>
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">PLATFORM MAIN WALLET</p>
            <h3 className="font-data-mono text-2xl text-secondary">&#8358;422,950,210.<span className="text-lg opacity-60">00</span></h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-surface-deep/50 p-2 border border-outline-variant/20">
                <p className="font-label-caps text-[9px] text-on-tertiary-container">BTC RESERVE</p>
                <p className="font-data-mono text-body-sm">12.4502 BTC</p>
              </div>
              <div className="bg-surface-deep/50 p-2 border border-outline-variant/20">
                <p className="font-label-caps text-[9px] text-on-tertiary-container">ETH RESERVE</p>
                <p className="font-data-mono text-body-sm">145.881 ETH</p>
              </div>
            </div>
          </div>
        </div>
        {/* Revenue Wallet */}
        <div className="bg-surface-bright border border-subtle p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-6xl">trending_up</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">TOTAL REVENUE (NET)</p>
          <h3 className="font-data-mono text-2xl text-status-success">&#8358;12,408,122.<span className="text-lg opacity-60">54</span></h3>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1 flex-1 bg-surface-deep rounded-full overflow-hidden">
              <div className="h-full bg-status-success w-3/4"></div>
            </div>
            <span className="font-label-caps text-[9px] text-status-success">+14.2% VS LMT</span>
          </div>
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant italic">Next reconciliation in 4h 12m</p>
        </div>
        {/* Reserve Wallet */}
        <div className="bg-surface-bright border border-subtle p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-6xl">security</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">COLD STORAGE RESERVE</p>
          <h3 className="font-data-mono text-2xl text-primary">&#8358;850,000,000.<span className="text-lg opacity-60">00</span></h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">USDT: 540k</span>
            <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">USDC: 210k</span>
            <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">SOL: 1.2k</span>
          </div>
        </div>
      </div>
    </>
  );
}
