"use client";

import { useMarketData } from "@/hooks/useAdminData";

const COIN_META: Record<string, { color: string; icon: string }> = {
  btc: { color: "#F7931A", icon: "currency_bitcoin" },
  eth: { color: "#627EEA", icon: "drive_image" },
  usdt: { color: "#26A17B", icon: "monetization_on" },
  sol: { color: "#14F195", icon: "flare" },
  bnb: { color: "#F3BA2F", icon: "whatshot" },
  xrp: { color: "#23292F", icon: "waves" },
  doge: { color: "#C2A633", icon: "pets" },
  ada: { color: "#0033AD", icon: "stacked_line_chart" },
  matic: { color: "#8247E5", icon: "polygon" },
  trx: { color: "#EF0027", icon: "token" },
  ton: { color: "#0098EA", icon: "diamond" },
};

function formatNaira(n: number) {
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

export default function ExchangeRatesTable() {
  const { data: market, loading } = useMarketData();

  const coins = market.filter((m: any) => m.id !== "_ngn_rate" && m.symbol);
  const totalVolume = coins.reduce((s: number, c: any) => s + (c.volume24h || 0) * (c.priceUsd || 0), 0);
  const ngnRate = market.find((m: any) => m.id === "_ngn_rate")?.rate || 1450;

  return (
    <div className="col-span-12 lg:col-span-8">
      <div className="bg-surface-container border border-subtle rounded h-full flex flex-col">
        <div className="bg-surface-container-high px-3 py-2 border-b border-subtle flex justify-between items-center">
          <div className="flex items-center gap-stack-base">
            <span className="font-label-caps text-label-caps text-secondary">NGN Exchange Rates</span>
            <span className="bg-status-success/10 text-status-success px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> AUTO-UPDATE ON
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <input className="bg-surface-deep border border-subtle rounded-full px-8 py-1 text-body-sm focus:w-48 transition-all outline-none" placeholder="Search rates..." type="text" />
              <span className="material-symbols-outlined absolute left-2 top-1.5 text-on-surface-variant text-[16px]">search</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface-container-high rounded animate-pulse" />
              ))}
            </div>
          ) : coins.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-body-sm">No market data available</div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-surface-container-low sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Asset</th>
                  <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Price (NGN)</th>
                  <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Price (USD)</th>
                  <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">24h Change</th>
                  <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Volume 24h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {coins.map((coin: any) => {
                  const meta = COIN_META[coin.symbol?.toLowerCase()] || COIN_META[coin.id] || { color: "#888", icon: "token" };
                  const change = coin.change24h || 0;
                  const changeClass = change >= 0 ? "text-status-success" : "text-status-danger";
                  return (
                    <tr key={coin.id} className="hover:bg-primary-container/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                            <span className="material-symbols-outlined text-[14px]" style={{ color: meta.color }}>{meta.icon}</span>
                          </div>
                          <div>
                            <span className="font-data-mono text-data-mono">{coin.symbol}/NGN</span>
                            <span className="text-[10px] text-on-surface-variant block">{coin.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">{formatNaira(coin.priceNaira || 0)}</span></td>
                      <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface-variant">${(coin.priceUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-data-mono text-[11px] ${changeClass}`}>
                          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface-variant">${((coin.volume24h || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-subtle grid grid-cols-1 md:grid-cols-3 gap-stack-base">
          <div className="bg-surface-container-low p-2 rounded flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">Total Volume</div>
              <div className="font-headline-md text-headline-md text-primary">{formatNaira(totalVolume * ngnRate)}</div>
            </div>
            <div className="w-16 h-8 bg-status-success/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline fill="none" points="0,35 10,30 20,38 30,25 40,30 50,20 60,25 70,10 80,15 90,5 100,8" stroke="#10B981" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="bg-surface-container-low p-2 rounded flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">Active Coins</div>
              <div className="font-headline-md text-headline-md text-primary">{coins.length}</div>
            </div>
            <div className="w-16 h-8 bg-secondary/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline fill="none" points="0,20 10,25 20,22 30,18 40,20 50,15 60,12 70,14 80,10 90,8 100,5" stroke="#7bd0ff" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="bg-surface-container-low p-2 rounded flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">NGN Rate</div>
              <div className="font-headline-md text-headline-md text-status-success">{"\u20a6"}{ngnRate.toFixed(0)}</div>
            </div>
            <div className="w-16 h-8 bg-status-info/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline fill="none" points="0,30 20,30 40,25 60,25 80,20 100,20" stroke="#0EA5E9" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
