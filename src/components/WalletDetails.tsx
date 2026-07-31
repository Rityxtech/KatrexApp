"use client";

import { useTransactions, useWallets } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  return `\u20a6${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function timeAgo(date: any) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTimestamp(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString("en-GB");
}

const DEPOSIT_ICONS: Record<string, string> = {
  deposit: "account_balance",
  crypto: "currency_bitcoin",
  virtual_account: "account_balance",
  card: "credit_card",
};

export default function WalletDetails() {
  const { data: txns, loading: lt } = useTransactions(50);
  const { data: wallets, loading: lw } = useWallets();

  const loading = lt || lw;

  const withdrawalQueue = txns
    .filter((t: any) => t.type === "withdrawal" && t.status === "pending")
    .slice(0, 10);

  const deposits = txns
    .filter((t: any) => t.type === "deposit")
    .slice(0, 10);

  const adjustments = txns
    .filter((t: any) => t.type === "adjustment" || t.description?.includes("adjustment") || t.description?.includes("refund") || t.description?.includes("correction"))
    .slice(0, 8);

  const totalNaira = wallets.reduce((s: number, w: any) => s + (w.nairaBalance || 0), 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container border border-subtle h-40 rounded animate-pulse" />
          ))}
        </div>
        <div className="lg:col-span-4 space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container border border-subtle h-32 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Column */}
      <div className="lg:col-span-8 space-y-5">
        {/* Withdrawal Approvals Queue */}
        <section className="bg-surface-container border border-subtle">
          <div className="px-3 py-2 border-b border-subtle bg-surface-container-high flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-warning">pending_actions</span>
              <h3 className="font-headline-md text-headline-md">Withdrawal Approvals Queue</h3>
            </div>
            <span className={`px-2 py-0.5 font-label-caps text-[10px] rounded-full ${withdrawalQueue.length > 0 ? "bg-error-container text-error" : "bg-status-success/10 text-status-success"}`}>
              {withdrawalQueue.length > 0 ? `${withdrawalQueue.length} URGENT` : "ALL CLEAR"}
            </span>
          </div>
          <div className="overflow-x-auto">
            {withdrawalQueue.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No pending withdrawals</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-deep/30">
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">USER</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">AMOUNT (NGN)</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">METHOD</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">REFERENCE</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {withdrawalQueue.map((r: any) => (
                    <tr key={r.id} className="hover:bg-surface-container-highest transition-colors group">
                      <td className="px-3 py-2 font-body-md text-body-md">{r.uid?.slice(0, 16) || "\u2014"}</td>
                      <td className="px-3 py-2 font-data-mono text-body-sm text-status-danger">{formatNaira(r.amountNaira || 0)}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 font-body-sm text-body-sm capitalize">
                          <span className="material-symbols-outlined text-[16px]">bolt</span> {r.paymentMethod || "bank"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-data-mono text-[10px] text-on-surface-variant">{r.reference || "\u2014"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-status-success/20 text-status-success transition-all"><span className="material-symbols-outlined">check_circle</span></button>
                          <button className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-status-danger/20 text-status-danger transition-all"><span className="material-symbols-outlined">cancel</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* User Wallet Control */}
        <section className="bg-surface-container border border-subtle p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">manage_accounts</span>
            <h3 className="font-headline-md text-headline-md">User Wallet Control</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">FIND USER BY HANDLE OR ID</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input className="w-full bg-surface-deep border border-subtle h-10 pl-10 pr-4 font-body-md focus:border-secondary focus:ring-0 outline-none transition-all" placeholder="e.g. @username or USR-9201" type="text" />
                </div>
              </div>
              <div className="p-3 border border-outline-variant/20 bg-surface-deep/40 rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-high rounded border border-secondary/30 flex items-center justify-center text-secondary font-bold">?</div>
                  <div>
                    <p className="font-body-md font-bold text-on-surface">Search for a user</p>
                    <p className="font-data-mono text-[10px] text-on-surface-variant">{wallets.length} wallets available</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 border-l border-outline-variant/10 pl-0 md:pl-4">
              <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">ADJUST BALANCE (OVERRIDE)</label>
              <div className="flex gap-2">
                <select className="bg-surface-deep border border-subtle h-10 px-2 font-body-sm text-on-surface focus:border-secondary outline-none">
                  <option>ADD (+)</option>
                  <option>SUB (-)</option>
                </select>
                <input className="flex-1 bg-surface-deep border border-subtle h-10 px-3 font-data-mono focus:border-secondary outline-none" placeholder="Amount" type="number" />
              </div>
              <input className="w-full bg-surface-deep border border-subtle h-10 px-3 font-body-sm focus:border-secondary outline-none" placeholder="Reason for adjustment (Internal Use)" type="text" />
              <button className="w-full h-10 bg-surface-bright border border-secondary text-secondary font-label-caps text-label-caps hover:bg-secondary hover:text-on-secondary transition-all">EXECUTE MANUAL OVERRIDE</button>
            </div>
          </div>
        </section>

        {/* Recent Adjustments Audit */}
        <section className="bg-surface-container border border-subtle">
          <div className="px-3 py-2 border-b border-subtle bg-surface-container-high flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-info">history_edu</span>
              <h3 className="font-headline-md text-headline-md">Recent Transactions Audit</h3>
            </div>
            <button className="text-secondary font-label-caps text-[10px] hover:underline">EXPORT CSV</button>
          </div>
          <div className="overflow-x-auto">
            {adjustments.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No recent adjustments</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-deep/30">
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">TIMESTAMP</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">USER</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">TYPE</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">AMOUNT</th>
                    <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {adjustments.map((r: any) => (
                    <tr key={r.id} className="hover:bg-surface-container-highest transition-colors">
                      <td className="px-3 py-1.5 font-data-mono text-[11px] text-on-surface-variant">{formatTimestamp(r.createdAt)}</td>
                      <td className="px-3 py-1.5 font-body-sm text-body-sm">{r.uid?.slice(0, 16) || "\u2014"}</td>
                      <td className="px-3 py-1.5 font-body-sm text-body-sm capitalize">{r.type}</td>
                      <td className={`px-3 py-1.5 font-data-mono text-body-sm ${r.amountNaira > 0 ? "text-status-success" : "text-status-danger"}`}>
                        {r.amountNaira ? formatNaira(r.amountNaira) : r.amountCoin ? `${r.amountCoin} ${r.coinSymbol || ""}` : "\u2014"}
                      </td>
                      <td className="px-3 py-1.5 font-body-sm text-body-sm max-w-[200px] truncate">{r.description || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-4 space-y-5">
        {/* Deposit Monitoring */}
        <section className="bg-surface-container border border-subtle">
          <div className="px-3 py-2 border-b border-subtle bg-surface-container-high flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-success">monitor_heart</span>
              <h3 className="font-headline-md text-headline-md">Deposit Monitoring</h3>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-ping"></div>
              <span className="font-label-caps text-[9px]">LIVE</span>
            </div>
          </div>
          <div className="p-0 max-h-[480px] overflow-y-auto">
            {deposits.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No recent deposits</div>
            ) : (
              deposits.map((d: any) => {
                const statusClass = d.status === "completed" ? "bg-status-success/10 text-status-success" : d.status === "pending" ? "bg-status-warning/10 text-status-warning" : "bg-status-danger/10 text-status-danger";
                const icon = DEPOSIT_ICONS[d.paymentMethod] || DEPOSIT_ICONS[d.type] || "account_balance";
                const amount = d.amountNaira ? formatNaira(d.amountNaira) : d.amountCoin ? `${d.amountCoin} ${d.coinSymbol || ""}` : "\u2014";
                return (
                  <div key={d.id} className="p-3 border-b border-outline-variant/10 hover:bg-surface-bright/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-label-caps text-[9px] ${statusClass} px-1 uppercase`}>{d.status}</span>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">{timeAgo(d.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">{icon}</span>
                        <div>
                          <p className="font-body-sm text-body-sm font-bold">{amount}</p>
                          <p className="font-body-sm text-[11px] text-on-surface-variant capitalize">{d.paymentMethod || d.type} &middot; {d.uid?.slice(0, 12) || "\u2014"}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant/40">chevron_right</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 bg-surface-deep text-center">
            <button className="font-label-caps text-[10px] text-secondary hover:text-primary transition-colors">VIEW ALL INCOMING FLOWS</button>
          </div>
        </section>

        {/* 24H Transaction Density */}
        <div className="bg-surface-bright border border-subtle p-3 space-y-3">
          <p className="font-label-caps text-label-caps text-on-surface-variant">TRANSACTION DENSITY</p>
          <div className="h-24 w-full bg-surface-deep relative flex items-end gap-0.5 px-1 pb-1">
            {Array.from({ length: 15 }).map((_, i) => {
              const hourTxns = txns.filter((t: any) => {
                if (!t.createdAt) return false;
                const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
                return d.getHours() === i;
              }).length;
              const maxCount = Math.max(...Array.from({ length: 24 }, (_, h) => txns.filter((t: any) => {
                if (!t.createdAt) return false;
                const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
                return d.getHours() === h;
              }).length), 1);
              const height = `${Math.max((hourTxns / maxCount) * 100, 5)}%`;
              return <div key={i} className={`w-full ${i === new Date().getHours() % 15 ? "bg-secondary animate-pulse" : "bg-secondary/40"}`} style={{ height }}></div>;
            })}
          </div>
          <div className="flex justify-between font-data-mono text-[9px] text-on-surface-variant">
            <span>00:00</span>
            <span>{txns.length} txns</span>
            <span>23:59</span>
          </div>
        </div>

        {/* System Alert */}
        <div className={`border p-2 flex gap-3 items-start ${totalNaira < 50_000_000 ? "bg-status-warning/10 border-status-warning/30" : "bg-status-success/10 border-status-success/30"}`}>
          <span className={`material-symbols-outlined text-[18px] ${totalNaira < 50_000_000 ? "text-status-warning" : "text-status-success"}`}>
            {totalNaira < 50_000_000 ? "warning" : "check_circle"}
          </span>
          <div>
            <p className={`font-label-caps text-[10px] ${totalNaira < 50_000_000 ? "text-status-warning" : "text-status-success"}`}>SYSTEM STATUS</p>
            <p className="font-body-sm text-[11px] text-on-surface">
              {totalNaira < 50_000_000
                ? `Main Wallet liquidity is below ${"\u20a6"}50M threshold. Consider rebalancing from Reserve.`
                : `Main Wallet liquidity is healthy at ${formatNaira(totalNaira)}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
