"use client";

import { useNotifications, useUsers } from "@/hooks/useAdminData";

function timeAgo(date: any) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  push: { icon: "notifications_active", color: "text-secondary" },
  email: { icon: "forward_to_inbox", color: "text-tertiary" },
  banner: { icon: "dashboard", color: "text-status-success" },
};

const STATUS_COLORS: Record<string, string> = {
  delivered: "text-status-success",
  read: "text-secondary",
  failed: "text-status-danger",
  pending: "text-status-warning",
  sent: "text-status-info",
};

export default function NotificationsPage() {
  const { data: notifications, loading } = useNotifications(50);
  const { data: users } = useUsers(1000);

  const activeCampaigns = notifications.filter((n: any) => n.status === "scheduled" || n.status === "sending" || n.status === "live");
  const deliveredCount = notifications.filter((n: any) => n.status === "delivered" || n.status === "read").length;

  return (
    <div className="px-container-padding pt-5 space-y-max-gap w-full">
      <section>
        <div className="flex justify-between items-end mb-unit">
          <h2 className="font-label-caps text-label-caps text-outline uppercase">Notifications &amp; Campaigns</h2>
          <span className="font-data-mono text-body-sm text-status-success bg-status-success/10 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> {loading ? "SYNCING" : "ONLINE"}
          </span>
        </div>
        <div className="h-1 w-full bg-surface-container overflow-hidden">
          <div className="h-full bg-secondary transition-all" style={{ width: `${notifications.length > 0 ? Math.min((deliveredCount / notifications.length) * 100, 100) : 0}%` }}></div>
        </div>
      </section>

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
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[200px] bg-surface-container border border-subtle p-stack-base h-32 rounded animate-pulse" />
            ))
          ) : activeCampaigns.length === 0 ? (
            <div className="text-on-surface-variant text-body-sm p-4">No active campaigns</div>
          ) : (
            activeCampaigns.slice(0, 6).map((c: any) => {
              const meta = TYPE_ICONS[c.type] || TYPE_ICONS.push;
              const statusColor = c.status === "live" ? "text-status-success" : c.status === "sending" ? "text-status-info" : "text-status-warning";
              return (
                <div key={c.id} className="min-w-[200px] bg-surface-container border border-subtle p-stack-base space-y-stack-base">
                  <div className="flex justify-between items-start">
                    <span className={`material-symbols-outlined ${meta.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                    <span className={`font-data-mono text-[10px] ${statusColor} uppercase`}>{c.status}</span>
                  </div>
                  <div>
                    <p className="font-headline-md text-body-md truncate">{c.title || c.subject || "Untitled"}</p>
                    <p className="font-body-sm text-on-surface-variant capitalize">{c.type || "push"}</p>
                  </div>
                  <div className="pt-stack-base border-t border-subtle grid grid-cols-2 gap-unit">
                    <div>
                      <p className="font-label-caps text-[8px] text-outline">TARGET</p>
                      <p className="font-data-mono text-body-sm text-on-background">{c.target || "ALL"}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[8px] text-outline">SENT</p>
                      <p className="font-data-mono text-body-sm text-on-background">{timeAgo(c.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Targeting Segments */}
      <section>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-base">ACTIVE SEGMENTS</h3>
        <div className="flex flex-wrap gap-unit">
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-secondary">ALL_USERS [{users.length.toLocaleString()}]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-primary">VERIFIED [{users.filter((u: any) => u.kycStatus === "verified" || u.verified).length.toLocaleString()}]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-status-warning">PENDING_KYC [{users.filter((u: any) => u.kycStatus === "pending").length.toLocaleString()}]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-tertiary">REJECTED [{users.filter((u: any) => u.kycStatus === "rejected").length.toLocaleString()}]</span>
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

      {/* Notification Logs */}
      <section>
        <div className="flex justify-between items-center mb-stack-base">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">NOTIFICATION LOGS</h3>
          <span className="material-symbols-outlined text-outline text-body-sm">filter_list</span>
        </div>
        <div className="space-y-unit">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container border border-subtle p-unit h-16 rounded animate-pulse" />
            ))
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant text-body-sm">No notifications sent yet</div>
          ) : (
            notifications.slice(0, 10).map((log: any) => {
              const statusColor = STATUS_COLORS[log.status] || "text-on-surface-variant";
              const barColor = log.type === "email" ? "bg-tertiary" : log.type === "banner" ? "bg-status-success" : "bg-secondary";
              return (
                <div key={log.id} className="bg-surface-container border border-subtle p-unit flex items-center justify-between">
                  <div className="flex items-center gap-stack-base">
                    <div className={`w-1 h-8 ${barColor}`}></div>
                    <div>
                      <div className="flex items-center gap-unit">
                        <span className="font-data-mono text-body-sm font-bold">{log.uid?.slice(0, 12) || "ALL"}</span>
                        <span className="font-label-caps text-[8px] text-outline px-1 border border-subtle uppercase">{log.type || "push"}</span>
                      </div>
                      <p className="font-body-sm text-on-surface-variant truncate w-32">{log.title || log.body?.slice(0, 40) || "\u2014"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-data-mono text-[10px] ${statusColor} uppercase`}>{log.status || "sent"}</p>
                    <p className="font-data-mono text-[8px] text-outline">{timeAgo(log.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <button className="w-full mt-stack-base py-unit text-center font-label-caps text-outline border border-dashed border-subtle hover:bg-surface-bright transition-colors">
          VIEW ALL LOGS ({notifications.length})
        </button>
      </section>
    </div>
  );
}
