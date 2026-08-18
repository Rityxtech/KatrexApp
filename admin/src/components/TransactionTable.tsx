"use client";

function formatDate(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  deposit: { icon: "account_balance_wallet", color: "text-secondary" },
  withdrawal: { icon: "account_balance_wallet", color: "text-status-danger" },
  send: { icon: "send", color: "text-status-danger" },
  crypto: { icon: "currency_bitcoin", color: "text-primary" },
  airtime: { icon: "settings_cell", color: "text-secondary" },
  data: { icon: "settings_cell", color: "text-secondary" },
  giftcard: { icon: "redeem", color: "text-tertiary" },
  p2p: { icon: "swap_horizontal_circle", color: "text-primary" },
  swap: { icon: "swap_horiz", color: "text-primary" },
};

const STATUS_BADGES: Record<string, string> = {
  completed: "bg-status-success/10 text-status-success",
  pending: "bg-status-warning/10 text-status-warning",
  failed: "bg-status-danger/10 text-status-danger",
  flagged: "bg-status-danger/10 text-status-danger",
  processing: "bg-status-info/10 text-status-info",
};

interface Props {
  transactions: any[];
  loading: boolean;
  onViewTransaction: (tx: any) => void;
}

export default function TransactionTable({ transactions, loading, onViewTransaction }: Props) {
  return (
    <div className="flex-1 bg-surface-container border border-subtle rounded-lg flex flex-col overflow-hidden min-h-[400px]">
      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-body-sm">No transactions found</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-surface-container-high z-10">
              <tr className="border-b border-subtle">
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-primary-container uppercase">TX ID</th>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-primary-container uppercase">User</th>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-primary-container uppercase">Type</th>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-primary-container uppercase">Status</th>
                <th className="px-4 py-2 text-right font-label-caps text-label-caps text-on-primary-container uppercase">Amount</th>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-primary-container uppercase">Date</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="font-data-mono text-body-sm divide-y divide-outline-variant/30">
              {transactions.map((tx: any) => {
                const meta = TYPE_ICONS[tx.type] || TYPE_ICONS[tx.paymentMethod] || { icon: "receipt_long", color: "text-on-surface-variant" };
                const badge = STATUS_BADGES[tx.status] || "bg-surface-container-high text-on-surface-variant";
                const amount = tx.amountNaira
                  ? `\u20a6${tx.amountNaira.toLocaleString()}`
                  : tx.amountCoin
                  ? `${tx.amountCoin} ${tx.coinSymbol || ""}`
                  : "\u2014";
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-primary-container/20 cursor-pointer group"
                    onClick={() => onViewTransaction(tx)}
                  >
                    <td className="px-4 py-2 text-secondary">#{tx.reference || tx.id?.slice(0, 12)}</td>
                    <td className="px-4 py-2">
                      <span className="text-on-surface">{tx.uid?.slice(0, 16) || "\u2014"}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${meta.color}`}>{meta.icon}</span>
                        <span className="capitalize">{tx.type || tx.paymentMethod || "\u2014"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`${badge} px-2 py-0.5 rounded-full text-[10px] font-bold uppercase`}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-on-surface">{amount}</td>
                    <td className="px-4 py-2 text-on-surface-variant">{formatDate(tx.createdAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
