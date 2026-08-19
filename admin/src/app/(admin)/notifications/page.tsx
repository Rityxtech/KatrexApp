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
    <div className="w-full flex flex-col gap-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded-xl shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-surface-bright rounded-xl border border-subtle p-5 md:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Notifications &amp; Campaigns</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Broadcast announcements, targeted push alerts, and automated transactional triggers.</p>
          </div>
          <span className="font-data-mono text-xs text-status-success bg-status-success/10 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" /> {loading ? "SYNCING" : "ONLINE"}
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary transition-all" style={{ width: `${notifications.length > 0 ? Math.min((deliveredCount / notifications.length) * 100, 100) : 0}%` }}></div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => { setCreateType("push"); setShowCreateModal(true); }}
          className="bg-surface-bright border border-subtle rounded-xl p-5 md:p-6 shadow-sm flex items-center gap-4 hover:border-secondary transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">send</span>
          </div>
          <div>
            <span className="font-headline-md text-base font-bold text-on-surface block">New Push Notification</span>
            <span className="text-xs text-on-surface-variant">Instant mobile push alert</span>
          </div>
        </button>
        <button
          onClick={() => { setCreateType("email"); setShowCreateModal(true); }}
          className="bg-surface-bright border border-subtle rounded-xl p-5 md:p-6 shadow-sm flex items-center gap-4 hover:border-tertiary transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">mail</span>
          </div>
          <div>
            <span className="font-headline-md text-base font-bold text-on-surface block">New Email Campaign</span>
            <span className="text-xs text-on-surface-variant">Send email broadcasts</span>
          </div>
        </button>
        <button
          onClick={() => { setCreateType("banner"); setShowCreateModal(true); }}
          className="bg-surface-bright border border-subtle rounded-xl p-5 md:p-6 shadow-sm flex items-center gap-4 hover:border-status-success transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-status-success/10 flex items-center justify-center text-status-success group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">ad_units</span>
          </div>
          <div>
            <span className="font-headline-md text-base font-bold text-on-surface block">New In-App Banner</span>
            <span className="text-xs text-on-surface-variant">Top-bar promo message</span>
          </div>
        </button>
      </section>

      {/* Active Campaigns */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-5 md:p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Active Campaigns</h3>
          <span className="font-data-mono text-xs text-on-surface-variant">{activeCampaigns.length} campaigns</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[240px] bg-surface-container-low border border-subtle p-5 h-36 rounded-xl animate-pulse" />
            ))
          ) : activeCampaigns.length === 0 ? (
            <div className="text-on-surface-variant text-body-sm p-6 text-center w-full bg-surface-container-low rounded-xl border border-subtle">No active campaigns at this time.</div>
          ) : (
            activeCampaigns.slice(0, 6).map((c: any) => {
              const meta = TYPE_ICONS[c.type] || TYPE_ICONS.push;
              const statusColor = c.status === "live" ? "text-status-success" : c.status === "sending" ? "text-status-info" : "text-status-warning";
              return (
                <div key={c.id} className="min-w-[240px] bg-surface-container-low border border-subtle p-5 rounded-xl space-y-3 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className={`material-symbols-outlined ${meta.color} text-[22px]`}>{meta.icon}</span>
                    <span className={`font-data-mono text-xs font-bold ${statusColor} uppercase`}>{c.status}</span>
                  </div>
                  <div>
                    <p className="font-body-md font-bold text-base text-on-surface truncate">{c.title || c.subject || "Untitled"}</p>
                    <p className="font-body-sm text-xs text-on-surface-variant capitalize mt-0.5">{c.type || "push"}</p>
                  </div>
                  <div className="pt-3 border-t border-subtle grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-label-caps text-[10px] text-on-surface-variant font-bold">TARGET</p>
                      <p className="font-data-mono font-semibold text-on-surface">{c.target || "ALL"}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[10px] text-on-surface-variant font-bold">SENT</p>
                      <p className="font-data-mono font-semibold text-on-surface">{timeAgo(c.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Targeting Segments */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-5 md:p-6 flex flex-col gap-4">
        <h3 className="font-headline-md text-headline-md font-bold text-primary">Audience Segments</h3>
        <div className="flex flex-wrap gap-3">
          <span className="bg-surface-container-low border border-subtle px-3.5 py-2 rounded-lg font-data-mono text-xs font-bold text-secondary">ALL USERS [{userSegments.all.toLocaleString()}]</span>
          <span className="bg-surface-container-low border border-subtle px-3.5 py-2 rounded-lg font-data-mono text-xs font-bold text-status-success">VERIFIED [{userSegments.verified.toLocaleString()}]</span>
          <span className="bg-surface-container-low border border-subtle px-3.5 py-2 rounded-lg font-data-mono text-xs font-bold text-status-warning">PENDING KYC [{userSegments.pendingKyc.toLocaleString()}]</span>
          <span className="bg-surface-container-low border border-subtle px-3.5 py-2 rounded-lg font-data-mono text-xs font-bold text-status-danger">REJECTED [{userSegments.rejected.toLocaleString()}]</span>
        </div>
      </section>

      {/* Auto-Notification Settings */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 md:p-5 border-b border-subtle bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Automated Event Triggers</h3>
        </div>
        <div className="divide-y divide-subtle">
          {[
            { icon: "payments", label: "Deposit Confirmed", key: "deposit", checked: autoTriggers.deposit, danger: false },
            { icon: "account_balance_wallet", label: "Withdrawal Initiated", key: "withdrawal", checked: autoTriggers.withdrawal, danger: false },
            { icon: "swap_vert", label: "Trade Executed", key: "trade", checked: autoTriggers.trade, danger: false },
            { icon: "security", label: "Security Alert (High)", key: "security", checked: autoTriggers.security, danger: true },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between p-4 md:p-5 hover:bg-surface-container-low transition-colors">
              <div className={`flex items-center gap-3.5 ${t.danger ? "text-status-danger" : "text-on-surface"}`}>
                <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
                <span className="font-body-md font-semibold text-sm">{t.label}</span>
              </div>
              <div
                onClick={() => toggleAutoTrigger(t.key)}
                className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${t.checked ? (t.danger ? "bg-status-danger" : "bg-secondary") : "bg-surface-deep border border-outline"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${t.checked ? "left-[22px]" : "left-0.5"} ${t.danger && t.checked ? "bg-white" : "bg-on-surface-variant"}`}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Notification Logs */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-5 md:p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Notification Dispatch Log</h3>
          <div className="flex gap-1.5">
            {["all", "push", "email", "banner"].map((f) => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                className={`font-label-caps text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${logFilter === f ? "border-primary text-on-primary bg-primary" : "border-subtle text-on-surface-variant hover:bg-surface-container"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-low border border-subtle p-4 h-16 rounded-xl animate-pulse" />
            ))
          ) : displayedLogs.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-body-sm bg-surface-container-low rounded-xl border border-subtle">No notifications match filter</div>
          ) : (
            displayedLogs.map((log: any) => {
              const statusColor = STATUS_COLORS[log.status] || "text-on-surface-variant";
              const barColor = log.type === "email" ? "bg-tertiary" : log.type === "banner" ? "bg-status-success" : "bg-secondary";
              return (
                <div key={log.id} className="bg-surface-container-low border border-subtle rounded-xl p-3.5 flex items-center justify-between hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-1.5 h-10 rounded-full ${barColor}`}></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-data-mono text-body-sm font-bold">{log.uid?.slice(0, 12) || "ALL USERS"}</span>
                        <span className="font-label-caps text-[10px] font-bold text-on-surface-variant px-1.5 py-0.5 bg-surface-container rounded uppercase">{log.type || "push"}</span>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant truncate max-w-sm mt-0.5">{log.title || log.body?.slice(0, 40) || "\u2014"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-data-mono text-xs font-bold ${statusColor} uppercase`}>{log.status || "sent"}</p>
                    <p className="font-data-mono text-[10px] text-on-surface-variant">{timeAgo(log.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {!showAllLogs && notifications.length > 10 && (
          <button
            onClick={() => setShowAllLogs(true)}
            className="w-full mt-2 py-2.5 text-center font-label-caps text-xs font-bold text-secondary border border-subtle rounded-lg hover:bg-surface-container transition-colors"
          >
            VIEW ALL LOGS ({notifications.length})
          </button>
        )}
        {showAllLogs && (
          <button
            onClick={() => setShowAllLogs(false)}
            className="w-full mt-2 py-2.5 text-center font-label-caps text-xs font-bold text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container transition-colors"
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
