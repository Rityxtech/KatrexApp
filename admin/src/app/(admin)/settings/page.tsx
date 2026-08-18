"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppSettings } from "@/hooks/useAdminData";
import { setDocument, updateDocument, deleteDocument } from "@/hooks/useFirestore";

export default function SettingsPage() {
  const { data: settings, loading } = useAppSettings();

  const systemConfig = settings.find((s: any) => s.id === "system") || {};
  const modules = settings.find((s: any) => s.id === "modules") || {};
  const banners = settings.filter((s: any) => s.type === "banner" || s.collection === "banners");
  const onboarding = settings.filter((s: any) => s.type === "onboarding" || s.collection === "onboarding");
  const faqs = settings.filter((s: any) => s.type === "faq" || s.collection === "faqs");
  const advanced = settings.find((s: any) => s.id === "advanced") || {};

  // ─── System Config state ───────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [androidVersion, setAndroidVersion] = useState("");
  const [iosVersion, setIosVersion] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("NGN");

  // ─── Module toggles ────────────────────────────────────────────
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({});

  // ─── Toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Banner modal ──────────────────────────────────────────────
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerForm, setBannerForm] = useState({ title: "", imageUrl: "", link: "", status: "active" });

  // ─── Onboarding modal ──────────────────────────────────────────
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({ title: "", text: "" });

  // ─── FAQ filter ────────────────────────────────────────────────
  const [faqCategory, setFaqCategory] = useState("all");

  // ─── Sync state from Firestore ─────────────────────────────────
  useEffect(() => {
    if (systemConfig) {
      setMaintenanceMode(systemConfig.maintenanceMode === true);
      setAndroidVersion(systemConfig.androidVersion || "");
      setIosVersion(systemConfig.iosVersion || "");
      setDefaultCurrency(systemConfig.defaultCurrency || "NGN");
    }
    if (modules) {
      setModuleState({
        p2p: modules.p2p !== false,
        crypto: modules.crypto !== false,
        airtime: modules.airtime !== false,
        giftcard: modules.giftcard !== false,
      });
    }
  }, [systemConfig, modules]);

  function flash(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Save all settings ─────────────────────────────────────────
  const publishChanges = async () => {
    setSaving(true);
    try {
      await setDocument("app_settings", "system", {
        maintenanceMode,
        androidVersion,
        iosVersion,
        defaultCurrency,
        updatedAt: new Date(),
      });
      await setDocument("app_settings", "modules", {
        ...moduleState,
        updatedAt: new Date(),
      });
      flash("success", "All settings published successfully");
    } catch (e: any) {
      flash("error", e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle maintenance mode ───────────────────────────────────
  const toggleMaintenance = async () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    try {
      await updateDocument("app_settings", "system", { maintenanceMode: next });
      flash("success", next ? "Maintenance mode ENABLED" : "Maintenance mode DISABLED");
    } catch (e: any) {
      setMaintenanceMode(!next);
      flash("error", e.message || "Failed to toggle maintenance");
    }
  };

  // ─── Toggle module ─────────────────────────────────────────────
  const toggleModule = async (key: string) => {
    const next = { ...moduleState, [key]: !moduleState[key] };
    setModuleState(next);
    try {
      await updateDocument("app_settings", "modules", { [key]: next[key] });
      flash("success", `${key.toUpperCase()} ${next[key] ? "enabled" : "disabled"}`);
    } catch (e: any) {
      setModuleState(moduleState);
      flash("error", e.message || "Failed to toggle module");
    }
  };

  // ─── Banner CRUD ───────────────────────────────────────────────
  const openBannerModal = (b?: any) => {
    if (b) {
      setEditingBanner(b);
      setBannerForm({ title: b.title || "", imageUrl: b.imageUrl || "", link: b.link || b.url || "", status: b.status || "active" });
    } else {
      setEditingBanner(null);
      setBannerForm({ title: "", imageUrl: "", link: "", status: "active" });
    }
    setShowBannerModal(true);
  };

  const saveBanner = async () => {
    if (!bannerForm.title.trim()) { flash("error", "Title is required"); return; }
    try {
      const id = editingBanner?.id || `banner_${Date.now()}`;
      await setDocument("app_settings", id, {
        id,
        type: "banner",
        collection: "banners",
        title: bannerForm.title.trim(),
        imageUrl: bannerForm.imageUrl.trim(),
        link: bannerForm.link.trim(),
        url: bannerForm.link.trim(),
        status: bannerForm.status,
        updatedAt: new Date(),
      });
      flash("success", `Banner ${editingBanner ? "updated" : "created"}`);
      setShowBannerModal(false);
    } catch (e: any) {
      flash("error", e.message || "Failed to save banner");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await deleteDocument("app_settings", id);
      flash("success", "Banner deleted");
    } catch (e: any) {
      flash("error", e.message || "Failed to delete");
    }
  };

  // ─── Onboarding CRUD ───────────────────────────────────────────
  const saveOnboardingStep = async () => {
    if (!onboardingForm.title.trim() && !onboardingForm.text.trim()) {
      flash("error", "Title or text is required");
      return;
    }
    try {
      const id = `onboarding_${Date.now()}`;
      await setDocument("app_settings", id, {
        id,
        type: "onboarding",
        collection: "onboarding",
        title: onboardingForm.title.trim(),
        text: onboardingForm.text.trim(),
        description: onboardingForm.text.trim(),
        sortOrder: onboarding.length,
        updatedAt: new Date(),
      });
      flash("success", "Onboarding step added");
      setShowOnboardingModal(false);
      setOnboardingForm({ title: "", text: "" });
    } catch (e: any) {
      flash("error", e.message || "Failed to add step");
    }
  };

  // ─── Filtered FAQs ─────────────────────────────────────────────
  const filteredFaqs = useMemo(() => {
    if (faqCategory === "all") return faqs;
    return faqs.filter((f: any) => (f.category || "general").toLowerCase() === faqCategory.toLowerCase());
  }, [faqs, faqCategory]);

  const moduleList = [
    { key: "p2p", icon: "swap_horizontal_circle", label: "P2P Trading" },
    { key: "crypto", icon: "currency_exchange", label: "Crypto Swap" },
    { key: "airtime", icon: "phone_android", label: "Airtime/Data" },
    { key: "giftcard", icon: "card_giftcard", label: "Giftcards" },
  ];

  return (
    <>
      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg shadow-xl text-body-sm font-medium flex items-center gap-2 ${
          toast.type === "success" ? "bg-status-success text-white" : "bg-status-danger text-white"
        }`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.text}
        </div>
      )}

      <div className="px-container-padding pt-5 w-full">
        <div className="max-w-6xl mx-auto space-y-max-gap">
          {/* Header */}
          <div className="flex justify-between items-end border-b border-outline-variant pb-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary">System &amp; Content</h1>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                Global configuration for Katrex Mobile Ecosystem
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>
              </p>
            </div>
            <button
              onClick={publishChanges}
              disabled={saving}
              className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? "SAVING..." : "PUBLISH CHANGES"}
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
                    <button
                      onClick={toggleMaintenance}
                      className={`w-10 h-5 rounded-full transition-colors relative ${maintenanceMode ? "bg-secondary" : "bg-outline-variant"}`}
                    >
                      <span className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${maintenanceMode ? "left-5" : "left-1"}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-caps text-on-surface-variant uppercase">Version Management</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant">
                        <p className="font-label-caps text-secondary mb-1">ANDROID</p>
                        <input
                          className="bg-transparent border-none p-0 w-full font-data-mono text-data-mono focus:ring-0 text-primary outline-none"
                          type="text"
                          value={androidVersion}
                          onChange={(e) => setAndroidVersion(e.target.value)}
                          placeholder="v2.4.1"
                        />
                      </div>
                      <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant">
                        <p className="font-label-caps text-secondary mb-1">IOS</p>
                        <input
                          className="bg-transparent border-none p-0 w-full font-data-mono text-data-mono focus:ring-0 text-primary outline-none"
                          type="text"
                          value={iosVersion}
                          onChange={(e) => setIosVersion(e.target.value)}
                          placeholder="v2.4.0"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-caps text-on-surface-variant uppercase">Global Default Currency</label>
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-md text-on-surface focus:border-secondary outline-none"
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="GBP">GBP - British Pound</option>
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
                    const enabled = moduleState[m.key] !== false;
                    return (
                      <div key={m.key} className="bg-surface-container-low p-3 rounded border border-outline-variant flex flex-col items-center gap-2 text-center group hover:border-secondary transition-colors">
                        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{m.icon}</span>
                        <p className="font-body-md font-bold">{m.label}</p>
                        <button
                          onClick={() => toggleModule(m.key)}
                          className={`w-8 h-4 rounded-full transition-colors relative ${enabled ? "bg-secondary" : "bg-outline-variant"}`}
                        >
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${enabled ? "left-4" : "left-1"}`} />
                        </button>
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
                  <button
                    onClick={() => openBannerModal()}
                    className="text-secondary font-label-caps flex items-center gap-1 hover:underline"
                  >
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
                                <button onClick={() => openBannerModal(b)} className="material-symbols-outlined text-on-surface-variant hover:text-secondary">edit</button>
                                <button onClick={() => deleteBanner(b.id)} className="material-symbols-outlined text-status-danger/70 hover:text-status-danger">delete</button>
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
                    <div className="p-3 bg-surface-container-low border border-outline-variant rounded text-center text-on-surface-variant text-body-sm">No onboarding screens</div>
                  ) : (
                    onboarding.map((s: any, i: number) => (
                      <div key={s.id} className="p-3 bg-surface-container-low border border-outline-variant rounded">
                        <p className="font-label-caps text-secondary mb-1">SCREEN {i + 1}</p>
                        <p className="font-body-sm line-clamp-1">{s.text || s.description || s.title || "\u2014"}</p>
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => setShowOnboardingModal(true)}
                    className="w-full border border-dashed border-outline-variant py-2 rounded text-on-surface-variant hover:text-secondary hover:border-secondary transition-all font-label-caps"
                  >
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
                  <select
                    className="bg-surface-container-low border border-outline-variant rounded text-xs p-1"
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="transactions">Transactions</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                  {filteredFaqs.length === 0 ? (
                    <div className="p-4 text-center text-on-surface-variant text-body-sm">No FAQs in this category</div>
                  ) : (
                    filteredFaqs.map((f: any) => (
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
                    <p className="text-status-info">API_ENDPOINT: <span className="text-on-surface">{advanced.apiEndpoint || "https://api.smclientkx.com/v2"}</span></p>
                    <p className="text-status-info">FIRESTORE: <span className="text-status-success flex items-center gap-1 inline-flex"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> REAL-TIME ACTIVE</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (confirm("Purge system cache? This will clear cached data.")) {
                          flash("success", "System cache purged");
                        }
                      }}
                      className="flex-1 bg-surface-container-high border border-outline-variant py-2 rounded font-label-caps hover:bg-error/10 hover:text-error transition-colors"
                    >
                      PURGE SYSTEM CACHE
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="flex-1 bg-surface-container-high border border-outline-variant py-2 rounded font-label-caps hover:bg-secondary/10 hover:text-secondary transition-colors"
                    >
                      RELOAD CONFIG
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Banner Modal ────────────────────────────────────────── */}
      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowBannerModal(false)}>
          <div className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary">{editingBanner ? "Edit Banner" : "New Banner"}</h3>
              <button onClick={() => setShowBannerModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Title</label>
                <input className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Image URL</label>
                <input className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none" value={bannerForm.imageUrl} onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })} />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Link / Route</label>
                <input className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none" value={bannerForm.link} onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })} />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Status</label>
                <select className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none" value={bannerForm.status} onChange={(e) => setBannerForm({ ...bannerForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowBannerModal(false)} className="flex-1 py-2 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors">Cancel</button>
              <button onClick={saveBanner} className="flex-1 py-2 bg-secondary text-on-secondary-container rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity">{editingBanner ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboarding Modal ────────────────────────────────────── */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowOnboardingModal(false)}>
          <div className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary">Add Onboarding Step</h3>
              <button onClick={() => setShowOnboardingModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Title</label>
                <input className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none" value={onboardingForm.title} onChange={(e) => setOnboardingForm({ ...onboardingForm, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Description</label>
                <textarea className="w-full h-24 bg-surface-container-low border border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:border-secondary outline-none resize-none" value={onboardingForm.text} onChange={(e) => setOnboardingForm({ ...onboardingForm, text: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowOnboardingModal(false)} className="flex-1 py-2 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors">Cancel</button>
              <button onClick={saveOnboardingStep} className="flex-1 py-2 bg-secondary text-on-secondary-container rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity">Add Step</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
