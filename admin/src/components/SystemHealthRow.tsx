"use client";

import { useMarketData } from "@/hooks/useAdminData";

function timeAgo(date: any) {
  if (!date) return "never";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function SystemHealthRow() {
  const { data: market, loading } = useMarketData();

  const coins = market.filter((m: any) => m.id !== "_ngn_rate");
  const lastUpdate = market.length > 0
    ? market.reduce((latest: any, m: any) => {
        if (!m.updatedAt) return latest;
        const d = m.updatedAt?.toDate ? m.updatedAt.toDate() : new Date(m.updatedAt);
        if (!latest || d > latest) return d;
        return latest;
      }, null as Date | null)
    : null;

  const totalVolume = coins.reduce((s: number, c: any) => s + (c.volume24h || 0) * (c.priceUsd || 0), 0);

  return (
    <div className="col-span-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-base">
        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">database</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Data Source</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-body-md text-body-md">Firestore Live</div>
            <div className="text-[10px] text-status-success font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> OPTIMAL
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-status-warning">history</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Last Update</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-data-mono text-data-mono">{loading ? "loading..." : timeAgo(lastUpdate)}</div>
            <div className="text-[10px] text-on-surface-variant">real-time</div>
          </div>
        </div>

        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-danger">security</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Coins Tracked</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-body-md text-body-md">{coins.length} assets</div>
            <div className="text-[10px] text-on-surface-variant">live feed</div>
          </div>
        </div>

        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">24h Volume</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-data-mono text-data-mono">${(totalVolume / 1_000_000).toFixed(2)}M</div>
            <div className="text-[10px] text-status-success">HEALTHY</div>
          </div>
        </div>
      </div>
    </div>
  );
}
