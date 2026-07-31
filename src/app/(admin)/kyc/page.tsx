export default function KycPage() {
  return (
    <div className="px-container-padding pt-5 space-y-gutter w-full">
      {/* Verification Metrics */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container border border-subtle p-stack-base">
          <p className="font-label-caps text-on-surface-variant mb-1">PENDING</p>
          <p className="font-headline-lg text-secondary font-data-mono">42</p>
        </div>
        <div className="bg-surface-container border border-subtle p-stack-base">
          <p className="font-label-caps text-on-surface-variant mb-1">AVG TIME</p>
          <div className="flex items-baseline gap-1">
            <p className="font-headline-lg text-on-background font-data-mono">14</p>
            <span className="font-label-caps text-outline">MIN</span>
          </div>
        </div>
        <div className="bg-surface-container border border-subtle p-stack-base">
          <p className="font-label-caps text-on-surface-variant mb-1">REJECTION</p>
          <p className="font-headline-lg text-status-danger font-data-mono">8%</p>
        </div>
      </section>

      {/* Main Review Queue */}
      <section className="space-y-stack-base">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-label-caps text-primary">REVIEW QUEUE</h2>
          <span className="font-label-caps text-outline">PRIORITY: HIGH</span>
        </div>

        {/* KYC Card: @crypto_queen */}
        <div className="bg-surface-container border-l-2 border-l-secondary border-y border-r border-subtle p-container-padding flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-surface-bright border border-subtle flex items-center justify-center">
                <span className="material-symbols-outlined text-outline">account_circle</span>
              </div>
              <div>
                <p className="font-headline-md text-on-background leading-none">@crypto_queen</p>
                <p className="font-body-sm text-outline">Ref: KYC-8821-X</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="bg-status-warning/10 text-status-warning border border-status-warning/20 font-label-caps px-2 py-0.5 rounded">AWAITING REVIEW</span>
              <span className="font-data-mono text-[10px] text-outline">2m ago</span>
            </div>
          </div>

          {/* Verification Bits */}
          <div className="grid grid-cols-1 gap-2 bg-surface-deep/50 p-2 border border-subtle/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-success text-sm">verified_user</span>
                <span className="font-label-caps">BVN DATA</span>
              </div>
              <span className="font-data-mono text-status-success text-xs">VERIFIED</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-success text-sm">check_circle</span>
                <span className="font-label-caps">DOB MATCH</span>
              </div>
              <span className="font-data-mono text-status-success text-xs">100% CONFIDENCE</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-warning text-sm">pending</span>
                <span className="font-label-caps">ID DOCUMENT</span>
              </div>
              <span className="font-data-mono text-status-warning text-xs">MANUAL REVIEW</span>
            </div>
          </div>

          {/* Document Preview Area */}
          <div className="relative group">
            <div className="w-full h-32 bg-surface-container-highest border border-subtle overflow-hidden relative flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-4xl">badge</span>
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button className="h-8 w-8 bg-surface-deep/80 border border-subtle flex items-center justify-center hover:bg-surface-bright transition-colors">
                  <span className="material-symbols-outlined text-sm">zoom_in</span>
                </button>
                <button className="h-8 px-3 bg-secondary text-on-secondary font-label-caps flex items-center gap-1 active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-sm">fullscreen</span>
                  VIEW FULL
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button className="bg-surface-bright border border-subtle text-on-surface py-2 font-label-caps hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">description</span>
              DOCS REQ.
            </button>
            <button className="bg-status-danger/10 border border-status-danger/30 text-status-danger py-2 font-label-caps hover:bg-status-danger/20 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">block</span>
              REJECT
            </button>
            <button className="col-span-2 bg-status-success text-on-primary py-2.5 font-label-caps active:opacity-80 transition-opacity flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              APPROVE VERIFICATION
            </button>
          </div>
        </div>

        {/* Second Queue Item (Compact) */}
        <div className="bg-surface-container border border-subtle p-container-padding opacity-60">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-outline">person</span>
              <p className="font-body-md font-bold">@whale_watcher</p>
            </div>
            <span className="bg-status-danger/10 text-status-danger border border-status-danger/20 font-label-caps px-2 py-0.5 rounded">FLAGGED</span>
          </div>
        </div>
      </section>

      {/* Verification History Log */}
      <section className="space-y-stack-base">
        <h2 className="font-label-caps text-primary px-1">AUDIT TRAIL</h2>
        <div className="bg-surface-container border border-subtle max-h-48 overflow-y-auto">
          {[
            { dot: "bg-status-success", shadow: "shadow-[0_0_8px_rgba(16,185,129,0.6)]", user: "@alpha_trader", action: "APPROVED", actionColor: "text-on-background", time: "14:22:10", note: '"Tier 3 address doc matches utility bill. Proceeding." \u2014 Admin_7' },
            { dot: "bg-status-danger", shadow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]", user: "@scam_hunter", action: "REJECTED", actionColor: "text-status-danger", time: "14:15:45", note: '"Photo ID appears digitally altered. IP mismatch detected."' },
            { dot: "bg-status-warning", shadow: "", user: "@user_992", action: "DOC_REQ", actionColor: "text-status-warning", time: "13:58:02", note: '"Selfie too blurry. System requested recapture."' },
          ].map((log) => (
            <div key={log.time} className="p-2 border-b border-subtle flex gap-3">
              <div className="mt-1 flex flex-col items-center">
                <div className={`w-1.5 h-1.5 rounded-full ${log.dot} ${log.shadow}`}></div>
                <div className="w-px h-full bg-subtle mt-1"></div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className={`font-label-caps ${log.actionColor}`}>{log.user} {log.action}</p>
                  <span className="font-data-mono text-[10px] text-outline">{log.time}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-tight mt-1 italic">{log.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
