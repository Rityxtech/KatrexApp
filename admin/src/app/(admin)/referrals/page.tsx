"use client";

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useReferrals, useReferralConfig, useUsers } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(0)}`;
}

export default function ReferralsPage() {
  const { data: referrals, loading } = useReferrals(100);
  const { data: users } = useUsers(500);
  const { data: config } = useReferralConfig();

  const [bonusAmount, setBonusAmount] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const totalBonuses = referrals
    .filter((r: any) => r.status === "qualified" || r.status === "claimed")
    .reduce((s: number, r: any) => s + (r.bonusAmount || 0), 0);
  const pendingPayouts = referrals.filter((r: any) => r.status === "pending");
  const conversionRate = users.length > 0 ? ((referrals.length / users.length) * 100).toFixed(1) : "0";

  const referralTree = referrals.slice(0, 5);
  const flaggedReferrals = referrals.filter((r: any) => r.status === "flagged");

  const functions = getFunctions();

  const handleSaveConfig = async () => {
    const amount = parseFloat(bonusAmount);
    if (isNaN(amount) || amount < 0) return;
    setSavingConfig(true);
    try {
      await httpsCallable(functions, "updateReferralConfig")({ bonusAmount: amount });
      setBonusAmount("");
    } catch (e) {
      console.error("Failed to save config:", e);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleProcessPayout = async (referralId: string, action: "approve" | "reject") => {
    setProcessingId(referralId);
    try {
      await httpsCallable(functions, "processReferralPayout")({ referralId, action });
    } catch (e) {
      console.error("Failed to process payout:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFlagReferral = async (referralId: string, flagged: boolean) => {
    try {
      await httpsCallable(functions, "flagReferral")({ referralId, flagged });
    } catch (e) {
      console.error("Failed to flag referral:", e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3.5">
      {/* Referral Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant font-bold block mb-0.5">TOTAL BONUSES PAID</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-headline-lg text-2xl font-bold font-data-mono text-primary">{formatNaira(totalBonuses)}</span>
              <span className="text-status-success font-data-mono text-xs font-bold">{referrals.length} referrals</span>
            </div>
          </div>
          <div className="h-6 w-full mt-2">
            <svg className="h-full w-full stroke-primary fill-none stroke-[2]" viewBox="0 0 100 25">
              <path d="M0,20 Q10,15 20,18 T40,10 T60,15 T80,5 T100,8"></path>
            </svg>
          </div>
        </div>
        <div className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant font-bold block mb-0.5">CONVERSION RATE</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-headline-lg text-2xl font-bold font-data-mono text-secondary">{conversionRate}%</span>
              <span className="font-data-mono text-xs text-on-surface-variant">{referrals.length}/{users.length} converted</span>
            </div>
          </div>
          <div className="h-6 w-full mt-2">
            <svg className="h-full w-full stroke-secondary fill-none stroke-[2]" viewBox="0 0 100 25">
              <path d="M0,5 Q10,10 20,8 T40,15 T60,10 T80,20 T100,18"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Program Settings */}
      <section className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">settings_input_component</span>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Program Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-surface-container-low p-3 rounded-xl border border-subtle">
          <div className="space-y-1.5">
            <label className="font-label-caps text-[10px] text-on-surface-variant font-bold block">BONUS PER REFERRAL</label>
            <div className="flex gap-1.5">
              <input
                className="flex-1 bg-surface-deep border border-subtle text-on-surface font-data-mono text-xs py-1.5 px-2.5 rounded-lg focus:border-primary outline-none"
                type="number"
                placeholder={config?.bonusAmount ? String(config.bonusAmount) : "1000"}
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig || !bonusAmount}
                className="bg-primary text-white font-label-caps text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
              >
                {savingConfig ? "..." : "SAVE"}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-label-caps text-[10px] text-on-surface-variant font-bold block">PROGRAM STATUS</label>
            <div className="flex items-center gap-2.5 py-0.5">
              <span className={`font-label-caps text-[10px] font-bold px-2.5 py-0.5 rounded-full ${config?.active !== false ? "bg-status-success/20 text-status-success" : "bg-status-danger/20 text-status-danger"}`}>
                {config?.active !== false ? "ACTIVE" : "PAUSED"}
              </span>
              <button
                onClick={async () => {
                  try {
                    await httpsCallable(functions, "updateReferralConfig")({ active: config?.active === false });
                  } catch (e) { console.error(e); }
                }}
                className="text-xs font-bold text-secondary hover:underline"
              >
                {config?.active !== false ? "Pause Program" : "Resume Program"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Tree */}
      <section className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Active Hierarchy</h2>
        </div>
        <div className="bg-surface-container-low border border-subtle p-3 rounded-xl overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-max gap-3 py-1">
            {loading ? (
              <div className="text-on-surface-variant text-body-sm">Loading referral tree...</div>
            ) : referralTree.length === 0 ? (
              <div className="text-on-surface-variant text-body-sm">No referral data</div>
            ) : (
              referralTree.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-xl ${i === 0 ? "bg-primary-container border-2 border-primary" : "bg-surface-container-high border border-subtle"} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                    </div>
                    <span className="font-body-sm text-xs font-semibold text-on-surface">{r.referrerName?.slice(0, 12) || r.referrerUid?.slice(0, 12) || "User"}</span>
                    {i === 0 && <span className="font-label-caps text-[9px] text-primary font-bold">REFERRER</span>}
                  </div>
                  {i < referralTree.length - 1 && <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">arrow_forward</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Payout Queue */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-subtle bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">list_alt</span>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Payout Queue</h2>
          </div>
          <span className="font-label-caps bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold">{pendingPayouts.length} PENDING</span>
        </div>
        <div className="overflow-x-auto">
          {pendingPayouts.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-body-sm">No pending payouts</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">REFERRER</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">REFERRED</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle text-right">BONUS</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle font-body-sm">
                {pendingPayouts.map((r: any) => (
                  <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-3 py-2 font-bold text-xs text-on-surface">{r.referrerName || r.referrerUid?.slice(0, 16) || "\u2014"}</td>
                    <td className="px-3 py-2 text-xs text-on-surface-variant">{r.referredName || r.referredUid?.slice(0, 16) || "\u2014"}</td>
                    <td className="px-3 py-2 text-right font-data-mono text-xs font-bold text-secondary">{formatNaira(config?.bonusAmount || 1000)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleProcessPayout(r.id, "approve")}
                          disabled={processingId === r.id}
                          className="material-symbols-outlined text-status-success cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 text-[18px]"
                          title="Approve"
                        >
                          {processingId === r.id ? "hourglass_top" : "check_circle"}
                        </button>
                        <button
                          onClick={() => handleProcessPayout(r.id, "reject")}
                          disabled={processingId === r.id}
                          className="material-symbols-outlined text-status-danger cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 text-[18px]"
                          title="Reject"
                        >
                          cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* All Referrals */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-subtle bg-surface-container-low">
          <span className="material-symbols-outlined text-primary text-[20px]">history</span>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">All Referrals</h2>
        </div>
        <div className="overflow-x-auto">
          {referrals.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-body-sm">No referrals yet</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">REFERRER</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">REFERRED</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">STATUS</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle text-right">BONUS</th>
                  <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle font-body-sm">
                {referrals.map((r: any) => {
                  const statusColor = r.status === "qualified" ? "text-status-success" : r.status === "claimed" ? "text-on-surface-variant" : r.status === "flagged" ? "text-status-danger" : "text-secondary";
                  const created = r.createdAt?.toDate ? r.createdAt.toDate() : null;
                  return (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-3 py-2 font-bold text-xs text-on-surface">{r.referrerName || r.referrerUid?.slice(0, 16) || "\u2014"}</td>
                      <td className="px-3 py-2 text-xs text-on-surface-variant">{r.referredName || r.referredUid?.slice(0, 16) || "\u2014"}</td>
                      <td className="px-3 py-2"><span className={`text-[10px] uppercase font-bold ${statusColor}`}>{r.status}</span></td>
                      <td className="px-3 py-2 text-right font-data-mono text-xs font-bold">{formatNaira(r.bonusAmount || 0)}</td>
                      <td className="px-3 py-2 text-on-surface-variant text-[10px]">{created ? `${created.getDate()}/${created.getMonth() + 1}/${created.getFullYear()}` : "\u2014"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Fraud Detection */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-status-danger text-[20px]">security</span>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Fraud Detection</h2>
        </div>
        {flaggedReferrals.length === 0 ? (
          <div className="bg-status-success/10 border border-status-success/30 p-3.5 rounded-xl flex gap-3 items-center">
            <span className="material-symbols-outlined text-status-success text-[30px]">check_circle</span>
            <div>
              <span className="font-headline-md font-bold text-status-success text-sm">ALL CLEAR</span>
              <p className="font-body-sm text-xs text-on-surface mt-0.5">No fraudulent referral patterns detected.</p>
            </div>
          </div>
        ) : (
          flaggedReferrals.map((r: any) => (
            <div key={r.id} className="bg-status-danger/10 border border-status-danger/30 p-3.5 rounded-xl flex gap-3">
              <span className="material-symbols-outlined text-status-danger text-[30px]">warning</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline-md font-bold text-status-danger text-sm">HIGH RISK ALERT</span>
                  <span className="font-data-mono text-[10px] bg-status-danger/30 text-status-danger px-1.5 py-0.5 rounded font-bold">FLAGGED</span>
                </div>
                <p className="font-body-sm text-xs text-on-surface mb-2">
                  Suspicious referral: {r.referrerName || r.referrerUid?.slice(0, 12)} referred {r.referredName || r.referredUid?.slice(0, 12)}. Account under review.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFlagReferral(r.id, false)}
                    className="bg-transparent border border-subtle text-on-surface font-label-caps text-xs font-bold px-4 py-2 rounded-lg hover:bg-surface-container transition-all"
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
