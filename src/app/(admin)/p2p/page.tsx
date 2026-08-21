"use client";

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useP2PListings, useP2PTrades, useP2PDisputes, useP2PSettings, useWallets } from "@/hooks/useAdminData";

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
  live: "text-status-success",
  pending: "text-status-warning",
  pending_review: "text-status-warning",
  disputed: "text-status-danger",
  escrow_locked: "text-status-info",
  credentials_sent: "text-status-info",
  buyer_secured: "text-status-info",
  released: "text-status-success",
  refunded: "text-on-surface-variant",
  cancelled: "text-on-surface-variant",
  completed: "text-status-success",
  processing: "text-status-info",
  rejected: "text-status-danger",
};

const ESCROW_COLORS: Record<string, string> = {
  locked: "bg-surface-container border border-subtle",
  released: "bg-status-success/10 text-status-success border border-status-success/20",
  frozen: "bg-status-danger/10 text-status-danger border border-status-danger/20",
  refunded: "bg-on-surface-variant/10 text-on-surface-variant border border-subtle",
  pending: "bg-surface-container border border-subtle",
};

export default function P2PPage() {
  const { data: listings, loading } = useP2PListings(50);
  const { data: trades } = useP2PTrades(100);
  const { data: disputes } = useP2PDisputes(50);
  const { data: settings } = useP2PSettings();
  const { data: wallets } = useWallets();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [disputeResolution, setDisputeResolution] = useState<"release_to_seller" | "refund_buyer" | "split">("release_to_seller");
  const [disputeComment, setDisputeComment] = useState("");
  const [splitRatio, setSplitRatio] = useState("0.5");
  const [manualTradeId, setManualTradeId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [escrowFeePercent, setEscrowFeePercent] = useState("");

  // Manual Listing Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState("Instagram");
  const [newHandle, setNewHandle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newNiche, setNewNiche] = useState("General");
  const [newFollowers, setNewFollowers] = useState("10000");
  const [newPrice, setNewPrice] = useState("");
  const [newVerified, setNewVerified] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);

  const functions = getFunctions();

  const pendingListings = listings.filter((l: any) => l.status === "pending" || l.status === "pending_review");
  const disputedTrades = trades.filter((t: any) => t.status === "disputed");
  const openDisputes = disputes.filter((d: any) => d.status === "open");
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

  // ─── Handlers ───────────────────────────────────────────────────

  const handleApprove = async (listingId: string) => {
    setProcessingId(listingId);
    try {
      try {
        await httpsCallable(functions, "p2pApi")({ action: "approveListing", listingId });
      } catch (callErr) {
        console.warn("Cloud Function failed, falling back to direct Firestore:", callErr);
        await updateDoc(doc(db, "p2p_listings", listingId), {
          status: "live",
          approvedAt: serverTimestamp(),
        });
      }
      alert("Listing approved and is now LIVE on the marketplace!");
    } catch (e: any) {
      console.error("Failed to approve listing:", e);
      alert("Failed to approve listing: " + (e?.message || e));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (listingId: string) => {
    if (!rejectReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setRejectingId(listingId);
    try {
      try {
        await httpsCallable(functions, "p2pApi")({ action: "rejectListing", listingId, reason: rejectReason.trim() });
      } catch (callErr) {
        console.warn("Cloud Function failed, falling back to direct Firestore:", callErr);
        await updateDoc(doc(db, "p2p_listings", listingId), {
          status: "rejected",
          rejectionReason: rejectReason.trim(),
          rejectedAt: serverTimestamp(),
        });
      }
      setRejectReason("");
      alert("Listing rejected.");
    } catch (e: any) {
      console.error("Failed to reject listing:", e);
      alert("Failed to reject listing: " + (e?.message || e));
    } finally {
      setRejectingId(null);
    }
  };

  const handleCreateManualListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = newHandle.trim();
    const priceNum = parseFloat(newPrice.replace(/[^0-9.]/g, ""));
    const followersNum = parseInt(newFollowers.replace(/[^0-9]/g, "")) || 1000;

    if (!handle || isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid handle and price.");
      return;
    }

    setCreatingListing(true);
    try {
      const docRef = await addDoc(collection(db, "p2p_listings"), {
        platform: newPlatform,
        handle: handle.startsWith("@") ? handle : `@${handle}`,
        title: newTitle.trim() || `${newPlatform} Account (${handle})`,
        niche: newNiche.trim() || "General",
        followers: followersNum,
        priceNaira: priceNum,
        priceType: "fixed",
        verified: newVerified,
        status: "live", // Admin creates directly as live
        sellerUid: "admin",
        sellerName: "Verified Store",
        sellerRating: 5.0,
        sellerTrades: 120,
        createdAt: serverTimestamp(),
      });
      alert(`Listing created and is now LIVE! ID: ${docRef.id}`);
      setShowCreateModal(false);
      setNewHandle("");
      setNewTitle("");
      setNewPrice("");
    } catch (err: any) {
      console.error("Failed to create listing:", err);
      alert("Failed to create listing: " + (err?.message || err));
    } finally {
      setCreatingListing(false);
    }
  };

  const handleResolveDispute = async (disputeId: string) => {
    setResolvingDisputeId(disputeId);
    try {
      const payload: any = { action: "resolveDispute", disputeId, resolution: disputeResolution };
      if (disputeComment.trim()) payload.adminComment = disputeComment.trim();
      if (disputeResolution === "split") {
        const ratio = parseFloat(splitRatio);
        if (isNaN(ratio) || ratio < 0 || ratio > 1) {
          alert("Split ratio must be between 0 and 1 (e.g. 0.5 for 50/50).");
          setResolvingDisputeId(null);
          return;
        }
        payload.splitRatio = ratio;
      }
      await httpsCallable(functions, "p2pApi")(payload);
      setDisputeComment("");
      setDisputeResolution("release_to_seller");
      setSplitRatio("0.5");
    } catch (e) {
      console.error("Failed to resolve dispute:", e);
      alert("Failed to resolve dispute. Check console for details.");
    } finally {
      setResolvingDisputeId(null);
    }
  };

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

  const handleBanSeller = async (uid: string, banned: boolean) => {
    if (!confirm(`${banned ? "Unban" : "Ban"} seller ${uid.slice(0, 16)}?`)) return;
    try {
      await httpsCallable(functions, "p2pApi")({ action: "banSeller", uid, banned: !banned });
    } catch (e) {
      console.error("Failed to ban seller:", e);
      alert("Failed to update seller status. Check console for details.");
    }
  };

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
            <div className="mt-3">
              <input
                className="w-full bg-surface-container border border-subtle rounded px-2 py-1 text-body-sm font-data-mono focus:outline-none focus:border-secondary mb-2"
                placeholder="Trade ID..."
                type="text"
                value={manualTradeId}
                onChange={(e) => setManualTradeId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleManualRelease} className="flex-1 bg-secondary text-on-secondary px-3 py-1.5 rounded font-label-caps text-label-caps font-bold hover:opacity-90 transition-opacity">RELEASE MANUAL</button>
              <button onClick={handleRefundAll} className="flex-1 border border-subtle text-on-surface px-3 py-1.5 rounded font-label-caps text-label-caps font-bold hover:bg-surface-container transition-colors">REFUND ALL</button>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface-container-high border-l-4 border-l-status-danger border-y border-r border-subtle p-4 rounded-lg relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-status-danger" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                  <span className="font-headline-md text-headline-md text-on-surface">Open Disputes</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${openDisputes.length > 0 ? "bg-status-danger text-white" : "bg-status-success/10 text-status-success"}`}>
                    {openDisputes.length > 0 ? `${String(openDisputes.length).padStart(2, "0")} URGENT` : "ALL CLEAR"}
                  </span>
                </div>
                <p className="font-body-sm text-on-surface-variant mt-1">
                  {openDisputes[0] ? `ID: #${openDisputes[0].id?.slice(0, 8)} \u2022 ${openDisputes[0].reason?.slice(0, 40) || "Dispute"} \u2022 ${timeAgo(openDisputes[0].createdAt)}` : "No active disputes"}
                </p>
              </div>
              {openDisputes.length > 0 && (
                <button
                  onClick={() => setResolvingDisputeId(openDisputes[0].id)}
                  className="bg-status-danger text-white px-4 py-2 rounded font-headline-md text-headline-md hover:brightness-110 transition-all shadow-lg"
                >RESOLVE NOW</button>
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
                <div className="flex items-center gap-3">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">{pendingListings.length} PENDING</span>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-secondary text-on-secondary px-3 py-1 rounded text-body-sm font-bold flex items-center gap-1 hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Post Live Listing</span>
                  </button>
                </div>
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
                          <span className="font-body-sm font-bold text-secondary">{formatNaira(c.priceNaira || c.price || c.amountNaira || 0)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={processingId === c.id}
                          className="flex-1 bg-status-success/10 text-status-success border border-status-success/20 py-1 rounded hover:bg-status-success/20 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span className="font-label-caps">{processingId === c.id ? "..." : "Approve"}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (rejectingId === c.id) {
                              handleReject(c.id);
                            } else {
                              setRejectingId(c.id);
                            }
                          }}
                          className="flex-1 bg-status-danger/10 text-status-danger border border-status-danger/20 py-1 rounded hover:bg-status-danger/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span className="font-label-caps">Reject</span>
                        </button>
                      </div>
                      {rejectingId === c.id && (
                        <div className="mt-2 space-y-1">
                          <input
                            className="w-full bg-surface-container border border-subtle rounded px-2 py-1 text-body-sm focus:outline-none focus:border-status-danger"
                            placeholder="Rejection reason..."
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReject(c.id)}
                              disabled={rejectingId === c.id && !rejectReason.trim()}
                              className="flex-1 bg-status-danger text-white py-1 rounded text-[10px] font-bold disabled:opacity-50"
                            >CONFIRM REJECT</button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              className="px-2 border border-subtle text-on-surface-variant py-1 rounded text-[10px] font-bold"
                            >CANCEL</button>
                          </div>
                        </div>
                      )}
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
                {trades.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-body-sm">No P2P trades yet</div>
                ) : (
                  <table className="w-full text-left font-body-sm border-collapse">
                    <thead className="bg-surface-container-low text-on-surface-variant font-label-caps text-[10px] border-b border-subtle">
                      <tr>
                        <th className="px-4 py-2 font-bold">TRADE ID</th>
                        <th className="px-4 py-2 font-bold">BUYER</th>
                        <th className="px-4 py-2 font-bold">SELLER</th>
                        <th className="px-4 py-2 font-bold">AMOUNT</th>
                        <th className="px-4 py-2 font-bold">STATUS</th>
                        <th className="px-4 py-2 font-bold">ESCROW</th>
                        <th className="px-4 py-2 font-bold text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {trades.slice(0, 20).map((t: any) => {
                        const dispute = disputes.find((d: any) => d.tradeId === t.id && d.status === "open");
                        return (
                        <tr key={t.id} className={`hover:bg-primary-container/20 transition-colors ${t.status === "disputed" ? "bg-status-danger/5" : ""}`}>
                          <td className="px-4 py-2 font-data-mono text-secondary">#{t.id?.slice(0, 8)}</td>
                          <td className="px-4 py-2"><span className="text-on-surface font-medium">{t.buyerUid?.slice(0, 12) || "\u2014"}</span></td>
                          <td className="px-4 py-2"><span className="text-on-surface font-medium">{t.sellerUid?.slice(0, 12) || "\u2014"}</span></td>
                          <td className="px-4 py-2 font-data-mono">{formatNaira(t.totalNaira || t.priceNaira || 0)}</td>
                          <td className="px-4 py-2">
                            <span className={`flex items-center gap-1.5 ${STATUS_COLORS[t.status] || "text-on-surface-variant"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${t.status === "disputed" ? "bg-status-danger animate-pulse" : `bg-current`}`}></span>
                              <span className="capitalize">{(t.status || "").replace(/_/g, " ")}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${ESCROW_COLORS[t.escrowStatus] || ESCROW_COLORS.pending} uppercase`}>{t.escrowStatus || "pending"}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {t.status === "disputed" && dispute ? (
                              <button
                                onClick={() => setResolvingDisputeId(dispute.id)}
                                className="bg-status-danger text-white px-2 py-0.5 rounded text-[10px] font-bold"
                              >RESOLVE</button>
                            ) : (
                              <button
                                onClick={() => setManualTradeId(t.id)}
                                className="material-symbols-outlined text-on-surface-variant hover:text-secondary"
                                title="Set as active trade for manual release/refund"
                              >more_vert</button>
                            )}
                          </td>
                        </tr>
                        );
                      })}
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
                        <button
                          onClick={() => handleBanSeller(uid, false)}
                          className="p-1 text-on-surface-variant hover:text-status-danger"
                          title="Ban Seller"
                        >
                          <span className="material-symbols-outlined text-[18px]">block</span>
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
                  {listings.filter((l: any) => l.status === "live").length === 0 ? (
                    <div className="p-4 text-center text-on-surface-variant text-body-sm">No active listings</div>
                  ) : (
                    listings.filter((l: any) => l.status === "live").slice(0, 10).map((l: any) => (
                      <div key={l.id} className="bg-surface-container/50 border border-subtle p-2 rounded flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body-sm font-medium text-on-surface truncate">{l.title || l.name || "Listing"}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant font-data-mono">Listed by: {l.sellerUid?.slice(0, 12) || l.uid?.slice(0, 12)} \u2022 {formatNaira(l.priceNaira || l.price || l.amountNaira || 0)}</span>
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

        {/* P2P Settings Panel */}
        <div className="bg-surface-bright border border-subtle rounded-lg p-4">
          <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined">settings</span>
            P2P Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-label-caps text-on-surface-variant mb-1">ESCROW FEE %</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-surface-container border border-subtle rounded px-3 py-1.5 text-body-sm focus:outline-none focus:border-secondary"
                  placeholder={settings?.escrowFeePercent != null ? String(settings.escrowFeePercent) : "0"}
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={escrowFeePercent}
                  onChange={(e) => setEscrowFeePercent(e.target.value)}
                />
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="bg-secondary text-on-secondary px-4 py-1.5 rounded font-label-caps text-label-caps font-bold hover:opacity-90 disabled:opacity-50"
                >{savingSettings ? "..." : "SAVE"}</button>
              </div>
            </div>
            <div>
              <label className="block font-label-caps text-on-surface-variant mb-1">AUTO APPROVE</label>
              <div className="flex items-center gap-2 h-[38px]">
                <span className={`font-body-sm ${settings?.autoApproveListings ? "text-status-success" : "text-on-surface-variant"}`}>
                  {settings?.autoApproveListings ? "Enabled" : "Disabled (manual review)"}
                </span>
              </div>
            </div>
            <div>
              <label className="block font-label-caps text-on-surface-variant mb-1">MIN FOLLOWERS</label>
              <div className="flex items-center h-[38px]">
                <span className="font-body-sm text-on-surface">{settings?.minFollowers ?? 100}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Resolution Modal */}
      {resolvingDisputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setResolvingDisputeId(null)}>
          <div className="bg-surface-bright border border-subtle rounded-lg p-5 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-status-danger">Resolve Dispute</h3>
              <button onClick={() => setResolvingDisputeId(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {(() => {
              const d = disputes.find((dd: any) => dd.id === resolvingDisputeId);
              if (!d) return <p className="text-on-surface-variant">Dispute not found.</p>;
              return (
                <>
                  <div className="bg-surface-container/50 border border-subtle rounded p-3 space-y-1">
                    <div className="font-data-mono text-[10px] text-on-surface-variant">DISPUTE #{d.id?.slice(0, 8)}</div>
                    <div className="font-body-sm font-bold text-on-surface">{d.reason}</div>
                    {d.details && <div className="font-body-sm text-on-surface-variant">{d.details}</div>}
                    <div className="font-data-mono text-[10px] text-on-surface-variant">Opened by: {d.openedBy} \u2022 {timeAgo(d.createdAt)}</div>
                  </div>
                  <div>
                    <label className="block font-label-caps text-on-surface-variant mb-1">RESOLUTION</label>
                    <select
                      className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm focus:outline-none focus:border-secondary"
                      value={disputeResolution}
                      onChange={(e) => setDisputeResolution(e.target.value as any)}
                    >
                      <option value="release_to_seller">Release funds to seller</option>
                      <option value="refund_buyer">Refund buyer (full)</option>
                      <option value="split">Split between buyer & seller</option>
                    </select>
                  </div>
                  {disputeResolution === "split" && (
                    <div>
                      <label className="block font-label-caps text-on-surface-variant mb-1">BUYER REFUND RATIO (0\u20131)</label>
                      <input
                        className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm focus:outline-none focus:border-secondary"
                        placeholder="0.5"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={splitRatio}
                        onChange={(e) => setSplitRatio(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-label-caps text-on-surface-variant mb-1">ADMIN COMMENT (optional)</label>
                    <textarea
                      className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm focus:outline-none focus:border-secondary min-h-[60px]"
                      placeholder="Reason for decision..."
                      value={disputeComment}
                      onChange={(e) => setDisputeComment(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveDispute(resolvingDisputeId)}
                      disabled={resolvingDisputeId === d.id && false}
                      className="flex-1 bg-status-danger text-white py-2 rounded font-label-caps font-bold hover:brightness-110"
                    >
                      {resolvingDisputeId === d.id ? "RESOLVING..." : "CONFIRM RESOLUTION"}
                    </button>
                    <button
                      onClick={() => setResolvingDisputeId(null)}
                      className="px-4 border border-subtle text-on-surface py-2 rounded font-label-caps font-bold"
                    >CANCEL</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {/* Manual Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-bright border border-subtle rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-subtle">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">add_circle</span>
                Create Live Account Listing
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateManualListing} className="space-y-3">
              <div>
                <label className="block font-label-caps text-on-surface-variant mb-1">PLATFORM</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Instagram", "TikTok", "YouTube", "X", "WhatsApp"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPlatform(p)}
                      className={`py-1.5 px-2 rounded text-body-sm font-bold border transition-colors ${
                        newPlatform === p
                          ? "bg-secondary text-on-secondary border-secondary"
                          : "bg-surface-container border-subtle text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-on-surface-variant mb-1">ACCOUNT HANDLE</label>
                <input
                  type="text"
                  placeholder="@username"
                  required
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-caps text-on-surface-variant mb-1">NICHE / CATEGORY</label>
                  <input
                    type="text"
                    placeholder="e.g. Comedy, Fashion"
                    value={newNiche}
                    onChange={(e) => setNewNiche(e.target.value)}
                    className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-on-surface-variant mb-1">FOLLOWERS</label>
                  <input
                    type="text"
                    placeholder="e.g. 50000"
                    value={newFollowers}
                    onChange={(e) => setNewFollowers(e.target.value)}
                    className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-on-surface-variant mb-1">PRICE (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-surface-container border border-subtle rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="verifiedCheck"
                  checked={newVerified}
                  onChange={(e) => setNewVerified(e.target.checked)}
                  className="rounded border-subtle"
                />
                <label htmlFor="verifiedCheck" className="text-body-sm text-on-surface font-medium cursor-pointer">
                  Show Blue Verified Badge (✓)
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={creatingListing}
                  className="flex-1 bg-secondary text-on-secondary py-2.5 rounded font-label-caps font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {creatingListing ? "CREATING..." : "PUBLISH LIVE TO MARKETPLACE"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 border border-subtle text-on-surface py-2.5 rounded font-label-caps font-bold hover:bg-surface-container"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
