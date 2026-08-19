"use client";

import { useState, useMemo, useCallback } from "react";
import { useAdminStats, useWallets, useMarketData, useTransactions, useUsers } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

type Period = "1H" | "24H" | "7D" | "1M";

export default function ReportsPage() {
  const { stats, loading } = useAdminStats();
  const { data: wallets } = useWallets();
  const { data: market } = useMarketData();
  const { data: txns } = useTransactions(500);
  const { data: users } = useUsers(500);

  const [period, setPeriod] = useState<Period>("1H");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Filter transactions by period or custom date range
  const filteredTxns = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      return txns.filter((t: any) => {
        if (!t.createdAt) return false;
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return d >= from && d <= to;
      });
    }

    switch (period) {
      case "1H":
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24H":
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7D":
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    if (!cutoff) return txns;
    return txns.filter((t: any) => {
      if (!t.createdAt) return false;
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return d >= cutoff!;
    });
  }, [txns, period, dateFrom, dateTo]);

  const totalNaira = wallets.reduce((s: number, w: any) => s + (w.nairaBalance || 0), 0);
  const totalRevenue = wallets.reduce((s: number, w: any) => s + (w.totalValueNaira || 0), 0);
  const totalValue = totalNaira + totalRevenue;
  const mainPct = totalValue > 0 ? (totalNaira / totalValue) * 100 : 0;
  const reservePct = totalValue > 0 ? (totalRevenue / totalValue) * 100 : 0;

  const coins = market.filter((m: any) => m.id !== "_ngn_rate");
  const cryptoSuccess = filteredTxns.filter((t: any) => t.type === "crypto" && t.status === "completed").length;
  const cryptoTotal = filteredTxns.filter((t: any) => t.type === "crypto").length;
  const fiatSuccess = filteredTxns.filter((t: any) => t.type !== "crypto" && t.status === "completed").length;
  const fiatTotal = filteredTxns.filter((t: any) => t.type !== "crypto").length;
  const cryptoRate = cryptoTotal > 0 ? ((cryptoSuccess / cryptoTotal) * 100).toFixed(1) : "100";
  const fiatRate = fiatTotal > 0 ? ((fiatSuccess / fiatTotal) * 100).toFixed(1) : "100";

  const totalFees = filteredTxns.reduce((s: number, t: any) => s + (t.fee || 0), 0);
  const totalVol = filteredTxns.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const userVolumes = users.map((u: any) => ({
    id: u.id,
    name: u.displayName || u.email || u.id?.slice(0, 12),
    vol: filteredTxns.filter((t: any) => t.uid === u.id && t.status === "completed").reduce((s: number, t: any) => s + (t.amountNaira || 0), 0),
    txns: filteredTxns.filter((t: any) => t.uid === u.id).length,
  })).sort((a: any, b: any) => b.vol - a.vol).slice(0, 5);

  const hourlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const hour = (new Date().getHours() - (11 - i) + 24) % 24;
      return filteredTxns.filter((t: any) => {
        if (!t.createdAt) return false;
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return d.getHours() === hour;
      }).length;
    });
  }, [filteredTxns]);
  const maxHourly = Math.max(...hourlyData, 1);

  function exportCSV() {
    const headers = ["ID", "Type", "Status", "Amount (NGN)", "Fee", "User", "Description", "Date"];
    const rows = filteredTxns.map((t: any) => [
      t.id || "",
      t.type || "",
      t.status || "",
      t.amountNaira || 0,
      t.fee || 0,
      t.uid || "",
      (t.description || "").replace(/,/g, ";"),
      t.createdAt?.toDate ? t.createdAt.toDate().toISOString() : (t.createdAt || ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katrex-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully");
  }

  function exportPDF() {
    try {
      const rows = filteredTxns.slice(0, 40).map((t: any) => `
        <tr>
          <td>${(t.id || "").slice(0, 8)}</td>
          <td>${t.type || ""}</td>
          <td>${t.status || ""}</td>
          <td style="text-align:right">${formatNaira(t.amountNaira || 0)}</td>
          <td style="text-align:right">${formatNaira(t.fee || 0)}</td>
          <td>${(t.uid || "").slice(0, 12)}</td>
        </tr>`).join("");

      const html = `<!DOCTYPE html><html><head><title>KatrexApp Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
          h1 { font-size: 18px; margin: 0 0 6px; }
          .meta { color: #666; margin-bottom: 16px; }
          .stats { display: flex; gap: 24px; margin-bottom: 20px; }
          .stat { background: #f5f5f5; padding: 10px 16px; border-radius: 6px; }
          .stat strong { display: block; font-size: 14px; }
          .stat span { color: #666; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; }
          td { padding: 5px 8px; border-bottom: 1px solid #eee; }
          @media print { body { padding: 10px; } }
        </style></head><body>
        <h1>KatrexApp — Reports &amp; Analytics</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Period: ${dateFrom && dateTo ? dateFrom + " to " + dateTo : period}</div>
        <div class="stats">
          <div class="stat"><strong>${formatNaira(totalVol)}</strong><span>Total Volume</span></div>
          <div class="stat"><strong>${formatNaira(totalFees)}</strong><span>Total Fees</span></div>
          <div class="stat"><strong>${filteredTxns.length}</strong><span>Transactions</span></div>
          <div class="stat"><strong>${stats.totalUsers}</strong><span>Users</span></div>
          <div class="stat"><strong>${stats.verifiedUsers}</strong><span>Verified</span></div>
        </div>
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th style="text-align:right">Amount</th><th style="text-align:right">Fee</th><th>User</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload=function(){window.print();}</script>
        </body></html>`;

      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
      showToast("PDF report generated — use Print to save as PDF");
    } catch (err: any) {
      showToast(`PDF export failed: ${err.message}`);
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded-xl shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="bg-surface-bright rounded-xl border border-subtle p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Reports &amp; Analytics</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
            System performance metrics and transactional telemetry
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-success animate-pulse" /> LIVE</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-surface-container-low border border-subtle rounded-lg overflow-hidden p-1">
            <input
              className="bg-transparent border-none text-on-surface font-data-mono text-xs focus:ring-0 px-2 py-1 outline-none"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="px-2 self-center text-outline text-xs">to</span>
            <input
              className="bg-transparent border-none text-on-surface font-data-mono text-xs focus:ring-0 px-2 py-1 outline-none"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-caps text-xs font-bold px-3.5 py-2 rounded-lg border border-subtle flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> CSV
            </button>
            <button
              onClick={exportPDF}
              className="bg-secondary text-on-secondary font-label-caps text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-opacity hover:opacity-90 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Operational Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-bright p-5 md:p-6 rounded-xl border border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold mb-1">Total Volume</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-data-mono text-2xl font-bold text-primary">{formatNaira(totalVol)}</span>
              <span className="text-status-success text-xs font-bold">{filteredTxns.filter((t: any) => t.status === "completed").length} txns</span>
            </div>
          </div>
          <div className="h-8 mt-4 w-full flex items-end gap-[2px]">
            {hourlyData.map((h, i) => (
              <div key={i} className="bg-primary/20 hover:bg-primary w-full rounded-t-sm transition-all" style={{ height: `${Math.max((h / maxHourly) * 100, 8)}%` }}></div>
            ))}
          </div>
        </div>

        <div className="bg-surface-bright p-5 md:p-6 rounded-xl border border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold mb-1">Success Rate</p>
            <div className="flex items-baseline gap-2 mb-3 mt-1">
              <span className="font-data-mono text-2xl font-bold text-secondary">
                {filteredTxns.length > 0
                  ? ((filteredTxns.filter((t: any) => t.status === "completed").length / filteredTxns.length) * 100).toFixed(1)
                  : "100"}%
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex justify-between text-xs font-data-mono mb-1">
                <span className="text-on-surface-variant font-medium">CRYPTO</span>
                <span className="text-on-surface font-bold">{cryptoRate}%</span>
              </div>
              <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full" style={{ width: `${cryptoRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-data-mono mb-1">
                <span className="text-on-surface-variant font-medium">FIAT</span>
                <span className="text-on-surface font-bold">{fiatRate}%</span>
              </div>
              <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full" style={{ width: `${fiatRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-bright p-5 md:p-6 rounded-xl border border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold mb-1">Revenue (Fees)</p>
            <div className="flex flex-col mt-1">
              <span className="font-data-mono text-2xl font-bold text-tertiary">{formatNaira(totalFees)}</span>
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-subtle">
            <div>
              <p className="text-[10px] text-on-surface-variant font-label-caps font-bold">TOTAL VOL</p>
              <p className="font-data-mono text-xs font-semibold text-on-surface mt-0.5">{formatNaira(totalVol)}</p>
            </div>
            <div className="border-l border-subtle pl-4">
              <p className="text-[10px] text-on-surface-variant font-label-caps font-bold">PENDING</p>
              <p className="font-data-mono text-xs font-semibold text-on-surface mt-0.5">{stats.pendingTxns}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-bright p-5 md:p-6 rounded-xl border border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold mb-1">Active Users (Live)</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-data-mono text-3xl font-bold text-on-surface tracking-tight">{stats.totalUsers.toLocaleString()}</span>
            </div>
          </div>
          <p className="font-data-mono text-xs font-bold text-status-success mt-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
            {stats.verifiedUsers} VERIFIED USERS
          </p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md font-bold">Transaction Volume</h2>
            <div className="flex bg-surface-deep rounded-lg p-1 gap-1 border border-subtle">
              {(["1H", "24H", "7D", "1M"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setDateFrom(""); setDateTo(""); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${period === p && !dateFrom ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-grow h-64 p-6 relative">
            <div className="absolute inset-0 m-6 flex flex-col justify-between opacity-10">
              {[0,1,2,3].map((i) => <div key={i} className="border-b border-dashed border-outline w-full h-0"></div>)}
            </div>
            <div className="relative w-full h-full flex items-end justify-between px-2 gap-2">
              {hourlyData.map((h, i) => (
                <div key={i} className={`w-full ${i % 2 === 0 ? "bg-primary/40" : "bg-secondary/40"} rounded-t-md`} style={{ height: `${Math.max((h / maxHourly) * 100, 8)}%` }}></div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-subtle flex gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
              <span className="font-body-sm text-body-sm font-semibold">Buy Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
              <span className="font-body-sm text-body-sm font-semibold">Sell Orders</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-subtle bg-surface-container-low">
            <h2 className="font-headline-md text-headline-md font-bold">Liquidity Split</h2>
          </div>
          <div className="p-5 flex flex-col gap-4 flex-grow justify-between">
            <div className="flex flex-col gap-2">
              <div className="h-6 w-full flex rounded-lg overflow-hidden">
                <div className="bg-primary hover:opacity-80 transition-opacity cursor-help" style={{ width: `${mainPct}%` }} title={`Main: ${formatNaira(totalNaira)}`}></div>
                <div className="bg-secondary hover:opacity-80 transition-opacity cursor-help" style={{ width: `${reservePct}%` }} title={`Revenue: ${formatNaira(totalRevenue)}`}></div>
              </div>
              <div className="flex justify-between font-data-mono text-xs text-on-surface-variant font-bold">
                <span>TOTAL: {formatNaira(totalValue)}</span>
                <span className="text-status-success font-bold">LIVE</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-subtle">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="font-body-sm text-body-sm font-semibold">Main Wallets</span>
                </div>
                <span className="font-data-mono text-sm font-bold">{mainPct.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-subtle">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span className="font-body-sm text-body-sm font-semibold">Revenue Vault</span>
                </div>
                <span className="font-data-mono text-sm font-bold">{reservePct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md font-bold">Market Performance</h2>
            <span className="font-label-caps text-xs font-bold text-on-surface-variant">COIN-SPECIFIC DATA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm">
              <thead className="bg-surface-container-low border-b border-subtle">
                <tr>
                  <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">ASSET</th>
                  <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant text-right">PRICE (NGN)</th>
                  <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant text-right">24H CHANGE</th>
                  <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant text-right">VOLUME</th>
                </tr>
              </thead>
              <tbody className="font-data-mono divide-y divide-subtle">
                {coins.slice(0, 6).map((coin: any) => (
                  <tr key={coin.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 text-primary font-bold uppercase">{coin.symbol}</td>
                    <td className="px-4 py-3 text-right">{formatNaira(coin.priceNaira || 0)}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={coin.change24h >= 0 ? "text-status-success" : "text-status-danger"}>
                        {coin.change24h >= 0 ? "+" : ""}{(coin.change24h || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-variant">{formatUsd(coin.volume24h || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md font-bold">High-Value Entities</h2>
            <span className="font-label-caps text-xs font-bold text-on-surface-variant">USER VOLUME RANKING</span>
          </div>
          <div className="flex flex-col divide-y divide-subtle">
            {userVolumes.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-body-sm">No data available</div>
            ) : (
              userVolumes.map((e: any, i: number) => (
                <div key={e.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border border-subtle bg-surface-container-low flex items-center justify-center font-data-mono text-xs font-bold">{String(i + 1).padStart(2, "0")}</div>
                    <div>
                      <p className="font-body-md text-body-md font-bold text-on-surface">{e.name}</p>
                      <p className="text-xs font-data-mono text-on-surface-variant uppercase">ID: {e.id?.slice(0, 12)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-sm font-bold text-primary">{formatNaira(e.vol)}</p>
                    <p className="text-[10px] font-label-caps text-on-surface-variant uppercase font-bold">{e.txns} TRANSACTIONS</p>
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
