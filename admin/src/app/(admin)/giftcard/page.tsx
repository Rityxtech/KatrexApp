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

const inputClass = "w-full rounded-lg border border-subtle bg-surface-deep px-2.5 py-1.5 text-xs font-body-sm outline-none focus:border-secondary transition-colors";
const buttonClass = "rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50";

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

function timeAgo(date: any) {
  if (!date) return "—";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatMoney(value?: number | null, currency = "NGN") {
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

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-subtle bg-surface-bright p-4 shadow-2xl">
        <div className="mb-3.5 flex items-center justify-between border-b border-subtle pb-2.5">
          <h3 className="font-headline-md text-sm text-primary font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Close modal">
            <span className="material-symbols-outlined text-[18px]">close</span>
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
    <form onSubmit={submit} className="grid grid-cols-2 gap-2.5">
      <label className="col-span-2 text-xs font-bold text-on-surface-variant">Name<input className={inputClass} name="name" required defaultValue={brand?.name || ""} /></label>
      <label className="text-xs font-bold text-on-surface-variant">Icon name<input className={inputClass} name="iconName" required defaultValue={brand?.iconName || ""} placeholder="e.g. redeem" /></label>
      <label className="text-xs font-bold text-on-surface-variant">Accent Color<input className={`${inputClass} h-8 cursor-pointer`} name="colorHex" type="color" required defaultValue={brand?.colorHex || "#6750A4"} /></label>
      <label className="col-span-2 text-xs font-bold text-on-surface-variant">Brand image URL<input className={inputClass} name="imageUrl" type="url" defaultValue={brand?.imageUrl || ""} /></label>
      <label className="text-xs font-bold text-on-surface-variant">Sort order<input className={inputClass} name="sortOrder" type="number" required defaultValue={brand?.sortOrder ?? 0} /></label>
      <div className="flex items-end gap-3 pb-1 text-xs font-bold">
        <label className="flex items-center gap-1"><input name="isActive" type="checkbox" defaultChecked={brand?.isActive ?? true} />Active</label>
        <label className="flex items-center gap-1"><input name="featured" type="checkbox" defaultChecked={brand?.featured ?? false} />Featured</label>
      </div>
      <label className="text-xs font-bold text-on-surface-variant">Promo tag<input className={inputClass} name="promoTag" defaultValue={brand?.promoTag || ""} placeholder="HOT / BEST RATE" /></label>
      <label className="text-xs font-bold text-on-surface-variant">Promo title<input className={inputClass} name="promoTitle" defaultValue={brand?.promoTitle || ""} /></label>
      <label className="col-span-2 text-xs font-bold text-on-surface-variant">Promo subtitle<input className={inputClass} name="promoSubtitle" defaultValue={brand?.promoSubtitle || ""} /></label>
      <label className="col-span-2 text-xs font-bold text-on-surface-variant">Promo image URL<input className={inputClass} name="promoImageUrl" type="url" defaultValue={brand?.promoImageUrl || ""} /></label>
      {error && <p className="col-span-2 text-xs text-status-danger bg-status-danger/10 p-2 rounded">{error}</p>}
      <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-subtle">
        <button type="button" onClick={onClose} className={`${buttonClass} border border-subtle bg-surface-deep`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${buttonClass} bg-primary text-on-primary`}>{saving ? "Saving…" : "Save Brand"}</button>
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
    <form onSubmit={submit} className="grid grid-cols-2 gap-2.5">
      <label className="col-span-2 text-xs font-bold text-on-surface-variant">Brand<select className={inputClass} name="brandId" required defaultValue={rate?.brandId || ""}><option value="" disabled>Select brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <label className="text-xs font-bold text-on-surface-variant">Currency<input className={inputClass} name="currency" required maxLength={3} defaultValue={rate?.currency || "USD"} placeholder="USD, GBP, EUR..." /></label>
      <label className="text-xs font-bold text-on-surface-variant">Card type<select className={inputClass} name="cardType" required defaultValue={rate?.cardType || "physical"}><option value="physical">Physical Card</option><option value="ecode">E-Code / Digital</option></select></label>
      <label className="text-xs font-bold text-on-surface-variant">Minimum value<input className={inputClass} name="minValue" type="number" min="0" step="any" required defaultValue={rate?.minValue ?? 10} /></label>
      <label className="text-xs font-bold text-on-surface-variant">Maximum value (optional)<input className={inputClass} name="maxValue" type="number" min="0" step="any" defaultValue={rate?.maxValue ?? ""} placeholder="No maximum" /></label>
      <label className="text-xs font-bold text-on-surface-variant">Rate per Unit (₦)<input className={inputClass} name="ratePerUnit" type="number" min="0" step="any" required defaultValue={rate?.ratePerUnit ?? 1500} /></label>
      <label className="text-xs font-bold text-on-surface-variant">Version<input className={inputClass} name="version" type="number" min="0" step="1" required defaultValue={rate?.version ?? 1} /></label>
      <label className="col-span-2 flex items-center gap-2 text-xs font-bold"><input name="isActive" type="checkbox" defaultChecked={rate?.isActive ?? true} />Active rate in market</label>
      {error && <p className="col-span-2 text-xs text-status-danger bg-status-danger/10 p-2 rounded">{error}</p>}
      <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-subtle">
        <button type="button" onClick={onClose} className={`${buttonClass} border border-subtle bg-surface-deep`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${buttonClass} bg-primary text-on-primary`}>{saving ? "Saving…" : "Save Rate"}</button>
      </div>
    </form>
  );
}

export default function GiftcardPage() {
  const brandsState = useGiftcardBrands();
  const ratesState = useGiftcardRates();
  const tradesState = useGiftcardTrades();
  const settingsState = useGiftcardSettings();

  // Active top-level tab
  type MainTab = "queue" | "history" | "rates" | "brands";
  const [activeTab, setActiveTab] = useState<MainTab>("queue");

  // Selected trade for Inspector
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [selectedQueueFilter, setSelectedQueueFilter] = useState<"pending" | "all" | "approved" | "rejected">("pending");
  const [queueSearch, setQueueSearch] = useState("");

  // Modals & Action states
  const [brandModal, setBrandModal] = useState<GiftcardBrand | "new" | null>(null);
  const [rateModal, setRateModal] = useState<GiftcardRate | "new" | null>(null);
  const [tradeModal, setTradeModal] = useState<{
    trade: GiftcardTrade;
    action: TradeAction;
    cardValue: number;
    payoutAmount: number;
    comment: string;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number>(0);
  const [processingTrade, setProcessingTrade] = useState<string | null>(null);
  const [togglingBrand, setTogglingBrand] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Settings form state
  const [payoutMode, setPayoutMode] = useState("");
  const [payoutDestination, setPayoutDestination] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Ledger state
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState<"all" | "approved" | "rejected" | "pending">("all");
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_PER_PAGE = 15;

  // Rate tab state
  type RateTab = "all" | "physical" | "ecode" | "USD" | "GBP" | "EUR";
  const [rateTab, setRateTab] = useState<RateTab>("all");
  const [ratePage, setRatePage] = useState(0);
  const RATES_PER_PAGE = 10;

  useEffect(() => {
    if (settingsState.data) {
      setPayoutMode(settingsState.data.payoutMode || "auto");
      setPayoutDestination(settingsState.data.payoutDestination || "");
    }
  }, [settingsState.data]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Derived lists
  const allTrades = tradesState.data;
  const pendingTrades = useMemo(() => allTrades.filter((t) => t.status === "pending"), [allTrades]);
  const approvedTrades = useMemo(() => allTrades.filter((t) => t.status === "approved"), [allTrades]);
  const rejectedTrades = useMemo(() => allTrades.filter((t) => t.status === "rejected"), [allTrades]);

  const totalRedeemedNaira = useMemo(() => {
    return approvedTrades.reduce((sum, t) => sum + (Number(t.payoutAmount) || 0), 0);
  }, [approvedTrades]);

  // Queue filtered trades
  const filteredQueueTrades = useMemo(() => {
    let list = allTrades;
    if (selectedQueueFilter === "pending") list = pendingTrades;
    else if (selectedQueueFilter === "approved") list = approvedTrades;
    else if (selectedQueueFilter === "rejected") list = rejectedTrades;

    if (!queueSearch.trim()) return list;
    const q = queueSearch.toLowerCase();
    return list.filter(
      (t) =>
        t.id?.toLowerCase().includes(q) ||
        t.brandName?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.userEmail?.toLowerCase().includes(q) ||
        t.ecode?.toLowerCase().includes(q)
    );
  }, [allTrades, pendingTrades, approvedTrades, rejectedTrades, selectedQueueFilter, queueSearch]);

  // Auto-select first trade in queue if current selection is invalid
  useEffect(() => {
    if (!selectedTradeId && filteredQueueTrades.length > 0) {
      setSelectedTradeId(filteredQueueTrades[0].id);
    } else if (selectedTradeId && !allTrades.some((t) => t.id === selectedTradeId)) {
      setSelectedTradeId(filteredQueueTrades[0]?.id || null);
    }
  }, [filteredQueueTrades, selectedTradeId, allTrades]);

  const selectedTrade = useMemo(() => {
    return allTrades.find((t) => t.id === selectedTradeId) || null;
  }, [allTrades, selectedTradeId]);

  // Valid card images for selected trade
  const validTradeImages = useMemo(() => {
    if (!selectedTrade?.cardImageUrls) return [];
    return selectedTrade.cardImageUrls.map(safeImageUrl).filter((url): url is string => Boolean(url));
  }, [selectedTrade]);

  // Filter rates by tab
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

  // Ledger filtered trades
  const filteredLedger = useMemo(() => {
    return allTrades.filter((t) => {
      const matchStatus = ledgerStatus === "all" || t.status === ledgerStatus;
      if (!matchStatus) return false;
      if (!ledgerSearch.trim()) return true;
      const q = ledgerSearch.toLowerCase();
      return (
        t.id?.toLowerCase().includes(q) ||
        t.brandName?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.userEmail?.toLowerCase().includes(q) ||
        t.ecode?.toLowerCase().includes(q)
      );
    });
  }, [allTrades, ledgerStatus, ledgerSearch]);

  const ledgerPageCount = Math.max(1, Math.ceil(filteredLedger.length / LEDGER_PER_PAGE));
  const pagedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * LEDGER_PER_PAGE;
    return filteredLedger.slice(start, start + LEDGER_PER_PAGE);
  }, [filteredLedger, ledgerPage]);

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
      showToast(`Brand ${brand.name} updated`);
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
      showToast("Payout settings updated successfully");
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setSavingSettings(false);
    }
  }

  async function processTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tradeModal) return;
    const comment = tradeModal.comment.trim();
    if (tradeModal.action === "reject" && !comment) return;
    setProcessingTrade(tradeModal.trade.id);
    setActionError(null);
    try {
      await httpsCallable(functions, "processGiftcardTrade")({
        tradeId: tradeModal.trade.id,
        action: tradeModal.action,
        cardValue: tradeModal.cardValue,
        payoutAmount: tradeModal.payoutAmount,
        comment,
      });
      showToast(`Trade #${tradeModal.trade.id.slice(0, 8)} ${tradeModal.action === "approve" ? "Approved" : "Rejected"}`);
      setTradeModal(null);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setProcessingTrade(null);
    }
  }

  function handleCopyEcode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function exportCsv() {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = filteredLedger.map((trade) => [
      formatDate(trade.createdAt),
      trade.id,
      trade.uid,
      trade.userName,
      trade.userEmail,
      trade.brandName,
      trade.cardType,
      trade.currency,
      trade.cardValue,
      trade.rateApplied,
      trade.payoutAmount,
      trade.status,
      trade.adminId,
      trade.adminComment,
      trade.rejectionReason,
    ].map(escape).join(","));
    const header = ["Created at", "Trade ID", "User ID", "User name", "User email", "Brand", "Card type", "Currency", "Card value", "Rate applied", "Payout amount", "Status", "Admin ID", "Admin comment", "Rejection reason"].map(escape).join(",");
    const url = URL.createObjectURL(new Blob([[header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `giftcard-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV Exported successfully");
  }

  // ---------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------

  // TAB 1: Queue & Trade Inspector (Split Screen Workspace)
  const renderQueueTab = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-3.5" style={{ height: "calc(100vh - 220px)", minHeight: "560px" }}>
        {/* LEFT PANE: Queue List (340px width) */}
        <div className="w-full lg:w-[340px] shrink-0 bg-surface-bright border border-subtle rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          {/* Header & Filter Row */}
          <div className="p-3 border-b border-subtle bg-surface-container-low shrink-0 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <h3 className="font-headline-sm font-bold text-on-surface text-sm">Giftcard Queue</h3>
              </div>
              <span className={`font-label-caps text-[10px] font-bold px-2 py-0.5 rounded-full ${pendingTrades.length > 0 ? "bg-status-danger text-white animate-pulse" : "bg-surface-container text-on-surface-variant"}`}>
                {pendingTrades.length} PENDING
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1 bg-surface-deep p-0.5 rounded-lg border border-subtle">
              {(["pending", "all", "approved", "rejected"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedQueueFilter(filter)}
                  className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    selectedQueueFilter === filter ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1.5 text-on-surface-variant text-[14px]">search</span>
              <input
                type="text"
                placeholder="Search user, brand, ID..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full bg-surface-bright border border-subtle rounded-md pl-7 pr-2 py-1 text-xs font-body-sm outline-none focus:border-secondary"
              />
            </div>
          </div>

          {/* Scrollable Trades Queue */}
          <div className="flex-1 overflow-y-auto divide-y divide-subtle no-scrollbar">
            {tradesState.loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-surface-container-high rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredQueueTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-body-sm p-6 text-center">
                <span className="material-symbols-outlined text-[36px] mb-2 opacity-30">card_giftcard</span>
                <p className="text-xs font-bold">No trades in queue</p>
                <p className="text-[10px] text-on-surface-variant/70 mt-0.5">Matching filter "{selectedQueueFilter}"</p>
              </div>
            ) : (
              filteredQueueTrades.map((t) => {
                const isSelected = selectedTradeId === t.id;
                const isPending = t.status === "pending";
                const isApproved = t.status === "approved";
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTradeId(t.id)}
                    className={`p-3 flex flex-col gap-1.5 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? "bg-secondary/10 border-l-secondary shadow-inner"
                        : isPending
                        ? "border-l-status-warning hover:bg-surface-container-low"
                        : isApproved
                        ? "border-l-status-success hover:bg-surface-container-low opacity-80"
                        : "border-l-status-danger hover:bg-surface-container-low opacity-75"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-surface-deep flex items-center justify-center font-bold text-xs text-primary shrink-0 border border-subtle">
                          <span className="material-symbols-outlined text-[16px]">redeem</span>
                        </div>
                        <div className="truncate">
                          <div className="font-body-sm text-xs font-bold text-on-surface truncate">{t.brandName || "Giftcard"}</div>
                          <div className="text-[10px] font-data-mono text-on-surface-variant truncate">#{t.id.slice(0, 10)}</div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          isPending ? "bg-status-warning/15 text-status-warning" : isApproved ? "bg-status-success/15 text-status-success" : "bg-status-danger/15 text-status-danger"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="font-data-mono font-bold text-primary">
                        {formatMoney(t.cardValue, t.currency)}
                      </span>
                      <span className="font-data-mono font-bold text-secondary text-[11px]">
                        {formatMoney(t.payoutAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-on-surface-variant border-t border-subtle/50 pt-1">
                      <span className="truncate max-w-[140px]">{t.userName || t.userEmail?.slice(0, 16) || "User"}</span>
                      <span className="font-data-mono shrink-0">{timeAgo(t.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Trade Inspector & Review Engine */}
        <div className="flex-1 bg-surface-bright border border-subtle rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          {!selectedTrade ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-[54px] opacity-30 mb-3">quick_reference_all</span>
              <p className="font-headline-md text-sm font-bold text-on-surface">No trade selected</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                Select a gift card trade from the queue on the left to inspect uploaded card images, verify the e-code, review the payout calculation, and process approval or rejection.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Pinned Inspector Header */}
              <div className="px-4 py-3 border-b border-subtle bg-surface-container-low shrink-0 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-deep flex items-center justify-center font-bold text-primary border border-subtle">
                    <span className="material-symbols-outlined text-[20px]">redeem</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-base font-bold text-on-surface">{selectedTrade.brandName} Gift Card</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container-high text-secondary border border-subtle">
                        {selectedTrade.cardType || "PHYSICAL"}
                      </span>
                    </div>
                    <p className="font-data-mono text-[10px] text-on-surface-variant">
                      Trade ID: <span className="font-bold text-primary">#{selectedTrade.id}</span> · Submitted {formatDate(selectedTrade.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 ${
                      selectedTrade.status === "pending"
                        ? "bg-status-warning/15 text-status-warning border border-status-warning/30"
                        : selectedTrade.status === "approved"
                        ? "bg-status-success/15 text-status-success border border-status-success/30"
                        : "bg-status-danger/15 text-status-danger border border-status-danger/30"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedTrade.status === "pending" ? "bg-status-warning animate-pulse" : selectedTrade.status === "approved" ? "bg-status-success" : "bg-status-danger"}`} />
                    {selectedTrade.status}
                  </span>
                </div>
              </div>

              {/* Scrollable Inspector Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                {/* 4-Column Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-surface-container-low border border-subtle p-3 rounded-lg flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-[9px] text-on-surface-variant font-bold uppercase">FACE VALUE</span>
                      {selectedTrade.cardValueAdjusted && (
                        <span className="px-1.5 py-0.2 bg-status-warning/15 text-status-warning rounded text-[8px] font-black tracking-wider uppercase border border-status-warning/30">
                          ADJUSTED
                        </span>
                      )}
                    </div>
                    <span className="font-data-mono text-base font-bold text-on-surface mt-1">
                      {formatMoney(selectedTrade.cardValue, selectedTrade.currency)}
                    </span>
                    {selectedTrade.cardValueAdjusted && selectedTrade.originalCardValue != null && (
                      <span className="text-[10px] text-on-surface-variant line-through font-data-mono">
                        Stated: {formatMoney(selectedTrade.originalCardValue, selectedTrade.currency)}
                      </span>
                    )}
                  </div>
                  <div className="bg-surface-container-low border border-subtle p-3 rounded-lg flex flex-col justify-between">
                    <span className="font-label-caps text-[9px] text-on-surface-variant font-bold uppercase">RATE APPLIED</span>
                    <span className="font-data-mono text-base font-bold text-status-info mt-1">
                      {formatMoney(selectedTrade.rateApplied)} / {selectedTrade.currency || "USD"}
                    </span>
                  </div>
                  <div className="bg-surface-container-low border border-subtle p-3 rounded-lg flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-[9px] text-on-surface-variant font-bold uppercase">PAYOUT AMOUNT</span>
                      {selectedTrade.payoutAdjusted && (
                        <span className="px-1.5 py-0.2 bg-status-warning/15 text-status-warning rounded text-[8px] font-black tracking-wider uppercase border border-status-warning/30">
                          ADJUSTED
                        </span>
                      )}
                    </div>
                    <span className="font-data-mono text-base font-bold text-status-success mt-1">
                      {formatMoney(selectedTrade.payoutAmount)}
                    </span>
                    {selectedTrade.payoutAdjusted && selectedTrade.originalPayoutAmount != null && (
                      <span className="text-[10px] text-on-surface-variant line-through font-data-mono">
                        Stated: {formatMoney(selectedTrade.originalPayoutAmount)}
                      </span>
                    )}
                  </div>
                  <div className="bg-surface-container-low border border-subtle p-3 rounded-lg flex flex-col justify-between">
                    <span className="font-label-caps text-[9px] text-on-surface-variant font-bold uppercase">USER DETAILS</span>
                    <span className="text-xs font-bold text-on-surface truncate mt-1" title={selectedTrade.userEmail}>
                      {selectedTrade.userName || selectedTrade.userEmail || selectedTrade.uid?.slice(0, 10)}
                    </span>
                  </div>
                </div>

                {/* E-Code Verification Section (if available) */}
                {selectedTrade.ecode && (
                  <div className="bg-surface-deep border border-secondary/30 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-[10px] text-secondary font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">pin</span>
                        DIGITAL E-CODE PIN
                      </span>
                      <button
                        onClick={() => handleCopyEcode(selectedTrade.ecode!)}
                        className="px-2.5 py-1 bg-surface-container border border-subtle rounded-md text-[10px] font-bold text-secondary hover:bg-surface-container-high transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">{copiedCode ? "check" : "content_copy"}</span>
                        {copiedCode ? "COPIED!" : "COPY PIN"}
                      </button>
                    </div>
                    <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-subtle font-data-mono text-base font-black text-primary tracking-widest text-center select-all">
                      {selectedTrade.ecode}
                    </div>
                  </div>
                )}

                {/* Compact Scrollable Card Uploaded Images Gallery */}
                <div className="bg-surface-container-low border border-subtle rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-label-caps text-[10px] text-on-surface-variant font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">photo_library</span>
                      UPLOADED CARD PROOFS &amp; RECEIPT ({validTradeImages.length})
                    </span>
                    {validTradeImages.length > 0 && (
                      <span className="text-[10px] text-secondary font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">swipe</span>
                        Scroll to view · Click to enlarge
                      </span>
                    )}
                  </div>

                  {validTradeImages.length === 0 ? (
                    <div className="p-4 text-center text-on-surface-variant/50 border border-dashed border-subtle rounded-lg">
                      <span className="material-symbols-outlined text-[24px] mb-0.5 opacity-30">image_not_supported</span>
                      <p className="text-xs">No physical images uploaded with this trade.</p>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto p-2 bg-surface-deep rounded-lg border border-subtle max-h-36 no-scrollbar">
                      {validTradeImages.map((url, idx) => (
                        <div
                          key={idx}
                          className="group relative w-32 h-24 shrink-0 bg-surface-container-lowest rounded-lg border border-subtle overflow-hidden cursor-pointer hover:border-secondary transition-all shadow-sm flex items-center justify-center"
                          onClick={() => {
                            setPreviewImage(url);
                            setPreviewImageIndex(idx);
                          }}
                        >
                          <img
                            src={url}
                            alt={`Giftcard image ${idx + 1}`}
                            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-white text-[20px]">zoom_in</span>
                            <span className="text-[9px] text-white font-bold">Inspect</span>
                          </div>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/75 text-white rounded text-[8px] font-data-mono">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Instructions / Comments */}
                {selectedTrade.comment && (
                  <div className="bg-surface-container-low border border-subtle rounded-xl p-3 flex flex-col gap-1">
                    <span className="font-label-caps text-[10px] text-on-surface-variant font-bold">USER NOTES / COMMENT</span>
                    <p className="text-xs text-on-surface whitespace-pre-wrap">{selectedTrade.comment}</p>
                  </div>
                )}

                {/* Audit & Review Log (If already reviewed) */}
                {selectedTrade.status !== "pending" && (
                  <div className="bg-surface-container border border-subtle rounded-xl p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">history_edu</span>
                      <span className="font-label-caps text-[10px] text-on-surface-variant font-bold">AUDIT REVIEW TRAIL</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-on-surface-variant text-[10px] block">Reviewed At:</span>
                        <span className="font-data-mono font-bold">{formatDate(selectedTrade.reviewedAt)}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant text-[10px] block">Reviewer Admin:</span>
                        <span className="font-data-mono font-bold">{selectedTrade.adminId || "Platform Admin"}</span>
                      </div>
                      {(selectedTrade.cardValueAdjusted || selectedTrade.payoutAdjusted) && (
                        <div className="col-span-2 p-2 bg-status-warning/10 rounded border border-status-warning/30 text-[11px]">
                          <span className="text-status-warning font-bold block">Admin Override Details:</span>
                          <span className="text-on-surface font-data-mono">
                            Face Value: {formatMoney(selectedTrade.originalCardValue, selectedTrade.currency)} → {formatMoney(selectedTrade.cardValue, selectedTrade.currency)} | Payout: {formatMoney(selectedTrade.originalPayoutAmount)} → {formatMoney(selectedTrade.payoutAmount)}
                          </span>
                        </div>
                      )}
                      {(selectedTrade.rejectionReason || selectedTrade.adminComment) && (
                        <div className="col-span-2 mt-1 p-2 bg-surface-deep rounded border border-subtle">
                          <span className="text-on-surface-variant text-[10px] block font-bold">Admin Remark:</span>
                          <span className="text-xs text-on-surface font-medium">{selectedTrade.rejectionReason || selectedTrade.adminComment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Bottom Action Toolbar */}
              {selectedTrade.status === "pending" && (
                <div className="p-3 border-t border-subtle bg-surface-container-low shrink-0 flex justify-between items-center gap-3">
                  <div className="text-xs">
                    <span className="text-on-surface-variant text-[10px] block">Payout upon approval:</span>
                    <span className="font-data-mono font-black text-secondary text-sm">{formatMoney(selectedTrade.payoutAmount)}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={processingTrade === selectedTrade.id}
                      onClick={() =>
                        setTradeModal({
                          trade: selectedTrade,
                          action: "reject",
                          cardValue: Number(selectedTrade.cardValue) || 0,
                          payoutAmount: Number(selectedTrade.payoutAmount) || 0,
                          comment: "",
                        })
                      }
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-status-danger/15 text-status-danger hover:bg-status-danger/25 border border-status-danger/30 transition-all"
                    >
                      REJECT TRADE
                    </button>
                    <button
                      disabled={processingTrade === selectedTrade.id}
                      onClick={() => {
                        const cVal = Number(selectedTrade.cardValue) || 0;
                        const rVal = Number(selectedTrade.rateApplied) || 0;
                        const pVal = Number(selectedTrade.payoutAmount) || Math.round(cVal * rVal);
                        setTradeModal({
                          trade: selectedTrade,
                          action: "approve",
                          cardValue: cVal,
                          payoutAmount: pVal,
                          comment: "",
                        });
                      }}
                      className="px-5 py-2 rounded-lg text-xs font-bold bg-status-success text-white hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      VERIFY &amp; APPROVE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // TAB 2: Trade History Ledger
  const renderHistoryTab = () => {
    return (
      <div className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col gap-3">
        {/* Ledger Header & Search Controls */}
        <div className="p-3.5 border-b border-subtle bg-surface-container-low flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary">Giftcard Trade Ledger</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Comprehensive audit history of all processed customer redemptions</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[14px]">search</span>
              <input
                type="text"
                placeholder="Search ledger..."
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value);
                  setLedgerPage(1);
                }}
                className="bg-surface-deep border border-subtle rounded-lg pl-7 pr-3 py-1.5 text-xs font-body-sm outline-none focus:border-secondary w-48"
              />
            </div>

            <select
              value={ledgerStatus}
              onChange={(e: any) => {
                setLedgerStatus(e.target.value);
                setLedgerPage(1);
              }}
              className="bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 text-xs font-body-sm outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={exportCsv}
              disabled={!filteredLedger.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-subtle bg-surface-container text-secondary text-xs hover:bg-surface-container-high transition-colors font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">download</span> Export CSV
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm border-collapse">
            <thead className="bg-surface-container-low font-label-caps text-[10px] text-on-surface-variant border-b border-subtle">
              <tr>
                <th className="py-2.5 px-3 font-bold">DATE</th>
                <th className="py-2.5 px-3 font-bold">TRADE ID</th>
                <th className="py-2.5 px-3 font-bold">USER</th>
                <th className="py-2.5 px-3 font-bold">ASSET &amp; TYPE</th>
                <th className="py-2.5 px-3 font-bold">CARD VALUE</th>
                <th className="py-2.5 px-3 font-bold">RATE</th>
                <th className="py-2.5 px-3 font-bold">PAYOUT</th>
                <th className="py-2.5 px-3 font-bold">STATUS</th>
                <th className="py-2.5 px-3 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle font-data-mono text-xs">
              {pagedLedger.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-on-surface-variant font-body-sm text-xs">
                    No giftcard trades found matching criteria.
                  </td>
                </tr>
              ) : (
                pagedLedger.map((trade) => {
                  const isApproved = trade.status === "approved";
                  const isPending = trade.status === "pending";
                  return (
                    <tr key={trade.id} className="hover:bg-primary/5 transition-colors">
                      <td className="py-2 px-3 text-on-surface-variant font-body-sm text-xs">{formatDate(trade.reviewedAt || trade.createdAt)}</td>
                      <td className="py-2 px-3 text-secondary font-bold">#{trade.id.slice(0, 8)}</td>
                      <td className="py-2 px-3 font-body-sm">
                        <span className="block font-bold text-xs text-on-surface">{trade.userName || "—"}</span>
                        <span className="text-[10px] text-on-surface-variant font-data-mono">{trade.userEmail || trade.uid?.slice(0, 10)}</span>
                      </td>
                      <td className="py-2 px-3 font-body-sm">
                        <span className="font-bold text-xs">{trade.brandName}</span>
                        <span className="text-[10px] text-on-surface-variant ml-1.5 uppercase font-bold">({trade.cardType})</span>
                      </td>
                      <td className="py-2 px-3 font-bold text-xs">{formatMoney(trade.cardValue, trade.currency)}</td>
                      <td className="py-2 px-3 text-on-surface-variant text-[11px]">{formatMoney(trade.rateApplied)}</td>
                      <td className="py-2 px-3 text-secondary font-bold text-xs">{formatMoney(trade.payoutAmount)}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isApproved ? "bg-status-success/15 text-status-success" : isPending ? "bg-status-warning/15 text-status-warning" : "bg-status-danger/15 text-status-danger"
                          }`}
                        >
                          {trade.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-body-sm">
                        <button
                          onClick={() => {
                            setSelectedTradeId(trade.id);
                            setActiveTab("queue");
                          }}
                          className="px-2.5 py-1 bg-surface-deep border border-subtle rounded text-xs font-bold text-secondary hover:bg-surface-container transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Pagination */}
        {ledgerPageCount > 1 && (
          <div className="flex justify-between items-center px-3.5 py-2 border-t border-subtle bg-surface-container-low text-xs">
            <button
              onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              disabled={ledgerPage === 1}
              className="px-2.5 py-1 bg-surface-deep border border-subtle rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
            >
              Prev
            </button>
            <span className="font-data-mono text-xs text-on-surface-variant">
              Page {ledgerPage} of {ledgerPageCount} ({filteredLedger.length} trades)
            </span>
            <button
              onClick={() => setLedgerPage((p) => Math.min(ledgerPageCount, p + 1))}
              disabled={ledgerPage >= ledgerPageCount}
              className="px-2.5 py-1 bg-surface-deep border border-subtle rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  // TAB 3: Rate Management & Live Quotations
  const renderRatesTab = () => {
    return (
      <div className="bg-surface-bright border border-subtle rounded-xl p-3.5 md:p-4 shadow-sm flex flex-col gap-3.5">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary font-bold">Exchange Rate Management</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Live unit redemption rates configured for end-user mobile app calculations</p>
          </div>
          <button
            disabled={!brandsState.data.length}
            onClick={() => setRateModal("new")}
            className="bg-secondary text-on-secondary px-3.5 py-1.5 rounded-lg font-bold text-xs hover:opacity-90 transition-opacity shadow flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span> ADD NEW RATE
          </button>
        </div>

        {/* Currency Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(["all", "physical", "ecode", "USD", "GBP", "EUR"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setRateTab(tab);
                setRatePage(0);
              }}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                rateTab === tab ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {tab === "all" ? "All Rates" : tab}
            </button>
          ))}
        </div>

        {/* Rates Table */}
        <div className="overflow-x-auto rounded-lg border border-subtle">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-caps text-[10px]">
              <tr className="border-b border-subtle">
                <th className="py-2.5 px-3 font-bold">BRAND / CURRENCY</th>
                <th className="py-2.5 px-3 font-bold">CARD TYPE</th>
                <th className="py-2.5 px-3 font-bold">DENOMINATION RANGE</th>
                <th className="py-2.5 px-3 font-bold">EXCHANGE RATE</th>
                <th className="py-2.5 px-3 font-bold">STATUS</th>
                <th className="py-2.5 px-3 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle font-data-mono text-xs">
              {pagedRates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant font-body-sm text-xs">
                    No exchange rates configured for this tab.
                  </td>
                </tr>
              ) : (
                pagedRates.map((rate) => (
                  <tr key={rate.id} className={`hover:bg-primary/5 transition-colors ${!rate.isActive ? "opacity-50" : ""}`}>
                    <td className="py-2 px-3 font-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-deep px-1.5 py-0.5 rounded text-[10px] font-bold text-primary border border-subtle">
                          {rate.currency}
                        </span>
                        <span className="font-bold text-xs">{rate.brandName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-[10px] uppercase font-bold text-secondary">
                        {rate.cardType}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-data-mono text-xs">
                      {formatMoney(rate.minValue, rate.currency)} – {rate.maxValue == null ? "No max" : formatMoney(rate.maxValue, rate.currency)}
                    </td>
                    <td className="py-2 px-3 font-bold text-status-success">
                      {formatMoney(rate.ratePerUnit)} <span className="text-[10px] text-on-surface-variant font-normal">/ unit</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rate.isActive ? "bg-status-success/15 text-status-success" : "bg-surface-container text-on-surface-variant"}`}>
                        {rate.isActive ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setRateModal(rate)}
                        className="p-1 rounded hover:bg-surface-container transition-colors"
                        title="Edit rate"
                      >
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant hover:text-primary">edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rate Pagination */}
        {ratePageCount > 1 && (
          <div className="flex items-center justify-between border-t border-subtle pt-2 text-xs">
            <span className="text-[10px] text-on-surface-variant font-data-mono">
              Showing {safeRatePage * RATES_PER_PAGE + 1}–{Math.min((safeRatePage + 1) * RATES_PER_PAGE, filteredRates.length)} of {filteredRates.length} rates
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRatePage((p) => Math.max(0, p - 1))}
                disabled={safeRatePage === 0}
                className="px-2 py-1 rounded-lg text-xs font-bold bg-surface-deep border border-subtle disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setRatePage((p) => Math.min(ratePageCount - 1, p + 1))}
                disabled={safeRatePage === ratePageCount - 1}
                className="px-2 py-1 rounded-lg text-xs font-bold bg-surface-deep border border-subtle disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // TAB 4: Brands & Payout Settings
  const renderBrandsTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column: Brand Management */}
        <div className="lg:col-span-8 bg-surface-bright border border-subtle rounded-xl p-3.5 md:p-4 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary font-bold">Brand Catalog Management</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Toggle visibility, edit promo tags, and configure brand listings</p>
            </div>
            <button
              onClick={() => setBrandModal("new")}
              className="bg-primary text-on-primary px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase hover:opacity-90 transition-opacity shadow flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span> ADD BRAND
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {brandsState.data.map((brand) => (
              <div
                key={brand.id}
                className={`p-3 bg-surface-container-low border border-subtle rounded-xl hover:border-primary transition-all flex items-center justify-between gap-3 ${
                  !brand.isActive ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setBrandModal(brand)}
                  className="flex min-w-0 items-center gap-2.5 text-left flex-1"
                  title="Click to edit brand details"
                >
                  <div
                    className="w-10 h-10 shrink-0 rounded-lg bg-surface-container-high flex items-center justify-center border"
                    style={{ borderColor: brand.colorHex || "#6750A4" }}
                  >
                    {brand.imageUrl && safeImageUrl(brand.imageUrl) ? (
                      <img src={safeImageUrl(brand.imageUrl)!} alt="" className="h-full w-full rounded-lg object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="material-symbols-outlined text-secondary text-[22px]">{brand.iconName || "redeem"}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs text-on-surface block truncate">{brand.name}</span>
                    <span className="text-[10px] text-on-surface-variant font-data-mono">
                      Sort: {brand.sortOrder ?? 0} {brand.featured && "· ⭐ Featured"}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={brand.isActive}
                      disabled={togglingBrand === brand.id}
                      onChange={() => toggleBrand(brand)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-status-success"></div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setBrandModal(brand)}
                    className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Payout Engine Settings */}
        <div className="lg:col-span-4 bg-surface-bright border border-subtle rounded-xl p-3.5 md:p-4 shadow-sm flex flex-col gap-3">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary font-bold">Payout Engine Control</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Automated disbursement configuration</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg border border-subtle">
              <div>
                <p className="font-body-sm text-xs font-bold">Disbursement Mode</p>
                <p className="text-[10px] text-on-surface-variant">Switch between instant API and manual approval</p>
              </div>
              <div className="flex bg-surface-deep p-0.5 rounded-lg border border-outline-variant">
                {(["auto", "manual"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPayoutMode(mode)}
                    className={`px-3 py-1 text-[10px] rounded font-bold uppercase transition-colors ${
                      payoutMode === mode ? "bg-secondary text-on-secondary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs font-bold text-on-surface-variant">
              PAYOUT DESTINATION / WALLET POOL
              <input
                className={inputClass}
                value={payoutDestination}
                onChange={(event) => setPayoutDestination(event.target.value)}
                placeholder="e.g. Master Settlement Wallet ID"
              />
            </label>

            <button
              type="button"
              disabled={savingSettings || !payoutMode || !payoutDestination.trim()}
              onClick={saveSettings}
              className="w-full py-2 rounded-lg font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 text-xs shadow-sm"
            >
              {savingSettings ? "Saving…" : "Save Payout Configuration"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-3.5">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3 py-1.5 rounded-xl shadow-lg font-body-sm text-xs text-on-surface">
          {toast}
        </div>
      )}

      {/* Global Error Banner */}
      {actionError && (
        <div className="flex justify-between items-center rounded-xl border border-status-danger/40 bg-status-danger/10 p-3 text-xs text-status-danger">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="bg-surface-bright rounded-xl border border-subtle p-3.5 md:p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary">card_giftcard</span>
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Giftcard Trade &amp; Rates Desk</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-2">
            Inspect customer gift card proofs, process instant redemptions, and manage unit rates.
            <span className="inline-flex items-center gap-1 bg-status-success/10 text-status-success px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE ENGINE
            </span>
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-4 bg-surface-container-low px-3.5 py-1.5 rounded-xl border border-subtle shrink-0">
          <div>
            <span className="text-[9px] font-label-caps text-on-surface-variant block font-bold">TOTAL REDEEMED</span>
            <span className="text-xs font-bold font-data-mono text-secondary">{formatMoney(totalRedeemedNaira)}</span>
          </div>
          <div className="border-r border-subtle h-6" />
          <div>
            <span className="text-[9px] font-label-caps text-on-surface-variant block font-bold">ACTIVE QUEUE</span>
            <span className="text-xs font-bold font-data-mono text-status-danger">{pendingTrades.length} Pending</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Switcher */}
      <div className="flex bg-surface-bright border border-subtle p-1 rounded-xl shadow-sm gap-1 w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "queue" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Trade Queue &amp; Inspector</span>
          {pendingTrades.length > 0 && (
            <span className="ml-1 bg-status-danger text-white px-1.5 py-0.2 rounded-full text-[9px] font-bold animate-pulse">
              {pendingTrades.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "history" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          <span>Trade Ledger &amp; History</span>
        </button>

        <button
          onClick={() => setActiveTab("rates")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "rates" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
          <span>Rate Management</span>
        </button>

        <button
          onClick={() => setActiveTab("brands")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "brands" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">branding_watermark</span>
          <span>Brands &amp; Settings</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "queue" && renderQueueTab()}
      {activeTab === "history" && renderHistoryTab()}
      {activeTab === "rates" && renderRatesTab()}
      {activeTab === "brands" && renderBrandsTab()}

      {/* Modals */}
      {brandModal && (
        <Modal title={brandModal === "new" ? "Add Gift Card Brand" : "Edit Brand Details"} onClose={() => setBrandModal(null)}>
          <BrandForm brand={brandModal === "new" ? null : brandModal} onClose={() => setBrandModal(null)} />
        </Modal>
      )}

      {rateModal && (
        <Modal title={rateModal === "new" ? "Add Exchange Rate" : "Edit Exchange Rate"} onClose={() => setRateModal(null)}>
          <RateForm rate={rateModal === "new" ? null : rateModal} brands={brandsState.data} onClose={() => setRateModal(null)} />
        </Modal>
      )}

      {/* Trade Approval / Modification / Rejection Modal */}
      {tradeModal && (
        <Modal
          title={
            tradeModal.action === "approve"
              ? tradeModal.cardValue !== tradeModal.trade.cardValue || tradeModal.payoutAmount !== tradeModal.trade.payoutAmount
                ? "Modify & Approve Gift Card Trade"
                : "Confirm Trade Approval & Payout"
              : "Reject Gift Card Trade"
          }
          onClose={() => !processingTrade && setTradeModal(null)}
        >
          <form onSubmit={processTrade} className="space-y-3.5">
            {/* Top Summary Box */}
            <div className="p-3 bg-surface-container-low rounded-xl border border-subtle text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Asset Brand &amp; Type:</span>
                <span className="font-bold text-on-surface">{tradeModal.trade.brandName} ({tradeModal.trade.cardType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">User Stated Face Value:</span>
                <span className="font-data-mono font-bold">{formatMoney(tradeModal.trade.cardValue, tradeModal.trade.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Exchange Rate:</span>
                <span className="font-data-mono font-bold text-status-info">
                  {formatMoney(tradeModal.trade.rateApplied)} / {tradeModal.trade.currency || "USD"}
                </span>
              </div>
              <div className="flex justify-between border-t border-subtle pt-1.5">
                <span className="text-on-surface-variant">User / Account:</span>
                <span className="font-medium truncate max-w-[220px]">{tradeModal.trade.userName || tradeModal.trade.userEmail}</span>
              </div>
            </div>

            {/* Approval Mode: Verified Values and Adjustments */}
            {tradeModal.action === "approve" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                      <span>Verified Card Value</span>
                      {tradeModal.cardValue !== tradeModal.trade.cardValue && (
                        <span className="px-1.5 py-0.2 bg-status-warning/15 text-status-warning rounded text-[9px] font-black tracking-wider uppercase">
                          MODIFIED
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={tradeModal.cardValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const rate = Number(tradeModal.trade.rateApplied) || 0;
                          const autoPayout = Math.round(val * rate);
                          setTradeModal({
                            ...tradeModal,
                            cardValue: val,
                            payoutAmount: autoPayout,
                          });
                        }}
                        className={`${inputClass} font-data-mono font-bold`}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">
                        {tradeModal.trade.currency || "USD"}
                      </span>
                    </div>
                  </label>

                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                      <span>Final Payout (NGN)</span>
                      {tradeModal.payoutAmount !== tradeModal.trade.payoutAmount && (
                        <span className="px-1.5 py-0.2 bg-status-warning/15 text-status-warning rounded text-[9px] font-black tracking-wider uppercase">
                          MODIFIED
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={tradeModal.payoutAmount}
                        onChange={(e) => {
                          const pVal = parseFloat(e.target.value) || 0;
                          setTradeModal({
                            ...tradeModal,
                            payoutAmount: pVal,
                          });
                        }}
                        className={`${inputClass} font-data-mono font-bold text-status-success`}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">
                        ₦ NGN
                      </span>
                    </div>
                  </label>
                </div>

                {/* Modification Alert Box if adjusted */}
                {(tradeModal.cardValue !== tradeModal.trade.cardValue || tradeModal.payoutAmount !== tradeModal.trade.payoutAmount) && (
                  <div className="p-2.5 bg-status-warning/10 border border-status-warning/30 rounded-xl flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-status-warning text-[18px] shrink-0 mt-0.5">warning</span>
                    <div className="text-[11px] text-on-surface">
                      <p className="font-bold text-status-warning">Amount Override Notice</p>
                      <p className="text-on-surface-variant mt-0.5 leading-relaxed">
                        User indicated {formatMoney(tradeModal.trade.cardValue, tradeModal.trade.currency)} (expected {formatMoney(tradeModal.trade.payoutAmount)}), but will be credited {formatMoney(tradeModal.payoutAmount)} based on verified value of {formatMoney(tradeModal.cardValue, tradeModal.trade.currency)}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick Presets for Adjustments */}
                {(tradeModal.cardValue !== tradeModal.trade.cardValue || tradeModal.payoutAmount !== tradeModal.trade.payoutAmount) && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">QUICK ADJUSTMENT NOTE:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        "Partial card balance verified",
                        "Card denomination discrepancy",
                        "Platform service fee adjustment",
                        "Balance verified via issuer portal",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTradeModal({ ...tradeModal, comment: preset })}
                          className="px-2 py-1 bg-surface-deep hover:bg-surface-container border border-subtle rounded text-[10px] text-on-surface-variant transition-colors text-left truncate"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="block text-xs font-bold text-on-surface-variant">
                  <span>
                    {tradeModal.cardValue !== tradeModal.trade.cardValue || tradeModal.payoutAmount !== tradeModal.trade.payoutAmount
                      ? "Adjustment Reason / Note (Sent to user in notification)"
                      : "Approval Remark (Optional)"}
                  </span>
                  <textarea
                    name="comment"
                    value={tradeModal.comment}
                    onChange={(e) => setTradeModal({ ...tradeModal, comment: e.target.value })}
                    placeholder={
                      tradeModal.cardValue !== tradeModal.trade.cardValue
                        ? "e.g. Card balance was verified to be only $50 instead of $100."
                        : "Internal remarks or approval comments..."
                    }
                    className={`${inputClass} mt-1 min-h-16`}
                  />
                </label>
              </div>
            ) : (
              /* Rejection Mode */
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant">
                  Reason for Rejection (Required)
                  <div className="grid grid-cols-2 gap-1.5 my-2">
                    {[
                      "Invalid Code / PIN",
                      "Already Redeemed / Used",
                      "Blurry / Unreadable Image",
                      "Wrong Currency / Card Brand",
                    ].map((quickReason) => (
                      <button
                        key={quickReason}
                        type="button"
                        onClick={() => setTradeModal({ ...tradeModal, comment: quickReason })}
                        className="px-2 py-1 bg-surface-deep hover:bg-surface-container border border-subtle rounded text-[10px] text-on-surface-variant transition-colors text-left"
                      >
                        {quickReason}
                      </button>
                    ))}
                  </div>
                  <textarea
                    name="comment"
                    value={tradeModal.comment}
                    onChange={(e) => setTradeModal({ ...tradeModal, comment: e.target.value })}
                    required
                    placeholder="Explain clearly to the user why this trade is rejected..."
                    className={`${inputClass} mt-1 min-h-20`}
                  />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-subtle">
              <button
                type="button"
                disabled={Boolean(processingTrade)}
                onClick={() => setTradeModal(null)}
                className={`${buttonClass} border border-subtle bg-surface-deep`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(processingTrade) || (tradeModal.action === "reject" && !tradeModal.comment.trim())}
                className={`${buttonClass} ${tradeModal.action === "approve" ? "bg-status-success text-white hover:opacity-90" : "bg-status-danger text-white hover:opacity-90"}`}
              >
                {processingTrade
                  ? "Processing…"
                  : tradeModal.action === "approve"
                  ? tradeModal.cardValue !== tradeModal.trade.cardValue || tradeModal.payoutAmount !== tradeModal.trade.payoutAmount
                    ? `Confirm Adjusted Payout (${formatMoney(tradeModal.payoutAmount)})`
                    : `Confirm Payout (${formatMoney(tradeModal.payoutAmount)})`
                  : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Full-screen High-Res Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Top Toolbar */}
            <div className="w-full flex justify-between items-center text-white px-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">Card Proof Preview</span>
                {validTradeImages.length > 1 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-data-mono">
                    Image {previewImageIndex + 1} of {validTradeImages.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  Open Original
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Main Image Container */}
            <div className="relative flex items-center justify-center">
              {/* Prev button if multiple images */}
              {validTradeImages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = previewImageIndex > 0 ? previewImageIndex - 1 : validTradeImages.length - 1;
                    setPreviewImageIndex(nextIdx);
                    setPreviewImage(validTradeImages[nextIdx]);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors z-10"
                  title="Previous image"
                >
                  <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                </button>
              )}

              <img
                src={previewImage}
                alt="High-res giftcard preview"
                className="max-w-full max-h-[78vh] object-contain rounded-xl border border-white/20 shadow-2xl bg-black/50"
                referrerPolicy="no-referrer"
              />

              {/* Next button if multiple images */}
              {validTradeImages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = previewImageIndex < validTradeImages.length - 1 ? previewImageIndex + 1 : 0;
                    setPreviewImageIndex(nextIdx);
                    setPreviewImage(validTradeImages[nextIdx]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors z-10"
                  title="Next image"
                >
                  <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
