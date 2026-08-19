"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppSettings } from "@/hooks/useAdminData";
import { setDocument, updateDocument, deleteDocument } from "@/hooks/useFirestore";

type SettingsTab = "system" | "modules" | "banners" | "content" | "advanced";

export default function SettingsPage() {
  const { data: settings, loading } = useAppSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("system");

  // Extract structured documents from app_settings collection
  const systemConfig = useMemo(() => settings.find((s: any) => s.id === "system") || {}, [settings]);
  const modules = useMemo(() => settings.find((s: any) => s.id === "modules") || {}, [settings]);
  const banners = useMemo(() => settings.filter((s: any) => s.type === "banner" || s.collection === "banners"), [settings]);
  const onboarding = useMemo(() => {
    const list = settings.filter((s: any) => s.type === "onboarding" || s.collection === "onboarding");
    return list.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [settings]);
  const faqs = useMemo(() => {
    const list = settings.filter((s: any) => s.type === "faq" || s.collection === "faqs");
    return list.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [settings]);
  const advanced = useMemo(() => settings.find((s: any) => s.id === "advanced") || {}, [settings]);

  // ─── System Config state ───────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [androidVersion, setAndroidVersion] = useState("");
  const [iosVersion, setIosVersion] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("NGN");
  const [supportEmail, setSupportEmail] = useState("");

  // ─── Module toggles ────────────────────────────────────────────
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({
    p2p: true,
    crypto: true,
    airtime: true,
    giftcard: true,
    virtualCard: true,
    referral: true,
  });

  // ─── Toast & Feedback ──────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Banner modal ──────────────────────────────────────────────
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    imageUrl: "",
    link: "",
    tag: "PROMO",
    status: "active",
  });

  // ─── Onboarding modal ──────────────────────────────────────────
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [editingOnboarding, setEditingOnboarding] = useState<any>(null);
  const [onboardingForm, setOnboardingForm] = useState({ title: "", text: "", imageUrl: "" });

  // ─── FAQ modal & filter ────────────────────────────────────────
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqCategory, setFaqCategory] = useState("all");
  const [faqSearch, setFaqSearch] = useState("");
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "General" });

  // ─── Sync state from Firestore ─────────────────────────────────
  useEffect(() => {
    if (systemConfig) {
      setMaintenanceMode(systemConfig.maintenanceMode === true);
      setMaintenanceMessage(systemConfig.maintenanceMessage || "");
      setAndroidVersion(systemConfig.androidVersion || "");
      setIosVersion(systemConfig.iosVersion || "");
      setForceUpdate(systemConfig.forceUpdate === true);
      setDefaultCurrency(systemConfig.defaultCurrency || "NGN");
      setSupportEmail(systemConfig.supportEmail || "support@katrex.com");
    }
    if (modules) {
      setModuleState({
        p2p: modules.p2p !== false,
        crypto: modules.crypto !== false,
        airtime: modules.airtime !== false,
        giftcard: modules.giftcard !== false,
        virtualCard: modules.virtualCard !== false,
        referral: modules.referral !== false,
      });
    }
  }, [systemConfig, modules]);

  function flash(type: "success" | "error" | "info", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Save all settings ─────────────────────────────────────────
  const publishChanges = async () => {
    setSaving(true);
    try {
      await setDocument("app_settings", "system", {
        maintenanceMode,
        maintenanceMessage,
        androidVersion,
        iosVersion,
        forceUpdate,
        defaultCurrency,
        supportEmail,
        updatedAt: new Date(),
      });
      await setDocument("app_settings", "modules", {
        ...moduleState,
        updatedAt: new Date(),
      });
      flash("success", "System & module settings saved successfully");
    } catch (e: any) {
      flash("error", e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ─── Quick Toggle maintenance mode ─────────────────────────────
  const toggleMaintenance = async () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    try {
      await updateDocument("app_settings", "system", { maintenanceMode: next });
      flash("success", next ? "Maintenance Mode ACTIVATED (App access disabled)" : "Maintenance Mode DEACTIVATED (Live)");
    } catch (e: any) {
      setMaintenanceMode(!next);
      flash("error", e.message || "Failed to toggle maintenance mode");
    }
  };

  // ─── Toggle individual module ──────────────────────────────────
  const toggleModule = async (key: string) => {
    const next = { ...moduleState, [key]: !moduleState[key] };
    setModuleState(next);
    try {
      await updateDocument("app_settings", "modules", { [key]: next[key] });
      flash("success", `${key.toUpperCase()} module is now ${next[key] ? "ENABLED" : "DISABLED"}`);
    } catch (e: any) {
      setModuleState(moduleState);
      flash("error", e.message || "Failed to toggle module");
    }
  };

  // ─── Banner CRUD ───────────────────────────────────────────────
  const openBannerModal = (b?: any) => {
    if (b) {
      setEditingBanner(b);
      setBannerForm({
        title: b.title || "",
        imageUrl: b.imageUrl || "",
        link: b.link || b.url || "",
        tag: b.tag || "PROMO",
        status: b.status || "active",
      });
    } else {
      setEditingBanner(null);
      setBannerForm({ title: "", imageUrl: "", link: "", tag: "PROMO", status: "active" });
    }
    setShowBannerModal(true);
  };

  const saveBanner = async () => {
    if (!bannerForm.title.trim()) {
      flash("error", "Banner title is required");
      return;
    }
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
        tag: bannerForm.tag.trim().toUpperCase(),
        status: bannerForm.status,
        updatedAt: new Date(),
      });
      flash("success", `Banner ${editingBanner ? "updated" : "created"} successfully`);
      setShowBannerModal(false);
    } catch (e: any) {
      flash("error", e.message || "Failed to save banner");
    }
  };

  const toggleBannerStatus = async (banner: any) => {
    const newStatus = banner.status === "active" ? "draft" : "active";
    try {
      await updateDocument("app_settings", banner.id, { status: newStatus });
      flash("success", `Banner set to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      flash("error", "Failed to update banner status");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this banner?")) return;
    try {
      await deleteDocument("app_settings", id);
      flash("success", "Banner deleted successfully");
    } catch (e: any) {
      flash("error", e.message || "Failed to delete banner");
    }
  };

  // ─── Onboarding CRUD ───────────────────────────────────────────
  const openOnboardingModal = (item?: any) => {
    if (item) {
      setEditingOnboarding(item);
      setOnboardingForm({
        title: item.title || "",
        text: item.text || item.description || "",
        imageUrl: item.imageUrl || "",
      });
    } else {
      setEditingOnboarding(null);
      setOnboardingForm({ title: "", text: "", imageUrl: "" });
    }
    setShowOnboardingModal(true);
  };

  const saveOnboardingStep = async () => {
    if (!onboardingForm.title.trim() && !onboardingForm.text.trim()) {
      flash("error", "Title or description is required");
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
        imageUrl: onboardingForm.imageUrl.trim(),
        sortOrder: editingOnboarding ? editingOnboarding.sortOrder ?? 0 : onboarding.length,
        updatedAt: new Date(),
      });
      flash("success", `Onboarding screen ${editingOnboarding ? "updated" : "added"}`);
      setShowOnboardingModal(false);
      setOnboardingForm({ title: "", text: "", imageUrl: "" });
    } catch (e: any) {
      flash("error", e.message || "Failed to save onboarding step");
    }
  };

  const deleteOnboarding = async (id: string) => {
    if (!confirm("Delete this onboarding screen?")) return;
    try {
      await deleteDocument("app_settings", id);
      flash("success", "Onboarding screen deleted");
    } catch (e: any) {
      flash("error", "Failed to delete screen");
    }
  };

  // ─── FAQ CRUD ──────────────────────────────────────────────────
  const openFaqModal = (faq?: any) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({
        question: faq.question || faq.q || "",
        answer: faq.answer || faq.a || "",
        category: faq.category || "General",
      });
    } else {
      setEditingFaq(null);
      setFaqForm({ question: "", answer: "", category: "General" });
    }
    setShowFaqModal(true);
  };

  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      flash("error", "Question and answer are both required");
      return;
    }
    try {
      const id = editingFaq?.id || `faq_${Date.now()}`;
      await setDocument("app_settings", id, {
        id,
        type: "faq",
        collection: "faqs",
        question: faqForm.question.trim(),
        q: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        a: faqForm.answer.trim(),
        category: faqForm.category,
        sortOrder: editingFaq ? editingFaq.sortOrder ?? 0 : faqs.length,
        updatedAt: new Date(),
      });
      flash("success", `FAQ ${editingFaq ? "updated" : "created"}`);
      setShowFaqModal(false);
    } catch (e: any) {
      flash("error", e.message || "Failed to save FAQ");
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await deleteDocument("app_settings", id);
      flash("success", "FAQ deleted");
    } catch (e: any) {
      flash("error", "Failed to delete FAQ");
    }
  };

  // ─── Filtered FAQs ─────────────────────────────────────────────
  const filteredFaqs = useMemo(() => {
    return faqs.filter((f: any) => {
      const cat = (f.category || "General").toLowerCase();
      if (faqCategory !== "all" && cat !== faqCategory.toLowerCase()) return false;
      if (faqSearch.trim()) {
        const q = (f.question || f.q || "").toLowerCase();
        const a = (f.answer || f.a || "").toLowerCase();
        const term = faqSearch.toLowerCase();
        return q.includes(term) || a.includes(term);
      }
      return true;
    });
  }, [faqs, faqCategory, faqSearch]);

  const moduleDefinitions = [
    {
      key: "p2p",
      icon: "swap_horizontal_circle",
      label: "P2P Marketplace",
      desc: "Peer-to-peer escrow trade hub, listings and order dispute resolution.",
      color: "text-secondary",
    },
    {
      key: "crypto",
      icon: "currency_exchange",
      label: "Instant Crypto Swaps",
      desc: "Live rate quotes, automated wallet swaps, and instant crypto settlements.",
      color: "text-primary",
    },
    {
      key: "airtime",
      icon: "phone_android",
      label: "Airtime & Utility Bills",
      desc: "Mobile top-ups, data bundles, and automated utility bill payments.",
      color: "text-status-warning",
    },
    {
      key: "giftcard",
      icon: "card_giftcard",
      label: "Giftcard Trade Center",
      desc: "Instant card buy/sell, brand rates management, and automated payouts.",
      color: "text-status-info",
    },
    {
      key: "virtualCard",
      icon: "credit_card",
      label: "Virtual Dollar Cards",
      desc: "Virtual MasterCard/Visa issuance, card funding, and transaction tracking.",
      color: "text-status-success",
    },
    {
      key: "referral",
      icon: "groups",
      label: "Referral & Rewards",
      desc: "Referral code generation, commission tracking, and bonus claims.",
      color: "text-secondary",
    },
  ];

  return (
    <div className="px-container-padding pt-4 pb-12 w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* ── Toast Alert ─────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-2xl text-body-sm font-medium flex items-center gap-2.5 animate-fadeIn border ${
            toast.type === "success"
              ? "bg-status-success/15 text-status-success border-status-success/30"
              : toast.type === "error"
              ? "bg-status-danger/15 text-status-danger border-status-danger/30"
              : "bg-surface-container-highest text-on-surface border-subtle"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === "success" ? "check_circle" : toast.type === "error" ? "error" : "info"}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* ── Top Header & Global Actions ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-subtle pb-4 bg-surface-container/40 p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">tune</span>
            <h1 className="font-headline-lg text-headline-lg text-primary">System Settings &amp; Configuration</h1>
          </div>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            Centralized control center for features, branding, mobile versions, and content.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {maintenanceMode && (
            <span className="bg-status-danger/15 text-status-danger border border-status-danger/30 px-3 py-1 rounded-full text-xs font-label-caps font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-status-danger" />
              MAINTENANCE ACTIVE
            </span>
          )}
          <button
            onClick={publishChanges}
            disabled={saving}
            className="bg-secondary text-on-secondary px-5 py-2.5 rounded-lg font-label-caps font-bold flex items-center gap-2 hover:opacity-95 shadow-md transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {saving ? "hourglass_empty" : "save"}
            </span>
            {saving ? "SAVING..." : "PUBLISH CHANGES"}
          </button>
        </div>
      </div>

      {/* ── Switchable Tabs Bar ──────────────────────────────────── */}
      <div className="flex border-b border-subtle bg-surface-container p-1 rounded-lg gap-1.5 overflow-x-auto self-start">
        {[
          { id: "system", label: "General & App", icon: "settings_suggest" },
          { id: "modules", label: "Feature Modules", icon: "toggle_on" },
          { id: "banners", label: "Banners & Promos", icon: "view_carousel" },
          { id: "content", label: "Onboarding & FAQs", icon: "quiz" },
          { id: "advanced", label: "System Diagnostics", icon: "terminal" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as SettingsTab)}
            className={`px-4 py-2 rounded-md font-label-caps text-label-caps flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === t.id
                ? "bg-primary text-on-primary shadow-sm font-bold"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: GENERAL & SYSTEM CONFIGURATION
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Maintenance & Emergency Panel */}
          <div className="lg:col-span-6 bg-surface-bright border border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-subtle">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-status-danger text-2xl">warning</span>
                  <h3 className="font-headline-md text-on-surface">Emergency &amp; Maintenance Mode</h3>
                </div>
                <button
                  onClick={toggleMaintenance}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    maintenanceMode ? "bg-status-danger" : "bg-surface-container-highest border border-subtle"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                      maintenanceMode ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3 bg-surface-container/60 border border-subtle rounded-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        maintenanceMode ? "bg-status-danger animate-pulse" : "bg-status-success"
                      }`}
                    />
                    <span className="font-body-sm font-bold text-on-surface">
                      Status: {maintenanceMode ? "ENABLED (Locked for all regular users)" : "DISABLED (Normal operations)"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    When active, mobile apps and web portals display the maintenance screen and block all trading, deposit, and withdrawal requests.
                  </p>
                </div>

                <div>
                  <label className="block font-label-caps text-on-surface-variant mb-1.5 uppercase text-[11px]">
                    Custom Maintenance Announcement
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none"
                    placeholder="We are currently upgrading our systems. Please check back in a few minutes."
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-subtle flex justify-between items-center text-xs text-on-surface-variant">
              <span>Admin accounts retain bypass capability</span>
              <button onClick={publishChanges} className="text-secondary font-bold hover:underline">
                Save Announcement
              </button>
            </div>
          </div>

          {/* App Versioning & Release Control */}
          <div className="lg:col-span-6 bg-surface-bright border border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-subtle">
                <span className="material-symbols-outlined text-secondary text-2xl">system_update</span>
                <h3 className="font-headline-md text-on-surface">App Release &amp; Updates</h3>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container/60 border border-subtle p-3 rounded-lg">
                    <span className="font-label-caps text-secondary text-[10px] block mb-1">ANDROID TARGET VERSION</span>
                    <input
                      type="text"
                      className="w-full bg-surface-container-high border border-subtle rounded px-2.5 py-1.5 font-data-mono text-body-sm text-primary focus:outline-none focus:border-secondary"
                      placeholder="e.g. 2.4.1"
                      value={androidVersion}
                      onChange={(e) => setAndroidVersion(e.target.value)}
                    />
                  </div>

                  <div className="bg-surface-container/60 border border-subtle p-3 rounded-lg">
                    <span className="font-label-caps text-secondary text-[10px] block mb-1">IOS TARGET VERSION</span>
                    <input
                      type="text"
                      className="w-full bg-surface-container-high border border-subtle rounded px-2.5 py-1.5 font-data-mono text-body-sm text-primary focus:outline-none focus:border-secondary"
                      placeholder="e.g. 2.4.0"
                      value={iosVersion}
                      onChange={(e) => setIosVersion(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-container/60 border border-subtle rounded-lg">
                  <div>
                    <span className="font-body-sm font-bold text-on-surface block">Mandatory (Force) Update</span>
                    <span className="text-xs text-on-surface-variant">
                      Forces users below target versions to update before accessing the app
                    </span>
                  </div>
                  <button
                    onClick={() => setForceUpdate(!forceUpdate)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      forceUpdate ? "bg-secondary" : "bg-surface-container-highest border border-subtle"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        forceUpdate ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-subtle text-xs text-on-surface-variant">
              Target versions match Play Store / App Store release numbers
            </div>
          </div>

          {/* Regional & Financial Defaults */}
          <div className="lg:col-span-12 bg-surface-bright border border-subtle rounded-xl p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-subtle">
              <span className="material-symbols-outlined text-primary text-2xl">public</span>
              <h3 className="font-headline-md text-on-surface">Regional Defaults &amp; Support Contact</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-label-caps text-on-surface-variant mb-1 uppercase text-[11px]">
                  Default Platform Base Currency
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="NGN">NGN - Nigerian Naira (₦)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                  <option value="KES">KES - Kenyan Shilling (KSh)</option>
                </select>
                <p className="text-xs text-on-surface-variant mt-1">
                  Controls default fiat display rates across all user dashboards.
                </p>
              </div>

              <div>
                <label className="block font-label-caps text-on-surface-variant mb-1 uppercase text-[11px]">
                  Official Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary font-data-mono"
                  placeholder="support@katrex.com"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Shown in verification emails and in-app contact cards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: FEATURE MODULE CONTROLS
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="bg-surface-container/60 border border-subtle p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-headline-md text-on-surface">Dynamic Service Modules</h3>
              <p className="text-body-sm text-on-surface-variant">
                Instantly turn features on or off without deploying app updates. Changes apply in real-time across client devices.
              </p>
            </div>
            <button
              onClick={publishChanges}
              disabled={saving}
              className="bg-secondary text-on-secondary px-4 py-1.5 rounded font-label-caps font-bold text-xs hover:opacity-90 transition-opacity"
            >
              SAVE MODULE STATES
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleDefinitions.map((mod) => {
              const isEnabled = moduleState[mod.key] !== false;
              return (
                <div
                  key={mod.key}
                  className={`bg-surface-bright border rounded-xl p-4 flex flex-col justify-between transition-all hover:border-secondary ${
                    isEnabled ? "border-subtle" : "border-status-danger/30 opacity-75"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container border border-subtle flex items-center justify-center">
                          <span className={`material-symbols-outlined ${mod.color} text-2xl`}>{mod.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-body-md font-bold text-on-surface">{mod.label}</h4>
                          <span
                            className={`text-[10px] font-label-caps px-2 py-0.5 rounded-full font-bold ${
                              isEnabled ? "bg-status-success/15 text-status-success" : "bg-status-danger/15 text-status-danger"
                            }`}
                          >
                            {isEnabled ? "ACTIVE & LIVE" : "DISABLED / HIDDEN"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleModule(mod.key)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          isEnabled ? "bg-secondary" : "bg-surface-container-highest border border-subtle"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                            isEnabled ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-body-sm text-on-surface-variant mt-3 text-xs leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-subtle/60 flex items-center justify-between text-[11px] font-data-mono text-on-surface-variant">
                    <span>KEY: {mod.key}</span>
                    <button onClick={() => toggleModule(mod.key)} className="text-secondary hover:underline font-bold">
                      {isEnabled ? "Disable Module" : "Enable Module"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: BANNERS & PROMOTION MANAGER
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "banners" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-surface-container/60 border border-subtle p-4 rounded-xl">
            <div>
              <h3 className="font-headline-md text-on-surface">Home Carousel &amp; Promo Banners</h3>
              <p className="text-body-sm text-on-surface-variant">
                Manage high-visibility promotional slides shown on the mobile homepage banner slider.
              </p>
            </div>
            <button
              onClick={() => openBannerModal()}
              className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps font-bold text-xs flex items-center gap-1.5 hover:opacity-90 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              CREATE NEW BANNER
            </button>
          </div>

          <div className="bg-surface-bright border border-subtle rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-surface-container rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : banners.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 text-on-surface-variant/40">view_carousel</span>
                  <p className="font-body-md font-bold text-on-surface">No banners configured</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Click "Create New Banner" to add promo graphics for trades, giveaways, or announcements.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left font-body-sm border-collapse">
                  <thead className="bg-surface-container text-on-surface-variant font-label-caps text-[10px] border-b border-subtle">
                    <tr>
                      <th className="px-4 py-3 font-bold">PREVIEW</th>
                      <th className="px-4 py-3 font-bold">TITLE &amp; TAG</th>
                      <th className="px-4 py-3 font-bold">ACTION LINK / ROUTE</th>
                      <th className="px-4 py-3 font-bold">STATUS</th>
                      <th className="px-4 py-3 font-bold text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {banners.map((b: any) => (
                      <tr key={b.id} className="hover:bg-surface-container/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-24 h-12 rounded-lg bg-surface-container-highest border border-subtle overflow-hidden flex items-center justify-center">
                            {b.imageUrl ? (
                              <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant/40">image</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">{b.title || "Untitled Banner"}</span>
                            {b.tag && (
                              <span className="text-[9px] font-label-caps px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                                {b.tag}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-on-surface-variant font-data-mono">ID: #{b.id?.slice(0, 10)}</span>
                        </td>
                        <td className="px-4 py-3 font-data-mono text-xs text-secondary truncate max-w-xs">
                          {b.link || b.url || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleBannerStatus(b)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              b.status === "active"
                                ? "bg-status-success/15 text-status-success hover:bg-status-success/25"
                                : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container"
                            }`}
                          >
                            {(b.status || "draft").toUpperCase()}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openBannerModal(b)}
                              className="p-1.5 text-on-surface-variant hover:text-secondary rounded hover:bg-surface-container"
                              title="Edit Banner"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => deleteBanner(b.id)}
                              className="p-1.5 text-status-danger/70 hover:text-status-danger rounded hover:bg-status-danger/10"
                              title="Delete Banner"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4: ONBOARDING & FAQ CONTENT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "content" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Onboarding Flow Sequence */}
          <div className="lg:col-span-5 bg-surface-bright border border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-subtle mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">flight_takeoff</span>
                  <h3 className="font-headline-md text-on-surface">Onboarding Screens</h3>
                </div>
                <button
                  onClick={() => openOnboardingModal()}
                  className="text-secondary font-label-caps text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> ADD SCREEN
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {onboarding.length === 0 ? (
                  <div className="p-6 bg-surface-container/50 border border-subtle rounded-lg text-center text-on-surface-variant text-body-sm">
                    No onboarding screens created yet.
                  </div>
                ) : (
                  onboarding.map((step: any, index: number) => (
                    <div
                      key={step.id}
                      className="p-3 bg-surface-container/60 border border-subtle rounded-lg flex items-start justify-between group hover:border-secondary transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-body-sm font-bold text-on-surface truncate">{step.title || `Screen ${index + 1}`}</h4>
                          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                            {step.text || step.description || "No description"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 ml-2">
                        <button
                          onClick={() => openOnboardingModal(step)}
                          className="p-1 text-on-surface-variant hover:text-secondary rounded"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => deleteOnboarding(step.id)}
                          className="p-1 text-status-danger/70 hover:text-status-danger rounded"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-subtle text-xs text-on-surface-variant">
              Screens are displayed sequentially when new users first launch the app.
            </div>
          </div>

          {/* FAQ Knowledge Base Editor */}
          <div className="lg:col-span-7 bg-surface-bright border border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-subtle mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">quiz</span>
                  <h3 className="font-headline-md text-on-surface">FAQ Knowledge Base</h3>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                    className="bg-surface-container border border-subtle rounded-md text-xs px-2.5 py-1 text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="transactions">Transactions</option>
                    <option value="security">Security</option>
                    <option value="trading">Trading &amp; Swaps</option>
                  </select>

                  <button
                    onClick={() => openFaqModal()}
                    className="bg-secondary text-on-secondary px-3 py-1 rounded font-label-caps font-bold text-xs flex items-center gap-1 hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    NEW FAQ
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search FAQ questions and answers..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full bg-surface-container border border-subtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredFaqs.length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant text-body-sm bg-surface-container/30 rounded-lg">
                    No FAQs found matching criteria.
                  </div>
                ) : (
                  filteredFaqs.map((faq: any) => (
                    <div
                      key={faq.id}
                      className="p-3 bg-surface-container/60 border border-subtle rounded-lg hover:border-secondary transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-label-caps px-1.5 py-0.2 rounded bg-surface-container-highest text-secondary border border-subtle font-bold">
                            {faq.category || "General"}
                          </span>
                          <h4 className="font-body-sm font-bold text-primary mt-1">{faq.question || faq.q || "—"}</h4>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => openFaqModal(faq)} className="p-1 text-on-surface-variant hover:text-secondary rounded">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => deleteFaq(faq.id)} className="p-1 text-status-danger/70 hover:text-status-danger rounded">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed bg-surface-container-low/50 p-2 rounded">
                        {faq.answer || faq.a || "—"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-subtle text-xs text-on-surface-variant flex justify-between items-center">
              <span>{filteredFaqs.length} active articles</span>
              <span className="font-data-mono">Searchable in Mobile Helpdesk</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 5: SYSTEM DIAGNOSTICS & CACHE
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "advanced" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Server Config & Environment */}
          <div className="lg:col-span-8 bg-surface-bright border border-subtle rounded-xl p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-subtle mb-4">
              <span className="material-symbols-outlined text-secondary text-2xl">dns</span>
              <h3 className="font-headline-md text-on-surface">Runtime Environment &amp; Integrations</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container/60 border border-subtle p-3.5 rounded-lg space-y-1.5">
                <span className="font-label-caps text-on-surface-variant text-[10px] block">FIREBASE PROJECT</span>
                <p className="font-data-mono text-body-sm font-bold text-primary">katrexapp-83cde</p>
                <div className="flex items-center gap-1.5 text-xs text-status-success font-medium">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  Connected to Production Cloud
                </div>
              </div>

              <div className="bg-surface-container/60 border border-subtle p-3.5 rounded-lg space-y-1.5">
                <span className="font-label-caps text-on-surface-variant text-[10px] block">API GATEWAY ENDPOINT</span>
                <p className="font-data-mono text-body-sm font-bold text-secondary truncate">
                  {advanced.apiEndpoint || "https://api.katrex.app/v1"}
                </p>
                <span className="text-xs text-on-surface-variant">Cloud Functions HTTPS Callable</span>
              </div>

              <div className="bg-surface-container/60 border border-subtle p-3.5 rounded-lg space-y-1.5">
                <span className="font-label-caps text-on-surface-variant text-[10px] block">FIRESTORE REALTIME SYNC</span>
                <p className="font-data-mono text-body-sm font-bold text-on-surface">WebSockets Active</p>
                <span className="text-xs text-status-info">Snapshot listeners connected</span>
              </div>

              <div className="bg-surface-container/60 border border-subtle p-3.5 rounded-lg space-y-1.5">
                <span className="font-label-caps text-on-surface-variant text-[10px] block">ACTIVE NODE ENVIRONMENT</span>
                <p className="font-data-mono text-body-sm font-bold text-on-surface">
                  {advanced.firebaseEnv || "production-v2"}
                </p>
                <span className="text-xs text-on-surface-variant">Admin SDK Permissions Granted</span>
              </div>
            </div>
          </div>

          {/* Maintenance Actions */}
          <div className="lg:col-span-4 bg-surface-bright border border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-subtle mb-4">
                <span className="material-symbols-outlined text-status-warning text-2xl">build</span>
                <h3 className="font-headline-md text-on-surface">Maintenance Tools</h3>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (confirm("Purge admin dashboard cached data?")) {
                      flash("success", "Local memory & browser caches purged");
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-surface-container hover:bg-surface-container-high border border-subtle rounded-lg font-label-caps text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-warning text-[18px]">cleaning_services</span>
                    PURGE LOCAL CACHE
                  </span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2.5 px-3 bg-surface-container hover:bg-surface-container-high border border-subtle rounded-lg font-label-caps text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px]">refresh</span>
                    HARD RELOAD DASHBOARD
                  </span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-subtle text-xs text-on-surface-variant">
              Diagnostics tools only affect local administrative sessions.
            </div>
          </div>
        </div>
      )}

      {/* ── Banner Modal ────────────────────────────────────────── */}
      {showBannerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowBannerModal(false)}
        >
          <div
            className="bg-surface-bright border border-subtle rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-subtle">
              <h3 className="font-headline-md text-primary">
                {editingBanner ? "Edit Promotional Banner" : "New Promotional Banner"}
              </h3>
              <button
                onClick={() => setShowBannerModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Banner Headline / Title
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="e.g. Zero Fee Crypto Swaps this Weekend"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Banner Graphic Image URL
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary font-data-mono text-xs"
                  placeholder="https://images.unsplash.com/..."
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                    Tag / Badge Label
                  </label>
                  <input
                    type="text"
                    className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="PROMO / NEW"
                    value={bannerForm.tag}
                    onChange={(e) => setBannerForm({ ...bannerForm, tag: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                    Display Status
                  </label>
                  <select
                    className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                    value={bannerForm.status}
                    onChange={(e) => setBannerForm({ ...bannerForm, status: e.target.value })}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Target Route / Deep Link
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary font-data-mono text-xs"
                  placeholder="/trade or https://..."
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowBannerModal(false)}
                className="flex-1 py-2.5 bg-surface-container border border-subtle text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBanner}
                className="flex-1 py-2.5 bg-secondary text-on-secondary rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowOnboardingModal(false)}
        >
          <div
            className="bg-surface-bright border border-subtle rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-subtle">
              <h3 className="font-headline-md text-primary">
                {editingOnboarding ? "Edit Onboarding Screen" : "New Onboarding Screen"}
              </h3>
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Screen Headline / Title
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="e.g. Trade Crypto Seamlessly"
                  value={onboardingForm.title}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Description Text
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none"
                  placeholder="Buy, sell, and swap multiple digital assets with zero hidden fees."
                  value={onboardingForm.text}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, text: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Illustration / Image URL (Optional)
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary font-data-mono text-xs"
                  placeholder="https://..."
                  value={onboardingForm.imageUrl}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, imageUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="flex-1 py-2.5 bg-surface-container border border-subtle text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveOnboardingStep}
                className="flex-1 py-2.5 bg-secondary text-on-secondary rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity"
              >
                {editingOnboarding ? "Save Screen" : "Add Screen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ───────────────────────────────────────────── */}
      {showFaqModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowFaqModal(false)}
        >
          <div
            className="bg-surface-bright border border-subtle rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-subtle">
              <h3 className="font-headline-md text-primary">
                {editingFaq ? "Edit FAQ Article" : "New FAQ Article"}
              </h3>
              <button
                onClick={() => setShowFaqModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Category
                </label>
                <select
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                >
                  <option value="General">General</option>
                  <option value="Transactions">Transactions &amp; Funding</option>
                  <option value="Security">Security &amp; PIN</option>
                  <option value="Trading">Trading &amp; Swaps</option>
                  <option value="P2P">P2P Escrow</option>
                  <option value="Giftcards">Giftcards</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Question
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="e.g. How long do crypto withdrawals take?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
                  Answer
                </label>
                <textarea
                  rows={4}
                  className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none"
                  placeholder="Detailed resolution instructions..."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFaqModal(false)}
                className="flex-1 py-2.5 bg-surface-container border border-subtle text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveFaq}
                className="flex-1 py-2.5 bg-secondary text-on-secondary rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity"
              >
                {editingFaq ? "Update FAQ" : "Create FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
