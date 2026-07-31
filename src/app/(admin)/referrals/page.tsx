export default function ReferralsPage() {
  return (
    <div className="px-4 w-full space-y-max-gap pt-5">
      {/* Section 5: Referral Stats */}
      <section className="grid grid-cols-2 gap-gutter">
        <div className="bg-surface-bright border border-border-subtle p-stack-base rounded relative overflow-hidden">
          <span className="font-label-caps text-on-surface-variant block mb-unit">TOTAL BONUSES PAID</span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-primary">&#8358;4.2M</span>
            <span className="text-status-success font-data-mono text-[10px]">+12.5%</span>
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
            <span className="font-headline-lg text-secondary">18.4%</span>
            <span className="text-status-warning font-data-mono text-[10px]">-2.1%</span>
          </div>
          <div className="h-6 w-full mt-stack-base">
            <svg className="h-full w-full stroke-secondary fill-none stroke-[1.5]" viewBox="0 0 100 25">
              <path d="M0,5 Q10,10 20,8 T40,15 T60,10 T80,20 T100,18"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Section 1: Program Settings */}
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
            <input className="w-full bg-surface-container-lowest border-border-subtle text-on-surface font-data-mono text-body-md py-1 px-2 rounded focus:border-primary outline-none text-center" type="text" defaultValue="&#8358;5,000" />
          </div>
        </div>
      </section>

      {/* Section 2: Referral Tree Snippet */}
      <section className="space-y-stack-base">
        <div className="flex items-center gap-2 px-unit">
          <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
          <h2 className="font-headline-md text-on-surface">Active Hierarchy</h2>
        </div>
        <div className="bg-surface-bright border border-border-subtle p-container-padding rounded overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-max gap-4 py-2">
            <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="w-12 h-12 rounded bg-primary-container border-2 border-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <span className="font-body-sm font-bold text-primary">@admin_ade</span>
              <span className="font-label-caps text-[8px] text-on-surface-variant">ORIGIN</span>
            </div>
            <span className="material-symbols-outlined text-border-subtle">arrow_forward</span>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded bg-surface-container-high border border-border-subtle flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
              <span className="font-body-sm text-on-surface">@user_01</span>
            </div>
            <span className="material-symbols-outlined text-border-subtle">arrow_forward</span>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded bg-surface-container-high border border-border-subtle flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
              <span className="font-body-sm text-on-surface">@user_02</span>
            </div>
            <span className="material-symbols-outlined text-border-subtle">arrow_forward</span>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <div className="w-8 h-8 rounded-full border border-dashed border-border-subtle flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">add</span>
              </div>
              <span className="font-label-caps text-[8px]">PENDING</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Commission Payout Queue */}
      <section className="space-y-stack-base">
        <div className="flex items-center justify-between px-unit">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">list_alt</span>
            <h2 className="font-headline-md text-on-surface">Payout Queue</h2>
          </div>
          <span className="font-label-caps bg-primary-container text-primary px-2 py-0.5 rounded-full">12 PENDING</span>
        </div>
        <div className="bg-surface-bright border border-border-subtle rounded overflow-hidden">
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
              {[
                { user: "@crypto_king", amount: "\u20a612,500", type: "P2P", typeColor: "text-secondary" },
                { user: "@lola_vibe", amount: "\u20a65,200", type: "Giftcard", typeColor: "text-tertiary" },
                { user: "@tech_bro", amount: "\u20a645,000", type: "P2P", typeColor: "text-secondary" },
              ].map((r) => (
                <tr key={r.user} className="hover:bg-primary-container transition-colors">
                  <td className="p-2 font-bold text-on-surface">{r.user}</td>
                  <td className="p-2 text-right font-data-mono">{r.amount}</td>
                  <td className="p-2"><span className={`text-[10px] uppercase font-bold ${r.typeColor}`}>{r.type}</span></td>
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
        </div>
      </section>

      {/* Section 4: Fraud Detection */}
      <section className="space-y-stack-base">
        <div className="flex items-center gap-2 px-unit">
          <span className="material-symbols-outlined text-status-danger text-[18px]">security</span>
          <h2 className="font-headline-md text-on-surface">Fraud Detection</h2>
        </div>
        <div className="bg-error-container/20 border border-status-danger p-container-padding rounded flex gap-3">
          <div className="flex-shrink-0">
            <span className="material-symbols-outlined text-status-danger text-[32px]">warning</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-unit">
              <span className="font-headline-md text-on-error-container">HIGH RISK ALERT</span>
              <span className="font-data-mono text-[10px] bg-status-danger/30 text-error px-1 rounded">MATCH: 98%</span>
            </div>
            <p className="font-body-sm text-on-error-container mb-stack-base">Circular referral chain detected: @user_X4 -&gt; @user_Y9 -&gt; @user_X4. Account activity suspended.</p>
            <div className="flex gap-2">
              <button className="bg-status-danger text-white font-label-caps px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all">FLAG USER</button>
              <button className="bg-transparent border border-border-subtle text-on-surface font-label-caps px-3 py-1.5 rounded-lg">DISMISS</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
