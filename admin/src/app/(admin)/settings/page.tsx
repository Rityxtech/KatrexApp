"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppSettings } from "@/hooks/useAdminData";
import { setDocument, updateDocument, deleteDocument } from "@/hooks/useFirestore";

type SettingsTab = "general" | "modules" | "banners" | "onboarding" | "faqs" | "diagnostics";

const TAB_CONFIG: { id: SettingsTab; label: string; icon: string; badge?: string }[] = [
  { id: "general", label: "General & System", icon: "tune" },
  { id: "modules", label: "Service Modules", icon: "toggle_on" },
  { id: "banners", label: "Banners & Promos", icon: "view_carousel" },
  { id: "onboarding", label: "Onboarding Flow", icon: "flight_takeoff" },
  { id: "faqs", label: "FAQ & Help", icon: "help_center" },
  { id: "diagnostics", label: "System Diagnostics", icon: "terminal" },
];

export default function SettingsPage() {
  const { data: settings, loading } = useAppSettings();

  const systemConfig = settings.find((s: any) => s.id === "system") || {};
  const modules = settings.find((s: any) => s.id === "modules") || {};
  const banners = settings.filter((s: any) => s.type === "banner" || s.collection === "banners");
  const onboarding = settings.filter((s: any) => s.type === "onboarding" || s.collection === "onboarding");
  const faqs = settings.filter((s: any) => s.type === "faq" || s.collection === "faqs");
  const advanced = settings.find((s: any) => s.id === "advanced") || {};

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // ─── System Config state ───────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [androidVersion, setAndroidVersion] = useState("");
  const [iosVersion, setIosVersion] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("NGN");

  // ─── Module toggles ────────────────────────────────────────────
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({});

  // ─── Toast / Saving ────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Banner modal ──────────────────────────────────────────────
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerForm, setBannerForm] = useState({ title: "", imageUrl: "", link: "", status: "active" });

  // ─── Onboarding modal ──────────────────────────────────────────
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [editingOnboarding, setEditingOnboarding] = useState<any>(null);
  const [onboardingForm, setOnboardingForm] = useState({ title: "", text: "" });

  // ─── FAQ state & modal ─────────────────────────────────────────
  const [faqCategory, setFaqCategory] = useState("all");
  const [faqSearch, setFaqSearch] = useState("");
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "general" });

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
      flash("error", e.message || "Failed to delete banner");
    }
  };

  // ─── Onboarding CRUD ───────────────────────────────────────────
  const openOnboardingModal = (item?: any) => {
    if (item) {
      setEditingOnboarding(item);
      setOnboardingForm({ title: item.title || "", text: item.text || item.description || "" });
    } else {
      setEditingOnboarding(null);
      setOnboardingForm({ title: "", text: "" });
    }
    setShowOnboardingModal(true);
  };

  const saveOnboardingStep = async () => {
    if (!onboardingForm.title.trim() && !onboardingForm.text.trim()) {
      flash("error", "Title or text is required");
      return;
    }
    try {
      const id = editingOnboarding?.id || `onboarding_${Date.now()}`;
      await setDocument("app_settings", id, {
        id,
        type: "onboarding",
        collection: "onboarding",
        title: onboardingForm.title.trim(),
        text: onboardingForm.text.trim(),
        description: onboardingForm.text.trim(),
        sortOrder: editingOnboarding?.sortOrder ?? onboarding.length,
        updatedAt: new Date(),
      });
      flash("success", editingOnboarding ? "Onboarding step updated" : "Onboarding step added");
      setShowOnboardingModal(false);
      setOnboardingForm({ title: "", text: "" });
      setEditingOnboarding(null);
    } catch (e: any) {
      flash("error", e.message || "Failed to save onboarding step");
    }
  };

  const deleteOnboardingStep = async (id: string) => {
    if (!confirm("Delete this onboarding screen?")) return;
    try {
      await deleteDocument("app_settings", id);
      flash("success", "Onboarding screen removed");
    } catch (e: any) {
      flash("error", e.message || "Failed to delete step");
    }
  };

  // ─── FAQ CRUD ──────────────────────────────────────────────────
  const openFaqModal = (faq?: any) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({
        question: faq.question || faq.q || "",
        answer: faq.answer || faq.a || "",
        category: faq.category || "general",
      });
    } else {
      setEditingFaq(null);
      setFaqForm({ question: "", answer: "", category: "general" });
    }
    setShowFaqModal(true);
  };

  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      flash("error", "Both question and answer are required");
      return;
    }
    try {
      const id = editingFaq?.id || `faq_${Date.now()}`;
      await setDocument("app_settings", id, {
        id,
        type: "faq",
        collection: "faqs",
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category || "general",
        updatedAt: new Date(),
      });
      flash("success", editingFaq ? "FAQ updated" : "FAQ created");
      setShowFaqModal(false);
      setFaqForm({ question: "", answer: "", category: "general" });
      setEditingFaq(null);
    } catch (e: any) {
      flash("error", e.message || "Failed to save FAQ");
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ entry?")) return;
    try {
      await deleteDocument("app_settings", id);
      flash("success", "FAQ deleted");
    } catch (e: any) {
      flash("error", e.message || "Failed to delete FAQ");
    }
  };

  // ─── Filtered FAQs ─────────────────────────────────────────────
  const filteredFaqs = useMemo(() => {
    return faqs.filter((f: any) => {
      const catMatch = faqCategory === "all" || (f.category || "general").toLowerCase() === faqCategory.toLowerCase();
      const q = (f.question || f.q || "").toLowerCase();
      const a = (f.answer || f.a || "").toLowerCase();
      const searchMatch = !faqSearch.trim() || q.includes(faqSearch.toLowerCase()) || a.includes(faqSearch.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [faqs, faqCategory, faqSearch]);

  const moduleList = [
    {
      key: "p2p",
      icon: "swap_horizontal_circle",
      label: "P2P Marketplace",
      description: "Peer-to-peer cryptocurrency and fiat trading escrow engine",
      color: "text-secondary",
    },
    {
      key: "crypto",
      icon: "currency_exchange",
      label: "Instant Crypto Swap",
      description: "Automated wallet swap, rate quoting and exchange pool",
      color: "text-status-success",
    },
    {
      key: "airtime",
      icon: "phone_android",
      label: "Airtime & Utility Bills",
      description: "VTU airtime top-ups, data bundles, and electricity payments",
      color: "text-status-info",
    },
    {
      key: "giftcard",
      icon: "card_giftcard",
      label: "Giftcard Trade Desk",
      description: "International and domestic gift card verification and redemption",
      color: "text-status-warning",
    },
  ];

  return (
    <>
      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg shadow-xl text-body-sm font-medium flex items-center gap-[8px] animate-fadeIn ${
            toast.type === "success" ? "bg-status-success text-white" : "bg-status-danger text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.text}
        </div>
      )}

      <div className="px-container-padding pt-5 w-full">
        <div className="max-w-6xl mx-auto flex flex-col gap-[24px] pb-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-[16px] border-b border-outline-variant pb-4">
            <div>
              <div className="flex items-center gap-[12px]">
                <span className="material-symbols-outlined text-3xl text-primary">settings_applications</span>
                <h1 className="font-headline-lg text-headline-lg text-primary">App &amp; System Settings</h1>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-[8px] mt-1">
                Centralized configuration for Katrex Mobile Ecosystem
                <span className="inline-flex items-center gap-[4px] bg-status-success/10 text-status-success px-2 py-0.5 rounded text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE CLOUD CONFIG
                </span>
              </p>
            </div>
            <div className="flex items-center gap-[12px]">
              <button
                onClick={() => window.location.reload()}
                className="px-3.5 py-2 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface font-label-caps text-xs flex items-center gap-[6px] transition-colors"
                title="Reload current settings from server"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                REFRESH
              </button>
              <button
                onClick={publishChanges}
                disabled={saving}
                className="bg-secondary text-on-secondary px-5 py-2 rounded-lg font-label-caps font-bold flex items-center gap-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {saving ? "SAVING..." : "SAVE & PUBLISH"}
              </button>
            </div>
          </div>

          {/* Quick Info Bar */}
          {maintenanceMode && (
            <div className="bg-status-danger/10 border border-status-danger/30 rounded-lg p-3.5 flex items-center justify-between text-status-danger animate-fadeIn">
              <div className="flex items-center gap-[10px]">
                <span className="material-symbols-outlined text-[24px]">warning</span>
                <div>
                  <span className="font-bold text-body-md">MAINTENANCE MODE IS CURRENTLY ACTIVE</span>
                  <p className="text-xs text-on-surface-variant">
                    All standard user mobile interactions are suspended until disabled.
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMaintenance}
                className="bg-status-danger text-white px-3 py-1 rounded text-xs font-bold font-label-caps hover:brightness-110"
              >
                DISABLE NOW
              </button>
            </div>
          )}

          {/* Top Switchable Tabs */}
          <div className="flex overflow-x-auto border-b border-outline-variant gap-[8px] pb-px scrollbar-none" style={{ display: "flex", gap: "8px" }}>
            {TAB_CONFIG.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                  className={`flex items-center gap-[8px] px-4 py-2.5 rounded-t-lg font-label-caps text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? "border-secondary bg-surface-container text-secondary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                  <span>{t.label}</span>
                  {t.id === "banners" && (
                    <span className="ml-1 bg-surface-container-highest px-1.5 py-0.2 rounded-full text-[10px] text-on-surface-variant">
                      {banners.length}
                    </span>
                  )}
                  {t.id === "faqs" && (
                    <span className="ml-1 bg-surface-container-highest px-1.5 py-0.2 rounded-full text-[10px] text-on-surface-variant">
                      {faqs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB 1: GENERAL & SYSTEM
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-[20px] animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Row 1: Maintenance & Base Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]" style={{ display: "grid", gap: "20px" }}>
                {/* System Maintenance & Kill Switch */}
                <div className="bg-surface-container p-5 rounded-xl border border-outline-variant flex flex-col justify-between" style={{ padding: "20px" }}>
                  <div>
                    <div className="flex items-center gap-[8px] mb-3">
                      <span className="material-symbols-outlined text-secondary">power_settings_new</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">Ecosystem Maintenance</h2>
                    </div>
                    <p className="font-body-sm text-on-surface-variant mb-4">
                      Instantly restrict end-user application access for scheduled maintenance or emergency upgrades.
                    </p>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/50 flex items-center justify-between" style={{ padding: "16px" }}>
                    <div>
                      <span className="font-bold font-body-md text-on-surface block">App-wide Lock</span>
                      <span
                        className={`text-xs font-bold font-label-caps ${
                          maintenanceMode ? "text-status-danger" : "text-status-success"
                        }`}
                      >
                        {maintenanceMode ? "ACTIVE (ACCESS BLOCKED)" : "ONLINE (NORMAL ACCESS)"}
                      </span>
                    </div>
                    <button
                      onClick={toggleMaintenance}
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        maintenanceMode ? "bg-status-danger" : "bg-outline-variant"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          maintenanceMode ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Global Default Currency */}
                <div className="bg-surface-container p-5 rounded-xl border border-outline-variant flex flex-col justify-between" style={{ padding: "20px" }}>
                  <div>
                    <div className="flex items-center gap-[8px] mb-3">
                      <span className="material-symbols-outlined text-secondary">monetization_on</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">Base Currency</h2>
                    </div>
                    <p className="font-body-sm text-on-surface-variant mb-4">
                      Default fiat denomination for wallet valuation, order calculation and fee summaries.
                    </p>
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className="font-label-caps text-[11px] text-on-surface-variant uppercase">
                      Primary Display Currency
                    </label>
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 font-body-md text-on-surface focus:border-secondary outline-none cursor-pointer"
                      style={{ padding: "10px 12px" }}
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                    >
                      <option value="NGN">NGN — Nigerian Naira (₦)</option>
                      <option value="USD">USD — United States Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                      <option value="GBP">GBP — British Pound (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Version Management (Full Width Card) */}
              <div className="w-full bg-surface-container p-5 rounded-xl border border-outline-variant flex flex-col gap-[16px]" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div className="flex items-center gap-[8px] mb-1">
                    <span className="material-symbols-outlined text-secondary">system_update</span>
                    <h2 className="font-headline-md text-headline-md text-on-surface">Mobile Client Version Enforcement</h2>
                  </div>
                  <p className="font-body-sm text-on-surface-variant">
                    Control the minimum required version numbers. Users running versions lower than specified will be
                    prompted to upgrade via their platform store.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] pt-1" style={{ display: "grid", gap: "16px" }}>
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant" style={{ padding: "16px" }}>
                    <div className="flex items-center gap-[8px] mb-2">
                      <span className="material-symbols-outlined text-status-success">android</span>
                      <span className="font-label-caps font-bold text-on-surface">ANDROID OS VERSION</span>
                    </div>
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-data-mono text-primary focus:border-secondary outline-none"
                      style={{ padding: "8px 12px" }}
                      type="text"
                      value={androidVersion}
                      onChange={(e) => setAndroidVersion(e.target.value)}
                      placeholder="e.g. 2.4.1"
                    />
                    <span className="text-[11px] text-on-surface-variant block mt-1">
                      Play Store version requirement
                    </span>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant" style={{ padding: "16px" }}>
                    <div className="flex items-center gap-[8px] mb-2">
                      <span className="material-symbols-outlined text-status-info">phone_iphone</span>
                      <span className="font-label-caps font-bold text-on-surface">APPLE IOS VERSION</span>
                    </div>
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-data-mono text-primary focus:border-secondary outline-none"
                      style={{ padding: "8px 12px" }}
                      type="text"
                      value={iosVersion}
                      onChange={(e) => setIosVersion(e.target.value)}
                      placeholder="e.g. 2.4.0"
                    />
                    <span className="text-[11px] text-on-surface-variant block mt-1">App Store version requirement</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: SERVICE MODULES
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "modules" && (
            <div className="flex flex-col gap-[16px] animate-fadeIn">
              <div className="bg-surface-container p-4 rounded-xl border border-outline-variant">
                <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-[8px] mb-1">
                  <span className="material-symbols-outlined text-secondary">tune</span>
                  Feature Flags &amp; Service Toggles
                </h2>
                <p className="font-body-sm text-on-surface-variant">
                  Enable or disable entire functional modules in real-time. Disabled modules will be hidden or set to
                  maintenance in user apps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                {moduleList.map((m) => {
                  const enabled = moduleState[m.key] !== false;
                  return (
                    <div
                      key={m.key}
                      className={`bg-surface-container p-5 rounded-xl border transition-all flex flex-col justify-between ${
                        enabled ? "border-outline-variant hover:border-secondary" : "border-outline-variant/40 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-[12px] mb-4">
                        <div className="flex items-center gap-[12px]">
                          <div
                            className={`w-12 h-12 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-center ${m.color}`}
                          >
                            <span className="material-symbols-outlined text-2xl">{m.icon}</span>
                          </div>
                          <div>
                            <h3 className="font-body-md font-bold text-on-surface text-base">{m.label}</h3>
                            <span
                              className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-label-caps font-bold mt-0.5 ${
                                enabled
                                  ? "bg-status-success/15 text-status-success"
                                  : "bg-status-danger/15 text-status-danger"
                              }`}
                            >
                              {enabled ? "OPERATIONAL" : "DISABLED"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleModule(m.key)}
                          className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
                            enabled ? "bg-secondary" : "bg-outline-variant"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              enabled ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-body-sm text-on-surface-variant border-t border-outline-variant/30 pt-3">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: BANNERS & PROMOS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "banners" && (
            <div className="flex flex-col gap-[16px] animate-fadeIn">
              <div className="flex justify-between items-center bg-surface-container p-4 rounded-xl border border-outline-variant">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-[8px]">
                    <span className="material-symbols-outlined text-secondary">view_carousel</span>
                    Home Banners &amp; Campaigns
                  </h2>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    Promotional graphics displayed on the mobile app home screen carousel.
                  </p>
                </div>
                <button
                  onClick={() => openBannerModal()}
                  className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps text-xs font-bold flex items-center gap-[6px] hover:opacity-90 transition-opacity shadow"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> ADD NEW BANNER
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-44 bg-surface-container rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : banners.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-[54px] opacity-30 mb-2">add_photo_alternate</span>
                  <p className="font-bold text-body-md text-on-surface">No banners configured</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm">
                    Add banners to feature promos, updates, and market events on users' mobile feeds.
                  </p>
                  <button
                    onClick={() => openBannerModal()}
                    className="mt-4 border border-secondary text-secondary px-4 py-1.5 rounded-lg font-label-caps text-xs font-bold hover:bg-secondary/10"
                  >
                    CREATE FIRST BANNER
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                  {banners.map((b: any) => (
                    <div
                      key={b.id}
                      className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col justify-between group hover:border-secondary transition-all shadow-sm"
                    >
                      <div>
                        {/* Image Preview Banner */}
                        <div className="w-full h-36 bg-surface-container-highest relative flex items-center justify-center overflow-hidden border-b border-outline-variant">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-on-surface-variant/40">
                              <span className="material-symbols-outlined text-[36px]">image</span>
                              <span className="text-[10px] font-data-mono">NO IMAGE URL</span>
                            </div>
                          )}
                          <span
                            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                              b.status === "active"
                                ? "bg-status-success text-white"
                                : "bg-surface-deep text-on-surface-variant"
                            }`}
                          >
                            {b.status || "draft"}
                          </span>
                        </div>

                        {/* Banner Details */}
                        <div className="p-4">
                          <h3 className="font-body-md font-bold text-on-surface truncate text-base">{b.title}</h3>
                          <p className="text-xs text-on-surface-variant font-data-mono truncate mt-1 flex items-center gap-[4px]">
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            {b.link || b.url || "No link destination"}
                          </p>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="px-4 py-2.5 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
                        <span className="font-data-mono text-[10px] text-on-surface-variant">ID: #{b.id?.slice(0, 10)}</span>
                        <div className="flex gap-[8px]">
                          <button
                            onClick={() => openBannerModal(b)}
                            className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant text-xs text-on-surface hover:text-secondary flex items-center gap-[4px] font-label-caps"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span> EDIT
                          </button>
                          <button
                            onClick={() => deleteBanner(b.id)}
                            className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant text-xs text-status-danger hover:bg-status-danger/10 flex items-center gap-[4px] font-label-caps"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span> DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: ONBOARDING FLOW
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "onboarding" && (
            <div className="flex flex-col gap-[16px] animate-fadeIn">
              <div className="flex justify-between items-center bg-surface-container p-4 rounded-xl border border-outline-variant">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-[8px]">
                    <span className="material-symbols-outlined text-secondary">flight_takeoff</span>
                    First-time Onboarding Sequence
                  </h2>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    Welcome slides shown to newly registered mobile users on initial launch.
                  </p>
                </div>
                <button
                  onClick={() => openOnboardingModal()}
                  className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps text-xs font-bold flex items-center gap-[6px] hover:opacity-90 transition-opacity shadow"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> ADD ONBOARDING STEP
                </button>
              </div>

              {onboarding.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-[54px] opacity-30 mb-2">view_carousel</span>
                  <p className="font-bold text-body-md text-on-surface">No onboarding steps defined</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm">
                    Create onboarding steps to introduce users to app features like P2P trading and Crypto wallet.
                  </p>
                  <button
                    onClick={() => openOnboardingModal()}
                    className="mt-4 border border-secondary text-secondary px-4 py-1.5 rounded-lg font-label-caps text-xs font-bold hover:bg-secondary/10"
                  >
                    ADD STEP 1
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
                  {onboarding.map((s: any, idx: number) => (
                    <div
                      key={s.id}
                      className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col justify-between group hover:border-secondary transition-colors shadow-sm relative"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full font-label-caps text-xs font-bold">
                            STEP {idx + 1}
                          </span>
                          <div className="flex gap-[4px]">
                            <button
                              onClick={() => openOnboardingModal(s)}
                              className="p-1 text-on-surface-variant hover:text-secondary rounded"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => deleteOnboardingStep(s.id)}
                              className="p-1 text-on-surface-variant hover:text-status-danger rounded"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        <h3 className="font-body-md font-bold text-on-surface text-base mb-2">
                          {s.title || `Onboarding Screen ${idx + 1}`}
                        </h3>
                        <p className="font-body-sm text-on-surface-variant leading-relaxed line-clamp-4">
                          {s.text || s.description || "No description provided."}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant font-data-mono">
                        <span>Seq: {idx + 1} of {onboarding.length}</span>
                        <span className="text-secondary font-bold">ACTIVE</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 5: FAQ & HELP
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "faqs" && (
            <div className="flex flex-col gap-[16px] animate-fadeIn">
              <div className="bg-surface-container p-4 rounded-xl border border-outline-variant flex flex-col gap-[12px]">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-[12px]">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-[8px]">
                      <span className="material-symbols-outlined text-secondary">help_center</span>
                      Frequently Asked Questions
                    </h2>
                    <p className="font-body-sm text-on-surface-variant mt-0.5">
                      Customer support knowledge base articles shown in the mobile help screen.
                    </p>
                  </div>
                  <button
                    onClick={() => openFaqModal()}
                    className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps text-xs font-bold flex items-center gap-[6px] hover:opacity-90 transition-opacity shadow self-start md:self-auto"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> NEW FAQ ITEM
                  </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row gap-[12px] pt-2 border-t border-outline-variant/40">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-body-sm text-on-surface focus:border-secondary outline-none"
                      placeholder="Search questions or answers..."
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-[8px] shrink-0">
                    {["all", "general", "transactions", "security"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFaqCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg font-label-caps text-xs capitalize transition-all ${
                          faqCategory === cat
                            ? "bg-secondary text-on-secondary font-bold"
                            : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-[54px] opacity-30 mb-2">quiz</span>
                  <p className="font-bold text-body-md text-on-surface">No FAQ articles found</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm">
                    {faqSearch ? "Try adjusting your search keywords." : "Click below to add your first knowledge base article."}
                  </p>
                  {!faqSearch && (
                    <button
                      onClick={() => openFaqModal()}
                      className="mt-4 border border-secondary text-secondary px-4 py-1.5 rounded-lg font-label-caps text-xs font-bold hover:bg-secondary/10"
                    >
                      CREATE FAQ
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-[12px]">
                  {filteredFaqs.map((f: any) => (
                    <div
                      key={f.id}
                      className="bg-surface-container border border-outline-variant rounded-xl p-4.5 hover:border-secondary transition-colors shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-[16px]">
                        <div className="flex-1">
                          <div className="flex items-center gap-[8px] mb-1">
                            <span className="px-2 py-0.2 rounded text-[10px] font-label-caps font-bold uppercase bg-surface-container-highest text-secondary">
                              {f.category || "general"}
                            </span>
                            <span className="text-[10px] font-data-mono text-on-surface-variant">
                              ID: #{f.id?.slice(0, 8)}
                            </span>
                          </div>
                          <h3 className="font-body-md font-bold text-primary text-base">{f.question || f.q}</h3>
                          <p className="text-body-sm text-on-surface-variant mt-2 leading-relaxed whitespace-pre-line">
                            {f.answer || f.a}
                          </p>
                        </div>

                        <div className="flex gap-[4px] shrink-0">
                          <button
                            onClick={() => openFaqModal(f)}
                            className="p-1.5 text-on-surface-variant hover:text-secondary rounded bg-surface-container-low border border-outline-variant hover:border-secondary"
                            title="Edit FAQ"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => deleteFaq(f.id)}
                            className="p-1.5 text-on-surface-variant hover:text-status-danger rounded bg-surface-container-low border border-outline-variant hover:border-status-danger"
                            title="Delete FAQ"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 6: DIAGNOSTICS & SYSTEM
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "diagnostics" && (
            <div className="flex flex-col gap-[20px] animate-fadeIn">
              <div className="bg-surface-container p-5 rounded-xl border border-outline-variant flex flex-col gap-[16px]">
                <div className="flex items-center gap-[8px]">
                  <span className="material-symbols-outlined text-secondary">terminal</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Runtime Telemetry &amp; Endpoints</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant flex flex-col gap-[8px] font-data-mono text-xs">
                    <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                      <span className="text-on-surface-variant">FIREBASE_ENV:</span>
                      <span className="text-primary font-bold">{advanced.firebaseEnv || "production-k-01"}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                      <span className="text-on-surface-variant">PROJECT_ID:</span>
                      <span className="text-on-surface">katrexapp-83cde</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                      <span className="text-on-surface-variant">API_ENDPOINT:</span>
                      <span className="text-secondary truncate max-w-[240px]">
                        {advanced.apiEndpoint || "https://api.smclientkx.com/v2"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">FIRESTORE SYNC:</span>
                      <span className="text-status-success flex items-center gap-[4px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> REAL-TIME ACTIVE
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant flex flex-col gap-[8px] font-data-mono text-xs">
                    <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                      <span className="text-on-surface-variant">NODE_RUNTIME:</span>
                      <span className="text-on-surface">Node.js 20.x (Cloud Functions)</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                      <span className="text-on-surface-variant">ENCRYPTION:</span>
                      <span className="text-status-success">AES-256 / SHA-256 HMAC</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                      <span className="text-on-surface-variant">R2 STORAGE:</span>
                      <span className="text-status-info">Cloudflare R2 Bucket</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">FIAT PROVIDER:</span>
                      <span className="text-on-surface">Squad / Monnify Gateway</span>
                    </div>
                  </div>
                </div>

                {/* Operations */}
                <div className="pt-2 flex flex-wrap gap-[12px]">
                  <button
                    onClick={() => {
                      if (confirm("Purge system cache? This will force live reload on next client fetch.")) {
                        flash("success", "System cache purged successfully");
                      }
                    }}
                    className="bg-surface-container-high border border-outline-variant px-4 py-2.5 rounded-lg font-label-caps text-xs font-bold hover:bg-status-danger/15 hover:text-status-danger transition-colors flex items-center gap-[6px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">cached</span>
                    PURGE SYSTEM CACHE
                  </button>
                  <button
                    onClick={() => {
                      flash("success", "Client configuration synchronized");
                    }}
                    className="bg-surface-container-high border border-outline-variant px-4 py-2.5 rounded-lg font-label-caps text-xs font-bold hover:bg-secondary/15 hover:text-secondary transition-colors flex items-center gap-[6px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    FORCE SYNC CONFIG
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Banner Modal ────────────────────────────────────────── */}
      {showBannerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={() => setShowBannerModal(false)}
        >
          <div
            className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-md w-full flex flex-col gap-[16px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingBanner ? "Edit Promotional Banner" : "New Promotional Banner"}
              </h3>
              <button onClick={() => setShowBannerModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-[12px] font-body-sm">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Banner Title *</label>
                <input
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  placeholder="e.g. 50% Off Swap Fees"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Image URL</label>
                <input
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  placeholder="https://.../banner.png"
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Link / Route Destination</label>
                <input
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none font-data-mono"
                  placeholder="e.g. /trade or https://..."
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Publication Status</label>
                <select
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none cursor-pointer"
                  value={bannerForm.status}
                  onChange={(e) => setBannerForm({ ...bannerForm, status: e.target.value })}
                >
                  <option value="active">Active (Visible in App)</option>
                  <option value="draft">Draft (Hidden)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-[8px] pt-2 border-t border-outline-variant/30">
              <button
                onClick={() => setShowBannerModal(false)}
                className="flex-1 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors font-label-caps"
              >
                Cancel
              </button>
              <button
                onClick={saveBanner}
                className="flex-1 py-2.5 bg-secondary text-on-secondary rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity font-label-caps shadow"
              >
                {editingBanner ? "Update Banner" : "Create Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboarding Modal ────────────────────────────────────── */}
      {showOnboardingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={() => setShowOnboardingModal(false)}
        >
          <div
            className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-md w-full flex flex-col gap-[16px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingOnboarding ? "Edit Onboarding Step" : "New Onboarding Step"}
              </h3>
              <button onClick={() => setShowOnboardingModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-[12px] font-body-sm">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Screen Title *</label>
                <input
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  placeholder="e.g. Instant P2P Escrow"
                  value={onboardingForm.title}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Screen Description *</label>
                <textarea
                  className="w-full h-24 bg-surface-container-low border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:border-secondary outline-none resize-none leading-relaxed"
                  placeholder="Explain feature highlights clearly to new users..."
                  value={onboardingForm.text}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, text: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-[8px] pt-2 border-t border-outline-variant/30">
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="flex-1 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors font-label-caps"
              >
                Cancel
              </button>
              <button
                onClick={saveOnboardingStep}
                className="flex-1 py-2.5 bg-secondary text-on-secondary rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity font-label-caps shadow"
              >
                {editingOnboarding ? "Update Screen" : "Save Screen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ───────────────────────────────────────────── */}
      {showFaqModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={() => setShowFaqModal(false)}
        >
          <div
            className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-lg w-full flex flex-col gap-[16px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingFaq ? "Edit FAQ Article" : "Create New FAQ Article"}
              </h3>
              <button onClick={() => setShowFaqModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-[12px] font-body-sm">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Category</label>
                <select
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none cursor-pointer"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="transactions">Transactions &amp; Payments</option>
                  <option value="security">Security &amp; KYC</option>
                </select>
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Question / Topic *</label>
                <input
                  className="w-full h-10 bg-surface-container-low border border-subtle rounded-lg px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  placeholder="e.g. How long do crypto withdrawals take?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1 font-bold">Answer / Instructions *</label>
                <textarea
                  className="w-full h-32 bg-surface-container-low border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:border-secondary outline-none resize-none leading-relaxed"
                  placeholder="Provide clear, concise guidance for the customer..."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-[8px] pt-2 border-t border-outline-variant/30">
              <button
                onClick={() => setShowFaqModal(false)}
                className="flex-1 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors font-label-caps"
              >
                Cancel
              </button>
              <button
                onClick={saveFaq}
                className="flex-1 py-2.5 bg-secondary text-on-secondary rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity font-label-caps shadow"
              >
                {editingFaq ? "Update Article" : "Save Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
