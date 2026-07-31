export default function P2PPage() {
  return (
    <div className="p-4 w-full">
      <div className="max-w-[1600px] mx-auto space-y-5 pb-8">
        {/* Hero Stats & Dispute Center */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Escrow Card */}
          <div className="bg-surface-bright border border-subtle p-4 rounded-lg flex flex-col justify-between">
            <div>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Funds in Escrow</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="font-headline-lg text-headline-lg text-secondary">&#8358;14,250,000</h2>
                <span className="font-data-mono text-[10px] text-on-surface-variant">($12,450.00)</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-secondary text-on-secondary px-3 py-1.5 rounded font-label-caps text-label-caps font-bold hover:opacity-90 transition-opacity">RELEASE MANUAL</button>
              <button className="flex-1 border border-subtle text-on-surface px-3 py-1.5 rounded font-label-caps text-label-caps font-bold hover:bg-surface-container transition-colors">REFUND ALL</button>
            </div>
          </div>

          {/* Dispute Center Card */}
          <div className="md:col-span-2 bg-surface-container-high border-l-4 border-l-status-danger border-y border-r border-subtle p-4 rounded-lg relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-status-danger" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                  <span className="font-headline-md text-headline-md text-on-surface">Open Disputes</span>
                  <span className="bg-status-danger text-white px-2 py-0.5 rounded-full text-[10px] font-bold">04 URGENT</span>
                </div>
                <p className="font-body-sm text-on-surface-variant mt-1">ID: #DSP-9921 &bull; buyer_prime vs seller_top &bull; Asset: TikTok Account</p>
              </div>
              <button className="bg-status-danger text-white px-4 py-2 rounded font-headline-md text-headline-md hover:brightness-110 transition-all shadow-lg">RESOLVE NOW</button>
            </div>
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'wght' 700" }}>gavel</span>
            </div>
          </div>

          {/* Active Listings Summary */}
          <div className="bg-surface-bright border border-subtle p-4 rounded-lg">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Market Liquidity</span>
            <div className="h-16 mt-2 flex items-end gap-1">
              {[
                { o: "opacity-20", h: "40%" }, { o: "opacity-40", h: "60%" },
                { o: "opacity-30", h: "50%" }, { o: "opacity-70", h: "85%" },
                { o: "", h: "100%" }, { o: "opacity-60", h: "70%" }, { o: "opacity-80", h: "90%" },
              ].map((b, i) => (
                <div key={i} className={`flex-1 bg-secondary ${b.o} rounded-t-sm`} style={{ height: b.h }}></div>
              ))}
            </div>
            <div className="flex justify-between mt-2 font-data-mono text-[10px] text-on-surface-variant">
              <span>L-7D</span>
              <span>CURRENT</span>
            </div>
          </div>
        </div>

        {/* Bento Grid Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left: Listing Approvals + Trade Ledger */}
          <div className="xl:col-span-8 space-y-3">
            {/* Listing Approvals */}
            <div>
              <div className="flex justify-between items-center px-1">
                <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">pending_actions</span>
                  Queue: Listing Approvals
                </h3>
                <span className="font-label-caps text-label-caps text-on-surface-variant">12 PENDING</span>
              </div>
              <div className="flex overflow-x-auto gap-3 pb-2">
                {[
                  { icon: "photo_camera", name: "@lux_vibe_travel", meta: "124.5k Followers", metaIcon: "group", niche: "Travel/Luxury", price: "\u20a6850,000" },
                  { icon: "movie", name: "tech_unboxed_ng", meta: "45.2k Followers", metaIcon: "group", niche: "Technology", price: "\u20a6320,000" },
                  { icon: "language", name: "cryptodaily.xyz", meta: "DAU: 1,200", metaIcon: "ads_click", niche: "Domain/Blog", price: "\u20a62,100,000" },
                ].map((c) => (
                  <div key={c.name} className="min-w-[280px] bg-surface-bright border border-subtle p-3 rounded-lg hover:border-secondary transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface-container border border-subtle flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">{c.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-body-md font-bold text-on-surface truncate">{c.name}</h4>
                        <div className="flex items-center gap-1 text-on-surface-variant text-[10px] font-data-mono">
                          <span className="material-symbols-outlined text-[12px]">{c.metaIcon}</span> {c.meta}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-y border-subtle/50 py-2 my-2">
                      <div>
                        <span className="block font-label-caps text-on-surface-variant">NICHE</span>
                        <span className="font-body-sm font-medium">{c.niche}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-label-caps text-on-surface-variant">PRICE</span>
                        <span className="font-body-sm font-bold text-secondary">{c.price}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-status-success/10 text-status-success border border-status-success/20 py-1 rounded hover:bg-status-success/20 transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        <span className="font-label-caps">Approve</span>
                      </button>
                      <button className="flex-1 bg-status-danger/10 text-status-danger border border-status-danger/20 py-1 rounded hover:bg-status-danger/20 transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        <span className="font-label-caps">Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* P2P Trade Ledger */}
            <div className="bg-surface-bright border border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-subtle flex justify-between items-center bg-surface-container/30">
                <h3 className="font-headline-md text-headline-md text-on-surface">P2P Trade Ledger</h3>
                <div className="flex gap-2">
                  <input className="bg-surface-container border border-subtle rounded px-3 py-1 text-body-sm focus:outline-none focus:border-secondary w-48" placeholder="Search trades..." type="text" />
                  <button className="bg-surface-container border border-subtle px-2 rounded hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body-sm border-collapse">
                  <thead className="bg-surface-container-low text-on-surface-variant font-label-caps text-[10px] border-b border-subtle">
                    <tr>
                      <th className="px-4 py-2 font-bold">TRADE ID</th>
                      <th className="px-4 py-2 font-bold">PARTIES</th>
                      <th className="px-4 py-2 font-bold">ASSET/ITEM</th>
                      <th className="px-4 py-2 font-bold">AMOUNT</th>
                      <th className="px-4 py-2 font-bold">TRADE STATUS</th>
                      <th className="px-4 py-2 font-bold">ESCROW</th>
                      <th className="px-4 py-2 font-bold text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {[
                      { id: "#TX-88219", buyer: "@alex_buyer", seller: "@mega_seller", asset: "IG Account: @fashion_nova_backup", amount: "\u20a6450,000", status: "Awaiting Approval", statusColor: "text-status-warning", dot: "bg-status-warning", escrow: "LOCKED", escrowClass: "bg-surface-container border border-subtle", rowClass: "" },
                      { id: "#TX-88218", buyer: "@crypto_king", seller: "@niche_market", asset: "Telegram Channel (12k)", amount: "\u20a6120,000", status: "Completed", statusColor: "text-status-success", dot: "bg-status-success", escrow: "RELEASED", escrowClass: "bg-status-success/10 text-status-success border border-status-success/20", rowClass: "" },
                      { id: "#TX-88217", buyer: "@scam_hunter", seller: "@bad_actor", asset: "Twitter Handle: @katrex_test", amount: "\u20a625,000", status: "Disputed", statusColor: "text-status-danger", dot: "bg-status-danger animate-pulse", escrow: "FROZEN", escrowClass: "bg-status-danger/10 text-status-danger border border-status-danger/20", rowClass: "bg-status-danger/5" },
                      { id: "#TX-88216", buyer: "@buyer_zero", seller: "@verified_seller", asset: "Digital Art Collection (Pack 1)", amount: "\u20a615,000", status: "Processing", statusColor: "text-status-info", dot: "bg-status-info", escrow: "PENDING", escrowClass: "bg-surface-container border border-subtle", rowClass: "" },
                    ].map((t) => (
                      <tr key={t.id} className={`hover:bg-primary-container/20 transition-colors ${t.rowClass}`}>
                        <td className="px-4 py-2 font-data-mono text-secondary">{t.id}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="text-on-surface font-medium">{t.buyer}</span>
                            <span className="text-[10px] text-on-surface-variant">to {t.seller}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">{t.asset}</td>
                        <td className="px-4 py-2 font-data-mono">{t.amount}</td>
                        <td className="px-4 py-2">
                          <span className={`flex items-center gap-1.5 ${t.statusColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></span>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${t.escrowClass}`}>{t.escrow}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {t.status === "Disputed" ? (
                            <button className="bg-status-danger text-white px-2 py-0.5 rounded text-[10px] font-bold">RESOLVE</button>
                          ) : (
                            <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary">more_vert</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Management Panels */}
          <div className="xl:col-span-4 space-y-5">
            {/* Top Sellers */}
            <div className="bg-surface-bright border border-subtle rounded-lg flex flex-col h-fit">
              <div className="px-4 py-3 border-b border-subtle bg-surface-container/30 flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-primary">Top Sellers</h3>
                <button className="text-secondary text-[11px] font-bold hover:underline">VIEW ALL</button>
              </div>
              <div className="p-2 space-y-1 overflow-y-auto max-h-[350px]">
                {[
                  { name: "@p2p_master", verified: true, rating: "\u2605\u2605\u2605\u2605\u2605", trades: "142 trades" },
                  { name: "@domain_giant", verified: false, rating: "\u2605\u2605\u2605\u2605\u2606", trades: "89 trades" },
                  { name: "@niche_expert", verified: false, rating: "\u2605\u2605\u2605\u2605\u2605", trades: "204 trades" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-2 hover:bg-surface-container-high rounded transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-container border border-subtle flex items-center justify-center text-on-surface-variant text-xs font-bold">
                        {s.name.slice(1, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-body-sm font-bold text-on-surface">{s.name}</span>
                          {s.verified && <span className="material-symbols-outlined text-status-info text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                          <span className="text-status-warning">{s.rating}</span>
                          <span>({s.trades})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 text-on-surface-variant hover:text-status-danger" title="Flag User">
                        <span className="material-symbols-outlined text-[18px]">flag</span>
                      </button>
                      <div className="w-8 h-4 bg-surface-container border border-subtle rounded-full relative cursor-pointer">
                        <div className="absolute right-0.5 top-0.5 w-2.5 h-2.5 bg-status-success rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Marketplace */}
            <div className="bg-surface-bright border border-subtle rounded-lg flex flex-col">
              <div className="px-4 py-3 border-b border-subtle bg-surface-container/30">
                <h3 className="font-headline-md text-headline-md text-primary">Live Marketplace</h3>
              </div>
              <div className="p-3 space-y-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1.5 text-on-surface-variant text-[18px]">search</span>
                  <input className="w-full bg-surface-container border border-subtle rounded pl-8 pr-3 py-1.5 text-body-sm focus:outline-none focus:border-secondary" placeholder="Search live listings..." type="text" />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    { name: "Domain: katrex.ai", badge: "Premium", badgeClass: "bg-secondary/10 text-secondary", seller: "@alex_domains", price: "\u20a61,250,000" },
                    { name: "TikTok: @crypto_daily_ng", badge: "", badgeClass: "", seller: "@niche_expert", price: "\u20a645,000" },
                    { name: "App: \"Katrex Budget\" (Flutter)", badge: "", badgeClass: "", seller: "@dev_king", price: "\u20a62,500,000" },
                  ].map((l) => (
                    <div key={l.name} className="bg-surface-container/50 border border-subtle p-2 rounded flex justify-between items-center group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body-sm font-medium text-on-surface truncate">{l.name}</span>
                          {l.badge && <span className={`${l.badgeClass} text-[9px] px-1.5 rounded uppercase font-bold`}>{l.badge}</span>}
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-data-mono">Listed by: {l.seller} &bull; {l.price}</span>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button className="w-7 h-7 flex items-center justify-center rounded border border-subtle hover:bg-surface-container transition-colors text-on-surface-variant hover:text-secondary">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded border border-subtle hover:bg-status-danger/20 transition-colors text-on-surface-variant hover:text-status-danger">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
