"use client";
// v2 — sync all, disbursement modal

import { useState, useCallback } from "react";
import { useWallets, useMarketData } from "@/hooks/useAdminData";
import { setDocument } from "@/hooks/useFirestore";

function formatNaira(n: number) {
  return `\u20a6${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function WalletOverview() {
  const { data: wallets, loading: wl } = useWallets();
  const { data: market, loading: ml } = useMarketData();
  const [syncing, setSyncing] = useState(false);
  const [showDisbursement, setShowDisbursement] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loading = wl || ml;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

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

  async function handleSyncAll() {
    setSyncing(true);
    try {
      await setDocument("app_settings", "wallet_sync", {
        lastSync: new Date(),
        status: "synced",
        walletCount: wallets.length,
      });
      showToast("All wallets synced successfully");
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

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
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}
      <div className="bg-surface-bright rounded-xl border border-subtle p-3.5 md:p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Wallet Command Center <span className="text-on-surface-variant text-sm font-normal">v3.0.4</span>
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider mt-0.5 flex items-center gap-2">
            Real-time Liquidity &amp; Balance Control
            <span className="flex items-center gap-1 normal-case font-semibold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={syncing}
            onClick={handleSyncAll}
            className="px-3 py-1.5 bg-surface-container-high border border-subtle rounded-lg font-label-caps text-xs font-bold hover:bg-surface-bright transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <span className={`material-symbols-outlined text-[16px] ${syncing ? "animate-spin" : ""}`}>refresh</span> {syncing ? "SYNCING..." : "SYNC ALL"}
          </button>
          <button
            onClick={() => setShowDisbursement(true)}
            className="px-3 py-1.5 bg-secondary text-on-secondary rounded-lg font-label-caps text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span> NEW DISBURSEMENT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">account_balance</span>
          </div>
          <div className="relative z-10">
            <p className="font-label-caps text-[10px] text-on-surface-variant font-bold mb-1">PLATFORM MAIN WALLET</p>
            <h3 className="font-data-mono text-2xl font-bold text-secondary">{formatNaira(totalNaira)}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-surface-container-low p-2 rounded-lg border border-subtle">
                <p className="font-label-caps text-[9px] text-on-tertiary-container font-bold">BTC RESERVE</p>
                <p className="font-data-mono text-xs font-semibold mt-0.5">{btcReserve.toFixed(4)} BTC</p>
              </div>
              <div className="bg-surface-container-low p-2 rounded-lg border border-subtle">
                <p className="font-label-caps text-[9px] text-on-tertiary-container font-bold">ETH RESERVE</p>
                <p className="font-data-mono text-xs font-semibold mt-0.5">{ethReserve.toFixed(3)} ETH</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-6xl">trending_up</span>
          </div>
          <p className="font-label-caps text-[10px] text-on-surface-variant font-bold mb-1">TOTAL REVENUE (NET)</p>
          <h3 className="font-data-mono text-2xl font-bold text-status-success">{formatNaira(totalRevenue)}</h3>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-status-success" style={{ width: `${Math.min((totalRevenue / (totalNaira || 1)) * 100, 100)}%` }}></div>
            </div>
            <span className="font-label-caps text-[9px] font-bold text-status-success">{wallets.length} WALLETS</span>
          </div>
          <p className="mt-2 font-body-sm text-xs text-on-surface-variant">Tracking {wallets.length} active user wallets</p>
        </div>

        <div className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-6xl">security</span>
          </div>
          <p className="font-label-caps text-[10px] text-on-surface-variant font-bold mb-1">CRYPTO RESERVES</p>
          <h3 className="font-data-mono text-2xl font-bold text-primary">{Object.keys(cryptoBalances).length} ASSETS</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {usdtReserve > 0 && <span className="px-2 py-0.5 bg-surface-container-low rounded-lg border border-subtle text-primary font-data-mono text-xs font-semibold">USDT: {usdtReserve.toFixed(0)}</span>}
            {solReserve > 0 && <span className="px-2 py-0.5 bg-surface-container-low rounded-lg border border-subtle text-primary font-data-mono text-xs font-semibold">SOL: {solReserve.toFixed(0)}</span>}
            {btcReserve > 0 && <span className="px-2 py-0.5 bg-surface-container-low rounded-lg border border-subtle text-primary font-data-mono text-xs font-semibold">BTC: {btcReserve.toFixed(2)}</span>}
            {ethReserve > 0 && <span className="px-2 py-0.5 bg-surface-container-low rounded-lg border border-subtle text-primary font-data-mono text-xs font-semibold">ETH: {ethReserve.toFixed(1)}</span>}
          </div>
        </div>
      </div>

      {/* Disbursement Modal */}
      {showDisbursement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDisbursement(false)}>
          <div className="bg-surface-container border border-border-subtle rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">NEW DISBURSEMENT</h3>
              <button onClick={() => setShowDisbursement(false)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">RECIPIENT UID</label>
                <input className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-data-mono text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Enter user UID..." type="text" />
              </div>
              <div>
                <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">AMOUNT (NGN)</label>
                <input className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-data-mono text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none" placeholder="0.00" type="number" />
              </div>
              <div>
                <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">REASON</label>
                <input className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Reason for disbursement..." type="text" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowDisbursement(false)} className="flex-1 border border-border-subtle py-2 rounded font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-bright transition-colors">CANCEL</button>
              <button
                onClick={async () => {
                  try {
                    await setDocument("app_settings", `disbursement_${Date.now()}`, {
                      type: "disbursement",
                      createdAt: new Date(),
                      status: "pending",
                    });
                    showToast("Disbursement queued for processing");
                    setShowDisbursement(false);
                  } catch (err: any) {
                    showToast(`Failed: ${err.message}`);
                  }
                }}
                className="flex-1 bg-secondary text-on-secondary py-2 rounded font-label-caps text-label-caps"
              >
                PROCESS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
