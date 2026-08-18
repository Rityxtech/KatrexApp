"use client";

import { useState, useMemo, useCallback } from "react";
import { useSupportTickets, useEmailCodes } from "@/hooks/useAdminData";
import { updateDocument } from "@/hooks/useFirestore";
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

const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-status-danger/10 text-status-danger border-status-danger/20",
  medium: "bg-status-warning/10 text-status-warning border-status-warning/20",
  low: "bg-on-primary-container/10 text-on-primary-container border-on-primary-container/20",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-status-info/10 text-status-info border-status-info/20",
  resolved: "bg-status-success/10 text-status-success border-status-success/20",
  closed: "bg-surface-container-high text-on-surface-variant border-subtle",
  pending: "bg-status-warning/10 text-status-warning border-status-warning/20",
};

const CANNED_TEMPLATES: Record<string, string> = {
  "Technical troubleshooting": "We're looking into the issue you reported. Please try clearing your cache and restarting the app. If the problem persists, contact us with your device model and OS version.",
  "Login reset protocol": "We've initiated a password reset for your account. Please check your email for a reset link. The link expires in 24 hours.",
  "Escalation notice": "Your ticket has been escalated to our senior support team. You can expect a response within 2-4 business hours.",
  "Withdrawal FAQ": "Withdrawals are processed within 1-24 hours depending on the amount and network conditions. Please ensure your KYC is verified for faster processing.",
};

export default function SupportPage() {
  const { data: tickets, loading } = useSupportTickets(50);
  const { data: emails } = useEmailCodes(10);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cannedTemplate, setCannedTemplate] = useState("Technical troubleshooting");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t: any) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tickets, statusFilter, priorityFilter]);

  const openTickets = tickets.filter((t: any) => t.status === "open" || t.status === "pending");
  const resolvedTickets = tickets.filter((t: any) => t.status === "resolved" || t.status === "closed");
  const resolutionRate = tickets.length > 0 ? ((resolvedTickets.length / tickets.length) * 100).toFixed(1) : "0";

  const avgResponseTime = useMemo(() => {
    const responded = tickets.filter((t: any) => t.respondedAt || t.adminReply);
    if (responded.length === 0) return "N/A";
    const totalMins = responded.reduce((sum: number, t: any) => {
      const created = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      const replied = t.respondedAt?.toDate ? t.respondedAt.toDate() : new Date(t.respondedAt);
      return sum + Math.floor((replied.getTime() - created.getTime()) / 60000);
    }, 0);
    const avg = Math.floor(totalMins / responded.length);
    if (avg < 60) return `${avg}m`;
    return `${Math.floor(avg / 60)}h ${avg % 60}m`;
  }, [tickets]);

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      await updateDocument("support_tickets", selectedTicket.id, {
        adminReply: replyText.trim(),
        status: "pending",
        respondedAt: new Date(),
        updatedAt: new Date(),
      });
      setReplyText("");
      showToast("Reply sent successfully");
    } catch (err: any) {
      showToast(`Failed to send reply: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  async function handleBulkAction(action: "close" | "merge" | "reassign") {
    if (selectedIds.size === 0) {
      showToast("No tickets selected");
      return;
    }
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === "close") {
        for (const id of ids) {
          await updateDocument("support_tickets", id, { status: "closed", updatedAt: new Date() });
        }
        showToast(`${ids.length} ticket(s) closed`);
      } else if (action === "merge") {
        // Merge: keep the first ticket, close the rest with a note
        const [keepId, ...mergeIds] = ids;
        for (const id of mergeIds) {
          await updateDocument("support_tickets", id, {
            status: "closed",
            mergedInto: keepId,
            updatedAt: new Date(),
          });
        }
        showToast(`${mergeIds.length} ticket(s) merged into #${keepId.slice(0, 8)}`);
      } else if (action === "reassign") {
        for (const id of ids) {
          await updateDocument("support_tickets", id, {
            status: "open",
            reassignedAt: new Date(),
            updatedAt: new Date(),
          });
        }
        showToast(`${ids.length} ticket(s) reassigned to queue`);
      }
      setSelectedIds(new Set());
    } catch (err: any) {
      showToast(`Bulk action failed: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCopyTemplate() {
    const text = CANNED_TEMPLATES[cannedTemplate] || "";
    navigator.clipboard.writeText(text);
    showToast("Template copied to clipboard");
  }

  return (
    <div className="px-container-padding flex flex-col gap-max-gap w-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}

      {/* SLA & Performance Metrics */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">SLA &amp; PERFORMANCE METRICS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">AVG RESPONSE TIME</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">{avgResponseTime}</span>
              <span className="font-data-mono text-data-mono text-status-success">{tickets.length} tickets</span>
            </div>
          </div>
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">RESOLUTION RATE</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">{resolutionRate}%</span>
              <span className="font-data-mono text-data-mono text-status-success">{resolvedTickets.length} resolved</span>
            </div>
          </div>
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">OPEN TICKETS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">{openTickets.length}</span>
              <span className="flex items-center text-status-warning">
                <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse mr-1"></span>
                <span className="font-data-mono text-data-mono">LIVE</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ticket Queue */}
      <section className="bg-surface-container border border-border-subtle overflow-hidden">
        <div className="px-container-padding py-2 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant">TICKET QUEUE</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`bg-surface-container-high px-2 py-1 border rounded flex items-center gap-1 transition-colors ${showFilters ? "border-primary text-primary" : "border-border-subtle"}`}
            >
              <span className="material-symbols-outlined text-[14px]">filter_list</span>
              <span className="font-label-caps text-label-caps">FILTERS</span>
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="px-container-padding py-2 bg-surface-container-low border-b border-border-subtle flex gap-4">
            <div className="flex items-center gap-2">
              <label className="font-label-caps text-[9px] text-on-surface-variant">STATUS</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-deep border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-label-caps text-[9px] text-on-surface-variant">PRIORITY</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-surface-deep border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />)}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-body-sm">No support tickets match filters</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-deep text-on-surface-variant border-b border-border-subtle">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(filteredTickets.map((t: any) => t.id)));
                        else setSelectedIds(new Set());
                      }}
                      className="rounded border-border-subtle"
                    />
                  </th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">TID</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">USER</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">SUBJECT</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">PRIORITY</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">STATUS</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">CREATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredTickets.map((t: any) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-surface-container-high transition-colors cursor-pointer ${selectedTicket?.id === t.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedTicket(t)}
                  >
                    <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="rounded border-border-subtle"
                      />
                    </td>
                    <td className="px-3 py-1.5 font-data-mono text-data-mono text-primary">#{t.reference || t.id?.slice(0, 8)}</td>
                    <td className="px-3 py-1.5 font-body-sm text-body-sm text-on-surface">{t.uid?.slice(0, 16) || t.userEmail || "\u2014"}</td>
                    <td className="px-3 py-1.5 font-body-sm text-body-sm text-on-surface">{t.subject || t.description?.slice(0, 40) || "\u2014"}</td>
                    <td className="px-3 py-1.5">
                      <span className={`font-label-caps text-[8px] px-1.5 py-0.5 rounded border ${PRIORITY_CLASS[t.priority] || PRIORITY_CLASS.low}`}>{(t.priority || "low").toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`font-label-caps text-[8px] px-1.5 py-0.5 rounded border ${STATUS_CLASS[t.status] || STATUS_CLASS.open} uppercase`}>{t.status || "open"}</span>
                    </td>
                    <td className="px-3 py-1.5 font-data-mono text-[10px] text-on-surface-variant">{timeAgo(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Active Live Chat */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">ACTIVE LIVE CHAT</h2>
        <div className="bg-surface-bright border border-border-subtle rounded-xl overflow-hidden flex flex-col">
          <div className="p-stack-base bg-surface-container flex items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-on-secondary text-[10px] font-bold">
                {selectedTicket ? "!" : "?"}
              </div>
              <span className="font-body-sm text-body-sm font-bold">
                {selectedTicket
                  ? (selectedTicket.uid?.slice(0, 16) || selectedTicket.userEmail || "Selected ticket")
                  : openTickets[0]?.uid?.slice(0, 16) || "No active chats"}
              </span>
            </div>
            <span className="font-data-mono text-[10px] text-on-surface-variant">
              {selectedTicket ? `#${selectedTicket.reference || selectedTicket.id?.slice(0, 8)}` : openTickets.length > 0 ? "Active" : "Idle"}
            </span>
          </div>
          <div className="p-3 bg-surface-container-lowest min-h-[80px]">
            {(selectedTicket || openTickets[0]) ? (
              <div className="space-y-2">
                <div className="bg-surface-container-high p-2 rounded-lg max-w-[85%] border border-border-subtle">
                  <p className="font-body-sm text-body-sm text-on-surface">
                    {(selectedTicket || openTickets[0]).subject || (selectedTicket || openTickets[0]).description || "Awaiting user message..."}
                  </p>
                </div>
                {(selectedTicket || openTickets[0]).adminReply && (
                  <div className="bg-primary/10 p-2 rounded-lg max-w-[85%] ml-auto border border-primary/20">
                    <p className="font-body-sm text-body-sm text-on-surface">{(selectedTicket || openTickets[0]).adminReply}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-on-surface-variant text-body-sm text-center py-4">No active chats</p>
            )}
          </div>
          <div className="p-2 bg-surface-container flex gap-2 border-t border-border-subtle">
            <input
              className="flex-1 bg-surface-deep border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-on-surface-variant/40"
              placeholder="Type response..."
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
            />
            <button
              disabled={!replyText.trim() || sending || !selectedTicket}
              onClick={handleReply}
              className="bg-primary text-on-primary px-3 py-1 rounded font-label-caps text-label-caps disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? "SENDING..." : "REPLY"}
            </button>
          </div>
        </div>
      </section>

      {/* Email & Canned Responses */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-max-gap">
        <div className="flex flex-col gap-2">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant px-1">RECENT EMAILS</h2>
          <div className="bg-surface-bright border border-border-subtle rounded flex flex-col divide-y divide-border-subtle">
            {emails.length === 0 ? (
              <div className="p-4 text-center text-on-surface-variant text-body-sm">No recent emails</div>
            ) : (
              emails.slice(0, 5).map((email: any) => (
                <div key={email.id} className="p-2 hover:bg-surface-container-high transition-colors">
                  <p className="font-body-sm text-body-sm font-bold text-on-surface">{email.email || email.uid || "\u2014"}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">Code: {email.code || "\u2014"} &middot; {email.purpose || "verification"}</p>
                  <span className="font-data-mono text-[10px] text-on-primary-container">{timeAgo(email.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant px-1">CANNED RESPONSES</h2>
          <div className="bg-surface-bright border border-border-subtle rounded p-stack-base">
            <label className="font-label-caps text-[9px] text-on-surface-variant mb-1 block">SELECT TEMPLATE</label>
            <select
              value={cannedTemplate}
              onChange={(e) => setCannedTemplate(e.target.value)}
              className="w-full bg-surface-deep border border-border-subtle rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
            >
              {Object.keys(CANNED_TEMPLATES).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 p-2 bg-surface-deep rounded min-h-[60px]">
              {CANNED_TEMPLATES[cannedTemplate]}
            </p>
            <button
              onClick={handleCopyTemplate}
              className="w-full mt-2 border border-primary text-primary px-3 py-1.5 rounded font-label-caps text-label-caps hover:bg-primary/5 transition-colors active:scale-95"
            >
              COPY TO CLIPBOARD
            </button>
          </div>
        </div>
      </section>

      {/* Bulk Actions */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">
          BULK ACTIONS {selectedIds.size > 0 && <span className="text-primary">({selectedIds.size} selected)</span>}
        </h2>
        <div className="grid grid-cols-3 gap-gutter">
          <button
            disabled={selectedIds.size === 0 || bulkLoading}
            onClick={() => handleBulkAction("merge")}
            className="bg-surface-container border border-border-subtle p-2 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-primary">merge</span>
            <span className="font-label-caps text-label-caps">MERGE</span>
          </button>
          <button
            disabled={selectedIds.size === 0 || bulkLoading}
            onClick={() => handleBulkAction("close")}
            className="bg-surface-container border border-border-subtle p-2 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-status-danger">cancel</span>
            <span className="font-label-caps text-label-caps">CLOSE</span>
          </button>
          <button
            disabled={selectedIds.size === 0 || bulkLoading}
            onClick={() => handleBulkAction("reassign")}
            className="bg-surface-container border border-border-subtle p-2 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-secondary">move_up</span>
            <span className="font-label-caps text-label-caps">REASSIGN</span>
          </button>
        </div>
      </section>
    </div>
  );
}
