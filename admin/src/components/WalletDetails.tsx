"use client";
// v2 — full wallet management with search, override, export

import { useState, useMemo, useCallback } from "react";
import { useTransactions, useWallets, useUsers } from "@/hooks/useAdminData";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApps } from "firebase/app";
import { setDocument } from "@/hooks/useFirestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

async function processWithdrawal(txId: string, action: "approve" | "reject") {
  try {
    const functions = getFunctions(getApps()[0], "us-central1");
    const fn = httpsCallable(functions, "adminApi");
    await fn({ action: "processWithdrawal", txId, withdrawalAction: action });
  } catch (err: any) {
    // Direct Firestore atomic fallback
    const txRef = doc(db, "transactions", txId);
    const txSnap = await getDoc(txRef);
    if (!txSnap.exists()) throw err;
    const txData = txSnap.data();
    if (action === "approve") {
      await setDocument("transactions", txId, {
        ...txData,
        status: "completed",
        completedAt: new Date(),
        processedBy: "admin",
      });
    } else {
      const refundAmount = (txData.amountNaira || 0) + (txData.feeAmount || 0);
      const walletRef = doc(db, "wallets", txData.uid);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        const walletData = walletSnap.data();
        await setDocument("wallets", txData.uid, {
          ...walletData,
          nairaBalance: (walletData.nairaBalance || 0) + refundAmount,
          updatedAt: new Date(),
        });
      }
      await setDocument("transactions", txId, {
        ...txData,
        status: "failed",
        completedAt: new Date(),
        adminNote: "Declined by admin. Funds refunded.",
        processedBy: "admin",
      });
    }
  }
}

function parseRecipient(r: any) {
  if (!r) return { accountName: "\u2014", bankName: "\u2014", accountNumber: "\u2014" };
  if (typeof r === "string") {
    const parts = r.split(" - ").map((p) => p.trim());
    if (parts.length >= 3) {
      return { accountName: parts[0], bankName: parts[1], accountNumber: parts[2] };
    }
    return { accountName: r, bankName: "\u2014", accountNumber: "\u2014" };
  }

  if (r.bankName || r.accountNumber || r.accountName) {
    return {
      accountName: r.accountName || "\u2014",
      bankName: r.bankName || r.paymentMethod || "\u2014",
      accountNumber: r.accountNumber || r.recipient || "\u2014",
    };
  }

  const desc = r.description || "";
  const descMatch = desc.match(/Withdrawal to ([^(]+)\s*\(([^)]+)\)\s*(?:—|-)\s*(.+)/i);
  if (descMatch) {
    return {
      bankName: descMatch[1].trim(),
      accountNumber: descMatch[2].trim(),
      accountName: descMatch[3].trim(),
    };
  }

  const recipient = r.recipient || "";
  const paymentMethod = r.paymentMethod || "";
  const parts = recipient.split(" - ").map((p: string) => p.trim());
  if (parts.length >= 3) {
    return { accountName: parts[0], bankName: parts[1], accountNumber: parts[2] };
  }
  return {
    accountName: r.accountName || "\u2014",
    bankName: paymentMethod || "\u2014",
    accountNumber: recipient || "\u2014",
  };
}

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
  const { data: users } = useUsers(500);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [adjustType, setAdjustType] = useState("ADD (+)");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loading = lt || lw;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const searchedUser = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    return users.find((u: any) =>
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    ) || null;
  }, [searchQuery, users]);

  const searchedWallet = useMemo(() => {
    if (!searchedUser) return null;
    return wallets.find((w: any) => w.uid === searchedUser.id) || null;
  }, [searchedUser, wallets]);

  async function handleAction(txId: string, action: "approve" | "reject") {
    const verb = action === "approve" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} this withdrawal?`)) return;
    setProcessing(txId);
    try {
      await processWithdrawal(txId, action);
      showToast(`Withdrawal ${action}d successfully.`);
    } catch (err: any) {
      showToast(`Failed to ${verb} withdrawal: ${err?.message || "Unknown error"}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleManualOverride() {
    if (!foundUser || !adjustAmount) {
      showToast("Search for a user and enter an amount");
      return;
    }
    if (!adjustReason.trim()) {
      showToast("Please provide a reason for the adjustment");
      return;
    }
    setAdjusting(true);
    try {
      const amount = parseFloat(adjustAmount);
      const isAdd = adjustType === "ADD (+)";
      const finalAmount = isAdd ? amount : -amount;

      // Read current wallet balance
      const walletRef = doc(db, "wallets", foundUser.id);
      const walletSnap = await getDoc(walletRef);
      const currentBalance = walletSnap.exists()
        ? (walletSnap.data()?.nairaBalance || 0)
        : 0;
      const newBalance = currentBalance + finalAmount;

      // Update the wallet balance
      await setDocument("wallets", foundUser.id, {
        uid: foundUser.id,
        nairaBalance: newBalance,
        updatedAt: new Date(),
      });

      // Create a transaction record for the adjustment
      await setDocument("transactions", `adj_${Date.now()}`, {
        uid: foundUser.id,
        type: "adjustment",
        status: "completed",
        amountNaira: Math.abs(finalAmount),
        description: `${isAdd ? "Credit" : "Debit"}: ${adjustReason}`,
        reference: `adj_${Date.now()}`,
        processedBy: "admin",
        createdAt: new Date(),
        completedAt: new Date(),
      });

      showToast(`Balance ${isAdd ? "increased" : "decreased"} by ${formatNaira(amount)} for ${foundUser.displayName || foundUser.email}. New balance: ${formatNaira(newBalance)}`);
      setAdjustAmount("");
      setAdjustReason("");
    } catch (err: any) {
      showToast(`Override failed: ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  }

  function exportCSV() {
    const headers = ["Timestamp", "User", "Type", "Amount", "Description"];
    const rows = adjustments.map((r: any) => [
      r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : (r.createdAt || ""),
      r.uid || "",
      r.type || "",
      r.amountNaira || 0,
      (r.description || "").replace(/,/g, ";"),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported");
  }

  const withdrawalQueue = txns
    .filter((t: any) => (t.type === "withdrawal" || t.type === "send") && (t.status === "pending" || t.status === "processing"))
    .slice(0, 50);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3 py-1.5 rounded-xl shadow-lg font-body-sm text-xs text-on-surface">
          {toast}
        </div>
      )}
      {/* Left Column */}
      <div className="lg:col-span-8 flex flex-col gap-3.5">
        {/* Withdrawal Approvals Queue */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-warning text-[20px]">pending_actions</span>
              <h3 className="font-headline-md text-headline-md font-bold">Withdrawal Approvals Queue</h3>
            </div>
            <span className={`px-2.5 py-0.5 font-label-caps text-[10px] font-bold rounded-full ${withdrawalQueue.length > 0 ? "bg-status-danger/10 text-status-danger" : "bg-status-success/10 text-status-success"}`}>
              {withdrawalQueue.length > 0 ? `${withdrawalQueue.length} PENDING` : "ALL CLEAR"}
            </span>
          </div>
          <div className="overflow-x-auto">
            {withdrawalQueue.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No pending withdrawals</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">USER</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">AMOUNT</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">STATUS</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">BANK</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">ACCOUNT NUMBER</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">ACCOUNT NAME</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">REFERENCE</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {withdrawalQueue.map((r: any) => {
                    const bank = parseRecipient(r);
                    const isProcessing = processing === r.id;
                    const isCrypto = r.type === "send";
                    return (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-3 py-2 font-body-sm text-xs font-medium">{r.uid?.slice(0, 16) || "\u2014"}</td>
                      <td className="px-3 py-2 font-data-mono text-xs font-bold text-status-danger">
                        {isCrypto ? `${r.amountCoin || "0"} ${r.coinSymbol || ""}` : formatNaira(r.amountNaira || 0)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-status-warning/10 text-status-warning uppercase">
                          {r.status || "processing"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-body-sm text-xs">{bank.bankName}</td>
                      <td className="px-3 py-2 font-data-mono text-[10px] text-on-surface-variant">{bank.accountNumber}</td>
                      <td className="px-3 py-2 font-body-sm text-xs">{bank.accountName}</td>
                      <td className="px-3 py-2 font-data-mono text-[10px] text-on-surface-variant">{r.reference || "\u2014"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAction(r.id, "approve")}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-status-success/10 hover:bg-status-success/20 text-status-success transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Approve withdrawal"
                          >
                            <span className="material-symbols-outlined text-[16px]">{isProcessing ? "hourglass_top" : "check_circle"}</span>
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAction(r.id, "reject")}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-status-danger/10 hover:bg-status-danger/20 text-status-danger transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Reject & Refund withdrawal"
                          >
                            <span className="material-symbols-outlined text-[16px]">{isProcessing ? "hourglass_top" : "cancel"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* User Wallet Control */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">manage_accounts</span>
            <h3 className="font-headline-md text-headline-md font-bold">User Wallet Control</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-2.5">
              <div>
                <label className="font-label-caps text-[10px] text-on-surface-variant font-bold block mb-1">FIND USER BY HANDLE OR ID</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                  <input
                    className="w-full bg-surface-deep border border-subtle rounded-lg h-8 pl-8 pr-3 text-xs focus:border-secondary focus:ring-0 outline-none transition-all"
                    placeholder="e.g. @username or USR-9201"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              {searchedUser ? (
                <div className="p-3 border border-secondary/30 bg-surface-container-low rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-surface-container-high rounded-lg border border-secondary/30 flex items-center justify-center text-secondary font-bold text-xs">
                      {(searchedUser.displayName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-body-md text-xs font-bold text-on-surface">{searchedUser.displayName || searchedUser.email}</p>
                      <p className="font-data-mono text-[10px] text-on-surface-variant">
                        {searchedWallet ? `Balance: ${formatNaira(searchedWallet.nairaBalance || 0)}` : "No wallet found"}
                      </p>
                    </div>
                  </div>
                  <span className="font-data-mono text-[10px] text-status-success bg-status-success/10 px-1.5 py-0.5 rounded-md font-bold">FOUND</span>
                </div>
              ) : (
                <div className="p-3 border border-subtle bg-surface-container-low rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-surface-container-high rounded-lg border border-subtle flex items-center justify-center text-on-surface-variant font-bold text-xs">?</div>
                    <div>
                      <p className="font-body-md text-xs font-semibold text-on-surface">{searchQuery ? "No user found" : "Search for a user"}</p>
                      <p className="font-data-mono text-[10px] text-on-surface-variant">{wallets.length} wallets available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2.5 border-t md:border-t-0 md:border-l border-subtle pt-3 md:pt-0 md:pl-4">
              <label className="font-label-caps text-[10px] text-on-surface-variant font-bold block">ADJUST BALANCE (OVERRIDE)</label>
              <div className="flex gap-1.5">
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="bg-surface-deep border border-subtle rounded-lg h-8 px-2 text-xs font-bold text-on-surface focus:border-secondary outline-none cursor-pointer"
                >
                  <option>ADD (+)</option>
                  <option>SUB (-)</option>
                </select>
                <input
                  className="flex-1 bg-surface-deep border border-subtle rounded-lg h-8 px-2.5 font-data-mono text-xs focus:border-secondary outline-none"
                  placeholder="Amount"
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>
              <input
                className="w-full bg-surface-deep border border-subtle rounded-lg h-8 px-2.5 text-xs focus:border-secondary outline-none"
                placeholder="Reason for adjustment (Internal Use)"
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
              <button
                disabled={!searchedUser || !adjustAmount || adjusting}
                onClick={handleManualOverride}
                className="w-full h-8 bg-secondary text-on-secondary font-label-caps text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {adjusting ? "PROCESSING..." : "EXECUTE MANUAL OVERRIDE"}
              </button>
            </div>
          </div>
        </section>

        {/* Recent Adjustments Audit */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-info text-[20px]">history_edu</span>
              <h3 className="font-headline-md text-headline-md font-bold">Recent Transactions Audit</h3>
            </div>
            <button onClick={exportCSV} className="text-secondary font-label-caps text-xs font-bold hover:underline">EXPORT CSV</button>
          </div>
          <div className="overflow-x-auto">
            {adjustments.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No recent adjustments</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">TIMESTAMP</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">USER</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">TYPE</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">AMOUNT</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {adjustments.map((r: any) => (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-3 py-2 font-data-mono text-[10px] text-on-surface-variant">{formatTimestamp(r.createdAt)}</td>
                      <td className="px-3 py-2 font-body-sm text-xs font-medium">{r.uid?.slice(0, 16) || "\u2014"}</td>
                      <td className="px-3 py-2 font-body-sm text-xs capitalize">{r.type}</td>
                      <td className={`px-3 py-2 font-data-mono text-xs font-bold ${r.amountNaira > 0 ? "text-status-success" : "text-status-danger"}`}>
                        {r.amountNaira ? formatNaira(r.amountNaira) : r.amountCoin ? `${r.amountCoin} ${r.coinSymbol || ""}` : "\u2014"}
                      </td>
                      <td className="px-3 py-2 font-body-sm text-xs text-on-surface-variant max-w-[200px] truncate">{r.description || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-4 flex flex-col gap-3.5">
        {/* Deposit Monitoring */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-subtle bg-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-success text-[20px]">monitor_heart</span>
              <h3 className="font-headline-md text-headline-md font-bold">Deposit Monitoring</h3>
            </div>
            <div className="flex items-center gap-1.5 bg-status-success/10 px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-ping"></div>
              <span className="font-label-caps text-[9px] text-status-success font-bold">LIVE</span>
            </div>
          </div>
          <div className="p-0 max-h-[420px] overflow-y-auto no-scrollbar">
            {deposits.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No recent deposits</div>
            ) : (
              deposits.map((d: any) => {
                const statusClass = d.status === "completed" ? "bg-status-success/10 text-status-success" : d.status === "pending" ? "bg-status-warning/10 text-status-warning" : "bg-status-danger/10 text-status-danger";
                const icon = DEPOSIT_ICONS[d.paymentMethod] || DEPOSIT_ICONS[d.type] || "account_balance";
                const amount = d.amountNaira ? formatNaira(d.amountNaira) : d.amountCoin ? `${d.amountCoin} ${d.coinSymbol || ""}` : "\u2014";
                return (
                  <div key={d.id} className="p-3 border-b border-subtle hover:bg-surface-container-low transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-label-caps text-[9px] ${statusClass} px-1.5 py-0.5 rounded font-bold uppercase`}>{d.status}</span>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">{timeAgo(d.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
                        </div>
                        <div>
                          <p className="font-body-sm text-xs font-bold">{amount}</p>
                          <p className="font-body-sm text-[10px] text-on-surface-variant capitalize">{d.paymentMethod || d.type} &middot; {d.uid?.slice(0, 12) || "\u2014"}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">chevron_right</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2.5 bg-surface-container-low text-center border-t border-subtle">
            <button className="font-label-caps text-xs font-bold text-secondary hover:text-primary transition-colors">VIEW ALL INCOMING FLOWS</button>
          </div>
        </section>

        {/* 24H Transaction Density */}
        <div className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 space-y-3">
          <p className="font-label-caps text-[10px] text-on-surface-variant font-bold">TRANSACTION DENSITY</p>
          <div className="h-24 w-full bg-surface-container-low rounded-lg relative flex items-end gap-1 p-1.5">
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
              const height = `${Math.max((hourTxns / maxCount) * 100, 8)}%`;
              return <div key={i} className={`flex-1 rounded-t-sm ${i === new Date().getHours() % 15 ? "bg-secondary animate-pulse" : "bg-secondary/40"}`} style={{ height }}></div>;
            })}
          </div>
          <div className="flex justify-between font-data-mono text-[10px] text-on-surface-variant">
            <span>00:00</span>
            <span>{txns.length} txns</span>
            <span>23:59</span>
          </div>
        </div>

        {/* System Alert */}
        <div className={`border rounded-xl p-3 flex gap-2.5 items-start ${totalNaira < 50_000_000 ? "bg-status-warning/10 border-status-warning/30" : "bg-status-success/10 border-status-success/30"}`}>
          <span className={`material-symbols-outlined text-[18px] ${totalNaira < 50_000_000 ? "text-status-warning" : "text-status-success"}`}>
            {totalNaira < 50_000_000 ? "warning" : "check_circle"}
          </span>
          <div>
            <p className={`font-label-caps text-xs font-bold ${totalNaira < 50_000_000 ? "text-status-warning" : "text-status-success"}`}>SYSTEM STATUS</p>
            <p className="font-body-sm text-xs text-on-surface mt-0.5">
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
