"use client";

import { useWallets, useMarketData } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  return `\u20a6${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function WalletOverview() {
  const { data: wallets, loading: wl } = useWallets();
  const { data: market, loading: ml } = useMarketData();

  const loading = wl || ml;

  const totalNaira = wallets.reduce((s: number, w: any) => s + (w.nairaBalance || 0), 0);
  const totalRevenue = wallets.reduce((s: number, w: any) => s + (w.totalValueNaira || 0), 0);

  const cryptoBalances = wallets.reduce((acc: Record<string, number>, w: any) => {
    const cb = w.cryptoBalances || {};
    for (const [key, val] of Object.entries(cb)) {
      acc[key] = (acc[key] || 0) + (val as number);
    }
    return acc;
  }, {});

  const btcReserve = cryptoBalances["btc"] || 0;
  const ethReserve = cryptoBalances["eth"] || 0;
  const usdtReserve = cryptoBalances["usdttrc20"] || cryptoBalances["usdt"] || 0;
  const solReserve = cryptoBalances["sol"] || 0;

  if (loading) {
    return (
      <>
        <div className="py-4 border-b border-outline-variant/30 flex justify-between items-end mb-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">Wallet Command Center</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-bright border border-subtle p-3 h-32 rounded animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="py-4 border-b border-outline-variant/30 flex justify-between items-end mb-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">
            Wallet Command Center <span className="text-on-surface-variant font-normal">v3.0.4</span>
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest mt-1 flex items-center gap-2">
            Real-time Liquidity &amp; Balance Control
            <span className="flex items-center gap-1 normal-case">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE
            </span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-surface-bright border border-subtle p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">account_balance</span>
          </div>
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">PLATFORM MAIN WALLET</p>
            <h3 className="font-data-mono text-2xl text-secondary">{formatNaira(totalNaira)}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-surface-deep/50 p-2 border border-outline-variant/20">
                <p className="font-label-caps text-[9px] text-on-tertiary-container">BTC RESERVE</p>
                <p className="font-data-mono text-body-sm">{btcReserve.toFixed(4)} BTC</p>
              </div>
              <div className="bg-surface-deep/50 p-2 border border-outline-variant/20">
                <p className="font-label-caps text-[9px] text-on-tertiary-container">ETH RESERVE</p>
                <p className="font-data-mono text-body-sm">{ethReserve.toFixed(3)} ETH</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-bright border border-subtle p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-6xl">trending_up</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">TOTAL REVENUE (NET)</p>
          <h3 className="font-data-mono text-2xl text-status-success">{formatNaira(totalRevenue)}</h3>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1 flex-1 bg-surface-deep rounded-full overflow-hidden">
              <div className="h-full bg-status-success" style={{ width: `${Math.min((totalRevenue / (totalNaira || 1)) * 100, 100)}%` }}></div>
            </div>
            <span className="font-label-caps text-[9px] text-status-success">{wallets.length} WALLETS</span>
          </div>
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant italic">Tracking {wallets.length} active wallets</p>
        </div>

        <div className="bg-surface-bright border border-subtle p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-6xl">security</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">CRYPTO RESERVES</p>
          <h3 className="font-data-mono text-2xl text-primary">{Object.keys(cryptoBalances).length} ASSETS</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {usdtReserve > 0 && <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">USDT: {usdtReserve.toFixed(0)}</span>}
            {solReserve > 0 && <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">SOL: {solReserve.toFixed(0)}</span>}
            {btcReserve > 0 && <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">BTC: {btcReserve.toFixed(2)}</span>}
            {ethReserve > 0 && <span className="px-2 py-0.5 border border-primary/30 text-primary font-data-mono text-[10px]">ETH: {ethReserve.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </>
  );
}
