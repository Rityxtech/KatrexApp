export default function GiftcardPage() {
  return (
    <div className="p-max-gap w-full">
      <div className="grid grid-cols-12 gap-gutter">
        {/* SECTION 1: Brand Management (Left Rail) */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-gutter">
          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-center mb-stack-base">
              <h2 className="font-headline-md text-headline-md text-primary">Brand Management</h2>
              <button className="bg-primary text-on-primary-fixed px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-white transition-colors">Add Brand</button>
            </div>
            <div className="flex flex-col gap-unit">
              {[
                { name: "Apple iTunes", icon: "file_download", checked: true },
                { name: "Amazon Card", icon: "shopping_cart", checked: true },
                { name: "Steam Wallet", icon: "sports_esports", checked: false },
              ].map((b) => (
                <div key={b.name} className={`brand-card flex items-center justify-between p-2 bg-surface-container-low border border-subtle rounded hover:border-primary transition-all ${!b.checked ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm opacity-0 transition-opacity cursor-grab">drag_indicator</span>
                    <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant">
                      <span className="material-symbols-outlined text-secondary">{b.icon}</span>
                    </div>
                    <span className="font-body-sm text-body-sm font-semibold">{b.name}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked={b.checked} className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-7 h-4 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: Payout Settings */}
          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-base">Payout Control</h2>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded border border-subtle">
                <div>
                  <p className="font-body-sm font-bold">Payout Mode</p>
                  <p className="text-[10px] text-on-surface-variant">Switch between manual &amp; instant</p>
                </div>
                <div className="flex bg-surface-deep p-1 rounded-lg border border-outline-variant">
                  <button className="px-3 py-1 text-[10px] bg-secondary text-on-secondary rounded font-bold uppercase">Auto</button>
                  <button className="px-3 py-1 text-[10px] text-on-surface-variant font-bold uppercase">Manual</button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-label-caps text-label-caps text-on-surface-variant">PAYOUT DESTINATION</p>
                <select className="bg-surface-container-high border border-outline-variant rounded p-2 text-body-sm focus:ring-1 focus:ring-primary outline-none">
                  <option>Internal Wallet (Default)</option>
                  <option>Direct Bank Transfer</option>
                  <option>Crypto Gateway</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 & 3: Main Dashboard Area */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-gutter">
          {/* SECTION 2: Rate Management */}
          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Rate Management</h2>
                <p className="text-body-sm text-on-surface-variant">Live exchange rates (&#8358; per $)</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 border border-subtle px-3 py-1 rounded text-body-sm hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-sm">filter_alt</span> Filter
                </button>
                <button className="bg-secondary text-on-secondary px-3 py-1 rounded text-body-sm font-bold hover:brightness-110">Bulk Update Rates</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-subtle">
                    <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">BRAND/REGION</th>
                    <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">TYPE</th>
                    <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">RANGE</th>
                    <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">CURRENT RATE</th>
                    <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { region: "USA", brand: "Apple iTunes", type: "Physical", typeColor: "text-secondary", range: "$10 - $100", rate: "\u20a6 890.00" },
                    { region: "UK", brand: "Amazon UK", type: "E-code", typeColor: "text-primary", range: "\u00a350 - \u00a3500", rate: "\u20a6 1,120.00" },
                    { region: "EUR", brand: "Steam Euro", type: "Physical", typeColor: "text-secondary", range: "\u20ac100+", rate: "\u20a6 940.00" },
                  ].map((r) => (
                    <tr key={r.brand} className="border-b border-subtle/50 hover:bg-primary/5 transition-colors group">
                      <td className="py-2 px-3 font-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-white/10 flex items-center justify-center rounded-sm text-[8px] font-bold">{r.region}</span>
                          {r.brand}
                        </div>
                      </td>
                      <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full bg-surface-container text-[10px] uppercase font-bold ${r.typeColor}`}>{r.type}</span></td>
                      <td className="py-2 px-3 font-data-mono text-data-mono">{r.range}</td>
                      <td className="py-2 px-3 font-data-mono text-data-mono text-status-success">{r.rate}</td>
                      <td className="py-2 px-3 text-right">
                        <span className="material-symbols-outlined text-sm cursor-pointer text-on-surface-variant hover:text-primary">edit</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: Active Trade Queue */}
          <div className="flex flex-col gap-stack-base">
            <h2 className="font-headline-md text-headline-md text-primary">
              Active Trade Queue <span className="bg-status-danger text-white px-2 py-0.5 rounded text-[10px] ml-2">4 Pending</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {/* Order Card 1 */}
              <div className="bg-surface-container-high border-l-4 border-l-status-warning rounded-lg p-container-padding flex gap-4 hover:shadow-xl transition-all border-y border-r border-subtle">
                <div className="w-24 h-16 bg-surface-deep rounded border border-outline-variant overflow-hidden flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">file_download</span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-body-sm font-bold">Apple iTunes USA</p>
                      <p className="text-data-mono text-primary">$100.00 <span className="text-on-surface-variant text-[10px]">(&#8358; 89,000)</span></p>
                    </div>
                    <span className="text-[10px] font-label-caps text-status-warning px-1.5 py-0.5 bg-status-warning/10 rounded">Pending Approval</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] text-on-secondary font-bold">JD</div>
                      <span className="text-[10px] text-on-surface-variant">John Doe &bull; 2m ago</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-status-success/20 text-status-success p-1 rounded hover:bg-status-success/40 transition-colors">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </button>
                      <button className="bg-status-danger/20 text-status-danger p-1 rounded hover:bg-status-danger/40 transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Order Card 2 */}
              <div className="bg-surface-container-high border-l-4 border-l-status-info rounded-lg p-container-padding flex gap-4 hover:shadow-xl transition-all border-y border-r border-subtle">
                <div className="w-24 h-16 bg-surface-deep rounded border border-outline-variant overflow-hidden flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">shopping_cart</span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-body-sm font-bold">Amazon UK E-code</p>
                      <p className="text-data-mono text-primary">&#163;50.00 <span className="text-on-surface-variant text-[10px]">(&#8358; 56,000)</span></p>
                    </div>
                    <span className="text-[10px] font-label-caps text-status-info px-1.5 py-0.5 bg-status-info/10 rounded">Processing Payout</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-tertiary flex items-center justify-center text-[10px] text-on-tertiary font-bold">AS</div>
                      <span className="text-[10px] text-on-surface-variant">Alice Smith &bull; 5m ago</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant italic">Auto-payout queued</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Trade History */}
          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-center mb-stack-base">
              <h2 className="font-headline-md text-headline-md text-primary">Trade History</h2>
              <button className="flex items-center gap-2 text-secondary text-body-sm hover:underline">
                <span className="material-symbols-outlined text-sm">download</span> Export CSV
              </button>
            </div>
            <div className="overflow-hidden border border-outline-variant rounded">
              <table className="w-full text-left text-body-sm">
                <thead className="bg-surface-container-high">
                  <tr className="border-b border-subtle">
                    <th className="p-2 font-label-caps text-label-caps">DATE</th>
                    <th className="p-2 font-label-caps text-label-caps">TRADE ID</th>
                    <th className="p-2 font-label-caps text-label-caps">ASSET</th>
                    <th className="p-2 font-label-caps text-label-caps">VALUE</th>
                    <th className="p-2 font-label-caps text-label-caps">PAYOUT</th>
                    <th className="p-2 font-label-caps text-label-caps">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {[
                    { date: "Oct 24, 14:22", id: "#GC-99210", asset: "Apple (Physical)", value: "$500", payout: "\u20a6 445k", status: "Paid", statusColor: "text-status-success" },
                    { date: "Oct 24, 12:05", id: "#GC-99208", asset: "Steam (E-code)", value: "\u20ac200", payout: "\u20a6 188k", status: "Rejected", statusColor: "text-status-danger" },
                    { date: "Oct 24, 09:15", id: "#GC-99195", asset: "Amazon (E-code)", value: "$100", payout: "\u20a6 86k", status: "Paid", statusColor: "text-status-success" },
                  ].map((r) => (
                    <tr key={r.id} className="hover:bg-surface-container">
                      <td className="p-2 text-on-surface-variant">{r.date}</td>
                      <td className="p-2 font-data-mono text-[10px]">{r.id}</td>
                      <td className="p-2">{r.asset}</td>
                      <td className="p-2">{r.value}</td>
                      <td className="p-2 text-secondary">{r.payout}</td>
                      <td className="p-2"><span className={`${r.statusColor} font-bold text-[10px] uppercase`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
