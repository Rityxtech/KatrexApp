"use client";
// v2 — typed props interface

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { updateDocument } from "@/hooks/useFirestore";

interface Props {
  transaction: any;
  onClose: () => void;
}

function formatDate(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  completed: { bg: "bg-status-success/10 text-status-success", label: "SUCCESS" },
  pending: { bg: "bg-status-warning/10 text-status-warning", label: "PENDING" },
  failed: { bg: "bg-status-danger/10 text-status-danger", label: "FAILED" },
  flagged: { bg: "bg-status-danger/10 text-status-danger", label: "FLAGGED" },
  processing: { bg: "bg-status-info/10 text-status-info", label: "PROCESSING" },
};

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  deposit: { icon: "account_balance_wallet", label: "Deposit" },
  withdrawal: { icon: "account_balance_wallet", label: "Withdrawal" },
  send: { icon: "send", label: "Crypto Send" },
  crypto: { icon: "currency_bitcoin", label: "Crypto" },
  airtime: { icon: "settings_cell", label: "Airtime" },
  data: { icon: "settings_cell", label: "Data" },
  giftcard: { icon: "redeem", label: "Gift Card" },
  p2p: { icon: "swap_horizontal_circle", label: "P2P Trade" },
  swap: { icon: "swap_horiz", label: "Swap" },
};

export default function TransactionDetailOverlay({ transaction: tx, onClose }: Props) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const statusStyle = STATUS_STYLES[tx.status] || { bg: "bg-surface-container-high text-on-surface-variant", label: tx.status?.toUpperCase() || "UNKNOWN" };
  const typeMeta = TYPE_LABELS[tx.type] || TYPE_LABELS[tx.paymentMethod] || { icon: "receipt_long", label: tx.type || tx.paymentMethod || "Unknown" };
  const amount = tx.amountNaira
    ? `\u20a6${tx.amountNaira.toLocaleString()}`
    : tx.amountCoin
    ? `${tx.amountCoin} ${tx.coinSymbol || ""}`
    : "\u2014";

  function flash(type: "success" | "error", text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  }

  // Flag as suspicious
  const handleFlag = async () => {
    setActionLoading(true);
    try {
      await updateDocument("transactions", tx.id, {
        status: "flagged",
        flaggedAt: new Date(),
      });
      flash("success", "Transaction flagged as suspicious");
    } catch (e: any) {
      flash("error", e.message || "Failed to flag transaction");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve withdrawal/send
  const handleApprove = async () => {
    if (tx.type !== "withdrawal" && tx.type !== "send") {
      flash("error", "Only withdrawal/send transactions can be approved");
      return;
    }
    if (tx.status !== "pending" && tx.status !== "processing") {
      flash("error", "Only pending or processing transactions can be approved");
      return;
    }
    if (!confirm("Approve this withdrawal and mark as completed?")) return;
    setActionLoading(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "processWithdrawal",
        txId: tx.id,
        withdrawalAction: "approve",
      });
      flash("success", "Withdrawal approved and completed.");
    } catch (e: any) {
      flash("error", e.message || "Failed to approve withdrawal");
    } finally {
      setActionLoading(false);
    }
  };

  // Reverse/refund — only for withdrawals and sends
  const handleReverse = async () => {
    if (tx.type !== "withdrawal" && tx.type !== "send") {
      flash("error", "Only withdrawal/send transactions can be reversed");
      return;
    }
    if (tx.status !== "completed" && tx.status !== "pending" && tx.status !== "processing") {
      flash("error", "Only completed, pending, or processing transactions can be reversed");
      return;
    }
    if (!confirm("Reverse this transaction and refund the user?")) return;
    setActionLoading(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "processWithdrawal",
        txId: tx.id,
        withdrawalAction: "reject", // reject = refund the user
      });
      flash("success", "Transaction reversed. Funds refunded to user.");
    } catch (e: any) {
      flash("error", e.message || "Failed to reverse transaction");
    } finally {
      setActionLoading(false);
    }
  };

  // Build timeline from available dates
  const timeline: { label: string; date: any; icon: string; color: string }[] = [];
  if (tx.createdAt) timeline.push({ label: "Initiated", date: tx.createdAt, icon: "person", color: "bg-outline-variant" });
  if (tx.completedAt) timeline.push({ label: "Completed", date: tx.completedAt, icon: "check", color: "bg-status-success" });
  if (tx.failedAt) timeline.push({ label: "Failed", date: tx.failedAt, icon: "close", color: "bg-status-danger" });
  if (tx.flaggedAt) timeline.push({ label: "Flagged", date: tx.flaggedAt, icon: "flag", color: "bg-status-danger" });
  if (tx.processedBy) timeline.push({ label: `Processed by admin`, date: null, icon: "admin_panel_settings", color: "bg-secondary" });
  // Sort newest first
  timeline.sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : a.date ? new Date(a.date) : new Date(0);
    const db = b.date?.toDate ? b.date.toDate() : b.date ? new Date(b.date) : new Date(0);
    return db.getTime() - da.getTime();
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-surface-deep/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl bg-surface-container border border-subtle shadow-2xl rounded-xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Panel — Transaction Details */}
          <div className="flex-1 p-5 border-r border-subtle overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-label-caps text-label-caps text-secondary">TRANSACTION ID</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  #{tx.reference || tx.id?.slice(0, 16)}
                </h3>
              </div>
              <span className={`${statusStyle.bg} px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest`}>
                {statusStyle.label}
              </span>
            </div>

            {/* Action message toast */}
            {actionMsg && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-body-sm font-medium ${
                actionMsg.type === "success" ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger"
              }`}>
                {actionMsg.text}
              </div>
            )}

            {/* Core details grid */}
            <div className="grid grid-cols-2 gap-max-gap mb-6">
              <div className="space-y-4">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">USER (UID)</p>
                  <p className="font-data-mono text-body-sm text-on-surface break-all">{tx.uid || "\u2014"}</p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">TYPE</p>
                  <p className="font-body-md flex items-center gap-2 text-on-surface">
                    <span className={`material-symbols-outlined text-[18px] ${
                      typeMeta.icon === "currency_bitcoin" ? "text-primary" :
                      typeMeta.icon === "send" || typeMeta.icon === "account_balance_wallet" ? "text-status-danger" :
                      "text-secondary"
                    }`}>{typeMeta.icon}</span>
                    {typeMeta.label}
                  </p>
                </div>
                {tx.description && (
                  <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">DESCRIPTION</p>
                    <p className="text-body-sm text-on-surface">{tx.description}</p>
                  </div>
                )}
                {tx.paymentMethod && (
                  <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">PAYMENT METHOD</p>
                    <p className="text-body-sm text-on-surface capitalize">{tx.paymentMethod}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">AMOUNT</p>
                  <p className="font-data-mono text-headline-md text-on-surface">{amount}</p>
                  {tx.fee > 0 && (
                    <p className="text-[10px] text-on-surface-variant">
                      Fee: {"\u20a6"}{tx.fee.toLocaleString()}
                    </p>
                  )}
                </div>
                {tx.coinSymbol && (
                  <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">CRYPTO AMOUNT</p>
                    <p className="font-data-mono text-body-sm text-on-surface">
                      {tx.amountCoin || "\u2014"} {tx.coinSymbol}
                    </p>
                  </div>
                )}
                {tx.cardBrand && (
                  <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">CARD BRAND</p>
                    <p className="text-body-sm text-on-surface">{tx.cardBrand}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Blockchain / reference data */}
            {(tx.txHash || tx.reference) && (
              <div className="bg-surface-deep/50 p-4 rounded-lg border border-outline-variant mb-6">
                <h4 className="font-label-caps text-label-caps text-secondary mb-3">REFERENCE DATA</h4>
                <div className="space-y-2 font-data-mono text-[11px]">
                  {tx.txHash && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Hash:</span>
                      <span className="text-primary truncate ml-4 max-w-[200px]" title={tx.txHash}>{tx.txHash}</span>
                    </div>
                  )}
                  {tx.reference && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Reference:</span>
                      <span className="text-on-surface">{tx.reference}</span>
                    </div>
                  )}
                  {tx.confirmations !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Confirmations:</span>
                      <span className="text-on-surface">{tx.confirmations}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {(tx.type === "withdrawal" || tx.type === "send") && (tx.status === "pending" || tx.status === "processing") && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full bg-status-success text-white py-2.5 rounded font-label-caps text-label-caps hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 font-bold"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  APPROVE & COMPLETE WITHDRAWAL
                </button>
              )}
              <button
                onClick={handleReverse}
                disabled={actionLoading || (tx.type !== "withdrawal" && tx.type !== "send")}
                className="flex-1 bg-status-danger/10 text-status-danger border border-status-danger/30 py-2 rounded font-label-caps text-label-caps hover:bg-status-danger/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                REJECT & REFUND
              </button>
              <button
                onClick={handleFlag}
                disabled={actionLoading || tx.status === "flagged"}
                className="flex-1 bg-surface-bright border border-subtle py-2 rounded font-label-caps text-label-caps hover:bg-surface-container-high transition-colors text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tx.status === "flagged" ? "ALREADY FLAGGED" : "FLAG SUSPICIOUS"}
              </button>
            </div>
          </div>

          {/* Right Panel — Activity Timeline */}
          <div className="w-full md:w-80 bg-surface-container-low p-5 flex flex-col relative">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-label-caps text-label-caps text-on-primary-container">ACTIVITY LOG</h4>
              <button
                className="p-1 hover:bg-surface-bright rounded"
                onClick={onClose}
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex-1 relative">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-outline-variant"></div>
              <div className="space-y-6">
                {timeline.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant pl-8">No activity recorded</p>
                )}
                {timeline.map((item, i) => (
                  <div key={i} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-5 h-5 rounded-full ${item.color} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[12px] text-white">{item.icon}</span>
                    </div>
                    <p className="text-[11px] font-bold text-on-surface">{item.label}</p>
                    <p className="text-[10px] text-on-surface-variant">{formatDate(item.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
