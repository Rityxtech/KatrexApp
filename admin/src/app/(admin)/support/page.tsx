"use client";

import { useState, useMemo, useCallback } from "react";
import { useSupportTickets, useEmailCodes } from "@/hooks/useAdminData";
import { updateDocument } from "@/hooks/useFirestore";

function timeAgo(date: any) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
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

type TabType = "tickets" | "emails" | "metrics" | "templates";

export default function SupportPage() {
  const { data: tickets, loading } = useSupportTickets(100);
  const { data: emails } = useEmailCodes(25);
  const [activeTab, setActiveTab] = useState<TabType>("tickets");
  
  // Filtering & Pagination State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Chat State
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

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter]);

  // Paginated Tickets for Left Sidebar
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));

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
      // Update selected ticket state locally to show immediate reply in chat window
      setSelectedTicket((prev: any) => prev ? {
        ...prev,
        adminReply: replyText.trim(),
        status: "pending",
        respondedAt: { toDate: () => new Date() },
      } : null);
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

  function injectTemplateDirectly(tplKey: string) {
    setReplyText(CANNED_TEMPLATES[tplKey] || "");
    showToast("Template loaded into input box");
  }

  return (
    <div className="w-full flex flex-col gap-3.5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3 py-1.5 rounded-xl shadow-lg font-body-sm text-xs text-on-surface">
          {toast}
        </div>
      )}

      {/* Tabs Switcher at top */}
      <div className="flex bg-surface-bright border border-subtle p-1 rounded-xl shadow-sm gap-1 w-fit">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === "tickets"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Tickets &amp; Live Chat
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === "emails"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Verification Emails
        </button>
        <button
          onClick={() => setActiveTab("metrics")}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === "metrics"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          SLA &amp; Performance
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === "templates"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Canned Templates
        </button>
      </div>

      {/* TAB 1: TICKETS & LIVE CHAT (Split screen) */}
      {activeTab === "tickets" && (
        <div className="flex flex-col gap-3.5 w-full">
          {/* Quick Stats Header */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-surface-bright border border-subtle px-3.5 py-2.5 rounded-xl shadow-sm">
            <div className="flex gap-4 items-center">
              <div>
                <span className="text-[10px] font-label-caps text-on-surface-variant block font-bold">TOTAL QUEUED</span>
                <span className="text-sm font-bold font-data-mono text-on-surface">{filteredTickets.length} tickets</span>
              </div>
              <div className="border-r border-subtle h-6 self-center" />
              <div>
                <span className="text-[10px] font-label-caps text-on-surface-variant block font-bold">SELECTED</span>
                <span className="text-sm font-bold font-data-mono text-primary">{selectedIds.size} tickets</span>
              </div>
            </div>
            {/* Quick Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex gap-1.5 items-center bg-surface-deep px-2.5 py-1 rounded-lg border border-subtle animate-fadeIn">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">BULK ACTIONS:</span>
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction("close")}
                  className="bg-status-danger/10 hover:bg-status-danger/20 text-status-danger px-2.5 py-0.5 rounded-md text-xs font-bold transition-all"
                >
                  CLOSE
                </button>
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction("merge")}
                  className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-0.5 rounded-md text-xs font-bold transition-all"
                >
                  MERGE
                </button>
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction("reassign")}
                  className="bg-status-warning/10 hover:bg-status-warning/20 text-status-warning px-2.5 py-0.5 rounded-md text-xs font-bold transition-all"
                >
                  REASSIGN
                </button>
              </div>
            )}
          </div>

          {/* Redesigned 2-Column Messaging Workspace Container */}
          <div className="w-full flex rounded-xl border border-subtle overflow-hidden bg-surface-bright shadow-sm" style={{ height: "calc(100vh - 200px)", minHeight: "560px" }}>
            {/* LEFT SIDEBAR: Ticket Lists (35% width / Min-width 360px) */}
            <div className="w-[380px] border-r border-border-subtle flex flex-col bg-surface-deep">
              {/* Filter Sub-header */}
              <div className="p-3 bg-surface-container border-b border-border-subtle flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface font-bold">FILTERS</span>
                  {(statusFilter !== "all" || priorityFilter !== "all") && (
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setPriorityFilter("all");
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-surface-bright border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm text-on-surface focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-surface-bright border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm text-on-surface focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Sidebar Scrollable Tickets list */}
              <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/50">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 bg-surface-container-high rounded animate-pulse" />
                    ))}
                  </div>
                ) : paginatedTickets.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-body-sm">
                    No tickets match selected filters
                  </div>
                ) : (
                  paginatedTickets.map((t: any) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`p-3 flex items-start gap-2.5 hover:bg-surface-container-high/50 cursor-pointer transition-all ${
                          isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
                        }`}
                      >
                        {/* Selector checkbox */}
                        <div
                          className="pt-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(t.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(t.id)}
                            onChange={() => {}} // handled by click parent
                            className="rounded border-border-subtle cursor-pointer text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                        </div>

                        {/* Ticket metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-data-mono text-[11px] font-bold text-primary">
                              #{t.reference || t.id?.slice(0, 8)}
                            </span>
                            <span className="font-data-mono text-[9px] text-on-surface-variant">
                              {timeAgo(t.createdAt)}
                            </span>
                          </div>
                          <p className="font-body-sm text-[12px] font-bold text-on-surface truncate">
                            {t.userEmail || t.uid?.slice(0, 16) || "Anonymous User"}
                          </p>
                          <p className="font-body-sm text-[11px] text-on-surface-variant truncate mt-0.5">
                            {t.subject || t.description || "\u2014"}
                          </p>

                          {/* Badges */}
                          <div className="flex gap-1.5 mt-2">
                            <span className={`text-[9px] font-label-caps px-1.5 py-0.2 rounded border ${STATUS_CLASS[t.status] || STATUS_CLASS.open}`}>
                              {t.status || "open"}
                            </span>
                            <span className={`text-[9px] font-label-caps px-1.5 py-0.2 rounded border ${PRIORITY_CLASS[t.priority] || PRIORITY_CLASS.low}`}>
                              {t.priority || "low"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Left Pane Pagination Bottom Bar */}
              <div className="p-3 bg-surface-container border-t border-border-subtle flex items-center justify-between">
                <span className="text-[10px] font-label-caps text-on-surface-variant">
                  PAGE {currentPage} OF {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-surface-deep border border-border-subtle disabled:opacity-40 text-on-surface animate-scaleUp"
                  >
                    <span className="material-symbols-outlined text-[16px] block">chevron_left</span>
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded bg-surface-deep border border-border-subtle disabled:opacity-40 text-on-surface animate-scaleUp"
                  >
                    <span className="material-symbols-outlined text-[16px] block">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT WORKSPACE: Chat Conversation Window (65% width) */}
            <div className="flex-1 flex flex-col bg-surface-container-lowest">
              {selectedTicket ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Chat Active Header */}
                  <div className="p-3 bg-surface-container border-b border-border-subtle flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-body-sm text-body-sm font-bold text-on-surface">
                          {selectedTicket.userEmail || "Anonymous User"}
                        </span>
                        <span className="font-data-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                          #{selectedTicket.reference || selectedTicket.id?.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant block mt-0.5">
                        User ID: {selectedTicket.uid || "N/A"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await updateDocument("support_tickets", selectedTicket.id, {
                              status: newStatus,
                              updatedAt: new Date(),
                            });
                            setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
                            showToast(`Status updated to ${newStatus}`);
                          } catch (err: any) {
                            showToast(`Failed to update status: ${err.message}`);
                          }
                        }}
                        className="bg-surface-bright border border-border-subtle rounded px-2.5 py-1 text-xs font-label-caps text-on-surface focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages Stream View Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {/* Ticket Subject/Description: First message */}
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div className="bg-surface-container p-3 rounded-2xl rounded-tl-none border border-border-subtle shadow-sm">
                        <span className="text-[9px] font-label-caps text-primary font-bold block mb-1">
                          USER REQUEST &middot; {timeAgo(selectedTicket.createdAt)}
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line">
                          {selectedTicket.subject ? `Subject: ${selectedTicket.subject}\n\n` : ""}
                          {selectedTicket.description || "Awaiting description..."}
                        </p>
                      </div>
                    </div>

                    {/* Admin Reply Message */}
                    {selectedTicket.adminReply && (
                      <div className="flex flex-col items-end max-w-[80%] ml-auto">
                        <div className="bg-primary text-on-primary p-3 rounded-2xl rounded-tr-none shadow-sm">
                          <span className="text-[9px] font-label-caps text-on-primary/70 font-bold block mb-1">
                            SUPPORT ADMIN &middot; {timeAgo(selectedTicket.respondedAt)}
                          </span>
                          <p className="font-body-sm text-body-sm whitespace-pre-line">
                            {selectedTicket.adminReply}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Inline Editor for replies */}
                  <div className="p-3 bg-surface-container border-t border-border-subtle flex flex-col gap-2">
                    {/* Quick Canned Responses Injector */}
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[10px] font-label-caps text-on-surface-variant font-bold shrink-0">
                          LOAD RESPONSE:
                        </span>
                        <div className="flex gap-1.5 overflow-x-auto py-0.5 scrollbar-thin flex-1">
                          {Object.keys(CANNED_TEMPLATES).map((key) => (
                            <button
                              key={key}
                              onClick={() => injectTemplateDirectly(key)}
                              className="bg-surface-deep hover:bg-surface-container-high border border-border-subtle text-on-surface text-[10px] px-2 py-0.5 rounded-full shrink-0 transition-colors"
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        className="flex-1 bg-surface-bright border border-border-subtle rounded-lg p-2.5 font-body-sm text-body-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-on-surface-variant/40 resize-none h-[64px]"
                        placeholder="Type response..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                      />
                      <button
                        disabled={!replyText.trim() || sending}
                        onClick={handleReply}
                        className="bg-primary text-on-primary hover:bg-primary/95 px-5 rounded-lg font-label-caps text-label-caps disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center transition-colors font-bold"
                      >
                        {sending ? "SENDING..." : "SEND"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-2">
                    forum
                  </span>
                  <p className="font-body-sm text-body-sm font-bold text-on-surface">No ticket selected</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1 max-w-[280px]">
                    Select a support ticket from the sidebar queue to display the conversation and compose a reply.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICATION EMAILS */}
      {activeTab === "emails" && (
        <section className="bg-surface-container border border-border-subtle rounded-xl overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-border-subtle">
            <h2 className="font-label-caps text-label-caps text-on-surface font-bold">
              VERIFICATION EMAILS LOG
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Logs of the most recently sent system-generated authentication and verification code emails.
            </p>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-deep text-on-surface-variant border-b border-border-subtle">
                <tr>
                  <th className="px-3 py-2 font-label-caps text-[10px]">EMAIL ADDRESS / USER ID</th>
                  <th className="px-3 py-2 font-label-caps text-[10px]">CODE</th>
                  <th className="px-3 py-2 font-label-caps text-[10px]">PURPOSE</th>
                  <th className="px-3 py-2 font-label-caps text-[10px]">GENERATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-on-surface-variant text-body-sm">
                      No emails generated yet.
                    </td>
                  </tr>
                ) : (
                  emails.map((email: any) => (
                    <tr key={email.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="px-3 py-2 font-body-sm text-xs text-on-surface font-semibold">
                        {email.email || email.uid || "\u2014"}
                      </td>
                      <td className="px-3 py-2 font-data-mono text-xs text-primary font-bold">
                        {email.code || "\u2014"}
                      </td>
                      <td className="px-3 py-2 font-body-sm text-xs text-on-surface">
                        {email.purpose || "verification"}
                      </td>
                      <td className="px-3 py-2 font-data-mono text-[10px] text-on-surface-variant">
                        {timeAgo(email.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: SLA & PERFORMANCE */}
      {activeTab === "metrics" && (
        <div className="flex flex-col gap-3.5">
          <section className="bg-surface-container border border-border-subtle rounded-xl p-3.5 md:p-4">
            <h2 className="font-label-caps text-label-caps text-on-surface font-bold mb-2.5">
              KPI SUMMARY METRICS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="bg-surface-bright p-3.5 border border-border-subtle rounded-lg flex flex-col justify-between">
                <span className="font-label-caps text-[10px] text-on-surface-variant block font-bold">
                  AVG RESPONSE TIME
                </span>
                <span className="font-headline-lg text-2xl font-black text-on-surface mt-1">
                  {avgResponseTime}
                </span>
                <span className="font-data-mono text-[10px] text-status-success mt-0.5 font-bold">
                  Based on {tickets.filter((t: any) => t.respondedAt || t.adminReply).length} responses
                </span>
              </div>
              <div className="bg-surface-bright p-3.5 border border-border-subtle rounded-lg flex flex-col justify-between">
                <span className="font-label-caps text-[10px] text-on-surface-variant block font-bold">
                  TICKET RESOLUTION RATE
                </span>
                <span className="font-headline-lg text-2xl font-black text-on-surface mt-1">
                  {resolutionRate}%
                </span>
                <span className="font-data-mono text-[10px] text-status-success mt-0.5 font-bold">
                  {resolvedTickets.length} of {tickets.length} resolved
                </span>
              </div>
              <div className="bg-surface-bright p-3.5 border border-border-subtle rounded-lg flex flex-col justify-between">
                <span className="font-label-caps text-[10px] text-on-surface-variant block font-bold">
                  PENDING QUEUE SIZE
                </span>
                <span className="font-headline-lg text-2xl font-black text-on-surface mt-1">
                  {openTickets.length}
                </span>
                <span className="text-[10px] text-status-warning mt-0.5 flex items-center font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning mr-1 animate-pulse" />
                  Active live tickets
                </span>
              </div>
            </div>
          </section>

          {/* Details SLA policy */}
          <div className="bg-surface-container border border-border-subtle rounded-xl p-3.5 text-on-surface-variant text-xs space-y-1.5">
            <h3 className="font-label-caps text-label-caps text-on-surface font-bold">
              ADMIN SLA POLICY &amp; TARGETS
            </h3>
            <p>
              Our targets are to respond to all incoming user support tickets within a maximum time of 2 hours.
              Resolution should be achieved within 24 hours of ticket opening.
            </p>
            <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px]">
              <li>Urgent/High priority tickets target response time: &lt; 30 minutes</li>
              <li>Medium priority tickets target response time: &lt; 2 hours</li>
              <li>General / Low priority tickets target response time: &lt; 6 hours</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: CANNED TEMPLATES */}
      {activeTab === "templates" && (
        <section className="bg-surface-container border border-border-subtle rounded-xl p-3.5 md:p-4 flex flex-col gap-3">
          <div>
            <h2 className="font-label-caps text-label-caps text-on-surface font-bold">
              CANNED RESPONSE TEMPLATES
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Review and copy canned response templates to respond quickly to typical inquiries.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-[10px] text-on-surface-variant font-bold">
                SELECT TEMPLATE
              </label>
              <select
                value={cannedTemplate}
                onChange={(e) => setCannedTemplate(e.target.value)}
                className="w-full bg-surface-deep border border-border-subtle rounded-lg px-2.5 py-1.5 font-body-sm text-xs text-on-surface focus:outline-none cursor-pointer"
              >
                {Object.keys(CANNED_TEMPLATES).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 bg-surface-deep p-2.5 rounded-lg border border-border-subtle min-h-[140px]">
              <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">
                TEMPLATE CONTENT Preview
              </span>
              <p className="font-body-sm text-xs text-on-surface mt-1 flex-1 select-all whitespace-pre-line">
                {CANNED_TEMPLATES[cannedTemplate]}
              </p>
              <button
                onClick={handleCopyTemplate}
                className="w-full mt-2 border border-primary text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-lg font-label-caps transition-all text-xs font-bold"
              >
                COPY TO CLIPBOARD
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
