"use client";

import { FormEvent, ReactNode, useState } from "react";
import {
  useAppSettings,
  useHomepagePromos,
  useGiftcardPromos,
  HomepagePromo,
  GiftcardPromo,
} from "@/hooks/useAdminData";
import { setDocument, deleteDocument, updateDocument } from "@/hooks/useFirestore";

const inputClass = "w-full rounded border border-outline-variant bg-surface-container-high px-3 py-2 text-body-sm outline-none focus:border-secondary transition-colors";
const buttonClass = "rounded px-4 py-2 text-body-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50";

function safeImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-outline-variant bg-surface-bright p-container-padding shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Promo Form Modal Component ─────────────────────────────────────────────

interface PromoModalProps {
  type: "homepage" | "giftcard";
  promo: (HomepagePromo | GiftcardPromo) | "new" | null;
  onClose: () => void;
}

function PromoFormModal({ type, promo, onClose }: PromoModalProps) {
  const isEditing = promo !== "new" && promo !== null;
  const initial = isEditing ? (promo as any) : null;

  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const collectionName = type === "homepage" ? "homepage_promos" : "giftcard_promos";
    const docId = isEditing ? initial.id : `promo_${Date.now()}`;

    try {
      const data: Record<string, any> = {
        id: docId,
        title: String(form.get("title") || "").trim(),
        subtitle: String(form.get("subtitle") || "").trim() || null,
        imageUrl: String(form.get("imageUrl") || "").trim(),
        sortOrder: Number(form.get("sortOrder")) || 0,
        isActive: form.get("isActive") === "on",
        updatedAt: new Date(),
      };

      if (type === "homepage") {
        data.badge = String(form.get("badge") || "").trim() || "HOT DEALS";
        data.buttonText = String(form.get("buttonText") || "").trim() || "View";
      } else {
        data.tag = String(form.get("tag") || "").trim() || "HOT DEAL";
      }

      await setDocument(collectionName, docId, data);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save promo slide");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {/* Live Image Preview */}
      <div className="flex flex-col gap-1">
        <label className="text-body-sm text-on-surface-variant font-semibold">Image Preview</label>
        <div className="w-full h-36 rounded-lg bg-surface-container-highest border border-outline-variant overflow-hidden flex items-center justify-center relative">
          {safeImageUrl(imageUrl) ? (
            <img
              src={safeImageUrl(imageUrl)!}
              alt="Slide Preview"
              className="w-full h-full object-cover"
              onError={() => setImageUrl("")}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
              <span className="text-[11px]">Enter a valid image URL below</span>
            </div>
          )}
        </div>
      </div>

      <label className="text-body-sm text-on-surface-variant font-semibold">
        Image URL *
        <input
          className={inputClass}
          name="imageUrl"
          type="url"
          required
          placeholder="https://images.unsplash.com/..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-body-sm text-on-surface-variant font-semibold">
          Title *
          <input
            className={inputClass}
            name="title"
            required
            defaultValue={initial?.title || ""}
            placeholder="e.g. Trade Gift Cards at Best Rates"
          />
        </label>

        <label className="text-body-sm text-on-surface-variant font-semibold">
          {type === "homepage" ? "Badge Tag" : "Tag"}
          <input
            className={inputClass}
            name={type === "homepage" ? "badge" : "tag"}
            defaultValue={initial?.badge || initial?.tag || (type === "homepage" ? "HOT DEALS" : "HOT DEAL")}
            placeholder="e.g. PROMO, HOT DEAL"
          />
        </label>
      </div>

      <label className="text-body-sm text-on-surface-variant font-semibold">
        Subtitle
        <input
          className={inputClass}
          name="subtitle"
          defaultValue={initial?.subtitle || ""}
          placeholder="e.g. Highest payout rates today"
        />
      </label>

      {type === "homepage" && (
        <label className="text-body-sm text-on-surface-variant font-semibold">
          Action Button Text
          <input
            className={inputClass}
            name="buttonText"
            defaultValue={initial?.buttonText || "Trade Now"}
            placeholder="e.g. Trade Now, Buy Crypto, Share Code"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3 items-end">
        <label className="text-body-sm text-on-surface-variant font-semibold">
          Sort Order
          <input
            className={inputClass}
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={initial?.sortOrder ?? 0}
          />
        </label>

        <div className="flex items-center gap-2 pb-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              name="isActive"
              type="checkbox"
              className="sr-only peer"
              defaultChecked={initial?.isActive ?? true}
            />
            <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-status-success"></div>
            <span className="ms-2 text-body-sm text-on-surface font-semibold">Active</span>
          </label>
        </div>
      </div>

      {error && <p className="text-body-sm text-status-danger mt-1">{error}</p>}

      <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/30">
        <button
          type="button"
          onClick={onClose}
          className={`${buttonClass} border border-outline-variant hover:bg-surface-container-high`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`${buttonClass} bg-secondary text-on-secondary hover:opacity-90`}
        >
          {saving ? "Saving..." : isEditing ? "Update Slide" : "Add Slide"}
        </button>
      </div>
    </form>
  );
}

// ─── Settings Page Main Component ───────────────────────────────────────────

export default function SettingsPage() {
  const { data: settings } = useAppSettings();
  const { data: homepagePromos, loading: loadingHomePromos } = useHomepagePromos();
  const { data: giftcardPromos, loading: loadingGiftcardPromos } = useGiftcardPromos();

  const [activeTab, setActiveTab] = useState<"homepage" | "giftcard">("homepage");
  const [promoModal, setPromoModal] = useState<{
    type: "homepage" | "giftcard";
    promo: (HomepagePromo | GiftcardPromo) | "new";
  } | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);

  const systemConfig = settings.find((s: any) => s.id === "system") || {};
  const modules = settings.find((s: any) => s.id === "modules") || {};
  const onboarding = settings.filter((s: any) => s.type === "onboarding" || s.collection === "onboarding");
  const faqs = settings.filter((s: any) => s.type === "faq" || s.collection === "faqs");
  const advanced = settings.find((s: any) => s.id === "advanced") || {};

  const moduleList = [
    { key: "p2p", icon: "swap_horizontal_circle", label: "P2P Trading" },
    { key: "crypto", icon: "currency_exchange", label: "Crypto Swap" },
    { key: "airtime", icon: "phone_android", label: "Airtime/Data" },
    { key: "giftcard", icon: "card_giftcard", label: "Giftcards" },
  ];

  async function togglePromoStatus(type: "homepage" | "giftcard", id: string, currentStatus: boolean) {
    const col = type === "homepage" ? "homepage_promos" : "giftcard_promos";
    await updateDocument(col, id, { isActive: !currentStatus, updatedAt: new Date() });
  }

  async function handleDeletePromo(type: "homepage" | "giftcard", id: string) {
    if (confirm("Are you sure you want to delete this slider banner?")) {
      const col = type === "homepage" ? "homepage_promos" : "giftcard_promos";
      setDeletingPromoId(id);
      try {
        await deleteDocument(col, id);
      } finally {
        setDeletingPromoId(null);
      }
    }
  }

  return (
    <div className="px-container-padding pt-5 pb-12 w-full">
      <div className="max-w-6xl mx-auto space-y-max-gap">
        <div className="flex justify-between items-end border-b border-outline-variant pb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">System &amp; Content</h1>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
              Global configuration &amp; Live Mobile Carousel Sliders
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE SYNC</span>
            </p>
          </div>
          <button
            onClick={() => alert("All changes auto-sync to mobile app in real time via Firestore.")}
            className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps flex items-center gap-2 hover:opacity-90 transition-opacity shadow"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_done</span>
            REAL-TIME SYNCED
          </button>
        </div>

        {/* ─── Banner & Slider Manager (Homepage & Giftcard) ──────────────── */}
        <section className="bg-surface-container p-5 rounded-xl border border-outline-variant shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-outline-variant/40 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-2xl">view_carousel</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">App Slider &amp; Banner Management</h2>
                <p className="text-body-sm text-on-surface-variant">Regulate all banners displayed on mobile app carousels</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Tabs Switcher */}
              <div className="flex bg-surface-container-lowest p-1 rounded-lg border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setActiveTab("homepage")}
                  className={`px-3 py-1.5 rounded-md text-body-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "homepage"
                      ? "bg-secondary text-on-secondary shadow-sm"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">home</span>
                  Homepage Slider ({homepagePromos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("giftcard")}
                  className={`px-3 py-1.5 rounded-md text-body-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "giftcard"
                      ? "bg-secondary text-on-secondary shadow-sm"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">card_giftcard</span>
                  Giftcard Slider ({giftcardPromos.length})
                </button>
              </div>

              {/* Add Button */}
              <button
                type="button"
                onClick={() => setPromoModal({ type: activeTab, promo: "new" })}
                className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-body-sm font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Add Slide
              </button>
            </div>
          </div>

          {/* Slider Table / Cards */}
          <div className="overflow-x-auto">
            {activeTab === "homepage" ? (
              loadingHomePromos ? (
                <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-surface-container-high rounded animate-pulse" />)}</div>
              ) : homepagePromos.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">view_carousel</span>
                  <p className="text-body-md font-bold text-primary">No homepage promo slides configured</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">Add slides to display them dynamically on the mobile app home screen.</p>
                  <button
                    type="button"
                    onClick={() => setPromoModal({ type: "homepage", promo: "new" })}
                    className="mt-3 bg-secondary text-on-secondary px-4 py-1.5 rounded text-body-sm font-bold inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Add First Slide
                  </button>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-left border-b border-outline-variant">
                      <th className="p-3 font-label-caps text-on-surface-variant">PREVIEW</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">TITLE &amp; SUBTITLE</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">TAG / BADGE</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">BUTTON</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">ORDER</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">STATUS</th>
                      <th className="p-3 font-label-caps text-on-surface-variant text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm divide-y divide-outline-variant/30">
                    {homepagePromos.map((p) => (
                      <tr key={p.id} className={`hover:bg-surface-bright/20 transition-colors ${!p.isActive ? "opacity-60" : ""}`}>
                        <td className="p-3">
                          <div className="w-20 h-12 rounded bg-surface-container-highest border border-outline-variant overflow-hidden flex items-center justify-center">
                            {safeImageUrl(p.imageUrl) ? (
                              <img src={safeImageUrl(p.imageUrl)!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="material-symbols-outlined text-outline text-sm">broken_image</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-primary">{p.title || "Untitled"}</p>
                          <p className="text-[11px] text-on-surface-variant line-clamp-1">{p.subtitle || "—"}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary text-[10px] font-extrabold uppercase">
                            {p.badge || "FEATURED"}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-on-surface-variant font-semibold">
                          {p.buttonText || "View"}
                        </td>
                        <td className="p-3 font-data-mono text-[11px] text-primary">
                          #{p.sortOrder ?? 0}
                        </td>
                        <td className="p-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              checked={p.isActive}
                              onChange={() => togglePromoStatus("homepage", p.id, p.isActive)}
                              className="sr-only peer"
                              type="checkbox"
                            />
                            <div className="w-7 h-4 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                          </label>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPromoModal({ type: "homepage", promo: p })}
                              className="p-1 hover:bg-secondary/10 rounded text-on-surface-variant hover:text-secondary transition-colors"
                              title="Edit slide"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={deletingPromoId === p.id}
                              onClick={() => handleDeletePromo("homepage", p.id)}
                              className="p-1 hover:bg-status-danger/10 rounded text-on-surface-variant hover:text-status-danger transition-colors disabled:opacity-40"
                              title="Delete slide"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              loadingGiftcardPromos ? (
                <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-surface-container-high rounded animate-pulse" />)}</div>
              ) : giftcardPromos.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">card_giftcard</span>
                  <p className="text-body-md font-bold text-primary">No giftcard slider banners configured</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">Add banners to display them in the Giftcard screen carousel slider.</p>
                  <button
                    type="button"
                    onClick={() => setPromoModal({ type: "giftcard", promo: "new" })}
                    className="mt-3 bg-secondary text-on-secondary px-4 py-1.5 rounded text-body-sm font-bold inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Add First Banner
                  </button>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-left border-b border-outline-variant">
                      <th className="p-3 font-label-caps text-on-surface-variant">PREVIEW</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">TITLE &amp; SUBTITLE</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">TAG</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">ORDER</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">STATUS</th>
                      <th className="p-3 font-label-caps text-on-surface-variant text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm divide-y divide-outline-variant/30">
                    {giftcardPromos.map((p) => (
                      <tr key={p.id} className={`hover:bg-surface-bright/20 transition-colors ${!p.isActive ? "opacity-60" : ""}`}>
                        <td className="p-3">
                          <div className="w-20 h-12 rounded bg-surface-container-highest border border-outline-variant overflow-hidden flex items-center justify-center">
                            {safeImageUrl(p.imageUrl) ? (
                              <img src={safeImageUrl(p.imageUrl)!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="material-symbols-outlined text-outline text-sm">broken_image</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-primary">{p.title || "Untitled"}</p>
                          <p className="text-[11px] text-on-surface-variant line-clamp-1">{p.subtitle || "—"}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-extrabold uppercase">
                            {p.tag || "HOT DEAL"}
                          </span>
                        </td>
                        <td className="p-3 font-data-mono text-[11px] text-primary">
                          #{p.sortOrder ?? 0}
                        </td>
                        <td className="p-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              checked={p.isActive}
                              onChange={() => togglePromoStatus("giftcard", p.id, p.isActive)}
                              className="sr-only peer"
                              type="checkbox"
                            />
                            <div className="w-7 h-4 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                          </label>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPromoModal({ type: "giftcard", promo: p })}
                              className="p-1 hover:bg-secondary/10 rounded text-on-surface-variant hover:text-secondary transition-colors"
                              title="Edit banner"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={deletingPromoId === p.id}
                              onClick={() => handleDeletePromo("giftcard", p.id)}
                              className="p-1 hover:bg-status-danger/10 rounded text-on-surface-variant hover:text-status-danger transition-colors disabled:opacity-40"
                              title="Delete banner"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </section>

        {/* ─── Grid: System Config & Modules & Onboarding ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* System Config */}
          <section className="md:col-span-4 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant h-full">
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
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant">
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

          {/* Onboarding */}
          <section className="md:col-span-4 flex flex-col gap-stack-base">
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">flight_takeoff</span>
                <h2 className="font-headline-md text-headline-md">Onboarding Flow</h2>
              </div>
              <div className="space-y-3">
                {onboarding.length === 0 ? (
                  <div className="p-3 bg-surface-container-low border border-outline-variant rounded text-center text-on-surface-variant text-body-sm">No onboarding screens</div>
                ) : (
                  onboarding.map((s: any, i: number) => (
                    <div key={s.id} className="p-3 bg-surface-container-low border border-outline-variant rounded relative group">
                      <p className="font-label-caps text-secondary mb-1">SCREEN {i + 1}</p>
                      <p className="font-body-sm line-clamp-1">{s.text || s.description || s.title || "—"}</p>
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
          <section className="md:col-span-4">
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant h-full">
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
                        <p className="font-body-md font-bold text-primary">{f.question || f.q || "—"}</p>
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">drag_indicator</span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1 opacity-80">{f.answer || f.a || "—"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Advanced System */}
          <section className="md:col-span-4">
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant h-full">
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

      {/* Slide Modal */}
      {promoModal && (
        <Modal
          title={
            promoModal.promo === "new"
              ? `Add ${promoModal.type === "homepage" ? "Homepage" : "Giftcard"} Slide`
              : `Edit ${promoModal.type === "homepage" ? "Homepage" : "Giftcard"} Slide`
          }
          onClose={() => setPromoModal(null)}
        >
          <PromoFormModal
            type={promoModal.type}
            promo={promoModal.promo}
            onClose={() => setPromoModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
