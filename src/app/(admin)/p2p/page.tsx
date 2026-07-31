"use client";

import { useP2PListings, useTransactions, useWallets } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(0)}`;
}

function timeAgo(date: any) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-status-success",
  pending: "text-status-warning",
  disputed: "text-status-danger",
  completed: "text-status-success",
  cancelled: "text-on-surface-variant",
  processing: "text-status-info",
};

const ESCROW_COLORS: Record<string, string> = {
  locked: "bg-surface-container border border-subtle",
  released: "bg-status-success/10 text-status-success border border-status-success/20",
  frozen: "bg-status-danger/10 text-status-danger border border-status-danger/20",
  pending: "bg-surface-container border border-subtle",
};

export default function P2PPage() {
  const { data: listings, loading } = useP2PListings(50);
  const { data: txns } = useTransactions(200);
  const { data: wallets } = useWallets();

  const p2pTxns = txns.filter((t: any) => t.type === "p2p");
  const pendingListings = listings.filter((l: any) => l.status === "pending");
  const disputedTxns = p2pTxns.filter((t: any) => t.status === "disputed" || t.status === "flagged");
  const escrowBalance = wallets.reduce((s: number, w: any) => s + (w.escrowBalance || 0), 0);

  const sellerStats = listings.reduce((acc: Record<string, { trades: number; rating: number }>, l: any) => {
    const seller = l.sellerUid || l.uid || "unknown";
    if (!acc[seller]) acc[seller] = { trades: 0, rating: l.rating || 0 };
    acc[seller].trades++;
    return acc;
  }, {});

  const topSellers = Object.entries(sellerStats)
    .sort((a: any, b: any) => b[1].trades - a[1].trades)
    .slice(0, 5);

  return (
    <div className="p-4 w-full">
      <div className="space-y-5 pb-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-bright border border-subtle p-4 rounded-lg flex flex-col justify-between">
            <div>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Funds in Escrow</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="font-headline-lg text-headline-lg text-secondary">{formatNaira(escrowBalance)}</h2>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-secondary text-on-secondary px-3 py-1.5 rounded font-label-caps text-label-caps font-bold hover:opacity-90 transition-opacity">RELEASE MANUAL</button>
              <button className="flex-1 border border-subtle text-on-surface px-3 py-1.5 rounded font-label-caps text-label-caps font-bold hover:bg-surface-container transition-colors">REFUND ALL</button>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface-container-high border-l-4 border-l-status-danger border-y border-r border-subtle p-4 rounded-lg relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-status-danger" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                  <span className="font-headline-md text-headline-md text-on-surface">Open Disputes</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${disputedTxns.length > 0 ? "bg-status-danger text-white" : "bg-status-success/10 text-status-success"}`}>
                    {disputedTxns.length > 0 ? `${String(disputedTxns.length).padStart(2, "0")} URGENT` : "ALL CLEAR"}
                  </span>
                </div>
                <p className="font-body-sm text-on-surface-variant mt-1">
                  {disputedTxns[0] ? `ID: #${disputedTxns[0].reference || disputedTxns[0].id?.slice(0, 8)} \u2022 ${disputedTxns[0].uid?.slice(0, 16) || ""} \u2022 ${disputedTxns[0].description?.slice(0, 30) || "Dispute"}` : "No active disputes"}
                </p>
              </div>
              {disputedTxns.length > 0 && (
                <button className="bg-status-danger text-white px-4 py-2 rounded font-headline-md text-headline-md hover:brightness-110 transition-all shadow-lg">RESOLVE NOW</button>
              )}
            </div>
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'wght' 700" }}>gavel</span>
            </div>
          </div>

          <div className="bg-surface-bright border border-subtle p-4 rounded-lg">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Market Liquidity</span>
            <div className="h-16 mt-2 flex items-end gap-1">
              {Array.from({ length: 7 }).map((_, i) => {
                const dayListings = listings.filter((l: any) => {
                  if (!l.createdAt) return false;
                  const d = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
                  return Math.floor((Date.now() - d.getTime()) / 86400000) === i;
                }).length;
                const maxDay = Math.max(...Array.from({ length: 7 }, (_, j) => listings.filter((l: any) => {
                  if (!l.createdAt) return false;
                  const d = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
                  return Math.floor((Date.now() - d.getTime()) / 86400000) === j;
                }).length), 1);
                return <div key={i} className={`flex-1 bg-secondary ${i === 0 ? "" : "opacity-60"} rounded-t-sm`} style={{ height: `${Math.max((dayListings / maxDay) * 100, 10)}%` }}></div>;
              })}
            </div>
            <div className="flex justify-between mt-2 font-data-mono text-[10px] text-on-surface-variant">
              <span>L-7D</span>
              <span>{listings.length} LIVE</span>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 space-y-3">
            {/* Listing Approvals */}
            <div>
              <div className="flex justify-between items-center px-1">
                <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">pending_actions</span>
                  Queue: Listing Approvals
                </h3>
                <span className="font-label-caps text-label-caps text-on-surface-variant">{pendingListings.length} PENDING</span>
              </div>
              <div className="flex overflow-x-auto gap-3 pb-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="min-w-[280px] bg-surface-bright border border-subtle h-40 rounded-lg animate-pulse" />)
                ) : pendingListings.length === 0 ? (
                  <div className="p-4 text-on-surface-variant text-body-sm">No pending listings</div>
                ) : (
                  pendingListings.slice(0, 10).map((c: any) => (
                    <div key={c.id} className="min-w-[280px] bg-surface-bright border border-subtle p-3 rounded-lg hover:border-secondary transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-surface-container border border-subtle flex items-center justify-center">
                          <span className="material-symbols-outlined text-secondary">{c.icon || "inventory_2"}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-body-md font-bold text-on-surface truncate">{c.title || c.name || "Listing"}</h4>
                          <div className="flex items-center gap-1 text-on-surface-variant text-[10px] font-data-mono">
                            <span className="material-symbols-outlined text-[12px]">person</span> {c.sellerUid?.slice(0, 12) || c.uid?.slice(0, 12) || "\u2014"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-y border-subtle/50 py-2 my-2">
                        <div>
                          <span className="block font-label-caps text-on-surface-variant">CATEGORY</span>
                          <span className="font-body-sm font-medium">{c.category || c.niche || "\u2014"}</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-label-caps text-on-surface-variant">PRICE</span>
                          <span className="font-body-sm font-bold text-secondary">{formatNaira(c.price || c.amountNaira || 0)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-status-success/10 text-status-success border border-status-success/20 py-1 rounded hover:bg-status-success/20 transition-colors flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span className="font-label-caps">Approve</span>
                        </button>
                        <button className="flex-1 bg-status-danger/10 text-status-danger border border-status-danger/20 py-1 rounded hover:bg-status-danger/20 transition-colors flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span className="font-label-caps">Reject</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* P2P Trade Ledger */}
            <div className="bg-surface-bright border border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-subtle flex justify-between items-center bg-surface-container/30">
                <h3 className="font-headline-md text-headline-md text-on-surface">P2P Trade Ledger</h3>
                <div className="flex gap-2">
                  <input className="bg-surface-container border border-subtle rounded px-3 py-1 text-body-sm focus:outline-none focus:border-secondary w-48" placeholder="Search trades..." type="text" />
                  <button className="bg-surface-container border border-subtle px-2 rounded hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {p2pTxns.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-body-sm">No P2P trades yet</div>
                ) : (
                  <table className="w-full text-left font-body-sm border-collapse">
                    <thead className="bg-surface-container-low text-on-surface-variant font-label-caps text-[10px] border-b border-subtle">
                      <tr>
                        <th className="px-4 py-2 font-bold">TRADE ID</th>
                        <th className="px-4 py-2 font-bold">USER</th>
                        <th className="px-4 py-2 font-bold">AMOUNT</th>
                        <th className="px-4 py-2 font-bold">STATUS</th>
                        <th className="px-4 py-2 font-bold">ESCROW</th>
                        <th className="px-4 py-2 font-bold text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {p2pTxns.slice(0, 20).map((t: any) => (
                        <tr key={t.id} className={`hover:bg-primary-container/20 transition-colors ${t.status === "disputed" || t.status === "flagged" ? "bg-status-danger/5" : ""}`}>
                          <td className="px-4 py-2 font-data-mono text-secondary">#{t.reference || t.id?.slice(0, 8)}</td>
                          <td className="px-4 py-2"><span className="text-on-surface font-medium">{t.uid?.slice(0, 16) || "\u2014"}</span></td>
                          <td className="px-4 py-2 font-data-mono">{formatNaira(t.amountNaira || 0)}</td>
                          <td className="px-4 py-2">
                            <span className={`flex items-center gap-1.5 ${STATUS_COLORS[t.status] || "text-on-surface-variant"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${t.status === "disputed" || t.status === "flagged" ? "bg-status-danger animate-pulse" : `bg-current`}`}></span>
                              <span className="capitalize">{t.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${ESCROW_COLORS[t.escrowStatus] || ESCROW_COLORS.pending} uppercase`}>{t.escrowStatus || "pending"}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {t.status === "disputed" || t.status === "flagged" ? (
                              <button className="bg-status-danger text-white px-2 py-0.5 rounded text-[10px] font-bold">RESOLVE</button>
                            ) : (
                              <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary">more_vert</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-4 space-y-5">
            {/* Top Sellers */}
            <div className="bg-surface-bright border border-subtle rounded-lg flex flex-col h-fit">
              <div className="px-4 py-3 border-b border-subtle bg-surface-container/30 flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-primary">Top Sellers</h3>
                <button className="text-secondary text-[11px] font-bold hover:underline">VIEW ALL</button>
              </div>
              <div className="p-2 space-y-1 overflow-y-auto max-h-[350px]">
                {topSellers.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant text-body-sm">No seller data</div>
                ) : (
                  topSellers.map(([uid, stats]: any) => (
                    <div key={uid} className="flex items-center justify-between p-2 hover:bg-surface-container-high rounded transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-container border border-subtle flex items-center justify-center text-on-surface-variant text-xs font-bold">
                          {uid.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-body-sm font-bold text-on-surface">{uid.slice(0, 16)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                            <span>({stats.trades} trades)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-on-surface-variant hover:text-status-danger" title="Flag User">
                          <span className="material-symbols-outlined text-[18px]">flag</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Marketplace */}
            <div className="bg-surface-bright border border-subtle rounded-lg flex flex-col">
              <div className="px-4 py-3 border-b border-subtle bg-surface-container/30">
                <h3 className="font-headline-md text-headline-md text-primary">Live Marketplace</h3>
              </div>
              <div className="p-3 space-y-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1.5 text-on-surface-variant text-[18px]">search</span>
                  <input className="w-full bg-surface-container border border-subtle rounded pl-8 pr-3 py-1.5 text-body-sm focus:outline-none focus:border-secondary" placeholder="Search live listings..." type="text" />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {listings.filter((l: any) => l.status === "active" || l.status === "approved").length === 0 ? (
                    <div className="p-4 text-center text-on-surface-variant text-body-sm">No active listings</div>
                  ) : (
                    listings.filter((l: any) => l.status === "active" || l.status === "approved").slice(0, 10).map((l: any) => (
                      <div key={l.id} className="bg-surface-container/50 border border-subtle p-2 rounded flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body-sm font-medium text-on-surface truncate">{l.title || l.name || "Listing"}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant font-data-mono">Listed by: {l.sellerUid?.slice(0, 12) || l.uid?.slice(0, 12)} \u2022 {formatNaira(l.price || l.amountNaira || 0)}</span>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button className="w-7 h-7 flex items-center justify-center rounded border border-subtle hover:bg-surface-container transition-colors text-on-surface-variant hover:text-secondary">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center rounded border border-subtle hover:bg-status-danger/20 transition-colors text-on-surface-variant hover:text-status-danger">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
