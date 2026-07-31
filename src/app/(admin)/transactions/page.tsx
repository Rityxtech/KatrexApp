import TransactionTable from "@/components/TransactionTable";
import TransactionDetailOverlay from "@/components/TransactionDetailOverlay";

export default function TransactionsPage() {
  return (
    <div className="mt-12 h-[calc(100vh-48px)] overflow-y-auto p-5 md:p-gutter flex flex-col gap-5">
      {/* Action Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Transaction Ledger
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Real-time monitoring and control terminal
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-bright border border-subtle px-3 py-1.5 rounded-lg flex items-center gap-2 font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>{" "}
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Revenue Overview: Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-max-gap">
        {/* Total Fees Collected */}
        <div className="bg-surface-container border border-subtle p-3 rounded-lg flex flex-col justify-between h-24">
          <div>
            <span className="font-label-caps text-label-caps text-on-primary-container">
              TOTAL FEES COLLECTED
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-data-mono">
                $42,904.50
              </span>
              <span className="text-status-success text-[10px] font-bold">
                +12.4%
              </span>
            </div>
          </div>
          <div className="h-4 w-full bg-surface-container-low rounded-full overflow-hidden flex gap-[2px]">
            <div className="h-full bg-secondary w-2/3"></div>
            <div className="h-full bg-tertiary w-1/6"></div>
            <div className="h-full bg-primary w-1/12"></div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="md:col-span-2 bg-surface-container border border-subtle p-3 rounded-lg flex flex-col h-24 relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <span className="font-label-caps text-label-caps text-on-primary-container">
              REVENUE BREAKDOWN
            </span>
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
            <div className="flex-1 bg-secondary opacity-30" style={{ height: "45%" }}></div>
            <div className="flex-1 bg-secondary opacity-50" style={{ height: "60%" }}></div>
            <div className="flex-1 bg-secondary" style={{ height: "75%" }}></div>
            <div className="flex-1 bg-tertiary opacity-30" style={{ height: "30%" }}></div>
            <div className="flex-1 bg-tertiary" style={{ height: "40%" }}></div>
            <div className="flex-1 bg-primary opacity-50" style={{ height: "25%" }}></div>
            <div className="flex-1 bg-primary" style={{ height: "55%" }}></div>
            <div className="flex-1 bg-secondary" style={{ height: "85%" }}></div>
            <div className="flex-1 bg-secondary opacity-60" style={{ height: "65%" }}></div>
            <div className="flex-1 bg-tertiary" style={{ height: "35%" }}></div>
            <div className="flex-1 bg-primary" style={{ height: "15%" }}></div>
            <div className="flex-1 bg-secondary" style={{ height: "50%" }}></div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <TransactionTable />

      {/* Detail Overlay */}
      <TransactionDetailOverlay />
    </div>
  );
}
