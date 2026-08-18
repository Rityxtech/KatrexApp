"use client";

import { useState, useMemo, useCallback } from "react";
import { useNotifications, useUsers } from "@/hooks/useAdminData";
import { setDocument, updateDocument } from "@/hooks/useFirestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApps } from "firebase/app";

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
  live: "text-status-success",
  scheduled: "text-status-warning",
  sending: "text-status-info",
};

export default function NotificationsPage() {
  const { data: notifications, loading } = useNotifications(50);
  const { data: users } = useUsers(1000);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"push" | "email" | "banner">("push");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "segment" | "individual">("all");
  const [targetUid, setTargetUid] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [autoTriggers, setAutoTriggers] = useState<Record<string, boolean>>({
    deposit: true,
    withdrawal: true,
    trade: false,
    security: true,
  });
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const activeCampaigns = notifications.filter((n: any) => n.status === "scheduled" || n.status === "sending" || n.status === "live");
  const deliveredCount = notifications.filter((n: any) => n.status === "delivered" || n.status === "read").length;

  const filteredLogs = useMemo(() => {
    if (logFilter === "all") return notifications;
    return notifications.filter((n: any) => n.type === logFilter);
  }, [notifications, logFilter]);

  const displayedLogs = showAllLogs ? filteredLogs : filteredLogs.slice(0, 10);

  const userSegments = useMemo(() => ({
    all: users.length,
    verified: users.filter((u: any) => u.kycStatus === "verified" || u.verified).length,
    pendingKyc: users.filter((u: any) => u.kycStatus === "pending").length,
    rejected: users.filter((u: any) => u.kycStatus === "rejected").length,
  }), [users]);

  async function handleCreate() {
    if (!title.trim() || !body.trim()) {
      showToast("Title and body are required");
      return;
    }
    setSending(true);
    try {
      if (createType === "push") {
        const functions = getFunctions(getApps()[0], "us-central1");
        const adminApi = httpsCallable(functions, "adminApi");
        const result = await adminApi({
          action: "sendPushNotification",
          title: title.trim(),
          body: body.trim(),
          targetType,
          targetUid: targetType === "individual" ? targetUid : undefined,
        });
        showToast(`Push sent to ${(result.data as any)?.recipients || 0} recipients`);
      } else if (createType === "banner") {
        await setDocument("app_settings", `banner_${Date.now()}`, {
          type: "banner",
          title: title.trim(),
          body: body.trim(),
          targetType,
          createdAt: new Date(),
          active: true,
        });
        showToast("Banner created successfully");
      } else {
        // Email notification - store as a notification doc
        await setDocument("notifications", `email_${Date.now()}`, {
          type: "email",
          title: title.trim(),
          body: body.trim(),
          targetType,
          targetUid: targetType === "individual" ? targetUid : undefined,
          status: "sent",
          createdAt: new Date(),
        });
        showToast("Email notification queued");
      }
      setTitle("");
      setBody("");
      setTargetUid("");
      setShowCreateModal(false);
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  async function toggleAutoTrigger(key: string) {
    setAutoTriggers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Persist to Firestore
      setDocument("app_settings", "auto_notifications", {
        ...next,
        updatedAt: new Date(),
      }).catch(() => {});
      return next;
    });
  }

  return (
    <div className="px-container-padding pt-5 space-y-max-gap w-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}

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
        <button
          onClick={() => { setCreateType("push"); setShowCreateModal(true); }}
          className="bg-surface-bright border border-subtle p-stack-base flex flex-col items-center gap-unit active:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-secondary">send</span>
          <span className="font-label-caps text-label-caps">NEW PUSH</span>
        </button>
        <button
          onClick={() => { setCreateType("email"); setShowCreateModal(true); }}
          className="bg-surface-bright border border-subtle p-stack-base flex flex-col items-center gap-unit active:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-secondary">mail</span>
          <span className="font-label-caps text-label-caps">NEW EMAIL</span>
        </button>
        <button
          onClick={() => { setCreateType("banner"); setShowCreateModal(true); }}
          className="bg-surface-bright border border-subtle p-stack-base flex flex-col items-center gap-unit active:opacity-80 transition-opacity"
        >
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
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-secondary">ALL_USERS [{userSegments.all.toLocaleString()}]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-primary">VERIFIED [{userSegments.verified.toLocaleString()}]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-status-warning">PENDING_KYC [{userSegments.pendingKyc.toLocaleString()}]</span>
          <span className="bg-surface-bright border border-subtle px-2 py-1 font-data-mono text-[10px] text-tertiary">REJECTED [{userSegments.rejected.toLocaleString()}]</span>
        </div>
      </section>

      {/* Auto-Notification Settings */}
      <section className="bg-surface-container border border-subtle overflow-hidden">
        <div className="p-stack-base border-b border-subtle bg-surface-container-high">
          <h3 className="font-label-caps text-label-caps text-on-surface">AUTO-EVENT TRIGGERS</h3>
        </div>
        <div className="divide-y divide-subtle">
          {[
            { icon: "payments", label: "Deposit Confirmed", key: "deposit", checked: autoTriggers.deposit, danger: false },
            { icon: "account_balance_wallet", label: "Withdrawal Initiated", key: "withdrawal", checked: autoTriggers.withdrawal, danger: false },
            { icon: "swap_vert", label: "Trade Executed", key: "trade", checked: autoTriggers.trade, danger: false },
            { icon: "security", label: "Security Alert (High)", key: "security", checked: autoTriggers.security, danger: true },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between p-stack-base active:bg-surface-bright transition-colors">
              <div className={`flex items-center gap-stack-base ${t.danger ? "text-status-danger" : ""}`}>
                <span className="material-symbols-outlined text-outline">{t.icon}</span>
                <span className="font-body-md">{t.label}</span>
              </div>
              <div
                onClick={() => toggleAutoTrigger(t.key)}
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${t.checked ? (t.danger ? "bg-status-danger" : "bg-secondary") : "bg-surface-deep border border-outline"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${t.checked ? "left-5" : "left-0.5"} ${t.danger && t.checked ? "bg-white" : "bg-on-surface-variant"}`}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Notification Logs */}
      <section>
        <div className="flex justify-between items-center mb-stack-base">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">NOTIFICATION LOGS</h3>
          <div className="flex gap-2">
            {["all", "push", "email", "banner"].map((f) => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                className={`font-label-caps text-[9px] px-2 py-0.5 rounded border transition-colors ${logFilter === f ? "border-primary text-primary bg-primary/5" : "border-subtle text-on-surface-variant hover:text-on-surface"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-unit">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container border border-subtle p-unit h-16 rounded animate-pulse" />
            ))
          ) : displayedLogs.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant text-body-sm">No notifications match filter</div>
          ) : (
            displayedLogs.map((log: any) => {
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
        {!showAllLogs && notifications.length > 10 && (
          <button
            onClick={() => setShowAllLogs(true)}
            className="w-full mt-stack-base py-unit text-center font-label-caps text-secondary border border-dashed border-subtle hover:bg-surface-bright transition-colors"
          >
            VIEW ALL LOGS ({notifications.length})
          </button>
        )}
        {showAllLogs && (
          <button
            onClick={() => setShowAllLogs(false)}
            className="w-full mt-stack-base py-unit text-center font-label-caps text-on-surface-variant border border-dashed border-subtle hover:bg-surface-bright transition-colors"
          >
            SHOW LESS
          </button>
        )}
      </section>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface-container border border-border-subtle rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                NEW {createType.toUpperCase()}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">TITLE</label>
                <input
                  className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={40}
                />
                <span className="font-data-mono text-[9px] text-on-surface-variant mt-0.5 block">{title.length}/40</span>
              </div>
              <div>
                <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">BODY</label>
                <textarea
                  className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none min-h-[80px] resize-y"
                  placeholder="Notification body..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={120}
                />
                <span className="font-data-mono text-[9px] text-on-surface-variant mt-0.5 block">{body.length}/120</span>
              </div>
              <div>
                <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">TARGET</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="all">All Users ({userSegments.all})</option>
                  <option value="segment">Segment (Verified, Pending, etc.)</option>
                  <option value="individual">Individual User</option>
                </select>
              </div>
              {targetType === "individual" && (
                <div>
                  <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">USER UID</label>
                  <input
                    className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-data-mono text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Enter user UID..."
                    value={targetUid}
                    onChange={(e) => setTargetUid(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border border-border-subtle py-2 rounded font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-bright transition-colors"
              >
                CANCEL
              </button>
              <button
                disabled={sending || !title.trim() || !body.trim()}
                onClick={handleCreate}
                className="flex-1 bg-primary text-on-primary py-2 rounded font-label-caps text-label-caps disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "SENDING..." : "SEND"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
