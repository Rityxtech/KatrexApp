"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  GiftcardBrand,
  GiftcardRate,
  GiftcardTrade,
  useGiftcardBrands,
  useGiftcardRates,
  useGiftcardSettings,
  useGiftcardTrades,
} from "@/hooks/useAdminData";

type TradeAction = "approve" | "reject";

const inputClass = "w-full rounded border border-outline-variant bg-surface-container-high px-2 py-1.5 text-body-sm outline-none focus:border-primary";
const buttonClass = "rounded px-3 py-1.5 text-body-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: unknown) {
  const date = toDate(value);
  return date ? date.toLocaleString() : "—";
}

function formatMoney(value: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toLocaleString()}`;
  }
}

function safeImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function SectionState({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty: boolean; emptyText: string }) {
  if (loading) return <div className="h-16 animate-pulse rounded bg-surface-container-high" />;
  if (error) return <p className="rounded border border-status-danger/40 bg-status-danger/10 p-3 text-body-sm text-status-danger">{error}</p>;
  if (empty) return <p className="py-4 text-center text-body-sm text-on-surface-variant">{emptyText}</p>;
  return null;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-outline-variant bg-surface-bright p-container-padding shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary" aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BrandForm({ brand, onClose }: { brand: GiftcardBrand | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await httpsCallable(functions, "saveGiftcardBrand")({
        ...(brand ? { brandId: brand.id } : {}),
        name: String(form.get("name") || "").trim(),
        iconName: String(form.get("iconName") || "").trim(),
        colorHex: String(form.get("colorHex") || "").trim(),
        imageUrl: String(form.get("imageUrl") || "").trim(),
        isActive: form.get("isActive") === "on",
        sortOrder: Number(form.get("sortOrder")),
        featured: form.get("featured") === "on",
        promoTag: String(form.get("promoTag") || "").trim(),
        promoTitle: String(form.get("promoTitle") || "").trim(),
        promoSubtitle: String(form.get("promoSubtitle") || "").trim(),
        promoImageUrl: String(form.get("promoImageUrl") || "").trim(),
      });
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <label className="col-span-2 text-body-sm">Name<input className={inputClass} name="name" required defaultValue={brand?.name || ""} /></label>
      <label className="text-body-sm">Icon name<input className={inputClass} name="iconName" required defaultValue={brand?.iconName || ""} /></label>
      <label className="text-body-sm">Color<input className={`${inputClass} h-9`} name="colorHex" type="color" required defaultValue={brand?.colorHex || "#6750A4"} /></label>
      <label className="col-span-2 text-body-sm">Brand image URL<input className={inputClass} name="imageUrl" type="url" defaultValue={brand?.imageUrl || ""} /></label>
      <label className="text-body-sm">Sort order<input className={inputClass} name="sortOrder" type="number" required defaultValue={brand?.sortOrder ?? 0} /></label>
      <div className="flex items-end gap-4 pb-1 text-body-sm">
        <label><input name="isActive" type="checkbox" className="mr-2" defaultChecked={brand?.isActive ?? true} />Active</label>
        <label><input name="featured" type="checkbox" className="mr-2" defaultChecked={brand?.featured ?? false} />Featured</label>
      </div>
      <label className="text-body-sm">Promo tag<input className={inputClass} name="promoTag" defaultValue={brand?.promoTag || ""} /></label>
      <label className="text-body-sm">Promo title<input className={inputClass} name="promoTitle" defaultValue={brand?.promoTitle || ""} /></label>
      <label className="col-span-2 text-body-sm">Promo subtitle<input className={inputClass} name="promoSubtitle" defaultValue={brand?.promoSubtitle || ""} /></label>
      <label className="col-span-2 text-body-sm">Promo image URL<input className={inputClass} name="promoImageUrl" type="url" defaultValue={brand?.promoImageUrl || ""} /></label>
      {error && <p className="col-span-2 text-body-sm text-status-danger">{error}</p>}
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={`${buttonClass} border border-subtle`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${buttonClass} bg-primary text-on-primary`}>{saving ? "Saving…" : "Save brand"}</button>
      </div>
    </form>
  );
}

function RateForm({ rate, brands, onClose }: { rate: GiftcardRate | null; brands: GiftcardBrand[]; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const brandId = String(form.get("brandId") || "");
    const brand = brands.find((item) => item.id === brandId);
    const maxValue = String(form.get("maxValue") || "").trim();
    try {
      await httpsCallable(functions, "saveGiftcardRate")({
        ...(rate ? { rateId: rate.id } : {}),
        brandId,
        brandName: brand?.name || rate?.brandName || "",
        currency: String(form.get("currency") || "").trim().toUpperCase(),
        cardType: String(form.get("cardType") || "").trim(),
        minValue: Number(form.get("minValue")),
        maxValue: maxValue === "" ? null : Number(maxValue),
        ratePerUnit: Number(form.get("ratePerUnit")),
        isActive: form.get("isActive") === "on",
        version: Number(form.get("version")),
      });
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <label className="col-span-2 text-body-sm">Brand<select className={inputClass} name="brandId" required defaultValue={rate?.brandId || ""}><option value="" disabled>Select brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <label className="text-body-sm">Currency<input className={inputClass} name="currency" required maxLength={3} defaultValue={rate?.currency || ""} /></label>
      <label className="text-body-sm">Card type<input className={inputClass} name="cardType" required defaultValue={rate?.cardType || ""} /></label>
      <label className="text-body-sm">Minimum value<input className={inputClass} name="minValue" type="number" min="0" step="any" required defaultValue={rate?.minValue ?? 0} /></label>
      <label className="text-body-sm">Maximum value (optional)<input className={inputClass} name="maxValue" type="number" min="0" step="any" defaultValue={rate?.maxValue ?? ""} /></label>
      <label className="text-body-sm">Rate per unit<input className={inputClass} name="ratePerUnit" type="number" min="0" step="any" required defaultValue={rate?.ratePerUnit ?? 0} /></label>
      <label className="text-body-sm">Version<input className={inputClass} name="version" type="number" min="0" step="1" required defaultValue={rate?.version ?? 1} /></label>
      <label className="col-span-2 text-body-sm"><input name="isActive" type="checkbox" className="mr-2" defaultChecked={rate?.isActive ?? true} />Active rate</label>
      {error && <p className="col-span-2 text-body-sm text-status-danger">{error}</p>}
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={`${buttonClass} border border-subtle`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${buttonClass} bg-primary text-on-primary`}>{saving ? "Saving…" : "Save rate"}</button>
      </div>
    </form>
  );
}

export default function GiftcardPage() {
  const brandsState = useGiftcardBrands();
  const ratesState = useGiftcardRates();
  const tradesState = useGiftcardTrades();
  const settingsState = useGiftcardSettings();
  const [brandModal, setBrandModal] = useState<GiftcardBrand | "new" | null>(null);
  const [rateModal, setRateModal] = useState<GiftcardRate | "new" | null>(null);
  const [tradeModal, setTradeModal] = useState<{ trade: GiftcardTrade; action: TradeAction } | null>(null);
  const [processingTrade, setProcessingTrade] = useState<string | null>(null);
  const [togglingBrand, setTogglingBrand] = useState<string | null>(null);
  const [payoutMode, setPayoutMode] = useState("");
  const [payoutDestination, setPayoutDestination] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rate management: filter tabs + pagination
  type RateTab = "all" | "physical" | "ecode" | "USD" | "GBP" | "EUR";
  const [rateTab, setRateTab] = useState<RateTab>("all");
  const [ratePage, setRatePage] = useState(0);
  const RATES_PER_PAGE = 8;

  useEffect(() => {
    if (settingsState.data) {
      setPayoutMode(settingsState.data.payoutMode || "");
      setPayoutDestination(settingsState.data.payoutDestination || "");
    }
  }, [settingsState.data]);

  const pendingTrades = useMemo(() => tradesState.data.filter((trade) => trade.status === "pending"), [tradesState.data]);
  const history = useMemo(() => tradesState.data.filter((trade) => trade.status !== "pending"), [tradesState.data]);

  // Filter rates by the selected tab, then paginate
  const filteredRates = useMemo(() => {
    const rates = ratesState.data;
    if (rateTab === "all") return rates;
    if (rateTab === "physical" || rateTab === "ecode") return rates.filter((r) => r.cardType === rateTab);
    return rates.filter((r) => r.currency === rateTab);
  }, [ratesState.data, rateTab]);

  const ratePageCount = Math.max(1, Math.ceil(filteredRates.length / RATES_PER_PAGE));
  const safeRatePage = Math.min(ratePage, ratePageCount - 1);
  const pagedRates = useMemo(() => {
    const start = safeRatePage * RATES_PER_PAGE;
    return filteredRates.slice(start, start + RATES_PER_PAGE);
  }, [filteredRates, safeRatePage]);

  // Reset to page 0 whenever tab changes or data reloads
  useEffect(() => { setRatePage(0); }, [rateTab]);

  async function toggleBrand(brand: GiftcardBrand) {
    setTogglingBrand(brand.id);
    setActionError(null);
    try {
      await httpsCallable(functions, "saveGiftcardBrand")({
        brandId: brand.id,
        name: brand.name,
        iconName: brand.iconName,
        colorHex: brand.colorHex,
        imageUrl: brand.imageUrl,
        isActive: !brand.isActive,
        sortOrder: brand.sortOrder,
        featured: brand.featured,
        promoTag: brand.promoTag,
        promoTitle: brand.promoTitle,
        promoSubtitle: brand.promoSubtitle,
        promoImageUrl: brand.promoImageUrl,
      });
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setTogglingBrand(null);
    }
  }

  async function saveSettings() {
    if (!payoutMode || !payoutDestination.trim()) return;
    setSavingSettings(true);
    setActionError(null);
    try {
      await httpsCallable(functions, "updateGiftcardSettings")({ payoutMode, payoutDestination: payoutDestination.trim() });
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setSavingSettings(false);
    }
  }

  async function processTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tradeModal) return;
    const comment = String(new FormData(event.currentTarget).get("comment") || "").trim();
    if (tradeModal.action === "reject" && !comment) return;
    setProcessingTrade(tradeModal.trade.id);
    setActionError(null);
    try {
      await httpsCallable(functions, "processGiftcardTrade")({ tradeId: tradeModal.trade.id, action: tradeModal.action, comment });
      setTradeModal(null);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setProcessingTrade(null);
    }
  }

  function exportCsv() {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = history.map((trade) => [formatDate(trade.createdAt), trade.id, trade.uid, trade.userName, trade.userEmail, trade.brandName, trade.cardType, trade.currency, trade.cardValue, trade.rateApplied, trade.payoutAmount, trade.status, trade.adminId, trade.adminComment, trade.rejectionReason].map(escape).join(","));
    const header = ["Created at", "Trade ID", "User ID", "User name", "User email", "Brand", "Card type", "Currency", "Card value", "Rate applied", "Payout amount", "Status", "Admin ID", "Admin comment", "Rejection reason"].map(escape).join(",");
    const url = URL.createObjectURL(new Blob([[header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `giftcard-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-max-gap w-full">
      {actionError && <div className="mb-4 flex justify-between rounded border border-status-danger/40 bg-status-danger/10 p-3 text-body-sm text-status-danger"><span>{actionError}</span><button onClick={() => setActionError(null)}>Dismiss</button></div>}
      <div className="grid grid-cols-12 gap-gutter">
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-gutter">
          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-center mb-stack-base">
              <h2 className="font-headline-md text-headline-md text-primary">Brand Management</h2>
              <button onClick={() => setBrandModal("new")} className="bg-primary text-on-primary-fixed px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-white transition-colors">Add Brand</button>
            </div>
            <SectionState loading={brandsState.loading} error={brandsState.error} empty={!brandsState.data.length} emptyText="No gift-card brands configured." />
            {!brandsState.loading && !brandsState.error && <div className="flex flex-col gap-unit">{brandsState.data.map((brand) => (
              <div key={brand.id} className={`brand-card flex items-center justify-between p-2 bg-surface-container-low border border-subtle rounded hover:border-primary transition-all ${!brand.isActive ? "opacity-50" : ""}`}>
                <button type="button" onClick={() => setBrandModal(brand)} className="flex min-w-0 items-center gap-3 text-left" title="Edit brand">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">edit</span>
                  <div className="w-8 h-8 shrink-0 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant" style={{ borderColor: brand.colorHex || undefined }}>
                    {brand.imageUrl && safeImageUrl(brand.imageUrl) ? <img src={safeImageUrl(brand.imageUrl)!} alt="" className="h-full w-full rounded object-cover" referrerPolicy="no-referrer" /> : <span className="material-symbols-outlined text-secondary">{brand.iconName || "redeem"}</span>}
                  </div>
                  <span className="truncate font-body-sm text-body-sm font-semibold">{brand.name}</span>
                </button>
                <label className="relative inline-flex items-center cursor-pointer ml-2">
                  <input checked={brand.isActive} disabled={togglingBrand === brand.id} onChange={() => toggleBrand(brand)} className="sr-only peer" type="checkbox" />
                  <div className="w-7 h-4 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                </label>
              </div>
            ))}</div>}
          </div>

          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-base">Payout Control</h2>
            <SectionState loading={settingsState.loading} error={settingsState.error} empty={!settingsState.data} emptyText="No payout settings saved yet. Configure them below." />
            {!settingsState.loading && !settingsState.error && <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded border border-subtle">
                <div><p className="font-body-sm font-bold">Payout Mode</p><p className="text-[10px] text-on-surface-variant">Switch between manual &amp; instant</p></div>
                <div className="flex bg-surface-deep p-1 rounded-lg border border-outline-variant">
                  {(["auto", "manual"] as const).map((mode) => <button key={mode} type="button" onClick={() => setPayoutMode(mode)} className={`px-3 py-1 text-[10px] rounded font-bold uppercase ${payoutMode === mode ? "bg-secondary text-on-secondary" : "text-on-surface-variant"}`}>{mode}</button>)}
                </div>
              </div>
              <button type="button" disabled={savingSettings || !payoutMode || !payoutDestination.trim()} onClick={saveSettings} className={`${buttonClass} bg-primary text-on-primary`}>{savingSettings ? "Saving…" : "Save payout settings"}</button>
            </div>}
          </div>

          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-headline-md text-headline-md text-primary">Slider Banners</h2>
              <a href="/settings" className="text-secondary text-[11px] font-bold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">settings</span> Manage
              </a>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-3">
              Configure promo carousel images displayed on the mobile Giftcard page.
            </p>
            <a
              href="/settings"
              className="w-full bg-surface-container-high border border-outline-variant rounded-lg p-2.5 flex items-center justify-between text-body-sm font-semibold hover:border-secondary hover:text-secondary transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">view_carousel</span>
                Open Banner Manager
              </span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </a>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-9 flex flex-col gap-gutter">
          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Rate Management</h2>
                <p className="text-body-sm text-on-surface-variant">Live gift-card exchange rates</p>
              </div>
              <button disabled={!brandsState.data.length} onClick={() => setRateModal("new")} className={`${buttonClass} bg-secondary text-on-secondary`}>Add Rate</button>
            </div>

            {/* Scrollable filter tabs */}
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
              {(["all", "physical", "ecode", "USD", "GBP", "EUR"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRateTab(tab)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${rateTab === tab ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                >
                  {tab === "all" ? "All" : tab === "physical" || tab === "ecode" ? tab : tab}
                </button>
              ))}
            </div>

            <SectionState loading={ratesState.loading} error={ratesState.error} empty={!filteredRates.length} emptyText="No gift-card rates match this filter." />
            {!ratesState.loading && !ratesState.error && pagedRates.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-subtle">
                      <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">BRAND/CURRENCY</th>
                      <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">TYPE</th>
                      <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">RANGE</th>
                      <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant">CURRENT RATE</th>
                      <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRates.map((rate) => (
                      <tr key={rate.id} className={`border-b border-subtle/50 hover:bg-primary/5 transition-colors ${!rate.isActive ? "opacity-50" : ""}`}>
                        <td className="py-2 px-3 font-body-sm"><div className="flex items-center gap-2"><span className="bg-white/10 px-1 rounded-sm text-[8px] font-bold">{rate.currency}</span>{rate.brandName}</div></td>
                        <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] uppercase font-bold text-secondary">{rate.cardType}</span></td>
                        <td className="py-2 px-3 font-data-mono text-data-mono">{formatMoney(rate.minValue, rate.currency)} – {rate.maxValue == null ? "No maximum" : formatMoney(rate.maxValue, rate.currency)}</td>
                        <td className="py-2 px-3 font-data-mono text-data-mono text-status-success">{formatMoney(rate.ratePerUnit)} / unit</td>
                        <td className="py-2 px-3 text-right"><button type="button" onClick={() => setRateModal(rate)} aria-label={`Edit ${rate.brandName} rate`}><span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-primary">edit</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!ratesState.loading && !ratesState.error && ratePageCount > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-subtle pt-3">
                <span className="text-[11px] text-on-surface-variant">
                  Showing {safeRatePage * RATES_PER_PAGE + 1}–{Math.min((safeRatePage + 1) * RATES_PER_PAGE, filteredRates.length)} of {filteredRates.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRatePage((p) => Math.max(0, p - 1))}
                    disabled={safeRatePage === 0}
                    className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${safeRatePage === 0 ? "cursor-not-allowed opacity-40" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({length: ratePageCount}, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setRatePage(i)}
                      className={`h-7 w-7 rounded text-[11px] font-bold transition-colors ${i === safeRatePage ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setRatePage((p) => Math.min(ratePageCount - 1, p + 1))}
                    disabled={safeRatePage === ratePageCount - 1}
                    className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${safeRatePage === ratePageCount - 1 ? "cursor-not-allowed opacity-40" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-stack-base">
            <h2 className="font-headline-md text-headline-md text-primary">Active Trade Queue <span className="bg-status-danger text-white px-2 py-0.5 rounded text-[10px] ml-2">{pendingTrades.length} Pending</span></h2>
            <SectionState loading={tradesState.loading} error={tradesState.error} empty={!pendingTrades.length} emptyText="No pending gift-card trades." />
            {!tradesState.loading && !tradesState.error && <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">{pendingTrades.map((trade) => {
              const images = (trade.cardImageUrls || []).map(safeImageUrl).filter((url): url is string => Boolean(url));
              return <article key={trade.id} className="bg-surface-container-high border-l-4 border-l-status-warning rounded-lg p-container-padding flex flex-col gap-3 hover:shadow-xl transition-all border-y border-r border-subtle">
                <div className="flex gap-4"><div className="flex w-24 shrink-0 gap-1 overflow-x-auto">{images.length ? images.map((url, index) => <a key={`${trade.id}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="h-16 w-24 shrink-0"><img src={url} alt={`${trade.brandName} card ${index + 1}`} className="h-full w-full rounded border border-outline-variant object-cover" loading="lazy" referrerPolicy="no-referrer" /></a>) : <div className="w-24 h-16 bg-surface-deep rounded border border-outline-variant flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant">image_not_supported</span></div>}</div>
                  <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><p className="font-body-sm font-bold">{trade.brandName} · {trade.cardType}</p><p className="text-data-mono text-primary">{formatMoney(trade.cardValue, trade.currency)} <span className="text-on-surface-variant text-[10px]">({formatMoney(trade.payoutAmount)})</span></p></div><span className="h-fit shrink-0 text-[10px] font-label-caps text-status-warning px-1.5 py-0.5 bg-status-warning/10 rounded">Pending</span></div>
                    <p className="mt-2 break-all text-[10px] text-on-surface-variant">{trade.userName || "Unnamed user"} · {trade.userEmail || trade.uid}</p><p className="break-all font-data-mono text-[9px] text-on-surface-variant">Trade {trade.id}</p><p className="text-[10px] text-on-surface-variant">Rate {formatMoney(trade.rateApplied)} · {formatDate(trade.createdAt)}</p></div></div>
                {(trade.ecode || trade.comment) && <div className="rounded border border-outline-variant bg-surface-deep p-2 text-[11px]">{trade.ecode && <p className="break-all"><strong>E-code:</strong> {trade.ecode}</p>}{trade.comment && <p><strong>User comment:</strong> {trade.comment}</p>}</div>}
                <div className="flex justify-end gap-2"><button disabled={processingTrade === trade.id} onClick={() => setTradeModal({ trade, action: "approve" })} className={`${buttonClass} bg-status-success/20 text-status-success`}>Approve</button><button disabled={processingTrade === trade.id} onClick={() => setTradeModal({ trade, action: "reject" })} className={`${buttonClass} bg-status-danger/20 text-status-danger`}>Reject</button></div>
              </article>;
            })}</div>}
          </div>

          <div className="bg-surface-bright border border-subtle rounded-xl p-container-padding">
            <div className="flex justify-between items-center mb-stack-base"><h2 className="font-headline-md text-headline-md text-primary">Trade History</h2><button disabled={!history.length} onClick={exportCsv} className="flex items-center gap-2 text-secondary text-body-sm hover:underline disabled:opacity-50"><span className="material-symbols-outlined text-sm">download</span> Export CSV</button></div>
            <SectionState loading={tradesState.loading} error={tradesState.error} empty={!history.length} emptyText="No reviewed gift-card trades." />
            {!tradesState.loading && !tradesState.error && history.length > 0 && <div className="overflow-x-auto border border-outline-variant rounded"><table className="w-full text-left text-body-sm"><thead className="bg-surface-container-high"><tr className="border-b border-subtle"><th className="p-2 font-label-caps text-label-caps">DATE</th><th className="p-2 font-label-caps text-label-caps">TRADE ID</th><th className="p-2 font-label-caps text-label-caps">USER</th><th className="p-2 font-label-caps text-label-caps">ASSET</th><th className="p-2 font-label-caps text-label-caps">VALUE</th><th className="p-2 font-label-caps text-label-caps">PAYOUT</th><th className="p-2 font-label-caps text-label-caps">STATUS</th></tr></thead><tbody className="divide-y divide-outline-variant">{history.map((trade) => <tr key={trade.id} className="hover:bg-surface-container"><td className="p-2 text-on-surface-variant">{formatDate(trade.reviewedAt || trade.createdAt)}</td><td className="p-2 font-data-mono text-[10px]">{trade.id}</td><td className="p-2"><span className="block">{trade.userName || "—"}</span><span className="text-[10px] text-on-surface-variant">{trade.userEmail || trade.uid}</span></td><td className="p-2">{trade.brandName} ({trade.cardType})</td><td className="p-2">{formatMoney(trade.cardValue, trade.currency)}</td><td className="p-2 text-secondary">{formatMoney(trade.payoutAmount)}</td><td className="p-2"><span className={`${trade.status === "approved" ? "text-status-success" : "text-status-danger"} font-bold text-[10px] uppercase`}>{trade.status}</span>{(trade.rejectionReason || trade.adminComment) && <span className="block max-w-48 truncate text-[9px] text-on-surface-variant" title={trade.rejectionReason || trade.adminComment || ""}>{trade.rejectionReason || trade.adminComment}</span>}</td></tr>)}</tbody></table></div>}
          </div>
        </section>
      </div>

      {brandModal && <Modal title={brandModal === "new" ? "Add brand" : "Edit brand"} onClose={() => setBrandModal(null)}><BrandForm brand={brandModal === "new" ? null : brandModal} onClose={() => setBrandModal(null)} /></Modal>}
      {rateModal && <Modal title={rateModal === "new" ? "Add rate" : "Edit rate"} onClose={() => setRateModal(null)}><RateForm rate={rateModal === "new" ? null : rateModal} brands={brandsState.data} onClose={() => setRateModal(null)} /></Modal>}
      {tradeModal && <Modal title={`${tradeModal.action === "approve" ? "Approve" : "Reject"} trade`} onClose={() => !processingTrade && setTradeModal(null)}><form onSubmit={processTrade} className="space-y-3"><p className="text-body-sm">{tradeModal.trade.brandName} · {formatMoney(tradeModal.trade.cardValue, tradeModal.trade.currency)} · {tradeModal.trade.userName || tradeModal.trade.userEmail}</p><label className="block text-body-sm">{tradeModal.action === "reject" ? "Rejection reason" : "Approval note (optional)"}<textarea name="comment" required={tradeModal.action === "reject"} className={`${inputClass} mt-1 min-h-24`} /></label><div className="flex justify-end gap-2"><button type="button" disabled={Boolean(processingTrade)} onClick={() => setTradeModal(null)} className={`${buttonClass} border border-subtle`}>Cancel</button><button type="submit" disabled={Boolean(processingTrade)} className={`${buttonClass} ${tradeModal.action === "approve" ? "bg-status-success text-white" : "bg-status-danger text-white"}`}>{processingTrade ? "Processing…" : `Confirm ${tradeModal.action}`}</button></div></form></Modal>}
    </div>
  );
}
