"use client";

import { useAdminStats, useKycQueue, useP2PDisputes, useSupportTickets, useCryptoDeposits } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(1)}K`;
  return `\u20a6${n.toFixed(0)}`;
}

const TX_ICONS: Record<string, { icon: string; color: string }> = {
  deposit: { icon: "account_balance_wallet", color: "text-secondary" },
  withdrawal: { icon: "account_balance_wallet", color: "text-status-danger" },
  crypto: { icon: "currency_bitcoin", color: "text-primary" },
  airtime: { icon: "settings_cell", color: "text-secondary" },
  data: { icon: "settings_cell", color: "text-secondary" },
  giftcard: { icon: "redeem", color: "text-tertiary" },
  p2p: { icon: "swap_horizontal_circle", color: "text-primary" },
  swap: { icon: "swap_horiz", color: "text-primary" },
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-status-success",
  pending: "text-status-warning",
  failed: "text-status-danger",
  flagged: "text-status-danger",
  processing: "text-status-info",
};

export default function DashboardPage() {
  const { stats, txns, wallets, market, loading } = useAdminStats();
  const { data: kycQueue } = useKycQueue();
  const { data: p2pDisputes } = useP2PDisputes();
  const { data: supportTickets } = useSupportTickets();
  const { data: cryptoDeposits } = useCryptoDeposits();

  const recentTxns = txns.slice(0, 8);
  const pendingWithdrawals = txns.filter(
    (t: any) => t.type === "withdrawal" && t.status === "pending"
  ).length;
  const flaggedTxns = txns.filter((t: any) => t.status === "flagged").length;

  // Total crypto holdings value in Naira (all users' crypto balances * current prices)
  const totalCryptoValue = wallets.reduce((sum: number, w: any) => {
    const cryptoBalances = w.cryptoBalances || {};
    let walletValue = 0;
    for (const [symbol, balance] of Object.entries(cryptoBalances)) {
      const coin = market.find((m: any) =>
        m.symbol?.toLowerCase() === symbol.toLowerCase() ||
        m.id?.toLowerCase() === symbol.toLowerCase()
      );
      const priceNaira = Number(coin?.priceNaira) || 0;
      const balanceNum = Number(balance) || 0;
      walletValue += balanceNum * priceNaira;
    }
    return sum + walletValue;
  }, 0);
  const safeCryptoValue = isNaN(totalCryptoValue) ? 0 : totalCryptoValue;

  // Platform profit from fees
  const cryptoProfit = txns
    .filter((t: any) => t.type === "crypto" && t.status === "completed" && t.feeAmount)
    .reduce((s: number, t: any) => {
      const coin = market.find((m: any) => m.symbol?.toLowerCase() === t.coinSymbol?.toLowerCase());
      const priceNaira = Number(coin?.priceNaira) || 0;
      const feeNum = Number(t.feeAmount) || 0;
      return s + feeNum * priceNaira;
    }, 0);
  const p2pProfit = txns
    .filter((t: any) => t.type === "p2p" && t.status === "completed" && t.escrowFeeNaira)
    .reduce((s: number, t: any) => s + (Number(t.escrowFeeNaira) || 0), 0);

  const airtimeVol = txns
    .filter((t: any) => (t.type === "airtime" || t.type === "data") && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const airtimeProfit = airtimeVol * 0.05;

  const giftcardVol = txns
    .filter((t: any) => t.type === "giftcard" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const giftcardProfit = giftcardVol * 0.03;

  const totalProfit = cryptoProfit + p2pProfit + airtimeProfit + giftcardProfit;
  const safeTotalProfit = isNaN(totalProfit) ? 0 : totalProfit;

  const p2pVol = txns
    .filter((t: any) => t.type === "p2p" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const maxServiceVol = Math.max(airtimeVol, giftcardVol, p2pVol, 1);

  // Service performance data
  const cryptoVol = txns
    .filter((t: any) => t.type === "crypto" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const cryptoCount = txns.filter((t: any) => t.type === "crypto" && t.status === "completed").length;
  const airtimeCount = txns.filter((t: any) => (t.type === "airtime" || t.type === "data") && t.status === "completed").length;
  const giftcardCount = txns.filter((t: any) => t.type === "giftcard" && t.status === "completed").length;
  const p2pCount = txns.filter((t: any) => t.type === "p2p" && t.status === "completed").length;

  const services = [
    { name: "Crypto", icon: "currency_bitcoin", color: "text-primary", barColor: "bg-primary", vol: cryptoVol, count: cryptoCount, profit: cryptoProfit },
    { name: "Airtime/Data", icon: "settings_cell", color: "text-secondary", barColor: "bg-secondary", vol: airtimeVol, count: airtimeCount, profit: airtimeProfit },
    { name: "Giftcards", icon: "redeem", color: "text-tertiary", barColor: "bg-tertiary", vol: giftcardVol, count: giftcardCount, profit: giftcardProfit },
    { name: "P2P Escrow", icon: "swap_horizontal_circle", color: "text-status-info", barColor: "bg-status-info", vol: p2pVol, count: p2pCount, profit: p2pProfit },
  ];
  const totalServiceVol = services.reduce((s, sv) => s + sv.vol, 0) || 1;

  // Donut chart segments (cumulative percentages for conic-gradient)
  let cumPercent = 0;
  const donutSegments = services.map((sv) => {
    const percent = (sv.vol / totalServiceVol) * 100;
    const start = cumPercent;
    cumPercent += percent;
    return { ...sv, percent, start };
  });

  // 7-day activity chart data
  const now = new Date();
  const days: { label: string; date: string; count: number; volume: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayTxns = txns.filter((t: any) => {
      const created = t.createdAt?.toDate?.() || t.createdAt;
      if (!created) return false;
      const tStr = new Date(created).toISOString().slice(0, 10);
      return tStr === dateStr;
    });
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }),
      date: dateStr,
      count: dayTxns.length,
      volume: dayTxns.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (t.amountNaira || 0), 0),
    });
  }
  const maxDayCount = Math.max(...days.map((d) => d.count), 1);
  const totalWeekTxns = days.reduce((s, d) => s + d.count, 0);
  const avgDaily = totalWeekTxns / 7;
  const peakDay = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);
  const successRate = totalWeekTxns > 0
    ? ((days.reduce((s, d) => {
        const dayCompleted = txns.filter((t: any) => {
          const created = t.createdAt?.toDate?.() || t.createdAt;
          if (!created) return false;
          const tStr = new Date(created).toISOString().slice(0, 10);
          return tStr === d.date && t.status === "completed";
        }).length;
        return s + dayCompleted;
      }, 0) / totalWeekTxns) * 100).toFixed(1)
    : "0";

  // Action Center data
  const openDisputes = (p2pDisputes || []).filter((d: any) => d.status === "open");
  const pendingKyc = (kycQueue || []).length;
  const pendingDeposits = (cryptoDeposits || []).filter((d: any) => d.status === "pending" || d.status === "confirming");
  const pendingDepositTotal = pendingDeposits.reduce((s: number, d: any) => s + (d.amountNaira || 0), 0);
  const failedLast24h = txns.filter((t: any) => {
    if (t.status !== "failed") return false;
    const created = t.createdAt?.toDate?.() || t.createdAt;
    if (!created) return false;
    const age = Date.now() - new Date(created).getTime();
    return age < 24 * 60 * 60 * 1000;
  });
  const openTickets = (supportTickets || []).filter((t: any) => t.status === "open" || t.status === "pending");
  const pendingWithdrawalAmount = txns
    .filter((t: any) => t.type === "withdrawal" && t.status === "pending")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const alerts = [
    {
      id: "withdrawals",
      show: pendingWithdrawals > 0,
      icon: "account_balance_wallet",
      title: `${pendingWithdrawals} Pending Withdrawal${pendingWithdrawals > 1 ? "s" : ""}`,
      subtitle: `${formatNaira(pendingWithdrawalAmount)} at risk`,
      badge: "URGENT",
      badgeColor: "bg-status-danger/20 text-status-danger",
      borderColor: "border-status-danger",
      iconColor: "text-status-danger",
      href: "/transactions",
    },
    {
      id: "disputes",
      show: openDisputes.length > 0,
      icon: "gavel",
      title: `${openDisputes.length} Open P2P Dispute${openDisputes.length > 1 ? "s" : ""}`,
      subtitle: "Needs resolution",
      badge: "ACT",
      badgeColor: "bg-status-danger/20 text-status-danger",
      borderColor: "border-status-danger",
      iconColor: "text-status-danger",
      href: "/p2p",
    },
    {
      id: "kyc",
      show: pendingKyc > 0,
      icon: "verified_user",
      title: `${pendingKyc} KYC Verification${pendingKyc > 1 ? "s" : ""}`,
      subtitle: "Awaiting review",
      badge: "QUEUE",
      badgeColor: "bg-status-warning/20 text-status-warning",
      borderColor: "border-status-warning",
      iconColor: "text-status-warning",
      href: "/kyc",
    },
    {
      id: "deposits",
      show: pendingDeposits.length > 0,
      icon: "currency_bitcoin",
      title: `${pendingDeposits.length} Pending Deposit${pendingDeposits.length > 1 ? "s" : ""}`,
      subtitle: `${formatNaira(pendingDepositTotal)} awaiting confirm`,
      badge: "WAIT",
      badgeColor: "bg-status-info/20 text-status-info",
      borderColor: "border-status-info",
      iconColor: "text-status-info",
      href: "/crypto",
    },
    {
      id: "failed",
      show: failedLast24h.length > 0,
      icon: "error",
      title: `${failedLast24h.length} Failed Transaction${failedLast24h.length > 1 ? "s" : ""}`,
      subtitle: "Last 24 hours",
      badge: "CHECK",
      badgeColor: "bg-status-warning/20 text-status-warning",
      borderColor: "border-status-warning",
      iconColor: "text-status-warning",
      href: "/transactions",
    },
    {
      id: "flagged",
      show: flaggedTxns > 0,
      icon: "flag",
      title: `${flaggedTxns} Flagged Transaction${flaggedTxns > 1 ? "s" : ""}`,
      subtitle: "Requires review",
      badge: "REVIEW",
      badgeColor: "bg-status-warning/20 text-status-warning",
      borderColor: "border-status-warning",
      iconColor: "text-status-warning",
      href: "/transactions",
    },
    {
      id: "tickets",
      show: openTickets.length > 0,
      icon: "support_agent",
      title: `${openTickets.length} Open Support Ticket${openTickets.length > 1 ? "s" : ""}`,
      subtitle: "User help needed",
      badge: "OPEN",
      badgeColor: "bg-secondary/20 text-secondary",
      borderColor: "border-secondary",
      iconColor: "text-secondary",
      href: "/support",
    },
  ];

  const activeAlerts = alerts.filter((a) => a.show);

  const fiatReserve = wallets.reduce(
    (s: number, w: any) => s + (w.nairaBalance || 0),
    0
  );

  if (loading) {
    return (
      <div className="w-full p-gutter grid grid-cols-1 lg:grid-cols-12 gap-unit animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface-bright border border-subtle p-3 rounded h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full p-gutter grid grid-cols-1 lg:grid-cols-12 gap-unit">
      {/* Section: Key Stats */}
      <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-unit">
        {/* Total Users */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">Total Users</p>
            <p className="font-headline-lg text-headline-lg text-primary">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-success font-data-mono text-[10px]">LIVE</span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-status-success/40 w-full h-[40%]" />
                <div className="bg-status-success/40 w-full h-[55%]" />
                <div className="bg-status-success/40 w-full h-[35%]" />
                <div className="bg-status-success/40 w-full h-[70%]" />
                <div className="bg-status-success/40 w-full h-[60%]" />
                <div className="bg-status-success w-full h-[85%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Value */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">Crypto Value</p>
            <p className="font-headline-lg text-headline-lg text-secondary">{formatNaira(safeCryptoValue)}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-success font-data-mono text-[10px]">{stats.marketCoins} coins</span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-secondary/40 w-full h-[60%]" />
                <div className="bg-secondary/40 w-full h-[45%]" />
                <div className="bg-secondary/40 w-full h-[80%]" />
                <div className="bg-secondary/40 w-full h-[70%]" />
                <div className="bg-secondary/40 w-full h-[50%]" />
                <div className="bg-secondary w-full h-[90%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Platform Profit */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">Platform Profit</p>
            <p className="font-headline-lg text-headline-lg text-primary">{formatNaira(safeTotalProfit)}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-on-surface-variant font-data-mono text-[10px]">all services</span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-primary/40 w-full h-[80%]" />
                <div className="bg-primary/40 w-full h-[70%]" />
                <div className="bg-primary/40 w-full h-[60%]" />
                <div className="bg-primary/40 w-full h-[45%]" />
                <div className="bg-primary/40 w-full h-[50%]" />
                <div className="bg-primary w-full h-[30%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Txns */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">Pending Txns</p>
            <p className="font-headline-lg text-headline-lg text-status-warning">{stats.pendingTxns}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-warning font-data-mono text-[10px]">awaiting</span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-status-warning/40 w-full h-[20%]" />
                <div className="bg-status-warning/40 w-full h-[40%]" />
                <div className="bg-status-warning/40 w-full h-[55%]" />
                <div className="bg-status-warning/40 w-full h-[65%]" />
                <div className="bg-status-warning/40 w-full h-[80%]" />
                <div className="bg-status-warning w-full h-[95%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="col-span-2 bg-surface-bright border border-subtle p-3 rounded">
          <div className="flex justify-between items-center mb-3">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Service Performance</p>
            <span className="font-data-mono text-[10px] text-on-surface-variant">{stats.completedTxns} total txns</span>
          </div>
          <div className="flex gap-4 items-start">
            {/* Donut Chart */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: donutSegments.every((s) => s.percent === 0)
                    ? undefined
                    : `conic-gradient(${donutSegments.map((s) => {
                        const colors: Record<string, string> = {
                          Crypto: "var(--color-primary)",
                          "Airtime/Data": "var(--color-secondary)",
                          Giftcards: "var(--color-tertiary)",
                          "P2P Escrow": "var(--color-status-info)",
                        };
                        return `${colors[s.name] || "#888"} ${s.start}% ${s.start + s.percent}%`;
                      }).join(", ")})`,
                }}
              />
              <div className="absolute inset-3 bg-surface-bright rounded-full flex items-center justify-center">
                <span className="font-data-mono text-[10px] text-on-surface-variant text-center leading-tight">
                  {formatNaira(totalServiceVol)}
                </span>
              </div>
            </div>
            {/* Service Breakdown */}
            <div className="flex-1 space-y-2 min-w-0">
              {services.map((sv) => (
                <div key={sv.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`material-symbols-outlined text-[14px] ${sv.color}`}>{sv.icon}</span>
                    <span className="font-body-sm text-[11px] truncate">{sv.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-data-mono text-[10px] text-on-surface-variant">{sv.count} txns</span>
                    <span className="font-data-mono text-[11px] font-medium">{formatNaira(sv.vol)}</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant w-8 text-right">
                      {((sv.vol / totalServiceVol) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Profit row */}
          <div className="mt-3 pt-2 border-t border-subtle flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">Est. Revenue</span>
            <span className="font-data-mono text-body-sm text-status-success">{formatNaira(safeTotalProfit)}</span>
          </div>
        </div>

        {/* 7-Day Activity */}
        <div className="col-span-2 bg-surface-bright border border-subtle p-3 rounded">
          <div className="flex justify-between items-center mb-3">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">7-Day Activity</p>
            <div className="flex gap-3">
              <span className="font-data-mono text-[10px] text-on-surface-variant">avg {avgDaily.toFixed(1)}/day</span>
              <span className="font-data-mono text-[10px] text-status-success">{successRate}% success</span>
            </div>
          </div>
          {/* Bar Chart */}
          <div className="flex items-end gap-1.5 h-24 mb-2">
            {days.map((day) => {
              const heightPct = (day.count / maxDayCount) * 100;
              const isPeak = day.date === peakDay.date;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="font-data-mono text-[9px] text-on-surface-variant">{day.count}</span>
                  <div
                    className={`w-full rounded-t-sm transition-all ${isPeak ? "bg-primary" : "bg-primary/40"}`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          {/* Day labels */}
          <div className="flex gap-1.5">
            {days.map((day) => {
              const isPeak = day.date === peakDay.date;
              return (
                <div key={day.date} className="flex-1 text-center">
                  <span className={`font-data-mono text-[9px] ${isPeak ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Summary metrics */}
          <div className="mt-3 pt-2 border-t border-subtle grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="font-data-mono text-headline-sm text-on-surface">{totalWeekTxns}</p>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase">Total Txns</p>
            </div>
            <div className="text-center">
              <p className="font-data-mono text-headline-sm text-on-surface">{peakDay.label}</p>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase">Peak Day</p>
            </div>
            <div className="text-center">
              <p className="font-data-mono text-headline-sm text-on-surface">{formatNaira(days.reduce((s, d) => s + d.volume, 0))}</p>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase">Week Volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Transactions Feed */}
      <div className="lg:col-span-4 bg-surface-bright border border-subtle flex flex-col rounded overflow-hidden">
        <div className="px-3 py-2 border-b border-subtle bg-surface-container-low flex justify-between items-center">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase">Live Transactions</h3>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span className="text-[9px] font-label-caps text-status-success">STREAMING</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar max-h-[460px]">
          {recentTxns.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant text-body-sm">No transactions yet</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-subtle">
                {recentTxns.map((t: any) => {
                  const meta = TX_ICONS[t.type] || TX_ICONS[t.paymentMethod] || { icon: "receipt_long", color: "text-on-surface-variant" };
                  const statusColor = STATUS_COLORS[t.status] || "text-on-surface-variant";
                  const amount = t.amountNaira ? formatNaira(t.amountNaira) : t.amountCoin ? `${t.amountCoin} ${t.coinSymbol || ""}` : "\u2014";
                  return (
                    <tr key={t.id} className="hover:bg-surface-container-highest transition-colors cursor-pointer group">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded bg-surface-container-low flex items-center justify-center ${meta.color}`}>
                            <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                          </div>
                          <div>
                            <p className="font-body-sm font-medium capitalize">{t.type || t.paymentMethod || "Transaction"}</p>
                            <p className="text-[10px] text-on-surface-variant">{t.uid?.slice(0, 12) || "\u2014"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <p className="font-data-mono text-body-sm">{amount}</p>
                        <p className={`text-[10px] capitalize ${statusColor}`}>{t.status}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-3 py-2 border-t border-subtle bg-surface-container-low text-center">
          <button className="font-label-caps text-primary hover:underline">View All Records</button>
        </div>
      </div>

      {/* Alerts & System Health */}
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-unit">
        <div className="bg-surface-bright border border-subtle p-3 rounded">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase">Action Center</h3>
            <span className="font-data-mono text-[10px] text-on-surface-variant">{activeAlerts.length} active</span>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-3 bg-surface-container-low p-2.5 rounded border-l-2 border-status-success">
                <span className="material-symbols-outlined text-status-success">check_circle</span>
                <span className="font-body-sm">All clear — no actions needed</span>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <a
                  key={alert.id}
                  href={alert.href}
                  className={`flex items-center justify-between bg-surface-container-low p-2.5 rounded border-l-2 ${alert.borderColor} hover:bg-surface-container-highest transition-colors cursor-pointer group`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`material-symbols-outlined text-[18px] ${alert.iconColor}`}>{alert.icon}</span>
                    <div className="min-w-0">
                      <p className="font-body-sm font-medium truncate">{alert.title}</p>
                      <p className="text-[10px] text-on-surface-variant">{alert.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`${alert.badgeColor} px-1.5 py-0.5 rounded text-[9px] font-bold`}>{alert.badge}</span>
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

        <div className="bg-surface-bright border border-subtle p-3 rounded">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">Integration Gateway Health</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                <span className="font-body-sm">Firestore</span>
              </div>
              <span className="font-data-mono text-[10px] text-status-success">CONNECTED</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-body-sm">Market Data Feed</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">{stats.marketCoins} coins tracked</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-body-sm">Wallets Sync</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">{wallets.length} wallets</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-body-sm">User Registry</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">{stats.totalUsers} users</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Snapshot */}
      <div className="lg:col-span-4 bg-surface-container border border-subtle p-3 rounded">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">System Snapshot</h3>
        <div className="space-y-4">
          <div className="p-3 bg-surface-deep rounded border border-subtle">
            <p className="font-label-caps text-label-caps text-primary mb-2">Total Wallet Balance</p>
            <p className="font-headline-md text-headline-md">{formatNaira(fiatReserve)}</p>
            <div className="mt-2 h-1 w-full bg-surface-container-highest rounded-full">
              <div className="h-full bg-primary" style={{ width: `${Math.min((fiatReserve / 100_000_000) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="p-3 bg-surface-deep rounded border border-subtle">
            <p className="font-label-caps text-label-caps text-secondary mb-2">Verified Users</p>
            <p className="font-headline-md text-headline-md">{stats.verifiedUsers.toLocaleString()}</p>
            <p className="text-[10px] text-on-surface-variant mt-1">out of {stats.totalUsers.toLocaleString()} total</p>
          </div>
          <button className="w-full py-2 bg-primary text-on-primary font-headline-md rounded hover:opacity-90 transition-opacity">
            Manual Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
}
