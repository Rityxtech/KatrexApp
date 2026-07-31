"use client";

import { useAppSettings } from "@/hooks/useAdminData";

export default function SettingsPage() {
  const { data: settings, loading } = useAppSettings();

  const systemConfig = settings.find((s: any) => s.id === "system") || {};
  const modules = settings.find((s: any) => s.id === "modules") || {};
  const banners = settings.filter((s: any) => s.type === "banner" || s.collection === "banners");
  const onboarding = settings.filter((s: any) => s.type === "onboarding" || s.collection === "onboarding");
  const faqs = settings.filter((s: any) => s.type === "faq" || s.collection === "faqs");
  const advanced = settings.find((s: any) => s.id === "advanced") || {};

  const moduleList = [
    { key: "p2p", icon: "swap_horizontal_circle", label: "P2P Trading" },
    { key: "crypto", icon: "currency_exchange", label: "Crypto Swap" },
    { key: "airtime", icon: "phone_android", label: "Airtime/Data" },
    { key: "giftcard", icon: "card_giftcard", label: "Giftcards" },
  ];

  return (
    <div className="px-container-padding pt-5 w-full">
      <div className="max-w-6xl mx-auto space-y-max-gap">
        <div className="flex justify-between items-end border-b border-outline-variant pb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">System &amp; Content</h1>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
              Global configuration for Katrex Mobile Ecosystem
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>
            </p>
          </div>
          <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">save</span>
            PUBLISH CHANGES
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* System Config */}
          <section className="md:col-span-4 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">settings_suggest</span>
                <h2 className="font-headline-md text-headline-md">System Config</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-outline-variant/30">
                  <div>
                    <p className="font-body-md text-on-surface">Maintenance Mode</p>
                    <p className="font-label-caps text-status-warning">DISABLES USER ACCESS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked={systemConfig.maintenanceMode === true} className="sr-only peer" type="checkbox" readOnly />
                    <div className={`w-10 h-5 rounded-full peer transition-colors ${systemConfig.maintenanceMode ? "bg-secondary" : "bg-outline-variant"}`}></div>
                    <div className={`absolute top-1 bg-on-surface-variant w-3 h-3 rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-transform ${systemConfig.maintenanceMode ? "left-5" : "left-1"}`}></div>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">Version Management</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant">
                      <p className="font-label-caps text-secondary mb-1">ANDROID</p>
                      <input className="bg-transparent border-none p-0 w-full font-data-mono text-data-mono focus:ring-0 text-primary" type="text" defaultValue={systemConfig.androidVersion || "v2.4.1"} />
                    </div>
                    <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant">
                      <p className="font-label-caps text-secondary mb-1">IOS</p>
                      <input className="bg-transparent border-none p-0 w-full font-data-mono text-data-mono focus:ring-0 text-primary" type="text" defaultValue={systemConfig.iosVersion || "v2.4.0"} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">Global Default Currency</label>
                  <select className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-md text-on-surface focus:border-secondary outline-none" defaultValue={systemConfig.defaultCurrency || "NGN"}>
                    <option>USD - US Dollar</option>
                    <option>EUR - Euro</option>
                    <option>NGN - Nigerian Naira</option>
                    <option>GBP - British Pound</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Module Controls */}
          <section className="md:col-span-8">
            <div className="bg-surface-container p-4 rounded border border-outline-variant">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">toggle_on</span>
                <h2 className="font-headline-md text-headline-md">Module Controls</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-stack-base">
                {moduleList.map((m) => {
                  const enabled = modules[m.key] !== false;
                  return (
                    <div key={m.label} className="bg-surface-container-low p-3 rounded border border-outline-variant flex flex-col items-center gap-2 text-center group hover:border-secondary transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{m.icon}</span>
                      <p className="font-body-md font-bold">{m.label}</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input checked={enabled} className="sr-only peer" type="checkbox" readOnly />
                        <div className={`w-8 h-4 rounded-full peer transition-colors ${enabled ? "bg-secondary" : "bg-outline-variant"}`}></div>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${enabled ? "left-4" : "left-1"}`}></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Banner Slider */}
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
                {loading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-surface-container-high rounded animate-pulse" />)}</div>
                ) : banners.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-body-sm">No banners configured</div>
                ) : (
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
                      {banners.map((b: any) => (
                        <tr key={b.id} className="border-b border-outline-variant/30 hover:bg-surface-bright/20 transition-colors">
                          <td className="p-3">
                            <div className="w-16 h-10 rounded bg-surface-container-highest border border-outline-variant overflow-hidden flex items-center justify-center">
                              {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline text-sm">image</span>}
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-primary">{b.title || "Untitled"}</p>
                            <p className="text-[10px] text-on-surface-variant font-data-mono">{b.link || b.url || "\u2014"}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === "active" ? "bg-status-success/20 text-status-success" : "bg-on-surface-variant/20 text-on-surface-variant"}`}>
                              {(b.status || "draft").toUpperCase()}
                            </span>
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
                )}
              </div>
            </div>
          </section>

          {/* Onboarding */}
          <section className="md:col-span-4 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">flight_takeoff</span>
                <h2 className="font-headline-md text-headline-md">Onboarding Flow</h2>
              </div>
              <div className="space-y-3">
                {onboarding.length === 0 ? (
                  <>
                    <div className="p-3 bg-surface-container-low border border-outline-variant rounded text-center text-on-surface-variant text-body-sm">No onboarding screens</div>
                  </>
                ) : (
                  onboarding.map((s: any, i: number) => (
                    <div key={s.id} className="p-3 bg-surface-container-low border border-outline-variant rounded relative group">
                      <p className="font-label-caps text-secondary mb-1">SCREEN {i + 1}</p>
                      <p className="font-body-sm line-clamp-1">{s.text || s.description || s.title || "\u2014"}</p>
                      <div className="absolute inset-0 bg-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <span className="material-symbols-outlined">edit</span>
                      </div>
                    </div>
                  ))
                )}
                <button className="w-full border border-dashed border-outline-variant py-2 rounded text-on-surface-variant hover:text-secondary hover:border-secondary transition-all font-label-caps">
                  + ADD STEP
                </button>
              </div>
            </div>
          </section>

          {/* FAQ Editor */}
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
                {faqs.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant text-body-sm">No FAQs configured</div>
                ) : (
                  faqs.map((f: any) => (
                    <div key={f.id} className="p-3 bg-surface-container-low rounded border border-outline-variant">
                      <div className="flex justify-between">
                        <p className="font-body-md font-bold text-primary">{f.question || f.q || "\u2014"}</p>
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">drag_indicator</span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1 opacity-80">{f.answer || f.a || "\u2014"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Advanced System */}
          <section className="md:col-span-6">
            <div className="bg-surface-container p-4 rounded border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">terminal</span>
                <h2 className="font-headline-md text-headline-md">Advanced System</h2>
              </div>
              <div className="grid grid-cols-1 gap-stack-base">
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant font-data-mono text-[11px] space-y-1">
                  <p className="text-status-info">FIREBASE_ENV: <span className="text-on-surface">{advanced.firebaseEnv || "production-k-01"}</span></p>
                  <p className="text-status-info">PROJECT_ID: <span className="text-on-surface">katrexapp-83cde</span></p>
                  <p className="text-status-info">API_ENDPOINT: <span className="text-on-surface">{advanced.apiEndpoint || "https://api.katrex.io/v2"}</span></p>
                  <p className="text-status-info">FIRESTORE: <span className="text-status-success flex items-center gap-1 inline-flex"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> REAL-TIME ACTIVE</span></p>
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
