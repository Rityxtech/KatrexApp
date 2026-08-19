"use client";

import { useState, useCallback } from "react";
import { useKycQueue, useUsers } from "@/hooks/useAdminData";
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

function formatTimestamp(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function KycPage() {
  const { data: pendingKyc, loading } = useKycQueue();
  const { data: allUsers } = useUsers(1000);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ uid: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [docViewer, setDocViewer] = useState<{ url: string; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const verifiedUsers = allUsers.filter((u: any) => u.kycStatus === "verified" || u.kycStatus === "completed");
  const rejectedUsers = allUsers.filter((u: any) => u.kycStatus === "rejected");
  const rejectionRate = allUsers.length > 0 ? ((rejectedUsers.length / allUsers.length) * 100).toFixed(0) : "0";

  const auditTrail = allUsers
    .filter((u: any) => u.kycStatus === "verified" || u.kycStatus === "rejected" || u.kycStatus === "completed")
    .slice(0, 10);

  async function handleApprove(uid: string) {
    setProcessing(uid);
    try {
      const functions = getFunctions(getApps()[0], "us-central1");
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({ action: "reviewKyc", uid, decision: "approve" });
      showToast("KYC approved successfully");
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    setProcessing(rejectModal.uid);
    try {
      const functions = getFunctions(getApps()[0], "us-central1");
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "reviewKyc",
        uid: rejectModal.uid,
        decision: "reject",
        reason: rejectReason.trim() || undefined,
      });
      showToast("KYC rejected");
      setRejectModal(null);
      setRejectReason("");
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleRequestDocs(uid: string) {
    try {
      const functions = getFunctions(getApps()[0], "us-central1");
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "sendPushNotification",
        title: "Additional Documents Required",
        body: "Please upload a clear photo of your government-issued ID to complete verification.",
        targetType: "individual",
        targetUid: uid,
      });
      showToast("Document request sent to user");
    } catch (err: any) {
      showToast(`Failed to send request: ${err.message}`);
    }
  }

  return (
    <div className="w-full flex flex-col gap-3.5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3 py-1.5 rounded-xl shadow-lg font-body-sm text-xs text-on-surface">
          {toast}
        </div>
      )}

      {/* Verification Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-surface-bright border border-subtle rounded-xl p-3.5 md:p-4 shadow-sm flex flex-col justify-between">
          <p className="font-label-caps text-[10px] text-on-surface-variant font-bold mb-0.5">PENDING VERIFICATIONS</p>
          <p className="font-headline-lg text-2xl text-secondary font-bold font-data-mono">{loading ? "..." : pendingKyc.length}</p>
        </div>
        <div className="bg-surface-bright border border-subtle rounded-xl p-3.5 md:p-4 shadow-sm flex flex-col justify-between">
          <p className="font-label-caps text-[10px] text-on-surface-variant font-bold mb-0.5">VERIFIED USERS</p>
          <p className="font-headline-lg text-2xl text-status-success font-bold font-data-mono">{verifiedUsers.length}</p>
        </div>
        <div className="bg-surface-bright border border-subtle rounded-xl p-3.5 md:p-4 shadow-sm flex flex-col justify-between">
          <p className="font-label-caps text-[10px] text-on-surface-variant font-bold mb-0.5">REJECTION RATE</p>
          <p className="font-headline-lg text-2xl text-status-danger font-bold font-data-mono">{rejectionRate}%</p>
        </div>
      </section>

      {/* Review Queue */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary font-bold">Review Queue</h2>
            <p className="text-body-sm text-xs text-on-surface-variant mt-0.5">Pending user identity verification submissions</p>
          </div>
          <span className="bg-status-warning/10 text-status-warning font-label-caps font-bold px-2.5 py-0.5 rounded-full text-[10px]">{pendingKyc.length} PENDING</span>
        </div>

        {loading ? (
          <div className="bg-surface-container-low border border-subtle p-4 rounded-xl animate-pulse h-36" />
        ) : pendingKyc.length === 0 ? (
          <div className="bg-surface-container-low border border-subtle p-6 rounded-xl text-center text-on-surface-variant text-body-sm">
            No pending KYC reviews. All verifications are up to date.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingKyc.slice(0, 10).map((user: any) => {
              const isProcessing = processing === user.id;
              return (
                <div key={user.id} className="bg-surface-container-low border-l-4 border-l-secondary border-y border-r border-subtle rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-surface-container-high rounded-xl border border-subtle flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                      </div>
                      <div>
                        <p className="font-body-md text-sm font-bold text-on-surface">{user.displayName || user.email || user.id?.slice(0, 12)}</p>
                        <p className="font-body-sm text-[10px] text-on-surface-variant">Ref: KYC-{user.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="bg-status-warning/10 text-status-warning border border-status-warning/20 font-label-caps font-bold px-2 py-0.5 rounded-full text-[10px]">AWAITING REVIEW</span>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">{timeAgo(user.createdAt)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-surface-deep/60 p-2.5 rounded-lg border border-subtle">
                    <div className="flex justify-between items-center px-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-status-success text-xs">verified_user</span>
                        <span className="font-label-caps text-[10px] font-bold">BVN DATA</span>
                      </div>
                      <span className="font-data-mono text-status-success text-xs font-bold">{user.bvn ? "VERIFIED" : "NOT PROVIDED"}</span>
                    </div>
                    <div className="flex justify-between items-center px-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-status-warning text-xs">pending</span>
                        <span className="font-label-caps text-[10px] font-bold">ID DOCUMENT</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-data-mono text-status-warning text-xs font-bold">{user.idDocumentUrl ? "UPLOADED" : "MANUAL REVIEW"}</span>
                        {user.idDocumentUrl && (
                          <button
                            onClick={() => setDocViewer({ url: user.idDocumentUrl, name: user.displayName || user.id?.slice(0, 12) })}
                            className="material-symbols-outlined text-primary text-[16px] hover:text-secondary transition-colors"
                            title="View document"
                          >
                            visibility
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-subtle">
                    <button
                      disabled={isProcessing}
                      onClick={() => handleRequestDocs(user.id)}
                      className="px-3 py-1.5 border border-subtle font-label-caps text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-40"
                    >
                      REQUEST INFO
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => setRejectModal({ uid: user.id, name: user.displayName || user.id?.slice(0, 8) })}
                      className="px-3 py-1.5 bg-status-danger/10 text-status-danger font-label-caps text-xs font-bold rounded-lg hover:bg-status-danger/20 transition-colors disabled:opacity-40"
                    >
                      REJECT
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleApprove(user.id)}
                      className="px-3 py-1.5 bg-status-success text-on-primary font-label-caps text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {isProcessing ? "PROCESSING..." : "APPROVE"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Audit Trail */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md text-primary font-bold">Audit Trail</h2>
          <span className="font-data-mono text-xs text-on-surface-variant">{auditTrail.length} records</span>
        </div>
        <div className="bg-surface-container-low border border-subtle rounded-xl max-h-52 overflow-y-auto no-scrollbar divide-y divide-subtle">
          {auditTrail.length === 0 ? (
            <div className="p-3 text-center text-on-surface-variant text-body-sm">No audit records</div>
          ) : (
            auditTrail.map((log: any) => {
              const approved = log.kycStatus === "verified" || log.kycStatus === "completed";
              const dot = approved ? "bg-status-success" : "bg-status-danger";
              const shadow = approved ? "shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "shadow-[0_0_8px_rgba(239,68,68,0.6)]";
              return (
                <div key={log.id} className="p-2 border-b border-subtle flex gap-2.5">
                  <div className="mt-1 flex flex-col items-center">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot} ${shadow}`}></div>
                    <div className="w-px h-full bg-subtle mt-1"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`font-label-caps text-xs ${approved ? "text-on-background" : "text-status-danger"}`}>
                        {log.displayName || log.email?.slice(0, 16) || log.id?.slice(0, 8)} {approved ? "APPROVED" : "REJECTED"}
                      </p>
                      <span className="font-data-mono text-[9px] text-outline">{formatTimestamp(log.kycVerifiedAt || log.updatedAt || log.createdAt)}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5 italic">
                      {log.kycRejectionReason || `KYC ${approved ? "approved" : "rejected"} for ${log.kycTier ? `Tier ${log.kycTier}` : "user"}.`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-surface-container border border-border-subtle rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-status-danger">REJECT KYC</h3>
              <button onClick={() => setRejectModal(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Rejecting KYC for <span className="font-bold text-on-surface">{rejectModal.name}</span>
            </p>
            <div>
              <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1">REJECTION REASON</label>
              <textarea
                className="w-full bg-surface-deep border border-border-subtle rounded px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-status-danger focus:outline-none min-h-[100px] resize-y"
                placeholder="Reason for rejection (will be shown to user)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 border border-border-subtle py-2 rounded font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-bright transition-colors"
              >
                CANCEL
              </button>
              <button
                disabled={processing === rejectModal.uid}
                onClick={handleReject}
                className="flex-1 bg-status-danger text-on-primary py-2 rounded font-label-caps text-label-caps disabled:opacity-40"
              >
                {processing === rejectModal.uid ? "PROCESSING..." : "REJECT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {docViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDocViewer(null)}>
          <div className="bg-surface-container border border-border-subtle rounded-xl overflow-hidden w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">ID Document: {docViewer.name}</h3>
              <button onClick={() => setDocViewer(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <div className="p-4 bg-surface-deep flex items-center justify-center min-h-[300px]">
              <img src={docViewer.url} alt="ID Document" className="max-w-full max-h-[500px] object-contain rounded" />
            </div>
            <div className="p-3 border-t border-border-subtle flex justify-end">
              <a
                href={docViewer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-on-primary px-4 py-2 rounded font-label-caps text-label-caps flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span> OPEN FULL SIZE
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
