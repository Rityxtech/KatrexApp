export default function NotificationsPage() {
  return (
    <div className="px-container-padding pt-5 space-y-max-gap w-full">
      {/* Screen Title Section */}
      <section>
        <div className="flex justify-between items-end mb-unit">
          <h2 className="font-label-caps text-label-caps text-outline uppercase">Notifications &amp; Campaigns</h2>
          <span className="font-data-mono text-body-sm text-status-success bg-status-success/10 px-2 py-0.5 rounded">SYSTEM: ONLINE</span>
        </div>
        <div className="h-1 w-full bg-surface-container overflow-hidden">
          <div className="h-full bg-secondary w-1/3"></div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-3 gap-gutter">
        <button className="bg-surface-bright border border-subtle p-stack-base flex flex-col items-center gap-unit active:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-secondary">send</span>
          <span className="font-label-caps text-label-caps">NEW PUSH</span>
        </button>
        <button className="bg-surface-bright border border-subtle p-stack-base flex flex-col items-center gap-unit active:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-secondary">mail</span>
          <span className="font-label-caps text-label-caps">NEW EMAIL</span>
        </button>
        <button className="bg-surface-bright border border-subtle p-stack-base flex flex-col items-center gap-unit active:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-secondary">ad_units</span>
          <span className="font-label-caps text-label-caps">NEW BANNER</span>
        </button>
      </section>

      {/* Active Campaigns */}
      <section>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-base">ACTIVE CAMPAIGNS</h3>
        <div className="flex gap-gutter overflow-x-auto pb-stack-base no-scrollbar">
          {[
            { icon: "notifications_active", iconColor: "text-secondary", title: "Tier 2 Welcome", type: "Push Notification", status: "SCHEDULED", statusColor: "text-status-warning", target: "T2_USERS", launch: "14:20Z" },
            { icon: "forward_to_inbox", iconColor: "text-tertiary", title: "Weekly Market Recap", type: "Email Newsletter", status: "SENDING", statusColor: "text-status-info", target: "ALL_ACTIVE", launch: "12:00Z" },
            { icon: "dashboard", iconColor: "text-status-success", title: "DEX Launch Promo", type: "In-App Banner", status: "LIVE", statusColor: "text-status-success", target: "GLOBAL", launch: "08:00Z" },
          ].map((c) => (
            <div key={c.title} className="min-w-[200px] bg-surface-container border border-subtle p-stack-base space-y-stack-base">
              <div className="flex justify-between items-start">
                <span className={`material-symbols-outlined ${c.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
                <span className={`font-data-mono text-[10px] ${c.statusColor}`}>{c.status}</span>
              </div>
              <div>
                <p className="font-headline-md text-body-md truncate">{c.title}</p>
                <p className="font-body-sm text-on-surface-variant">{c.type}</p>
              </div>
              <div className="pt-stack-base border-t border-subtle grid grid-cols-2 gap-unit">
                <div>
                  <p className="font-label-caps text-[8px] text-outline">TARGET</p>
                  <p className="font-data-mono text-body-sm text-on-background">{c.target}</p>
                </div>
                <div>
                  <p className="font-label-caps text-[8px] text-outline">LAUNCH</p>
                  <p className="font-data-mono text-body-sm text-on-background">{c.launch}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Targeting Segments */}
      <section>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-base">ACTIVE SEGMENTS</h3>
        <div className="flex flex-wrap gap-unit">
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-secondary">ALL_USERS [42.1K]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-primary">TIER_2_PLUS [12.4K]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-status-warning">INACTIVE_30D [8.2K]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-tertiary">HIGH_ROLLERS [1.1K]</span>
        </div>
      </section>

      {/* Auto-Notification Settings */}
      <section className="bg-surface-container border border-subtle overflow-hidden">
        <div className="p-stack-base border-b border-subtle bg-surface-container-high">
          <h3 className="font-label-caps text-label-caps text-on-surface">AUTO-EVENT TRIGGERS</h3>
        </div>
        <div className="divide-y divide-subtle">
          {[
            { icon: "payments", label: "Deposit Confirmed", checked: true, danger: false },
            { icon: "account_balance_wallet", label: "Withdrawal Initiated", checked: true, danger: false },
            { icon: "swap_vert", label: "Trade Executed", checked: false, danger: false },
            { icon: "security", label: "Security Alert (High)", checked: true, danger: true },
          ].map((t) => (
            <label key={t.label} className="flex items-center justify-between p-stack-base active:bg-surface-bright transition-colors">
              <div className={`flex items-center gap-stack-base ${t.danger ? "text-status-danger" : ""}`}>
                <span className="material-symbols-outlined text-outline">{t.icon}</span>
                <span className="font-body-md">{t.label}</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${t.checked ? (t.danger ? "bg-status-danger" : "bg-secondary") : "bg-surface-deep border border-outline"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${t.checked ? "left-5" : "left-0.5"} ${t.danger && t.checked ? "bg-white" : "bg-on-surface-variant"}`}></div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Notification History List */}
      <section>
        <div className="flex justify-between items-center mb-stack-base">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">NOTIFICATION LOGS</h3>
          <span className="material-symbols-outlined text-outline text-body-sm">filter_list</span>
        </div>
        <div className="space-y-unit">
          {[
            { uid: "USR_8291", type: "Push", msg: "Order #9921 Filled", barColor: "bg-secondary", status: "DELIVERED", statusColor: "text-status-success", time: "14:42:01" },
            { uid: "USR_1044", type: "Email", msg: "Password Reset Request", barColor: "bg-tertiary", status: "READ", statusColor: "text-secondary", time: "14:38:55" },
            { uid: "USR_2291", type: "Push", msg: "Suspicious Login Blocked", barColor: "bg-status-danger", status: "FAILED", statusColor: "text-status-danger", time: "14:35:12" },
            { uid: "USR_0012", type: "Push", msg: "Deposit Credited", barColor: "bg-secondary", status: "DELIVERED", statusColor: "text-status-success", time: "14:22:10" },
          ].map((log) => (
            <div key={log.uid + log.time} className="bg-surface-container border border-subtle p-unit flex items-center justify-between">
              <div className="flex items-center gap-stack-base">
                <div className={`w-1 h-8 ${log.barColor}`}></div>
                <div>
                  <div className="flex items-center gap-unit">
                    <span className="font-data-mono text-body-sm font-bold">{log.uid}</span>
                    <span className="font-label-caps text-[8px] text-outline px-1 border border-subtle uppercase">{log.type}</span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant truncate w-32">{log.msg}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-data-mono text-[10px] ${log.statusColor}`}>{log.status}</p>
                <p className="font-data-mono text-[8px] text-outline">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-stack-base py-unit text-center font-label-caps text-outline border border-dashed border-subtle hover:bg-surface-bright transition-colors">
          VIEW ALL LOGS (1,244)
        </button>
      </section>
    </div>
  );
}
