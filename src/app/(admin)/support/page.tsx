"use client";

import { useSupportTickets, useEmailCodes } from "@/hooks/useAdminData";

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

export default function SupportPage() {
  const { data: tickets, loading } = useSupportTickets(50);
  const { data: emails } = useEmailCodes(10);

  const openTickets = tickets.filter((t: any) => t.status === "open" || t.status === "pending");
  const resolvedTickets = tickets.filter((t: any) => t.status === "resolved" || t.status === "closed");
  const resolutionRate = tickets.length > 0 ? ((resolvedTickets.length / tickets.length) * 100).toFixed(1) : "0";

  return (
    <div className="px-container-padding flex flex-col gap-max-gap w-full">
      {/* SLA & Performance Metrics */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">SLA &amp; PERFORMANCE METRICS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">AVG RESPONSE TIME</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">{loading ? "..." : "real-time"}</span>
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
            <button className="bg-surface-container-high px-2 py-1 border border-border-subtle rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">filter_list</span>
              <span className="font-label-caps text-label-caps">FILTERS</span>
            </button>
            <button className="bg-primary text-on-primary px-2 py-1 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span className="font-label-caps text-label-caps">NEW</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-body-sm">No support tickets</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-deep text-on-surface-variant border-b border-border-subtle">
                <tr>
                  <th className="px-3 py-2 font-label-caps text-label-caps">TID</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">USER</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">SUBJECT</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">PRIORITY</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">STATUS</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps">CREATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-surface-container-high transition-colors cursor-pointer">
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
              <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-on-secondary text-[10px] font-bold">?</div>
              <span className="font-body-sm text-body-sm font-bold">{openTickets[0]?.uid?.slice(0, 16) || "No active chats"}</span>
            </div>
            <span className="font-data-mono text-[10px] text-on-surface-variant">{openTickets.length > 0 ? "Active" : "Idle"}</span>
          </div>
          <div className="p-3 bg-surface-container-lowest min-h-[80px]">
            {openTickets[0] ? (
              <div className="bg-surface-container-high p-2 rounded-lg max-w-[85%] border border-border-subtle">
                <p className="font-body-sm text-body-sm text-on-surface">{openTickets[0].subject || openTickets[0].description || "Awaiting user message..."}</p>
              </div>
            ) : (
              <p className="text-on-surface-variant text-body-sm text-center py-4">No active chats</p>
            )}
          </div>
          <div className="p-2 bg-surface-container flex gap-2 border-t border-border-subtle">
            <input className="flex-1 bg-surface-deep border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-on-surface-variant/40" placeholder="Type response..." type="text" />
            <button className="bg-primary text-on-primary px-3 py-1 rounded font-label-caps text-label-caps">REPLY</button>
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
            <select className="w-full bg-surface-deep border border-border-subtle rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer">
              <option>Technical troubleshooting</option>
              <option>Login reset protocol</option>
              <option>Escalation notice</option>
              <option>Withdrawal FAQ</option>
            </select>
            <button className="w-full mt-2 border border-primary text-primary px-3 py-1.5 rounded font-label-caps text-label-caps hover:bg-primary/5 transition-colors">COPY TO CLIPBOARD</button>
          </div>
        </div>
      </section>

      {/* Bulk Actions */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">BULK ACTIONS</h2>
        <div className="grid grid-cols-3 gap-gutter">
          <button className="bg-surface-container border border-border-subtle p-2 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95">
            <span className="material-symbols-outlined text-primary">merge</span>
            <span className="font-label-caps text-label-caps">MERGE</span>
          </button>
          <button className="bg-surface-container border border-border-subtle p-2 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95">
            <span className="material-symbols-outlined text-status-danger">cancel</span>
            <span className="font-label-caps text-label-caps">CLOSE</span>
          </button>
          <button className="bg-surface-container border border-border-subtle p-2 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95">
            <span className="material-symbols-outlined text-secondary">move_up</span>
            <span className="font-label-caps text-label-caps">REASSIGN</span>
          </button>
        </div>
      </section>
    </div>
  );
}
