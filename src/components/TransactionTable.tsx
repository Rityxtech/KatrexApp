import { transactions } from "@/data/transactions";

export default function TransactionTable() {
  return (
    <div className="flex-1 bg-surface-container border border-subtle rounded-lg flex flex-col overflow-hidden min-h-[400px]">
      {/* Table Controls */}
      <div className="flex justify-between items-center px-4 py-2 bg-surface-container-high border-b border-subtle">
        <div className="flex items-center gap-3 w-1/3">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 text-body-sm w-full placeholder:text-outline"
            placeholder="Search by ID, User, or Hash..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
          <button className="p-1 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="overflow-auto flex-1">
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
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className={`hover:bg-primary-container/20 cursor-pointer group ${tx.rowClass}`}
              >
                <td className="px-4 py-2 text-secondary">{tx.id}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full ${tx.avatarBg} ${tx.avatarText || ""} text-[10px] flex items-center justify-center font-bold`}>
                      {tx.avatar}
                    </div>
                    <span className="text-on-surface">{tx.user}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${tx.typeIconColor}`}>
                      {tx.typeIcon}
                    </span>{" "}
                    {tx.type}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className={`${tx.badgeClass} px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-on-surface">{tx.amount}</td>
                <td className="px-4 py-2 text-on-surface-variant">{tx.date}</td>
                <td className="px-4 py-2 text-right">
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">
                    {tx.actionIcon}
                  </span>
                </td>
              </tr>
            ))}
            {/* Duplicate density rows */}
            {Array.from({ length: 15 }).map((_, i) => (
              <tr
                key={`dup-${i}`}
                className="hover:bg-primary-container/20 cursor-pointer group border-b border-outline-variant/30"
              >
                <td className="px-4 py-2 text-secondary">#KTX-98{217 + i}</td>
                <td className="px-4 py-2 text-on-surface">User_{100 + i}@domain.com</td>
                <td className="px-4 py-2">CRYPTO</td>
                <td className="px-4 py-2">
                  <span className="bg-status-success/10 text-status-success px-2 py-0.5 rounded-full text-[10px] font-bold">
                    COMPLETED
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-on-surface">
                  {((i + 1) * 7.3).toFixed(2)} USD
                </td>
                <td className="px-4 py-2 text-on-surface-variant">2023-10-27 16:20</td>
                <td className="px-4 py-2 text-right">
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">
                    chevron_right
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-2 border-t border-subtle flex justify-between items-center bg-surface-container-low">
        <span className="text-[10px] font-label-caps text-on-surface-variant">
          SHOWING 1-20 OF 2,492 ENTRIES
        </span>
        <div className="flex gap-1">
          <button className="w-6 h-6 flex items-center justify-center border border-subtle rounded hover:bg-surface-bright">
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button className="w-6 h-6 flex items-center justify-center border border-subtle rounded bg-secondary text-on-secondary-fixed text-[10px] font-bold">
            1
          </button>
          <button className="w-6 h-6 flex items-center justify-center border border-subtle rounded hover:bg-surface-bright text-[10px]">
            2
          </button>
          <button className="w-6 h-6 flex items-center justify-center border border-subtle rounded hover:bg-surface-bright text-[10px]">
            3
          </button>
          <button className="w-6 h-6 flex items-center justify-center border border-subtle rounded hover:bg-surface-bright">
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
