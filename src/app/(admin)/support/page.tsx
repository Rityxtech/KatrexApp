export default function SupportPage() {
  return (
    <div className="px-container-padding flex flex-col gap-max-gap w-full">
      {/* Section 1: SLA & Performance Metrics */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">SLA &amp; PERFORMANCE METRICS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">AVG RESPONSE TIME</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">4m 12s</span>
              <span className="font-data-mono text-data-mono text-status-success">-18% v/d</span>
            </div>
          </div>
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">RESOLUTION RATE</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">98.2%</span>
              <span className="font-data-mono text-data-mono text-status-success">+2.4%</span>
            </div>
          </div>
          <div className="bg-surface-bright p-stack-base border border-border-subtle rounded flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant">ACTIVE CHATS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-lg text-headline-lg font-black text-on-surface">14</span>
              <span className="flex items-center text-status-warning">
                <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse mr-1"></span>
                <span className="font-data-mono text-data-mono">LIVE</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Ticket Queue */}
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
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-deep text-on-surface-variant border-b border-border-subtle">
              <tr>
                <th className="px-3 py-2 font-label-caps text-label-caps">TID</th>
                <th className="px-3 py-2 font-label-caps text-label-caps">USER</th>
                <th className="px-3 py-2 font-label-caps text-label-caps">PRIORITY</th>
                <th className="px-3 py-2 font-label-caps text-label-caps">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {[
                { tid: "#TKT-991", user: "@joshua", pri: "HIGH", priClass: "bg-status-danger/10 text-status-danger border-status-danger/20", status: "Open", statusClass: "bg-status-info/10 text-status-info border-status-info/20" },
                { tid: "#TKT-988", user: "@sarah_dev", pri: "MEDIUM", priClass: "bg-status-warning/10 text-status-warning border-status-warning/20", status: "Open", statusClass: "bg-status-info/10 text-status-info border-status-info/20" },
                { tid: "#TKT-985", user: "@mike_r", pri: "LOW", priClass: "bg-on-primary-container/10 text-on-primary-container border-on-primary-container/20", status: "Resolved", statusClass: "bg-status-success/10 text-status-success border-status-success/20" },
              ].map((t) => (
                <tr key={t.tid} className="hover:bg-surface-container-high transition-colors cursor-pointer">
                  <td className="px-3 py-1.5 font-data-mono text-data-mono text-primary">{t.tid}</td>
                  <td className="px-3 py-1.5 font-body-sm text-body-sm text-on-surface">{t.user}</td>
                  <td className="px-3 py-1.5">
                    <span className={`font-label-caps text-[8px] px-1.5 py-0.5 rounded border ${t.priClass}`}>{t.pri}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`font-label-caps text-[8px] px-1.5 py-0.5 rounded border ${t.statusClass} uppercase`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Active Live Chat */}
      <section>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-2 px-1">ACTIVE LIVE CHAT</h2>
        <div className="bg-surface-bright border border-border-subtle rounded-xl overflow-hidden flex flex-col">
          <div className="p-stack-base bg-surface-container flex items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-on-secondary text-[10px] font-bold">JD</div>
              <span className="font-body-sm text-body-sm font-bold">Joshua Davidson</span>
            </div>
            <span className="font-data-mono text-[10px] text-on-surface-variant">Active 2m</span>
          </div>
          <div className="p-3 bg-surface-container-lowest min-h-[80px]">
            <div className="bg-surface-container-high p-2 rounded-lg max-w-[85%] border border-border-subtle">
              <p className="font-body-sm text-body-sm text-on-surface">I&apos;m having trouble accessing the main terminal dashboard. Error code: ERR_403_KATREX. Any fix?</p>
            </div>
          </div>
          <div className="p-2 bg-surface-container flex gap-2 border-t border-border-subtle">
            <input className="flex-1 bg-surface-deep border border-border-subtle rounded px-2 py-1 font-body-sm text-body-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-on-surface-variant/40" placeholder="Type response..." type="text" />
            <button className="bg-primary text-on-primary px-3 py-1 rounded font-label-caps text-label-caps">REPLY</button>
          </div>
        </div>
      </section>

      {/* Section 4: Email & Canned Responses */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-max-gap">
        <div className="flex flex-col gap-2">
          <h2 className="font-label-caps text-label-caps text-on-surface-variant px-1">RECENT EMAILS</h2>
          <div className="bg-surface-bright border border-border-subtle rounded flex flex-col divide-y divide-border-subtle">
            <div className="p-2 hover:bg-surface-container-high transition-colors">
              <p className="font-body-sm text-body-sm font-bold text-on-surface">support@katrex.com</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">Re: Withdrawal inquiry from user #821...</p>
              <span className="font-data-mono text-[10px] text-on-primary-container">Received: 14:02 UTC</span>
            </div>
            <div className="p-2 hover:bg-surface-container-high transition-colors">
              <p className="font-body-sm text-body-sm font-bold text-on-surface">support@katrex.com</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">Security Alert: API Access Granted...</p>
              <span className="font-data-mono text-[10px] text-on-primary-container">Received: 13:45 UTC</span>
            </div>
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

      {/* Section 5: Admin Actions */}
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
