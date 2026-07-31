export default function WalletDetails() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Column: Approvals & Search (8 cols) */}
      <div className="lg:col-span-8 space-y-5">
        {/* Section 2: Withdrawal Approvals Queue */}
        <section className="bg-surface-container border border-subtle">
          <div className="px-3 py-2 border-b border-subtle bg-surface-container-high flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-warning">pending_actions</span>
              <h3 className="font-headline-md text-headline-md">Withdrawal Approvals Queue</h3>
            </div>
            <span className="px-2 py-0.5 bg-error-container text-error font-label-caps text-[10px] rounded-full">4 URGENT</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-deep/30">
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">USER HANDLE</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">AMOUNT (NGN)</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">METHOD</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">FLAGS</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {[
                  { initials: "JD", handle: "@johndoe_fx", amount: "\u20a61,250,000.00", amountColor: "text-status-danger", method: "Korapay", icon: "bolt", flag: "LARGE_AMT", flagClass: "bg-status-danger text-white", rowHover: "hover:bg-status-danger/5" },
                  { initials: "AM", handle: "@amaka_pay", amount: "\u20a645,000.00", amountColor: "text-on-surface", method: "Manual", icon: "badge", flag: "NONE", flagClass: "text-on-surface-variant", rowHover: "hover:bg-surface-container-highest" },
                  { initials: "KB", handle: "@kabir_dev", amount: "\u20a6320,000.00", amountColor: "text-on-surface", method: "Korapay", icon: "bolt", flag: "NEW_ACC", flagClass: "border border-status-warning text-status-warning", rowHover: "hover:bg-surface-container-highest" },
                ].map((r) => (
                  <tr key={r.handle} className={`${r.rowHover} transition-colors group`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-surface-bright flex items-center justify-center font-data-mono text-[10px]">{r.initials}</div>
                        <span className="font-body-md text-body-md">{r.handle}</span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 font-data-mono text-body-sm ${r.amountColor}`}>{r.amount}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1 font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px]">{r.icon}</span> {r.method}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 font-label-caps text-[9px] ${r.flagClass} ${r.flag === "LARGE_AMT" ? "animate-pulse" : ""} ${r.flag === "NEW_ACC" ? "border" : ""}`}>{r.flag}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-status-success/20 text-status-success transition-all"><span className="material-symbols-outlined">check_circle</span></button>
                        <button className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-status-danger/20 text-status-danger transition-all"><span className="material-symbols-outlined">cancel</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: User Wallet Control */}
        <section className="bg-surface-container border border-subtle p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">manage_accounts</span>
            <h3 className="font-headline-md text-headline-md">User Wallet Control</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">FIND USER BY HANDLE OR ID</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input className="w-full bg-surface-deep border border-subtle h-10 pl-10 pr-4 font-body-md focus:border-secondary focus:ring-0 outline-none transition-all" placeholder="e.g. @username or USR-9201" type="text" />
                </div>
              </div>
              <div className="p-3 border border-outline-variant/20 bg-surface-deep/40 rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-high rounded border border-secondary/30 flex items-center justify-center text-secondary font-bold">JD</div>
                  <div>
                    <p className="font-body-md font-bold text-on-surface">@johndoe_fx</p>
                    <p className="font-data-mono text-[10px] text-on-surface-variant">ID: KAT-8829-01X</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-label-caps text-[9px] text-on-surface-variant">CURRENT BALANCE</p>
                  <p className="font-data-mono text-body-md text-secondary">&#8358;2,104,220.00</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 border-l border-outline-variant/10 pl-0 md:pl-4">
              <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">ADJUST BALANCE (OVERRIDE)</label>
              <div className="flex gap-2">
                <select className="bg-surface-deep border border-subtle h-10 px-2 font-body-sm text-on-surface focus:border-secondary outline-none">
                  <option>ADD (+)</option>
                  <option>SUB (-)</option>
                </select>
                <input className="flex-1 bg-surface-deep border border-subtle h-10 px-3 font-data-mono focus:border-secondary outline-none" placeholder="Amount" type="number" />
              </div>
              <input className="w-full bg-surface-deep border border-subtle h-10 px-3 font-body-sm focus:border-secondary outline-none" placeholder="Reason for adjustment (Internal Use)" type="text" />
              <button className="w-full h-10 bg-surface-bright border border-secondary text-secondary font-label-caps text-label-caps hover:bg-secondary hover:text-on-secondary transition-all">EXECUTE MANUAL OVERRIDE</button>
            </div>
          </div>
        </section>

        {/* Section 5: Balance Audit Log */}
        <section className="bg-surface-container border border-subtle">
          <div className="px-3 py-2 border-b border-subtle bg-surface-container-high flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-info">history_edu</span>
              <h3 className="font-headline-md text-headline-md">Recent Manual Adjustments Audit</h3>
            </div>
            <button className="text-secondary font-label-caps text-[10px] hover:underline">EXPORT CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-deep/30">
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">TIMESTAMP</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">ADMIN</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">USER</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">ADJUSTMENT</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {[
                  { ts: "2023-10-24 14:22:01", admin: "Admin_Samuel", user: "@crypto_king", adj: "+\u20a650,000.00", adjColor: "text-status-success", reason: "Refund for failed airtime purchase" },
                  { ts: "2023-10-24 13:05:44", admin: "Admin_Sarah", user: "@bayo_88", adj: "-\u20a612,500.00", adjColor: "text-status-danger", reason: "Correction: Double deposit error" },
                  { ts: "2023-10-24 11:15:20", admin: "System_Auto", user: "@mercy_dev", adj: "+\u20a61,000.00", adjColor: "text-status-success", reason: "Referral Bonus - Tier 2" },
                  { ts: "2023-10-24 09:40:12", admin: "Admin_Samuel", user: "@trade_wiz", adj: "-\u20a6250,000.00", adjColor: "text-status-danger", reason: "Recovery: Chargeback from bank" },
                ].map((r) => (
                  <tr key={r.ts} className="hover:bg-surface-container-highest transition-colors">
                    <td className="px-3 py-1.5 font-data-mono text-[11px] text-on-surface-variant">{r.ts}</td>
                    <td className="px-3 py-1.5 font-body-sm text-body-sm">{r.admin}</td>
                    <td className="px-3 py-1.5 font-body-sm text-body-sm">{r.user}</td>
                    <td className={`px-3 py-1.5 font-data-mono text-body-sm ${r.adjColor}`}>{r.adj}</td>
                    <td className="px-3 py-1.5 font-body-sm text-body-sm max-w-[200px] truncate">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Right Column: Monitoring & Stats (4 cols) */}
      <div className="lg:col-span-4 space-y-5">
        {/* Section 4: Deposit Monitoring Feed */}
        <section className="bg-surface-container border border-subtle">
          <div className="px-3 py-2 border-b border-subtle bg-surface-container-high flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-success">monitor_heart</span>
              <h3 className="font-headline-md text-headline-md">Deposit Monitoring</h3>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-ping"></div>
              <span className="font-label-caps text-[9px]">LIVE</span>
            </div>
          </div>
          <div className="p-0 max-h-[480px] overflow-y-auto">
            {[
              { status: "CONFIRMED", statusClass: "bg-status-success/10 text-status-success", time: "2m ago", icon: "account_balance", amount: "\u20a6250,000.00", sub: "Bank Transfer \u00b7 @user_88", actionIcon: "chevron_right" },
              { status: "PENDING (3/6)", statusClass: "bg-status-warning/10 text-status-warning", time: "5m ago", icon: "currency_bitcoin", amount: "0.0241 BTC", sub: "On-chain \u00b7 @crypto_dev", actionIcon: "chevron_right" },
              { status: "FAILED", statusClass: "bg-status-danger/10 text-status-danger", time: "12m ago", icon: "credit_card", amount: "\u20a615,000.00", sub: "Paystack \u00b7 @newbie_trader", actionIcon: "error" },
              { status: "CONFIRMED", statusClass: "bg-status-success/10 text-status-success", time: "15m ago", icon: "account_balance", amount: "\u20a61,000,000.00", sub: "Manual \u00b7 @whale_alpha", actionIcon: "chevron_right" },
            ].map((d, i) => (
              <div key={i} className="p-3 border-b border-outline-variant/10 hover:bg-surface-bright/50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-label-caps text-[9px] ${d.statusClass} px-1`}>{d.status}</span>
                  <span className="font-data-mono text-[10px] text-on-surface-variant">{d.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">{d.icon}</span>
                    <div>
                      <p className="font-body-sm text-body-sm font-bold">{d.amount}</p>
                      <p className="font-body-sm text-[11px] text-on-surface-variant">{d.sub}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant/40">{d.actionIcon}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 bg-surface-deep text-center">
            <button className="font-label-caps text-[10px] text-secondary hover:text-primary transition-colors">VIEW ALL INCOMING FLOWS</button>
          </div>
        </section>

        {/* 24H Transaction Density */}
        <div className="bg-surface-bright border border-subtle p-3 space-y-3">
          <p className="font-label-caps text-label-caps text-on-surface-variant">24H TRANSACTION DENSITY</p>
          <div className="h-24 w-full bg-surface-deep relative flex items-end gap-0.5 px-1 pb-1">
            {["40%","55%","35%","70%","85%","60%","45%","90%","100%","75%","60%","80%","50%","65%","40%"].map((h, i) => (
              <div key={i} className={`w-full ${i === 8 ? "bg-secondary animate-pulse" : "bg-secondary/40"}`} style={{ height: h }}></div>
            ))}
          </div>
          <div className="flex justify-between font-data-mono text-[9px] text-on-surface-variant">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* System Alert */}
        <div className="bg-status-warning/10 border border-status-warning/30 p-2 flex gap-3 items-start">
          <span className="material-symbols-outlined text-status-warning text-[18px]">warning</span>
          <div>
            <p className="font-label-caps text-[10px] text-status-warning">SYSTEM ALERT</p>
            <p className="font-body-sm text-[11px] text-on-surface">Main Wallet liquidity is below &#8358;50M threshold. Consider rebalancing from Reserve.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
