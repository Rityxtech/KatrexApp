"use client";

import { useKycQueue, useUsers } from "@/hooks/useAdminData";

function timeAgo(date: any) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function formatTimestamp(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function KycPage() {
  const { data: pendingKyc, loading } = useKycQueue();
  const { data: allUsers } = useUsers(1000);

  const verifiedUsers = allUsers.filter((u: any) => u.kycStatus === "verified" || u.kycStatus === "completed");
  const rejectedUsers = allUsers.filter((u: any) => u.kycStatus === "rejected");
  const rejectionRate = allUsers.length > 0 ? ((rejectedUsers.length / allUsers.length) * 100).toFixed(0) : "0";

  const auditTrail = allUsers
    .filter((u: any) => u.kycStatus === "verified" || u.kycStatus === "rejected" || u.kycStatus === "completed")
    .slice(0, 10);

  return (
    <div className="px-container-padding pt-5 space-y-gutter w-full">
      {/* Verification Metrics */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container border border-subtle p-stack-base">
          <p className="font-label-caps text-on-surface-variant mb-1">PENDING</p>
          <p className="font-headline-lg text-secondary font-data-mono">{loading ? "..." : pendingKyc.length}</p>
        </div>
        <div className="bg-surface-container border border-subtle p-stack-base">
          <p className="font-label-caps text-on-surface-variant mb-1">VERIFIED</p>
          <p className="font-headline-lg text-status-success font-data-mono">{verifiedUsers.length}</p>
        </div>
        <div className="bg-surface-container border border-subtle p-stack-base">
          <p className="font-label-caps text-on-surface-variant mb-1">REJECTION</p>
          <p className="font-headline-lg text-status-danger font-data-mono">{rejectionRate}%</p>
        </div>
      </section>

      {/* Review Queue */}
      <section className="space-y-stack-base">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-label-caps text-primary">REVIEW QUEUE</h2>
          <span className="font-label-caps text-outline">{pendingKyc.length} PENDING</span>
        </div>

        {loading ? (
          <div className="bg-surface-container border border-subtle p-container-padding rounded animate-pulse h-48" />
        ) : pendingKyc.length === 0 ? (
          <div className="bg-surface-container border border-subtle p-container-padding rounded text-center text-on-surface-variant text-body-sm">
            No pending KYC reviews
          </div>
        ) : (
          pendingKyc.slice(0, 5).map((user: any) => (
            <div key={user.id} className="bg-surface-container border-l-2 border-l-secondary border-y border-r border-subtle p-container-padding flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-surface-bright border border-subtle flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline">account_circle</span>
                  </div>
                  <div>
                    <p className="font-headline-md text-on-background leading-none">{user.displayName || user.email || user.id?.slice(0, 12)}</p>
                    <p className="font-body-sm text-outline">Ref: KYC-{user.id?.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-status-warning/10 text-status-warning border border-status-warning/20 font-label-caps px-2 py-0.5 rounded">AWAITING REVIEW</span>
                  <span className="font-data-mono text-[10px] text-outline">{timeAgo(user.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 bg-surface-deep/50 p-2 border border-subtle/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-success text-sm">verified_user</span>
                    <span className="font-label-caps">BVN DATA</span>
                  </div>
                  <span className="font-data-mono text-status-success text-xs">{user.bvn ? "VERIFIED" : "NOT PROVIDED"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-warning text-sm">pending</span>
                    <span className="font-label-caps">ID DOCUMENT</span>
                  </div>
                  <span className="font-data-mono text-status-warning text-xs">{user.idDocumentUrl ? "UPLOADED" : "MANUAL REVIEW"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button className="bg-surface-bright border border-subtle text-on-surface py-2 font-label-caps hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">description</span> DOCS REQ.
                </button>
                <button className="bg-status-danger/10 border border-status-danger/30 text-status-danger py-2 font-label-caps hover:bg-status-danger/20 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">block</span> REJECT
                </button>
                <button className="col-span-2 bg-status-success text-on-primary py-2.5 font-label-caps active:opacity-80 transition-opacity flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> APPROVE VERIFICATION
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Audit Trail */}
      <section className="space-y-stack-base">
        <h2 className="font-label-caps text-primary px-1">AUDIT TRAIL</h2>
        <div className="bg-surface-container border border-subtle max-h-48 overflow-y-auto">
          {auditTrail.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant text-body-sm">No audit records</div>
          ) : (
            auditTrail.map((log: any) => {
              const approved = log.kycStatus === "verified" || log.kycStatus === "completed";
              const dot = approved ? "bg-status-success" : "bg-status-danger";
              const shadow = approved ? "shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "shadow-[0_0_8px_rgba(239,68,68,0.6)]";
              return (
                <div key={log.id} className="p-2 border-b border-subtle flex gap-3">
                  <div className="mt-1 flex flex-col items-center">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot} ${shadow}`}></div>
                    <div className="w-px h-full bg-subtle mt-1"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`font-label-caps ${approved ? "text-on-background" : "text-status-danger"}`}>
                        {log.displayName || log.email?.slice(0, 16) || log.id?.slice(0, 8)} {approved ? "APPROVED" : "REJECTED"}
                      </p>
                      <span className="font-data-mono text-[10px] text-outline">{formatTimestamp(log.kycVerifiedAt || log.updatedAt || log.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-tight mt-1 italic">
                      {log.kycRejectionReason || `KYC ${approved ? "approved" : "rejected"} for ${log.kycTier ? `Tier ${log.kycTier}` : "user"}.`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
