"use client";

import { useTransactions } from "@/hooks/useAdminData";
import TransactionTable from "@/components/TransactionTable";
import TransactionDetailOverlay from "@/components/TransactionDetailOverlay";

function formatNaira(n: number) {
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

export default function TransactionsPage() {
  const { data: txns, loading } = useTransactions(1000);

  const totalFees = txns
    .filter((t: any) => t.status === "completed")
    .reduce((s: number, t: any) => s + (t.fee || 0), 0);

  const cryptoVol = txns
    .filter((t: any) => t.type === "crypto" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const airtimeVol = txns
    .filter((t: any) => (t.type === "airtime" || t.type === "data") && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
  const giftcardVol = txns
    .filter((t: any) => t.type === "giftcard" && t.status === "completed")
    .reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);

  const maxVol = Math.max(cryptoVol, airtimeVol, giftcardVol, 1);

  return (
    <div className="mt-12 h-[calc(100vh-48px)] overflow-y-auto p-5 md:p-gutter flex flex-col gap-5">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Transaction Ledger</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            Real-time monitoring and control terminal
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-bright border border-subtle px-3 py-1.5 rounded-lg flex items-center gap-2 font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span> EXPORT CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-max-gap">
        <div className="bg-surface-container border border-subtle p-3 rounded-lg flex flex-col justify-between h-24">
          <div>
            <span className="font-label-caps text-label-caps text-on-primary-container">TOTAL FEES COLLECTED</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-data-mono">{formatNaira(totalFees)}</span>
              <span className="text-status-success text-[10px] font-bold">{txns.filter((t: any) => t.status === "completed").length} txns</span>
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
            <span className="font-label-caps text-label-caps text-on-primary-container">REVENUE BREAKDOWN</span>
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
                const slice = txns.slice(i * Math.max(Math.floor(txns.length / 12), 1), (i + 1) * Math.max(Math.floor(txns.length / 12), 1));
                const vol = slice.reduce((s: number, t: any) => s + (t.amountNaira || 0), 0);
                const maxSliceVol = Math.max(...Array.from({ length: 12 }, (_, j) => {
                  const s = txns.slice(j * Math.max(Math.floor(txns.length / 12), 1), (j + 1) * Math.max(Math.floor(txns.length / 12), 1));
                  return s.reduce((s2: number, t: any) => s2 + (t.amountNaira || 0), 0);
                }), 1);
                const h = `${Math.max((vol / maxSliceVol) * 100, 5)}%`;
                const colors = ["bg-secondary", "bg-tertiary", "bg-primary"];
                return <div key={i} className={`flex-1 ${colors[i % 3]}`} style={{ height: h }}></div>;
              })
            )}
          </div>
        </div>
      </div>

      <TransactionTable />
      <TransactionDetailOverlay />
    </div>
  );
}
