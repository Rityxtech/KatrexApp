export default function ReportsPage() {
  return (
    <div className="px-container-padding py-max-gap flex flex-col gap-max-gap max-w-[1600px] mx-auto w-full">
      {/* Export Control & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Reports &amp; Analytics</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">System performance metrics and transactional telemetry</p>
        </div>
        <div className="flex items-center gap-stack-base flex-wrap">
          <div className="flex bg-surface-container border border-outline-variant rounded overflow-hidden">
            <input className="bg-transparent border-none text-on-surface font-data-mono text-xs focus:ring-0 px-2 py-1" type="date" defaultValue="2023-10-20" />
            <span className="px-2 self-center text-outline text-xs">to</span>
            <input className="bg-transparent border-none text-on-surface font-data-mono text-xs focus:ring-0 px-2 py-1" type="date" defaultValue="2023-10-27" />
          </div>
          <div className="flex gap-1">
            <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-caps text-label-caps px-3 py-2 rounded flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[14px]">download</span> CSV
            </button>
            <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-caps text-label-caps px-3 py-2 rounded flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Operational Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/* Total Volume */}
        <div className="bg-surface-container p-3 rounded border border-outline-variant flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Total Volume (24h)</p>
            <div className="flex items-baseline gap-2">
              <span className="font-data-mono text-xl text-primary">$4,821,392.42</span>
              <span className="text-status-success text-[10px] font-bold">+12.4%</span>
            </div>
          </div>
          <div className="h-8 mt-2 w-full flex items-end gap-[1px]">
            {["40%","60%","30%","80%","100%","50%","90%"].map((h, i) => (
              <div key={i} className="bg-primary/20 hover:bg-primary w-full transition-all" style={{ height: h }}></div>
            ))}
          </div>
        </div>
        {/* Success Rate */}
        <div className="bg-surface-container p-3 rounded border border-outline-variant">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Success Rate</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-data-mono text-xl text-secondary">99.82%</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-data-mono">
              <span className="text-on-secondary-fixed">CRYPTO</span>
              <span className="text-on-surface">100%</span>
            </div>
            <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-full"></div>
            </div>
            <div className="flex justify-between text-[10px] font-data-mono mt-1">
              <span className="text-on-secondary-fixed">FIAT</span>
              <span className="text-on-surface">98.4%</span>
            </div>
            <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-[98.4%]"></div>
            </div>
          </div>
        </div>
        {/* Revenue */}
        <div className="bg-surface-container p-3 rounded border border-outline-variant">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Revenue (Net)</p>
          <div className="flex flex-col">
            <span className="font-data-mono text-xl text-tertiary">$142,903.00</span>
            <div className="flex gap-3 mt-2">
              <div>
                <p className="text-[9px] text-on-surface-variant font-label-caps">GROSS</p>
                <p className="font-data-mono text-xs text-on-surface">$168.2K</p>
              </div>
              <div className="border-l border-outline-variant pl-3">
                <p className="text-[9px] text-on-surface-variant font-label-caps">FEES</p>
                <p className="font-data-mono text-xs text-on-surface">$25.3K</p>
              </div>
            </div>
          </div>
        </div>
        {/* Active Users */}
        <div className="bg-surface-container p-3 rounded border border-outline-variant relative overflow-hidden">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-unit">Active Users (Live)</p>
          <div className="flex items-center gap-2">
            <span className="font-data-mono text-3xl text-on-surface tracking-tighter">8,421</span>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-surface-container bg-surface-bright flex items-center justify-center text-[10px]">+12</div>
            </div>
          </div>
          <p className="font-data-mono text-[10px] text-status-success mt-2">&#9679; 142 NEW IN LAST HOUR</p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Transaction Volume Chart */}
        <div className="lg:col-span-2 bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">Transaction Volume</h2>
            <div className="flex bg-surface-container-low rounded p-1 gap-1">
              <button className="px-2 py-0.5 text-[10px] font-label-caps bg-primary-container text-on-primary-container rounded">1H</button>
              <button className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">24H</button>
              <button className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">7D</button>
              <button className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">1M</button>
            </div>
          </div>
          <div className="flex-grow h-64 p-4 relative">
            <div className="absolute inset-0 m-4 flex flex-col justify-between opacity-10">
              {[0,1,2,3].map((i) => <div key={i} className="border-b border-dashed border-outline w-full h-0"></div>)}
            </div>
            <div className="relative w-full h-full flex items-end justify-between px-2 gap-2">
              {[
                { c: "bg-primary/40", h: "20%" }, { c: "bg-secondary/40", h: "35%" },
                { c: "bg-primary/40", h: "45%" }, { c: "bg-secondary/40", h: "30%" },
                { c: "bg-primary/40", h: "60%" }, { c: "bg-secondary/40", h: "75%" },
                { c: "bg-primary/40", h: "55%" }, { c: "bg-secondary/40", h: "90%" },
                { c: "bg-primary/40", h: "65%" }, { c: "bg-secondary/40", h: "40%" },
                { c: "bg-primary/40", h: "80%" }, { c: "bg-secondary/40", h: "95%" },
              ].map((b, i) => (
                <div key={i} className={`w-full ${b.c} rounded-t-sm`} style={{ height: b.h }}></div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 flex justify-between px-6 text-[8px] font-data-mono text-on-surface-variant">
              <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
            </div>
          </div>
          <div className="p-3 bg-surface-container-low flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="font-body-sm text-body-sm">Buy Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-body-sm text-body-sm">Sell Orders</span>
            </div>
          </div>
        </div>

        {/* Liquidity Distribution */}
        <div className="bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant">
            <h2 className="font-headline-md text-headline-md">Liquidity Split</h2>
          </div>
          <div className="p-4 flex flex-col gap-4 flex-grow">
            <div className="flex flex-col gap-1">
              <div className="h-6 w-full flex rounded overflow-hidden">
                <div className="bg-primary w-[55%] hover:opacity-80 transition-opacity cursor-help" title="Main: $14.2M"></div>
                <div className="bg-secondary w-[25%] hover:opacity-80 transition-opacity cursor-help" title="Reserve: $6.4M"></div>
                <div className="bg-tertiary w-[20%] hover:opacity-80 transition-opacity cursor-help" title="Revenue: $5.1M"></div>
              </div>
              <div className="flex justify-between font-data-mono text-[10px]">
                <span>TOTAL: $25.7M</span>
                <span className="text-status-success">AUDITED</span>
              </div>
            </div>
            <div className="flex flex-col gap-stack-base mt-2">
              {[
                { color: "bg-primary", label: "Main Wallets", pct: "55%" },
                { color: "bg-secondary", label: "Reserve Reserve", pct: "25%" },
                { color: "bg-tertiary", label: "Revenue Vault", pct: "20%" },
              ].map((l) => (
                <div key={l.label} className="flex items-center justify-between p-2 bg-surface-container-low rounded border border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${l.color}`}></span>
                    <span className="font-body-sm text-body-sm">{l.label}</span>
                  </div>
                  <span className="font-data-mono text-xs">{l.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Margin Performance */}
        <div className="bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">Margin Performance</h2>
            <span className="font-label-caps text-label-caps text-on-surface-variant">COIN-SPECIFIC SPREAD</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant">ASSET</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-right">AVG SPREAD</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-right">VOLUME (24H)</th>
                  <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-right">NET PROFIT</th>
                </tr>
              </thead>
              <tbody className="font-data-mono divide-y divide-outline-variant">
                {[
                  { asset: "BTC/USDT", color: "text-primary", spread: "0.05%", vol: "$1.2M", profit: "+$18.4K" },
                  { asset: "ETH/USDT", color: "text-secondary", spread: "0.08%", vol: "$842K", profit: "+$12.1K" },
                  { asset: "SOL/USDT", color: "text-tertiary", spread: "0.12%", vol: "$420K", profit: "+$8.2K" },
                  { asset: "XRP/USDT", color: "text-on-surface", spread: "0.15%", vol: "$210K", profit: "+$4.1K" },
                ].map((r) => (
                  <tr key={r.asset} className="hover:bg-surface-container-high transition-colors">
                    <td className={`px-3 py-2 ${r.color} font-bold`}>{r.asset}</td>
                    <td className="px-3 py-2 text-right">{r.spread}</td>
                    <td className="px-3 py-2 text-right text-on-surface-variant">{r.vol}</td>
                    <td className="px-3 py-2 text-right text-status-success">{r.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* High-Value Entities */}
        <div className="bg-surface-container border border-outline-variant rounded flex flex-col">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">High-Value Entities</h2>
            <span className="font-label-caps text-label-caps text-on-surface-variant">USER VOLUME RANKING</span>
          </div>
          <div className="flex flex-col divide-y divide-outline-variant">
            {[
              { rank: "01", name: "Alpha_Whale_09", id: "KAT-99281-Z", vol: "$492,000.00", txns: "82 TRANSACTIONS" },
              { rank: "02", name: "Deep_Liquidity_X", id: "KAT-44102-B", vol: "$381,200.00", txns: "14 TRANSACTIONS" },
              { rank: "03", name: "Scalp_Master_V2", id: "KAT-11092-K", vol: "$120,400.00", txns: "291 TRANSACTIONS" },
            ].map((e) => (
              <div key={e.rank} className="p-3 flex items-center justify-between hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded border border-outline-variant bg-surface-container-low flex items-center justify-center font-data-mono text-xs">{e.rank}</div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">{e.name}</p>
                    <p className="text-[10px] font-data-mono text-on-surface-variant uppercase">ID: {e.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-sm text-primary">{e.vol}</p>
                  <p className="text-[10px] font-label-caps text-on-surface-variant uppercase">{e.txns}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
