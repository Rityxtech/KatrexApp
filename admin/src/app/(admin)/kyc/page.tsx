"use client";

import { useState, useCallback } from "react";
import { useKycQueue, useUsers } from "@/hooks/useAdminData";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApps } from "firebase/app";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, setDoc, serverTimestamp } from "firebase/firestore";

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
  if (!date) return "—";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatFullDate(date: any) {
  if (!date) return "—";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function KycPage() {
  const { data: pendingKyc, loading } = useKycQueue();
  const { data: allUsers } = useUsers(1000);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<{ uid: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [requestInfoModal, setRequestInfoModal] = useState<{ uid: string; name: string } | null>(null);
  const [requestInfoMsg, setRequestInfoMsg] = useState("");
  const [docViewer, setDocViewer] = useState<{ url: string; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Copied ${field}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const verifiedUsers = allUsers.filter((u: any) => u.kycStatus === "verified" || u.kycStatus === "completed");
  const rejectedUsers = allUsers.filter((u: any) => u.kycStatus === "rejected");
  const rejectionRate = allUsers.length > 0 ? ((rejectedUsers.length / allUsers.length) * 100).toFixed(0) : "0";

  const auditTrail = allUsers
    .filter((u: any) => u.kycStatus === "verified" || u.kycStatus === "rejected" || u.kycStatus === "completed")
    .slice(0, 10);

  async function handleApprove(uid: string) {
    setProcessing(uid);
    try {
      try {
        const functions = getFunctions(getApps()[0], "us-central1");
        const adminApi = httpsCallable(functions, "adminApi");
        await adminApi({ action: "reviewKyc", uid, decision: "approve" });
      } catch (_) {
        // Direct Firestore fallback
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          kycStatus: "verified",
          kycTier: 1,
          kycReviewedAt: serverTimestamp(),
          kycRejectionReason: null,
          updatedAt: serverTimestamp(),
        });
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          uid,
          type: "general",
          title: "Identity Verified ✓",
          body: "Your identity has been verified. Enjoy higher limits and full access to your account.",
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
      showToast("KYC approved successfully");
      if (selectedUser?.id === uid) setSelectedUser(null);
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    const uid = rejectModal.uid;
    setProcessing(uid);
    try {
      const reason = rejectReason.trim() || "Your submission could not be verified. Please check your details and try again.";
      try {
        const functions = getFunctions(getApps()[0], "us-central1");
        const adminApi = httpsCallable(functions, "adminApi");
        await adminApi({
          action: "reviewKyc",
          uid,
          decision: "reject",
          reason,
        });
      } catch (_) {
        // Direct Firestore fallback
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          kycStatus: "rejected",
          kycTier: 0,
          kycReviewedAt: serverTimestamp(),
          kycRejectionReason: reason,
          updatedAt: serverTimestamp(),
        });
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          uid,
          type: "general",
          title: "KYC Rejected",
          body: reason,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
      showToast("KYC rejected");
      setRejectModal(null);
      setRejectReason("");
      if (selectedUser?.id === uid) setSelectedUser(null);
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleSendRequestInfo() {
    if (!requestInfoModal) return;
    const uid = requestInfoModal.uid;
    const message = requestInfoMsg.trim() || "Please provide additional documents or clarification to complete your KYC verification.";
    setProcessing(uid);
    try {
      // 1. Create in-app Notification for user
      const notifRef = doc(collection(db, "notifications"));
      await setDoc(notifRef, {
        id: notifRef.id,
        uid,
        type: "general",
        title: "Additional KYC Information Required",
        body: message,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // 2. Update user profile note
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        kycAdminNote: message,
        updatedAt: serverTimestamp(),
      });

      // 3. Trigger Push Notification via adminApi if available
      try {
        const functions = getFunctions(getApps()[0], "us-central1");
        const adminApi = httpsCallable(functions, "adminApi");
        await adminApi({
          action: "sendPushNotification",
          title: "Additional KYC Info Required",
          body: message,
          targetType: "individual",
          targetUid: uid,
        });
      } catch (_) {}

      showToast("Document/Info request sent to user");
      setRequestInfoModal(null);
      setRequestInfoMsg("");
    } catch (err: any) {
      showToast(`Failed to send request: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="w-full flex flex-col gap-3.5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3.5 py-2 rounded-xl shadow-lg font-body-sm text-xs text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">info</span>
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
            {pendingKyc.map((user: any) => {
              const isProcessing = processing === user.id;
              const hasDoc = Boolean(user.idDocumentUrl || user.kycDocumentUrl || user.idUrl);
              const docUrl = user.idDocumentUrl || user.kycDocumentUrl || user.idUrl;
              return (
                <div key={user.id} className="bg-surface-container-low border-l-4 border-l-secondary border-y border-r border-subtle rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-surface-container-high rounded-xl border border-subtle flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                      </div>
                      <div>
                        <p className="font-body-md text-sm font-bold text-on-surface">{user.fullName || user.displayName || user.email || user.id?.slice(0, 12)}</p>
                        <p className="font-body-sm text-[10px] text-on-surface-variant">{user.email} • Ref: KYC-{user.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="bg-status-warning/10 text-status-warning border border-status-warning/20 font-label-caps font-bold px-2 py-0.5 rounded-full text-[10px]">AWAITING REVIEW</span>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">{timeAgo(user.kycSubmittedAt || user.createdAt)}</span>
                    </div>
                  </div>

                  {/* KYC Submitted Details Preview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-deep/60 p-2.5 rounded-lg border border-subtle">
                    <div className="flex flex-col px-1.5">
                      <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">BVN</span>
                      <span className="font-data-mono text-primary text-xs font-bold truncate">{user.bvn || "—"}</span>
                    </div>
                    <div className="flex flex-col px-1.5">
                      <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">PHONE</span>
                      <span className="font-data-mono text-on-surface text-xs font-bold truncate">{user.phone || "—"}</span>
                    </div>
                    <div className="flex flex-col px-1.5">
                      <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">DOB / GENDER</span>
                      <span className="font-data-mono text-on-surface text-xs font-bold truncate">{user.dateOfBirth || "—"} {user.gender ? `(${user.gender.toUpperCase()})` : ""}</span>
                    </div>
                    <div className="flex flex-col px-1.5">
                      <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">DOCUMENT</span>
                      <div className="flex items-center gap-1">
                        <span className="font-data-mono text-xs font-bold text-secondary">{hasDoc ? "UPLOADED" : "BVN DATA"}</span>
                        {hasDoc && (
                          <button
                            onClick={() => setDocViewer({ url: docUrl, name: user.fullName || user.displayName || user.id?.slice(0, 12) })}
                            className="material-symbols-outlined text-primary text-[16px] hover:text-secondary transition-colors"
                            title="View document"
                          >
                            visibility
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap justify-between items-center gap-2 pt-1 border-t border-subtle">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-3 py-1.5 bg-surface-container-high border border-subtle font-label-caps text-xs font-bold rounded-lg hover:bg-surface-bright text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      VIEW DETAILS
                    </button>
                    <div className="flex gap-2">
                      <button
                        disabled={isProcessing}
                        onClick={() => {
                          setRequestInfoModal({ uid: user.id, name: user.fullName || user.displayName || user.email || user.id?.slice(0, 8) });
                          setRequestInfoMsg("Please provide additional documents or clarification to complete your KYC verification.");
                        }}
                        className="px-3 py-1.5 border border-subtle font-label-caps text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-40"
                      >
                        REQUEST INFO
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => setRejectModal({ uid: user.id, name: user.fullName || user.displayName || user.email || user.id?.slice(0, 8) })}
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
                        {log.fullName || log.displayName || log.email?.slice(0, 16) || log.id?.slice(0, 8)} {approved ? "APPROVED" : "REJECTED"}
                      </p>
                      <span className="font-data-mono text-[9px] text-outline">{formatTimestamp(log.kycReviewedAt || log.kycVerifiedAt || log.updatedAt || log.createdAt)}</span>
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

      {/* Detailed KYC Submission Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-surface-container border border-border-subtle rounded-2xl p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">person_pin</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-base text-on-surface font-bold">KYC Submission Details</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant">{selectedUser.fullName || selectedUser.displayName || "User"} • ID: {selectedUser.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-surface-deep p-3 rounded-xl border border-subtle flex flex-col justify-between">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">FULL NAME</span>
                <p className="font-body-md text-sm font-bold text-on-surface mt-1">{selectedUser.fullName || selectedUser.displayName || "—"}</p>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle flex flex-col justify-between">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">EMAIL ADDRESS</span>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-body-md text-xs font-bold text-on-surface truncate">{selectedUser.email || "—"}</p>
                  {selectedUser.email && (
                    <button onClick={() => copyToClipboard(selectedUser.email, "Email")} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-[14px]">content_copy</button>
                  )}
                </div>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle flex flex-col justify-between">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">BANK VERIFICATION NUMBER (BVN)</span>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-data-mono text-sm font-bold text-primary">{selectedUser.bvn || "—"}</p>
                  {selectedUser.bvn && (
                    <button onClick={() => copyToClipboard(selectedUser.bvn, "BVN")} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-[14px]">content_copy</button>
                  )}
                </div>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle flex flex-col justify-between">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">PHONE NUMBER</span>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-data-mono text-xs font-bold text-on-surface">{selectedUser.phone || "—"}</p>
                  {selectedUser.phone && (
                    <button onClick={() => copyToClipboard(selectedUser.phone, "Phone")} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-[14px]">content_copy</button>
                  )}
                </div>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle flex flex-col justify-between">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">DATE OF BIRTH</span>
                <p className="font-data-mono text-xs font-bold text-on-surface mt-1">{selectedUser.dateOfBirth || "—"}</p>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle flex flex-col justify-between">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">GENDER</span>
                <p className="font-body-md text-xs font-bold text-on-surface uppercase mt-1">{selectedUser.gender || "—"}</p>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">RESIDENTIAL ADDRESS</span>
                  {selectedUser.address && (
                    <button onClick={() => copyToClipboard(selectedUser.address, "Address")} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-[14px]">content_copy</button>
                  )}
                </div>
                <p className="font-body-md text-xs text-on-surface mt-1 leading-relaxed">{selectedUser.address || "—"}</p>
              </div>

              <div className="bg-surface-deep p-3 rounded-xl border border-subtle md:col-span-2">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">SUBMITTED ON</span>
                <p className="font-data-mono text-xs text-on-surface-variant mt-1">{formatFullDate(selectedUser.kycSubmittedAt || selectedUser.updatedAt || selectedUser.createdAt)}</p>
              </div>

              {(selectedUser.idDocumentUrl || selectedUser.kycDocumentUrl || selectedUser.idUrl) && (
                <div className="bg-surface-deep p-3 rounded-xl border border-subtle md:col-span-2">
                  <span className="font-label-caps text-[9px] text-on-surface-variant font-bold block mb-2">UPLOADED DOCUMENT</span>
                  <div className="relative group cursor-pointer rounded-lg overflow-hidden border border-subtle max-h-48 flex items-center justify-center bg-black/40"
                    onClick={() => setDocViewer({ url: selectedUser.idDocumentUrl || selectedUser.kycDocumentUrl || selectedUser.idUrl, name: selectedUser.fullName || selectedUser.displayName || selectedUser.id })}>
                    <img src={selectedUser.idDocumentUrl || selectedUser.kycDocumentUrl || selectedUser.idUrl} alt="ID Document" className="max-h-48 object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="bg-primary text-on-primary px-3 py-1 rounded text-xs font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">fullscreen</span> Open Full Size</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex gap-2 pt-3 border-t border-subtle">
              <button
                disabled={processing === selectedUser.id}
                onClick={() => {
                  setRequestInfoModal({ uid: selectedUser.id, name: selectedUser.fullName || selectedUser.displayName || selectedUser.id });
                  setRequestInfoMsg("Please provide additional documents or clarification to complete your KYC verification.");
                }}
                className="flex-1 border border-border-subtle py-2.5 rounded-xl font-label-caps text-xs font-bold text-on-surface-variant hover:bg-surface-bright transition-colors"
              >
                REQUEST INFO
              </button>
              <button
                disabled={processing === selectedUser.id}
                onClick={() => setRejectModal({ uid: selectedUser.id, name: selectedUser.fullName || selectedUser.displayName || selectedUser.id })}
                className="flex-1 bg-status-danger/10 text-status-danger py-2.5 rounded-xl font-label-caps text-xs font-bold hover:bg-status-danger/20 transition-colors"
              >
                REJECT
              </button>
              <button
                disabled={processing === selectedUser.id}
                onClick={() => handleApprove(selectedUser.id)}
                className="flex-1 bg-status-success text-on-primary py-2.5 rounded-xl font-label-caps text-xs font-bold hover:opacity-90 transition-opacity"
              >
                {processing === selectedUser.id ? "PROCESSING..." : "APPROVE KYC"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {requestInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRequestInfoModal(null)}>
          <div className="bg-surface-container border border-border-subtle rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-base text-primary font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">chat</span>
                Request Information
              </h3>
              <button onClick={() => setRequestInfoModal(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Sending information request to <span className="font-bold text-on-surface">{requestInfoModal.name}</span>. This will send an in-app notification and push alert.
            </p>

            <div className="space-y-1.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant block font-bold">QUICK TEMPLATES</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Please upload a clear photo of your government-issued ID.",
                  "Please provide proof of residential address (utility bill).",
                  "BVN name does not match profile name. Please clarify.",
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRequestInfoMsg(tmpl)}
                    className="text-[11px] bg-surface-deep border border-subtle rounded px-2.5 py-1 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors text-left"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1 font-bold">MESSAGE TO USER</label>
              <textarea
                className="w-full bg-surface-deep border border-border-subtle rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface focus:ring-1 focus:ring-primary focus:outline-none min-h-[100px] resize-y"
                placeholder="Specify what details or documents the user needs to provide..."
                value={requestInfoMsg}
                onChange={(e) => setRequestInfoMsg(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRequestInfoModal(null)}
                className="flex-1 border border-border-subtle py-2.5 rounded-xl font-label-caps text-xs font-bold text-on-surface-variant hover:bg-surface-bright transition-colors"
              >
                CANCEL
              </button>
              <button
                disabled={processing === requestInfoModal.uid}
                onClick={handleSendRequestInfo}
                className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-label-caps text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {processing === requestInfoModal.uid ? "SENDING..." : "SEND REQUEST"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-surface-container border border-border-subtle rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-base text-status-danger font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-status-danger">cancel</span>
                Reject KYC Verification
              </h3>
              <button onClick={() => setRejectModal(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Rejecting KYC for <span className="font-bold text-on-surface">{rejectModal.name}</span>
            </p>
            <div>
              <label className="font-label-caps text-[9px] text-on-surface-variant block mb-1 font-bold">REJECTION REASON</label>
              <textarea
                className="w-full bg-surface-deep border border-border-subtle rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface focus:ring-1 focus:ring-status-danger focus:outline-none min-h-[100px] resize-y"
                placeholder="Reason for rejection (will be shown in user's app and notifications)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 border border-border-subtle py-2.5 rounded-xl font-label-caps text-xs font-bold text-on-surface-variant hover:bg-surface-bright transition-colors"
              >
                CANCEL
              </button>
              <button
                disabled={processing === rejectModal.uid}
                onClick={handleReject}
                className="flex-1 bg-status-danger text-on-primary py-2.5 rounded-xl font-label-caps text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {processing === rejectModal.uid ? "PROCESSING..." : "CONFIRM REJECT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {docViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setDocViewer(null)}>
          <div className="bg-surface-container border border-border-subtle rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3.5 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-headline-md text-sm text-on-surface font-bold">ID Document: {docViewer.name}</h3>
              <button onClick={() => setDocViewer(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>
            <div className="p-4 bg-surface-deep flex items-center justify-center min-h-[300px]">
              <img src={docViewer.url} alt="ID Document" className="max-w-full max-h-[500px] object-contain rounded-lg" />
            </div>
            <div className="p-3 border-t border-border-subtle flex justify-end">
              <a
                href={docViewer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-xs font-bold flex items-center gap-2"
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
