"use client";

import { useAdminStats } from "@/hooks/useAdminData";

function formatNaira(n: number) {
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

  const recentTxns = txns.slice(0, 8);
  const pendingWithdrawals = txns.filter(
    (t: any) => t.type === "withdrawal" && t.status === "pending"
  ).length;
  const flaggedTxns = txns.filter((t: any) => t.status === "flagged").length;

  const cryptoVol = market.reduce(
    (sum: number, m: any) => sum + (m.volume24h || 0) * (m.priceNaira || 0),
    0
  );

  const airtimeVol = txns
    .filter((t: any) => (t.type === "airtime" || t.type === "data") && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const giftcardVol = txns
    .filter((t: any) => t.type === "giftcard" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const p2pVol = txns
    .filter((t: any) => t.type === "p2p" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const maxServiceVol = Math.max(airtimeVol, giftcardVol, p2pVol, 1);

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

        {/* NGN Volume */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">NGN Volume</p>
            <p className="font-headline-lg text-headline-lg text-secondary">{formatNaira(stats.totalVolume)}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-success font-data-mono text-[10px]">{stats.completedTxns} completed</span>
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

        {/* Crypto Volume */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">Crypto Vol</p>
            <p className="font-headline-lg text-headline-lg text-on-surface">{formatNaira(cryptoVol)}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-on-surface-variant font-data-mono text-[10px]">{stats.marketCoins} coins</span>
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

        {/* Volume by Service */}
        <div className="col-span-2 bg-surface-bright border border-subtle p-3 rounded">
          <div className="flex justify-between items-center mb-4">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Volume by Service</p>
            <button className="material-symbols-outlined text-body-sm text-on-surface-variant">more_vert</button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">settings_cell</span>
                <span className="font-body-sm">Airtime/Data</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-body-sm">{formatNaira(airtimeVol)}</span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: `${(airtimeVol / maxServiceVol) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">redeem</span>
                <span className="font-body-sm">Giftcards</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-body-sm">{formatNaira(giftcardVol)}</span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary" style={{ width: `${(giftcardVol / maxServiceVol) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">swap_horizontal_circle</span>
                <span className="font-body-sm">P2P Escrow</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-body-sm">{formatNaira(p2pVol)}</span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(p2pVol / maxServiceVol) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Graph */}
        <div className="col-span-2 bg-surface-bright border border-subtle p-3 rounded relative overflow-hidden group">
          <div className="flex justify-between items-center mb-1">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Transaction Trend</p>
            <span className="font-data-mono text-status-success text-[10px]">{stats.totalTransactions} total</span>
          </div>
          <div className="h-32 w-full" />
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
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">Critical Alerts</h3>
          <div className="space-y-2">
            {pendingWithdrawals > 0 && (
              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border-l-2 border-status-danger">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-status-danger">priority_high</span>
                  <span className="font-body-sm">{pendingWithdrawals} Pending Withdrawals</span>
                </div>
                <span className="bg-status-danger/20 text-status-danger px-2 py-0.5 rounded text-[10px] font-bold">URGENT</span>
              </div>
            )}
            {flaggedTxns > 0 && (
              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border-l-2 border-status-warning">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-status-warning">flag</span>
                  <span className="font-body-sm">{flaggedTxns} Flagged Transactions</span>
                </div>
                <span className="bg-status-warning/20 text-status-warning px-2 py-0.5 rounded text-[10px] font-bold">REVIEW</span>
              </div>
            )}
            {stats.pendingTxns > 0 && (
              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border-l-2 border-status-info">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-status-info">pending</span>
                  <span className="font-body-sm">{stats.pendingTxns} Pending Transactions</span>
                </div>
                <span className="bg-status-info/20 text-status-info px-2 py-0.5 rounded text-[10px] font-bold">ACT</span>
              </div>
            )}
            {pendingWithdrawals === 0 && flaggedTxns === 0 && stats.pendingTxns === 0 && (
              <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded border-l-2 border-status-success">
                <span className="material-symbols-outlined text-status-success">check_circle</span>
                <span className="font-body-sm">All clear — no critical alerts</span>
              </div>
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
