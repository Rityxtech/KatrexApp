"use client";

import { useState, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  useP2PListings,
  useP2PTrades,
  useP2PDisputes,
  useP2PSettings,
  useWallets,
  // New hooks (to be implemented separately)
  // usePeers, usePeerTransactions
} from "@/hooks/useAdminData";

// Utility helpers ----------------------------------------------------------
function formatNaira(n: number) {
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
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

// Color Maps --------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  active: "text-status-success",
  live: "text-status-success",
  pending: "text-status-warning",
  disputed: "text-status-danger",
  escrow_locked: "text-status-info",
  credentials_sent: "text-status-info",
  buyer_secured: "text-status-info",
  released: "text-status-success",
  refunded: "text-on-surface-variant",
  cancelled: "text-on-surface-variant",
  completed: "text-status-success",
  processing: "text-status-info",
};

const ESCROW_COLORS: Record<string, string> = {
  locked: "bg-surface-container border border-subtle",
  released: "bg-status-success/10 text-status-success border border-status-success/20",
  frozen: "bg-status-danger/10 text-status-danger border border-status-danger/20",
  refunded: "bg-on-surface-variant/10 text-on-surface-variant border border-subtle",
  pending: "bg-surface-container border border-subtle",
};

// -------------------------------------------------------------------------
export default function P2PPage() {
  // ---------------------------------------------------------------------
  // State shared across tabs (settings, manual actions, etc.)
  // ---------------------------------------------------------------------
  const { data: listings, loading } = useP2PListings(50);
  const { data: trades } = useP2PTrades(100);
  const { data: disputes } = useP2PDisputes(50);
  const { data: settings } = useP2PSettings();
  const { data: wallets } = useWallets();

  const functions = getFunctions();

  // Settings form state ---------------------------------------------------
  const [escrowFeePercent, setEscrowFeePercent] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual escrow actions -------------------------------------------------
  const [manualTradeId, setManualTradeId] = useState("");

  // Dispute resolution ----------------------------------------------------
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [disputeResolution, setDisputeResolution] = useState<
    "release_to_seller" | "refund_buyer" | "split"
  >("release_to_seller");
  const [disputeComment, setDisputeComment] = useState("");
  const [splitRatio, setSplitRatio] = useState("0.5");

  // ---------------------------------------------------------------------
  // Tab handling
  // ---------------------------------------------------------------------
  const tabs = ["Peers", "Transactions", "Analytics", "Settings"] as const;
  type Tab = typeof tabs[number];
  const [activeTab, setActiveTab] = useState<Tab>("Peers");

  // ---------------------------------------------------------------------
  // Derived data used in multiple tabs
  // ---------------------------------------------------------------------
  const escrowBalance = wallets.reduce((s: number, w: any) => s + (w.escrowBalance || 0), 0);
  const pendingListings = listings.filter((l: any) => l.status === "pending");
  const openDisputes = disputes.filter((d: any) => d.status === "open");

  // ---------------------------------------------------------------------
  // Handlers (mostly reused from original implementation)
  // ---------------------------------------------------------------------
  const handleManualRelease = async () => {
    if (!manualTradeId.trim()) {
      alert("Enter a trade ID first.");
      return;
    }
    try {
      await httpsCallable(functions, "p2pApi")({ action: "releaseEscrowManual", tradeId: manualTradeId.trim() });
      setManualTradeId("");
      alert("Escrow released manually.");
    } catch (e) {
      console.error("Failed to release escrow:", e);
      alert("Failed to release escrow. Check console for details.");
    }
  };

  const handleRefundAll = async () => {
    if (!manualTradeId.trim()) {
      alert("Enter a trade ID first.");
      return;
    }
    if (!confirm(`Refund escrow for trade ${manualTradeId.trim()}? This returns funds to the buyer.`)) return;
    try {
      await httpsCallable(functions, "p2pApi")({ action: "refundEscrow", tradeId: manualTradeId.trim() });
      setManualTradeId("");
      alert("Escrow refunded to buyer.");
    } catch (e) {
      console.error("Failed to refund escrow:", e);
      alert("Failed to refund escrow. Check console for details.");
    }
  };

  const handleSaveSettings = async () => {
    const fee = parseFloat(escrowFeePercent);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      alert("Escrow fee must be between 0 and 100.");
      return;
    }
    setSavingSettings(true);
    try {
      await httpsCallable(functions, "p2pApi")({ action: "updateSettings", escrowFeePercent: fee });
      setEscrowFeePercent("");
    } catch (e) {
      console.error("Failed to save settings:", e);
      alert("Failed to save settings. Check console for details.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResolveDispute = async (disputeId: string) => {
    setIsResolving(true);
    try {
      const payload: any = { action: "resolveDispute", disputeId, resolution: disputeResolution };
      if (disputeComment.trim()) payload.adminComment = disputeComment.trim();
      if (disputeResolution === "split") {
        const ratio = parseFloat(splitRatio);
        if (isNaN(ratio) || ratio < 0 || ratio > 1) {
          alert("Split ratio must be between 0 and 1 (e.g. 0.5 for 50/50).");
          setIsResolving(false);
          return;
        }
        payload.splitRatio = ratio;
      }
      await httpsCallable(functions, "p2pApi")(payload);
      setDisputeComment("");
      setDisputeResolution("release_to_seller");
      setSplitRatio("0.5");
      setResolvingDisputeId(null);
    } catch (e) {
      console.error("Failed to resolve dispute:", e);
      alert("Failed to resolve dispute. Check console for details.");
    } finally {
      setIsResolving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Render helpers for each tab
  // ---------------------------------------------------------------------
  const renderPeersTab = () => {
    // Placeholder peer data – replace with real peer hook when available.
    const peers = pendingListings;
    const pageSize = 10;
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(peers.length / pageSize);
    const pagedPeers = useMemo(() => peers.slice((page - 1) * pageSize, page * pageSize), [page, peers]);

    return (
      <div className="flex flex-col lg:flex-row gap-6" style={{ height: "calc(100vh - 180px)", minHeight: "500px" }}>
        {/* Left pane — fixed height, inner content scrolls */}
        <div className="w-full lg:w-[360px] shrink-0 bg-surface-bright border border-subtle rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          {/* Pinned header */}
          <div className="px-5 py-4 border-b border-subtle bg-surface-container-low shrink-0 flex justify-between items-center">
            <h3 className="font-headline-sm font-bold text-on-surface">Peers ({peers.length})</h3>
            <span className="font-label-caps text-[10px] text-on-surface-variant font-bold">ACTIVE QUEUE</span>
          </div>
          {/* Scrollable list fills remaining space */}
          <div className="flex-1 overflow-y-auto divide-y divide-subtle no-scrollbar">
            {pagedPeers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-body-sm p-6 text-center">
                <span className="material-symbols-outlined text-[40px] mb-2 opacity-30">group</span>
                No peers in queue
              </div>
            ) : (
              pagedPeers.map((p: any) => (
                <div key={p.id} className="px-4 py-3.5 flex justify-between items-center hover:bg-surface-container-low transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-deep flex items-center justify-center font-bold text-xs text-primary">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                    <div>
                      <div className="font-body-sm font-bold text-on-surface">{p.title || p.name || "Peer"}</div>
                      <div className="text-xs font-data-mono text-on-surface-variant">{p.sellerUid?.slice(0, 12) || p.uid?.slice(0, 12) || "—"}</div>
                    </div>
                  </div>
                  <div className="text-xs font-data-mono text-on-surface-variant shrink-0">{timeAgo(p.createdAt)}</div>
                </div>
              ))
            )}
          </div>
          {/* Pinned pagination */}
          <div className="flex justify-between items-center px-4 py-3 border-t border-subtle bg-surface-container-low shrink-0 text-sm">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-surface-deep border border-subtle rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
            >Prev</button>
            <span className="text-on-surface-variant text-xs font-data-mono">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-surface-deep border border-subtle rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
            >Next</button>
          </div>
        </div>

        {/* Right pane — fixed height, inner content scrolls */}
        <div className="flex-1 bg-surface-bright border border-subtle rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          {/* Pinned header */}
          <div className="px-5 py-4 border-b border-subtle bg-surface-container-low shrink-0">
            <h3 className="font-headline-sm font-bold text-on-surface">Peer Inspector</h3>
          </div>
          {/* Scrollable body fills remaining space */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center p-8">
            <span className="material-symbols-outlined text-[54px] text-on-surface-variant/30 mb-3">person_search</span>
            <p className="font-headline-md text-base font-bold text-on-surface">No peer selected</p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
              Select a peer listing from the queue on the left to view detailed transaction histories, collateral ratios, and escrow management actions.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionsTab = () => {
    const pageSize = 20;
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(trades.length / pageSize);
    const paged = useMemo(() => trades.slice((page - 1) * pageSize, page * pageSize), [page, trades]);
    return (
      <div className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 md:p-5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold">P2P Trade Ledger</h2>
          <span className="font-data-mono text-xs text-on-surface-variant">{trades.length} total trades</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-caps text-[10px] border-b border-subtle">
              <tr>
                <th className="px-4 py-3 font-bold">TRADE ID</th>
                <th className="px-4 py-3 font-bold">BUYER</th>
                <th className="px-4 py-3 font-bold">SELLER</th>
                <th className="px-4 py-3 font-bold">AMOUNT</th>
                <th className="px-4 py-3 font-bold">STATUS</th>
                <th className="px-4 py-3 font-bold">ESCROW</th>
                <th className="px-4 py-3 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {paged.map((t: any) => {
                const isDisputed = t.status === "disputed" && disputes.find((d: any) => d.tradeId === t.id && d.status === "open");
                const isCompleted = ["released", "refunded", "cancelled"].includes(t.status);
                const displayStatus = isCompleted ? "Completed" : (t.status || "").replace(/_/g, " ");
                return (
                  <tr key={t.id} className={`hover:bg-primary/5 transition-colors ${isDisputed ? "bg-status-danger/5" : ""}`}>
                    <td className="px-4 py-3 font-data-mono text-secondary font-bold">#{t.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3"><span className="text-on-surface font-medium">{t.buyerUid?.slice(0, 12) || "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-on-surface font-medium">{t.sellerUid?.slice(0, 12) || "—"}</span></td>
                    <td className="px-4 py-3 font-data-mono font-bold">{formatNaira(t.totalNaira || t.priceNaira || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 font-medium ${isCompleted ? STATUS_COLORS.completed : (STATUS_COLORS[t.status] || "text-on-surface-variant")}`}>
                        <span className={`w-2 h-2 rounded-full ${isDisputed ? "bg-status-danger animate-pulse" : "bg-current"}`} />
                        <span className="capitalize text-xs">{displayStatus}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ESCROW_COLORS[t.escrowStatus] || ESCROW_COLORS.pending} uppercase`}>{t.escrowStatus || "pending"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isDisputed ? (
                        <button
                          onClick={() => setResolvingDisputeId(isDisputed.id)}
                          className="bg-status-danger text-white px-3 py-1 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
                        >
                          RESOLVE
                        </button>
                      ) : (
                        <button
                          onClick={() => setManualTradeId(t.id)}
                          className="material-symbols-outlined text-on-surface-variant hover:text-secondary text-[20px]"
                          title="Set as active trade for manual release/refund"
                        >
                          more_vert
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center p-4 bg-surface-container-low border-t border-subtle text-sm">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-surface-deep border border-subtle rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
          >Prev</button>
          <span className="font-data-mono text-xs text-on-surface-variant">{page} / {totalPages || 1}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-surface-deep border border-subtle rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
          >Next</button>
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-bright border border-subtle p-5 md:p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-on-surface-variant font-bold uppercase mb-1">Total in Escrow</span>
          <h2 className="font-headline-lg text-3xl font-bold font-data-mono text-secondary mt-1">{formatNaira(escrowBalance)}</h2>
        </div>
        <div className="bg-surface-bright border border-subtle p-5 md:p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-on-surface-variant font-bold uppercase mb-1">Pending Listings</span>
          <h2 className="font-headline-lg text-3xl font-bold font-data-mono text-primary mt-1">{pendingListings.length}</h2>
        </div>
        <div className="bg-surface-bright border border-subtle p-5 md:p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-on-surface-variant font-bold uppercase mb-1">Open Disputes</span>
          <h2 className="font-headline-lg text-3xl font-bold font-data-mono text-status-danger mt-1">{openDisputes.length}</h2>
        </div>
        <div className="bg-surface-bright border border-subtle p-5 md:p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-on-surface-variant font-bold uppercase mb-1">Live Listings</span>
          <h2 className="font-headline-lg text-3xl font-bold font-data-mono text-status-success mt-1">{listings.filter((l: any) => l.status === "live").length}</h2>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="bg-surface-bright border border-subtle p-5 md:p-6 rounded-xl shadow-sm flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="font-headline-md text-headline-md font-bold text-primary">P2P Escrow &amp; Engine Settings</h2>
        <p className="text-xs text-on-surface-variant mt-0.5">Control platform commission cuts and manual escrow overrides.</p>
      </div>

      <div className="space-y-2">
        <label className="block font-label-caps text-xs font-bold text-on-surface-variant">MANUAL ESCROW CONTROL</label>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-surface-deep border border-subtle rounded-lg px-3 py-2 text-xs font-data-mono focus:border-secondary outline-none"
            placeholder="Enter Trade ID..."
            value={manualTradeId}
            onChange={e => setManualTradeId(e.target.value)}
          />
          <button
            onClick={handleManualRelease}
            className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
          >RELEASE</button>
          <button
            onClick={handleRefundAll}
            className="bg-surface-container border border-subtle text-on-surface px-4 py-2 rounded-lg font-label-caps text-xs font-bold hover:bg-surface-container-high transition-colors"
          >REFUND ALL</button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block font-label-caps text-xs font-bold text-on-surface-variant">ESCROW FEE (%)</label>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-surface-deep border border-subtle rounded-lg px-3 py-2 text-xs font-data-mono focus:border-secondary outline-none"
            placeholder={settings?.escrowFeePercent != null ? String(settings.escrowFeePercent) : "0"}
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={escrowFeePercent}
            onChange={e => setEscrowFeePercent(e.target.value)}
          />
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="bg-primary text-on-primary px-5 py-2 rounded-lg font-label-caps text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >{savingSettings ? "SAVING..." : "SAVE"}</button>
        </div>
      </div>

      <div className="pt-2 border-t border-subtle flex items-center justify-between">
        <div>
          <label className="block font-label-caps text-xs font-bold text-on-surface">AUTOMATIC LISTING APPROVAL</label>
          <p className="text-xs text-on-surface-variant">Auto-publish verified user ads without manual moderation</p>
        </div>
        <span className={`font-data-mono text-xs font-bold px-3 py-1 rounded-full ${settings?.autoApproveListings ? "bg-status-success/10 text-status-success" : "bg-surface-container text-on-surface-variant"}`}>
          {settings?.autoApproveListings ? "ENABLED" : "MANUAL REVIEW"}
        </span>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Tab Navigation */}
      <div className="flex bg-surface-bright border border-subtle p-1.5 rounded-xl shadow-sm gap-1.5 w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === t ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "Peers" && renderPeersTab()}
        {activeTab === "Transactions" && renderTransactionsTab()}
        {activeTab === "Analytics" && renderAnalyticsTab()}
        {activeTab === "Settings" && renderSettingsTab()}
      </div>
      {resolvingDisputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setResolvingDisputeId(null)}>
          <div className="bg-surface-bright border border-subtle rounded-lg p-5 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-status-danger">Resolve Dispute</h3>
              <button onClick={() => setResolvingDisputeId(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {(() => {
              const d = disputes.find(dd => dd.id === resolvingDisputeId);
              if (!d) return <p className="text-on-surface-variant">Dispute not found.</p>;
              return (
                <>
                  <div className="bg-surface-container/50 border border-subtle rounded p-3 space-y-1">
                    <div className="font-data-mono text-[10px] text-on-surface-variant">DISPUTE #{d.id?.slice(0, 8)}</div>
                    <div className="font-body-sm font-bold text-on-surface">{d.reason}</div>
                    {d.details && <div className="font-body-sm text-on-surface-variant">{d.details}</div>}
                    <div className="font-data-mono text-[10px] text-on-surface-variant">Opened by: {d.openedBy} • {timeAgo(d.createdAt)}</div>
                  </div>
                  <div>
                    <label className="block font-label-caps text-on-surface-variant mb-1">RESOLUTION</label>
                    <select
                      className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm focus:outline-none focus:border-secondary"
                      value={disputeResolution}
                      onChange={e => setDisputeResolution(e.target.value as any)}
                    >
                      <option value="release_to_seller">Release funds to seller</option>
                      <option value="refund_buyer">Refund buyer (full)</option>
                      <option value="split">Split between buyer & seller</option>
                    </select>
                  </div>
                  {disputeResolution === "split" && (
                    <div>
                      <label className="block font-label-caps text-on-surface-variant mb-1">BUYER REFUND RATIO (0‑1)</label>
                      <input
                        className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm focus:outline-none focus:border-secondary"
                        placeholder="0.5"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={splitRatio}
                        onChange={e => setSplitRatio(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-label-caps text-on-surface-variant mb-1">ADMIN COMMENT (optional)</label>
                    <textarea
                      className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm focus:outline-none focus:border-secondary min-h-[60px]"
                      placeholder="Reason for decision..."
                      value={disputeComment}
                      onChange={e => setDisputeComment(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveDispute(resolvingDisputeId)}
                      disabled={isResolving}
                      className="flex-1 bg-status-danger text-white py-2 rounded font-label-caps font-bold hover:brightness-110 disabled:opacity-50"
                    >
                      {isResolving ? "RESOLVING..." : "CONFIRM RESOLUTION"}
                    </button>
                    <button
                      onClick={() => setResolvingDisputeId(null)}
                      className="px-4 border border-subtle text-on-surface py-2 rounded font-label-caps font-bold"
                    >
                      CANCEL
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
