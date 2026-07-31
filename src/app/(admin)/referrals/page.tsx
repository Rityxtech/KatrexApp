"use client";

import { useReferrals, useTransactions, useUsers } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(0)}`;
}

export default function ReferralsPage() {
  const { data: referrals, loading } = useReferrals(100);
  const { data: txns } = useTransactions(500);
  const { data: users } = useUsers(500);

  const totalBonuses = referrals.reduce((s: number, r: any) => s + (r.bonusAmount || r.amount || 0), 0);
  const pendingPayouts = referrals.filter((r: any) => r.status === "pending");
  const conversionRate = users.length > 0 ? ((referrals.length / users.length) * 100).toFixed(1) : "0";

  const referralTree = referrals.slice(0, 5);

  const flaggedReferrals = referrals.filter((r: any) => r.status === "flagged" || r.fraudFlag);

  return (
    <div className="px-4 w-full space-y-max-gap pt-5">
      {/* Referral Stats */}
      <section className="grid grid-cols-2 gap-gutter">
        <div className="bg-surface-bright border border-border-subtle p-stack-base rounded relative overflow-hidden">
          <span className="font-label-caps text-on-surface-variant block mb-unit">TOTAL BONUSES PAID</span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-primary">{formatNaira(totalBonuses)}</span>
            <span className="text-status-success font-data-mono text-[10px]">{referrals.length} referrals</span>
          </div>
          <div className="h-6 w-full mt-stack-base">
            <svg className="h-full w-full stroke-primary fill-none stroke-[1.5]" viewBox="0 0 100 25">
              <path d="M0,20 Q10,15 20,18 T40,10 T60,15 T80,5 T100,8"></path>
            </svg>
          </div>
        </div>
        <div className="bg-surface-bright border border-border-subtle p-stack-base rounded relative overflow-hidden">
          <span className="font-label-caps text-on-surface-variant block mb-unit">CONVERSION RATE</span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-secondary">{conversionRate}%</span>
            <span className="font-data-mono text-[10px] text-on-surface-variant">{referrals.length}/{users.length}</span>
          </div>
          <div className="h-6 w-full mt-stack-base">
            <svg className="h-full w-full stroke-secondary fill-none stroke-[1.5]" viewBox="0 0 100 25">
              <path d="M0,5 Q10,10 20,8 T40,15 T60,10 T80,20 T100,18"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Program Settings */}
      <section className="space-y-stack-base">
        <div className="flex items-center gap-2 px-unit">
          <span className="material-symbols-outlined text-primary text-[18px]">settings_input_component</span>
          <h2 className="font-headline-md text-on-surface">Program Settings</h2>
        </div>
        <div className="bg-surface-bright border border-border-subtle p-container-padding rounded grid grid-cols-3 gap-gutter">
          <div className="space-y-unit">
            <label className="font-label-caps text-on-surface-variant">TIER 1 %</label>
            <input className="w-full bg-surface-container-lowest border-border-subtle text-on-surface font-data-mono text-body-md py-1 px-2 rounded focus:border-primary outline-none text-center" type="text" defaultValue="5%" />
          </div>
          <div className="space-y-unit">
            <label className="font-label-caps text-on-surface-variant">TIER 2 %</label>
            <input className="w-full bg-surface-container-lowest border-border-subtle text-on-surface font-data-mono text-body-md py-1 px-2 rounded focus:border-primary outline-none text-center" type="text" defaultValue="2%" />
          </div>
          <div className="space-y-unit">
            <label className="font-label-caps text-on-surface-variant">MIN PAYOUT</label>
            <input className="w-full bg-surface-container-lowest border-border-subtle text-on-surface font-data-mono text-body-md py-1 px-2 rounded focus:border-primary outline-none text-center" type="text" defaultValue={"\u20a65,000"} />
          </div>
        </div>
      </section>

      {/* Referral Tree */}
      <section className="space-y-stack-base">
        <div className="flex items-center gap-2 px-unit">
          <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
          <h2 className="font-headline-md text-on-surface">Active Hierarchy</h2>
        </div>
        <div className="bg-surface-bright border border-border-subtle p-container-padding rounded overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-max gap-4 py-2">
            {loading ? (
              <div className="text-on-surface-variant text-body-sm">Loading referral tree...</div>
            ) : referralTree.length === 0 ? (
              <div className="text-on-surface-variant text-body-sm">No referral data</div>
            ) : (
              referralTree.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-${i === 0 ? 12 : 10} h-${i === 0 ? 12 : 10} rounded ${i === 0 ? "bg-primary-container border-2 border-primary" : "bg-surface-container-high border border-border-subtle"} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    </div>
                    <span className="font-body-sm text-on-surface">{r.referrerUid?.slice(0, 12) || r.uid?.slice(0, 12) || "User"}</span>
                    {i === 0 && <span className="font-label-caps text-[8px] text-on-surface-variant">ORIGIN</span>}
                  </div>
                  {i < referralTree.length - 1 && <span className="material-symbols-outlined text-border-subtle">arrow_forward</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Payout Queue */}
      <section className="space-y-stack-base">
        <div className="flex items-center justify-between px-unit">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">list_alt</span>
            <h2 className="font-headline-md text-on-surface">Payout Queue</h2>
          </div>
          <span className="font-label-caps bg-primary-container text-primary px-2 py-0.5 rounded-full">{pendingPayouts.length} PENDING</span>
        </div>
        <div className="bg-surface-bright border border-border-subtle rounded overflow-hidden">
          {pendingPayouts.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant text-body-sm">No pending payouts</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-border-subtle">
                  <th className="p-2 font-label-caps text-on-surface-variant">USER</th>
                  <th className="p-2 font-label-caps text-on-surface-variant text-right">AMOUNT</th>
                  <th className="p-2 font-label-caps text-on-surface-variant">TYPE</th>
                  <th className="p-2 font-label-caps text-on-surface-variant text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body-sm">
                {pendingPayouts.map((r: any) => (
                  <tr key={r.id} className="hover:bg-primary-container transition-colors">
                    <td className="p-2 font-bold text-on-surface">{r.referrerUid?.slice(0, 16) || r.uid?.slice(0, 16) || "\u2014"}</td>
                    <td className="p-2 text-right font-data-mono">{formatNaira(r.bonusAmount || r.amount || 0)}</td>
                    <td className="p-2"><span className="text-[10px] uppercase font-bold text-secondary">{r.type || "referral"}</span></td>
                    <td className="p-2">
                      <div className="flex justify-center gap-2">
                        <span className="material-symbols-outlined text-status-success cursor-pointer hover:scale-110 transition-transform">check_circle</span>
                        <span className="material-symbols-outlined text-status-danger cursor-pointer hover:scale-110 transition-transform">cancel</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Fraud Detection */}
      <section className="space-y-stack-base">
        <div className="flex items-center gap-2 px-unit">
          <span className="material-symbols-outlined text-status-danger text-[18px]">security</span>
          <h2 className="font-headline-md text-on-surface">Fraud Detection</h2>
        </div>
        {flaggedReferrals.length === 0 ? (
          <div className="bg-status-success/10 border border-status-success/30 p-container-padding rounded flex gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-status-success text-[32px]">check_circle</span>
            </div>
            <div className="flex-1">
              <span className="font-headline-md text-status-success">ALL CLEAR</span>
              <p className="font-body-sm text-on-surface mt-1">No fraudulent referral patterns detected.</p>
            </div>
          </div>
        ) : (
          flaggedReferrals.map((r: any) => (
            <div key={r.id} className="bg-error-container/20 border border-status-danger p-container-padding rounded flex gap-3">
              <div className="flex-shrink-0">
                <span className="material-symbols-outlined text-status-danger text-[32px]">warning</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-unit">
                  <span className="font-headline-md text-on-error-container">HIGH RISK ALERT</span>
                  <span className="font-data-mono text-[10px] bg-status-danger/30 text-error px-1 rounded">FLAGGED</span>
                </div>
                <p className="font-body-sm text-on-error-container mb-stack-base">
                  Suspicious referral pattern detected: {r.referrerUid?.slice(0, 12) || r.uid?.slice(0, 12)}. Account under review.
                </p>
                <div className="flex gap-2">
                  <button className="bg-status-danger text-white font-label-caps px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all">FLAG USER</button>
                  <button className="bg-transparent border border-border-subtle text-on-surface font-label-caps px-3 py-1.5 rounded-lg">DISMISS</button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
