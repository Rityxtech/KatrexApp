"use client";

import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useAdminData";
import TransactionTable from "@/components/TransactionTable";
import TransactionDetailOverlay from "@/components/TransactionDetailOverlay";
import TableFooter from "@/components/TableFooter";

const PAGE_SIZE = 25;

function formatNaira(n: number) {
  if (isNaN(n) || !isFinite(n)) return "\u20a60.00";
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

export default function TransactionsPage() {
  const { data: txns, loading } = useTransactions(1000);

  // ─── Filter state ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ─── Pagination & detail ───────────────────────────────────────
  const [page, setPage] = useState(0);
  const [viewingTx, setViewingTx] = useState<any>(null);

  // ─── Filtered transactions ─────────────────────────────────────
  const filtered = useMemo(() => {
    let list = txns;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t: any) =>
          (t.id || "").toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q) ||
          (t.uid || "").toLowerCase().includes(q) ||
          (t.txHash || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((t: any) => t.type === typeFilter || t.paymentMethod === typeFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((t: any) => t.status === statusFilter);
    }
    return list;
  }, [txns, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // ─── Stats (from all filtered data) ────────────────────────────
  const totalFees = filtered
    .filter((t: any) => t.status === "completed")
    .reduce((s: number, t: any) => s + (t.fee || 0), 0);

  const cryptoVol = filtered
    .filter((t: any) => t.type === "crypto" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const airtimeVol = filtered
    .filter((t: any) => (t.type === "airtime" || t.type === "data") && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const giftcardVol = filtered
    .filter((t: any) => t.type === "giftcard" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const maxVol = Math.max(cryptoVol, airtimeVol, giftcardVol, 1);

  // ─── CSV Export ────────────────────────────────────────────────
  const exportCsv = () => {
    const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const header = ["TX ID", "Reference", "User UID", "Type", "Status", "Amount (NGN)", "Coin Amount", "Coin", "Fee", "Date"].map(escape).join(",");
    const rows = filtered.map((t: any) =>
      [
        t.id || "",
        t.reference || "",
        t.uid || "",
        t.type || t.paymentMethod || "",
        t.status || "",
        t.amountNaira || 0,
        t.amountCoin || "",
        t.coinSymbol || "",
        t.fee || 0,
        t.createdAt?.toDate ? t.createdAt.toDate().toISOString() : t.createdAt || "",
      ].map(escape).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katrex-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(0);
  };

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="p-container-padding flex flex-col md:flex-row md:items-center justify-between gap-stack-base bg-surface-dim border-b border-subtle">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Transaction Ledger</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            Real-time monitoring &mdash; {loading ? "..." : filtered.length.toLocaleString()} transactions
            {!loading && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-stack-base overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-body-sm font-medium"
          >
            <span className="material-symbols-outlined">download</span> EXPORT CSV
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────── */}
      <div className="p-container-padding grid grid-cols-1 md:grid-cols-3 gap-max-gap bg-surface border-b border-subtle">
        <div className="bg-surface-container border border-subtle p-3 rounded-lg flex flex-col justify-between h-24">
          <div>
            <span className="font-label-caps text-label-caps text-on-primary-container">TOTAL FEES COLLECTED</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-data-mono">{formatNaira(totalFees)}</span>
              <span className="text-status-success text-[10px] font-bold">
                {filtered.filter((t: any) => t.status === "completed").length} txns
              </span>
            </div>
          </div>
          <div className="h-4 w-full bg-surface-container-low rounded-full overflow-hidden flex gap-[2px]">
            <div className="h-full bg-secondary" style={{ width: `${(cryptoVol / maxVol) * 100}%` }}></div>
            <div className="h-full bg-tertiary" style={{ width: `${(airtimeVol / maxVol) * 100}%` }}></div>
            <div className="h-full bg-primary" style={{ width: `${(giftcardVol / maxVol) * 100}%` }}></div>
          </div>
        </div>

        <div className="md:col-span-2 bg-surface-container border border-subtle p-3 rounded-lg flex flex-col h-24 relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <span className="font-label-caps text-label-caps text-on-primary-container">VOLUME BREAKDOWN</span>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="text-[9px] font-bold">CRYPTO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span className="text-[9px] font-bold">AIRTIME</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-[9px] font-bold">GIFTCARD</span>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-full pt-2">
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 bg-surface-container-high animate-pulse" style={{ height: "50%" }}></div>
              ))
            ) : (
              Array.from({ length: 12 }).map((_, i) => {
                const chunkSize = Math.max(Math.floor(filtered.length / 12), 1);
                const slice = filtered.slice(i * chunkSize, (i + 1) * chunkSize);
                const vol = slice.reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
                const maxSliceVol = Math.max(
                  ...Array.from({ length: 12 }, (_, j) => {
                    const s = filtered.slice(j * chunkSize, (j + 1) * chunkSize);
                    return s.reduce((s2: number, t: any) => s2 + (t.amountNaira || 0), 0);
                  }),
                  1
                );
                const h = `${Math.max((vol / maxSliceVol) * 100, 5)}%`;
                const colors = ["bg-secondary", "bg-tertiary", "bg-primary"];
                return <div key={i} className={`flex-1 ${colors[i % 3]}`} style={{ height: h }}></div>;
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="p-container-padding grid grid-cols-1 md:grid-cols-12 gap-unit bg-surface border-b border-subtle items-center">
        <div className="md:col-span-5 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
          <input
            className="w-full h-8 pl-9 pr-4 bg-surface-container-low border border-subtle rounded-md text-body-sm focus:border-secondary focus:ring-0 text-on-surface placeholder:text-outline-variant"
            placeholder="Search by TX ID, reference, user UID, or hash..."
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="md:col-span-3">
          <select
            className="w-full h-8 bg-surface-container-low border border-subtle rounded-md text-body-sm px-2 focus:border-secondary focus:ring-0 text-on-surface"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          >
            <option value="all">Type: All</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="send">Crypto Send</option>
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
            <option value="giftcard">Gift Card</option>
            <option value="p2p">P2P</option>
            <option value="swap">Swap</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            className="w-full h-8 bg-surface-container-low border border-subtle rounded-md text-body-sm px-2 focus:border-secondary focus:ring-0 text-on-surface"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="all">Status: All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            onClick={clearFilters}
            className="h-8 px-3 text-secondary hover:bg-secondary/10 transition-colors rounded-md text-body-sm font-bold"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden p-container-padding flex flex-col gap-4 bg-surface-deep">
        <TransactionTable
          transactions={paged}
          loading={loading}
          onViewTransaction={(tx) => setViewingTx(tx)}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <TableFooter
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        currentPage={safePage}
        onPageChange={setPage}
        selectedCount={0}
        onBulkBlock={() => {}}
        onBulkDelete={() => {}}
        bulkLoading={false}
      />

      {/* ── Detail Overlay ──────────────────────────────────────── */}
      {viewingTx && (
        <TransactionDetailOverlay
          transaction={viewingTx}
          onClose={() => setViewingTx(null)}
        />
      )}
    </>
  );
}
