"use client";

import { useAdminStats, useWallets, useMarketData, useTransactions, useUsers } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export default function ReportsPage() {
  const { stats, loading } = useAdminStats();
  const { data: wallets } = useWallets();
  const { data: market } = useMarketData();
  const { data: txns } = useTransactions(500);
  const { data: users } = useUsers(500);

  const totalNaira = wallets.reduce((s: number, w: any) => s + (w.nairaBalance || 0), 0);
  const totalRevenue = wallets.reduce((s: number, w: any) => s + (w.totalValueNaira || 0), 0);
  const totalValue = totalNaira + totalRevenue;
  const mainPct = totalValue > 0 ? (totalNaira / totalValue) * 100 : 0;
  const reservePct = totalValue > 0 ? (totalRevenue / totalValue) * 100 : 0;

  const coins = market.filter((m: any) => m.id !== "_ngn_rate");
  const cryptoSuccess = txns.filter((t: any) => t.type === "crypto" && t.status === "completed").length;
  const cryptoTotal = txns.filter((t: any) => t.type === "crypto").length;
  const fiatSuccess = txns.filter((t: any) => t.type !== "crypto" && t.status === "completed").length;
  const fiatTotal = txns.filter((t: any) => t.type !== "crypto").length;
  const cryptoRate = cryptoTotal > 0 ? ((cryptoSuccess / cryptoTotal) * 100).toFixed(1) : "100";
  const fiatRate = fiatTotal > 0 ? ((fiatSuccess / fiatTotal) * 100).toFixed(1) : "100";

  const totalFees = txns.reduce((s: number, t: any) => s + (t.fee || 0), 0);
  const totalVol = txns.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const userVolumes = users.map((u: any) => ({
    id: u.id,
    name: u.displayName || u.email || u.id?.slice(0, 12),
    vol: txns.filter((t: any) => t.uid === u.id && t.status === "completed").reduce((s: number, t: any) => s + (t.amountNaira || 0), 0),
    txns: txns.filter((t: any) => t.uid === u.id).length,
  })).sort((a: any, b: any) => b.vol - a.vol).slice(0, 5);

  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = (new Date().getHours() - (11 - i) + 24) % 24;
    return txns.filter((t: any) => {
      if (!t.createdAt) return false;
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return d.getHours() === hour;
    }).length;
  });
  const maxHourly = Math.max(...hourlyData, 1);

  return (
    <div className="px-container-padding py-max-gap flex flex-col gap-max-gap w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Reports &amp; Analytics</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            System performance metrics and transactional telemetry
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>
          </p>
        </div>
        <div className="flex items-center gap-stack-base flex-wrap">
          <div className="flex bg-surface-container border border-outline-variant rounded overflow-hidden">
            <input className="bg-transparent border-none text-on-surface font-data-mono text-xs focus:ring-0 px-2 py-1" type="date" />
            <span className="px-2 self-center text-outline text-xs">to</span>
            <input className="bg-transparent border-none text-on-surface font-data-mono text-xs focus:ring-0 px-2 py-1" type="date" />
          </div>
          <div className="flex gap-1">
            <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-caps text-label-caps px-3 py-2 rounded flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[14px]">download</span> CSV
            </button>
            <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-caps text-label-caps px-3 py-2 rounded flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Operational Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container p-3 rounded border border-outline-variant flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Total Volume</p>
            <div className="flex items-baseline gap-2">
              <span className="font-data-mono text-xl text-primary">{formatNaira(totalVol)}</span>
              <span className="text-status-success text-[10px] font-bold">{stats.completedTxns} txns</span>
            </div>
          </div>
          <div className="h-8 mt-2 w-full flex items-end gap-[1px]">
            {hourlyData.map((h, i) => (
              <div key={i} className="bg-primary/20 hover:bg-primary w-full transition-all" style={{ height: `${Math.max((h / maxHourly) * 100, 5)}%` }}></div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container p-3 rounded border border-outline-variant">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Success Rate</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-data-mono text-xl text-secondary">{stats.totalTransactions > 0 ? ((stats.completedTxns / stats.totalTransactions) * 100).toFixed(1) : "100"}%</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-data-mono">
              <span className="text-on-secondary-fixed">CRYPTO</span>
              <span className="text-on-surface">{cryptoRate}%</span>
            </div>
            <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
              <div className="bg-secondary h-full" style={{ width: `${cryptoRate}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-data-mono mt-1">
              <span className="text-on-secondary-fixed">FIAT</span>
              <span className="text-on-surface">{fiatRate}%</span>
            </div>
            <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
              <div className="bg-secondary h-full" style={{ width: `${fiatRate}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container p-3 rounded border border-outline-variant">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Revenue (Fees)</p>
          <div className="flex flex-col">
            <span className="font-data-mono text-xl text-tertiary">{formatNaira(totalFees)}</span>
            <div className="flex gap-3 mt-2">
              <div>
                <p className="text-[9px] text-on-surface-variant font-label-caps">VOLUME</p>
                <p className="font-data-mono text-xs text-on-surface">{formatNaira(totalVol)}</p>
              </div>
              <div className="border-l border-outline-variant pl-3">
                <p className="text-[9px] text-on-surface-variant font-label-caps">PENDING</p>
                <p className="font-data-mono text-xs text-on-surface">{stats.pendingTxns}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container p-3 rounded border border-outline-variant relative overflow-hidden">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Active Users (Live)</p>
          <div className="flex items-center gap-2">
            <span className="font-data-mono text-3xl text-on-surface tracking-tighter">{stats.totalUsers.toLocaleString()}</span>
          </div>
          <p className="font-data-mono text-[10px] text-status-success mt-2">&#9679; {stats.verifiedUsers} VERIFIED</p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">Transaction Volume</h2>
            <div className="flex bg-surface-container-low rounded p-1 gap-1">
              <button className="px-2 py-0.5 text-[10px] font-label-caps bg-primary-container text-on-primary-container rounded">1H</button>
              <button className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">24H</button>
              <button className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">7D</button>
              <button className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">1M</button>
            </div>
          </div>
          <div className="flex-grow h-64 p-4 relative">
            <div className="absolute inset-0 m-4 flex flex-col justify-between opacity-10">
              {[0,1,2,3].map((i) => <div key={i} className="border-b border-dashed border-outline w-full h-0"></div>)}
            </div>
            <div className="relative w-full h-full flex items-end justify-between px-2 gap-2">
              {hourlyData.map((h, i) => (
                <div key={i} className={`w-full ${i % 2 === 0 ? "bg-primary/40" : "bg-secondary/40"} rounded-t-sm`} style={{ height: `${Math.max((h / maxHourly) * 100, 5)}%` }}></div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-surface-container-low flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="font-body-sm text-body-sm">Buy Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-body-sm text-body-sm">Sell Orders</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant">
            <h2 className="font-headline-md text-headline-md">Liquidity Split</h2>
          </div>
          <div className="p-4 flex flex-col gap-4 flex-grow">
            <div className="flex flex-col gap-1">
              <div className="h-6 w-full flex rounded overflow-hidden">
                <div className="bg-primary hover:opacity-80 transition-opacity cursor-help" style={{ width: `${mainPct}%` }} title={`Main: ${formatNaira(totalNaira)}`}></div>
                <div className="bg-secondary hover:opacity-80 transition-opacity cursor-help" style={{ width: `${reservePct}%` }} title={`Revenue: ${formatNaira(totalRevenue)}`}></div>
              </div>
              <div className="flex justify-between font-data-mono text-[10px]">
                <span>TOTAL: {formatNaira(totalValue)}</span>
                <span className="text-status-success">LIVE</span>
              </div>
            </div>
            <div className="flex flex-col gap-stack-base mt-2">
              <div className="flex items-center justify-between p-2 bg-surface-container-low rounded border border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="font-body-sm text-body-sm">Main Wallets</span>
                </div>
                <span className="font-data-mono text-xs">{mainPct.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-surface-container-low rounded border border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-body-sm text-body-sm">Revenue Vault</span>
                </div>
                <span className="font-data-mono text-xs">{reservePct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">Market Performance</h2>
            <span className="font-label-caps text-label-caps text-on-surface-variant">COIN-SPECIFIC DATA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant">ASSET</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-right">PRICE (NGN)</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-right">24H CHANGE</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-right">VOLUME</th>
                </tr>
              </thead>
              <tbody className="font-data-mono divide-y divide-outline-variant">
                {coins.slice(0, 6).map((coin: any) => (
                  <tr key={coin.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="px-3 py-2 text-primary font-bold uppercase">{coin.symbol}</td>
                    <td className="px-3 py-2 text-right">{formatNaira(coin.priceNaira || 0)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={coin.change24h >= 0 ? "text-status-success" : "text-status-danger"}>
                        {coin.change24h >= 0 ? "+" : ""}{(coin.change24h || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface-variant">{formatUsd(coin.volume24h || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">High-Value Entities</h2>
            <span className="font-label-caps text-label-caps text-on-surface-variant">USER VOLUME RANKING</span>
          </div>
          <div className="flex flex-col divide-y divide-outline-variant">
            {userVolumes.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No data available</div>
            ) : (
              userVolumes.map((e: any, i: number) => (
                <div key={e.id} className="p-3 flex items-center justify-between hover:bg-surface-container-high transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-outline-variant bg-surface-container-low flex items-center justify-center font-data-mono text-xs">{String(i + 1).padStart(2, "0")}</div>
                    <div>
                      <p className="font-body-md text-body-md text-on-surface">{e.name}</p>
                      <p className="text-[10px] font-data-mono text-on-surface-variant uppercase">ID: {e.id?.slice(0, 12)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-sm text-primary">{formatNaira(e.vol)}</p>
                    <p className="text-[10px] font-label-caps text-on-surface-variant uppercase">{e.txns} TRANSACTIONS</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
