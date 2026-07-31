export default function SettingsPage() {
  return (
    <div className="px-container-padding pt-5 w-full">
      <div className="max-w-6xl mx-auto space-y-max-gap">
        {/* Page Header */}
        <div className="flex justify-between items-end border-b border-outline-variant pb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">System &amp; Content</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Global configuration for Katrex Mobile Ecosystem</p>
          </div>
          <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">save</span>
            PUBLISH CHANGES
          </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Section 1: System Config (4 cols) */}
          <section className="md:col-span-4 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">settings_suggest</span>
                <h2 className="font-headline-md text-headline-md">System Config</h2>
              </div>
              <div className="space-y-4">
                {/* Maintenance Mode */}
                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-outline-variant/30">
                  <div>
                    <p className="font-body-md text-on-surface">Maintenance Mode</p>
                    <p className="font-label-caps text-status-warning">DISABLES USER ACCESS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-10 h-5 bg-outline-variant rounded-full peer peer-checked:bg-secondary transition-colors"></div>
                    <div className="absolute left-1 top-1 bg-on-surface-variant w-3 h-3 rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-transform"></div>
                  </label>
                </div>
                {/* App Versions */}
                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">Version Management</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant">
                      <p className="font-label-caps text-secondary mb-1">ANDROID</p>
                      <input className="bg-transparent border-none p-0 w-full font-data-mono text-data-mono focus:ring-0 text-primary" type="text" defaultValue="v2.4.1" />
                    </div>
                    <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant">
                      <p className="font-label-caps text-secondary mb-1">IOS</p>
                      <input className="bg-transparent border-none p-0 w-full font-data-mono text-data-mono focus:ring-0 text-primary" type="text" defaultValue="v2.4.0" />
                    </div>
                  </div>
                </div>
                {/* Default Currency */}
                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">Global Default Currency</label>
                  <select className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-md text-on-surface focus:border-secondary outline-none">
                    <option>USD - US Dollar</option>
                    <option>EUR - Euro</option>
                    <option>NGN - Nigerian Naira</option>
                    <option>GBP - British Pound</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Feature Toggles (8 cols) */}
          <section className="md:col-span-8">
            <div className="bg-surface-container p-4 rounded border border-outline-variant">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">toggle_on</span>
                <h2 className="font-headline-md text-headline-md">Module Controls</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-stack-base">
                {[
                  { icon: "swap_horizontal_circle", label: "P2P Trading", checked: true },
                  { icon: "currency_exchange", label: "Crypto Swap", checked: true },
                  { icon: "phone_android", label: "Airtime/Data", checked: true },
                  { icon: "card_giftcard", label: "Giftcards", checked: false },
                ].map((m) => (
                  <div key={m.label} className="bg-surface-container-low p-3 rounded border border-outline-variant flex flex-col items-center gap-2 text-center group hover:border-secondary transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{m.icon}</span>
                    <p className="font-body-md font-bold">{m.label}</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input checked={m.checked} className="sr-only peer" type="checkbox" readOnly />
                      <div className={`w-8 h-4 rounded-full peer transition-colors ${m.checked ? "bg-secondary" : "bg-outline-variant"}`}></div>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${m.checked ? "left-4" : "left-1"}`}></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Banner Slider (8 cols) */}
          <section className="md:col-span-8 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded border border-outline-variant">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">view_carousel</span>
                  <h2 className="font-headline-md text-headline-md">Banner Slider</h2>
                </div>
                <button className="text-secondary font-label-caps flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-[16px]">add</span> ADD NEW
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-left border-b border-outline-variant">
                      <th className="p-3 font-label-caps text-on-surface-variant">PREVIEW</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">TITLE &amp; LINK</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">STATUS</th>
                      <th className="p-3 font-label-caps text-on-surface-variant text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm">
                    {[
                      { title: "Crypto Summer Launch", link: "katrex://promo/summer-24", status: "ACTIVE", statusClass: "bg-status-success/20 text-status-success" },
                      { title: "New P2P Safeguard", link: "katrex://news/p2p-security", status: "DRAFT", statusClass: "bg-on-surface-variant/20 text-on-surface-variant" },
                    ].map((b) => (
                      <tr key={b.title} className="border-b border-outline-variant/30 hover:bg-surface-bright/20 transition-colors">
                        <td className="p-3">
                          <div className="w-16 h-10 rounded bg-surface-container-highest border border-outline-variant overflow-hidden flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline text-sm">image</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-primary">{b.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-data-mono">{b.link}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full ${b.statusClass} text-[10px] font-bold`}>{b.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-secondary">edit</span>
                            <span className="material-symbols-outlined text-status-danger/70 cursor-pointer hover:text-status-danger">delete</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 4: Onboarding (4 cols) */}
          <section className="md:col-span-4 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">flight_takeoff</span>
                <h2 className="font-headline-md text-headline-md">Onboarding Flow</h2>
              </div>
              <div className="space-y-3">
                {[
                  { screen: "SCREEN 1", text: "Welcome to the future of assets..." },
                  { screen: "SCREEN 2", text: "Secure P2P at your fingertips..." },
                ].map((s) => (
                  <div key={s.screen} className="p-3 bg-surface-container-low border border-outline-variant rounded relative group">
                    <p className="font-label-caps text-secondary mb-1">{s.screen}</p>
                    <p className="font-body-sm line-clamp-1">{s.text}</p>
                    <div className="absolute inset-0 bg-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <span className="material-symbols-outlined">edit</span>
                    </div>
                  </div>
                ))}
                <button className="w-full border border-dashed border-outline-variant py-2 rounded text-on-surface-variant hover:text-secondary hover:border-secondary transition-all font-label-caps">
                  + ADD STEP
                </button>
              </div>
            </div>
          </section>

          {/* Section 5: FAQ Editor (6 cols) */}
          <section className="md:col-span-6">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">help_center</span>
                  <h2 className="font-headline-md text-headline-md">FAQ Editor</h2>
                </div>
                <select className="bg-surface-container-low border border-outline-variant rounded text-xs p-1">
                  <option>General</option>
                  <option>Transactions</option>
                  <option>Security</option>
                </select>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                {[
                  { q: "How to recover my key?", a: "Navigate to security settings and select 'Key Recovery'..." },
                  { q: "What are the fees?", a: "Standard transaction fees apply at 0.1% for P2P..." },
                ].map((f) => (
                  <div key={f.q} className="p-3 bg-surface-container-low rounded border border-outline-variant">
                    <div className="flex justify-between">
                      <p className="font-body-md font-bold text-primary">{f.q}</p>
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">drag_indicator</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-1 opacity-80">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 6: Advanced/Firebase (6 cols) */}
          <section className="md:col-span-6">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">terminal</span>
                <h2 className="font-headline-md text-headline-md">Advanced System</h2>
              </div>
              <div className="grid grid-cols-1 gap-stack-base">
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant font-data-mono text-[11px] space-y-1">
                  <p className="text-status-info">FIREBASE_ENV: <span className="text-on-surface">production-k-01</span></p>
                  <p className="text-status-info">API_ENDPOINT: <span className="text-on-surface">https://api.katrex.io/v2</span></p>
                  <p className="text-status-info">CACHE_STATUS: <span className="text-status-success">OPTIMIZED (4.2MB)</span></p>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-surface-container-high border border-outline-variant py-2 rounded font-label-caps hover:bg-error/10 hover:text-error transition-colors">
                    PURGE SYSTEM CACHE
                  </button>
                  <button className="flex-1 bg-surface-container-high border border-outline-variant py-2 rounded font-label-caps hover:bg-secondary/10 hover:text-secondary transition-colors">
                    RELOAD CONFIG
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
