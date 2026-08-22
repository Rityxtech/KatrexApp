"use client";

import { useState, useEffect, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useMarketData, usePricingConfig, useGiftcardRates, useAirtimePlans } from "@/hooks/useAdminData";

function formatNaira(n: number) {
  if (isNaN(n) || !isFinite(n)) return "\u20a60.00";
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

const COIN_ICONS: Record<string, { icon: string; bg: string }> = {
  btc: { icon: "B", bg: "bg-status-warning/20 text-status-warning" },
  eth: { icon: "E", bg: "bg-status-info/20 text-status-info" },
  usdt: { icon: "T", bg: "bg-status-success/20 text-status-success" },
  sol: { icon: "S", bg: "bg-primary/20 text-primary" },
  bnb: { icon: "N", bg: "bg-tertiary/20 text-tertiary" },
  doge: { icon: "D", bg: "bg-on-primary-container/10 text-on-primary-container" },
};

export default function PricingPage() {
  const { data: market, loading: ml } = useMarketData();
  const { data: pricing } = usePricingConfig();
  const { data: giftcards, loading: gl } = useGiftcardRates();
  const { data: airtimePlans, loading: al } = useAirtimePlans();

  const coins = market.filter((m: any) => m.id !== "_ngn_rate" && m.symbol);
  const ngnRate = market.find((m: any) => m.id === "_ngn_rate")?.rate || 1450;

  const feeConfig = useMemo(() => pricing.find((p: any) => p.id === "fees") || {}, [pricing]);
  const limitsConfig = useMemo(() => pricing.find((p: any) => p.id === "limits") || {}, [pricing]);

  // ─── Fee state ─────────────────────────────────────────────────
  const [withdrawalFee, setWithdrawalFee] = useState("");
  const [depositFee, setDepositFee] = useState("");
  const [swapFee, setSwapFee] = useState("");
  const [p2pCommission, setP2pCommission] = useState("");
  const [airtimeDiscount, setAirtimeDiscount] = useState("");
  const [dataMarkup, setDataMarkup] = useState("");

  // ─── Limits state ──────────────────────────────────────────────
  const [p2pMin, setP2pMin] = useState("");
  const [p2pMax, setP2pMax] = useState("");
  const [cryptoMin, setCryptoMin] = useState("");
  const [cryptoMax, setCryptoMax] = useState("");
  const [billMin, setBillMin] = useState("");
  const [billMax, setBillMax] = useState("");

  // ─── Network filter ────────────────────────────────────────────
  const [networkFilter, setNetworkFilter] = useState("all");

  // ─── Toast / saving ────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Sync from Firestore ───────────────────────────────────────
  useEffect(() => {
    const fees = pricing.find((p: any) => p.id === "fees") || {};
    const limits = pricing.find((p: any) => p.id === "limits") || {};

    setWithdrawalFee(fees.withdrawalFee || "NGN 50");
    setDepositFee(fees.depositFee || "0%");
    setSwapFee(fees.swapFee || "0.5%");
    setP2pCommission(fees.p2pCommission || "1%");
    setAirtimeDiscount(String(fees.airtimeDiscount || "3.00"));
    setDataMarkup(String(fees.dataMarkup || "50.00"));
    setP2pMin(limits.p2pMin || "₦5,000");
    setP2pMax(limits.p2pMax || "₦5,000,000");
    setCryptoMin(limits.cryptoMin || "$10.00");
    setCryptoMax(limits.cryptoMax || "$50,000");
    setBillMin(limits.billMin || "₦100");
    setBillMax(limits.billMax || "₦100,000");
  }, [pricing]);

  function flash(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Push global updates ───────────────────────────────────────
  const pushGlobalUpdates = async () => {
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      // Save fees
      await adminApi({
        action: "updatePricingConfig",
        section: "fees",
        withdrawalFee,
        depositFee,
        swapFee,
        p2pCommission,
        airtimeDiscount,
        dataMarkup,
      });
      // Save limits
      await adminApi({
        action: "updatePricingConfig",
        section: "limits",
        p2pMin,
        p2pMax,
        cryptoMin,
        cryptoMax,
        billMin,
        billMax,
      });
      flash("success", "Global pricing updates pushed successfully");
    } catch (e: any) {
      flash("error", e.message || "Failed to push updates");
    } finally {
      setSaving(false);
    }
  };

  // ─── Filtered airtime plans ────────────────────────────────────
  const filteredPlans = useMemo(() => {
    if (networkFilter === "all") return airtimePlans;
    return airtimePlans.filter((p: any) =>
      (p.network || p.provider || "").toLowerCase().includes(networkFilter)
    );
  }, [airtimePlans, networkFilter]);

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

      <div className="w-full flex flex-col gap-3.5">
        {/* Header */}
        <div className="bg-surface-bright rounded-xl border border-subtle p-3.5 md:p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Pricing &amp; Rates Engine</h1>
              <span className="font-data-mono text-[10px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-bold">TERMINAL-ALPHA</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-2">
              Automated oracle rate sync &amp; multi-channel fee controllers
              <span className="flex items-center gap-1 text-status-success font-bold text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE FEED ACTIVE</span>
            </p>
          </div>
          <button
            onClick={pushGlobalUpdates}
            disabled={saving}
            className="bg-primary text-on-primary font-bold px-3 py-1.5 rounded-lg text-xs font-label-caps hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">{saving ? "hourglass_top" : "publish"}</span>
            {saving ? "PUSHING UPDATES..." : "PUSH GLOBAL UPDATES"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Crypto Exchange Rates */}
          <section className="lg:col-span-8 bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-subtle bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">currency_bitcoin</span>
                <h2 className="font-headline-md text-headline-md font-bold">Crypto Exchange Rates</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-deep px-2.5 py-0.5 rounded-full border border-subtle">
                <span className="font-label-caps text-[9px] font-bold text-on-surface-variant">ORACLE SYNC</span>
                <span className="text-[10px] font-bold text-status-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success" /> ACTIVE</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-subtle">
                  <tr>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant">COIN</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant">LIVE PRICE (USD)</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant">BUY RATE (NGN)</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant">SELL RATE (NGN)</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant">24H CHANGE</th>
                    <th className="px-3 py-2 font-label-caps text-[10px] text-on-surface-variant">STATUS</th>
                  </tr>
                </thead>
                <tbody className="font-data-mono text-xs divide-y divide-subtle">
                  {ml ? (
                    Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-3"><div className="h-6 bg-surface-container-low rounded animate-pulse" /></td></tr>)
                  ) : coins.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-on-surface-variant text-body-sm">No market data</td></tr>
                  ) : (
                    coins.map((coin: any) => {
                      const meta = COIN_ICONS[coin.symbol?.toLowerCase()] || { icon: coin.symbol?.[0] || "?", bg: "bg-surface-container-high text-on-surface" };
                      const buyRate = (coin.priceNaira || 0) * 1.01;
                      const sellRate = (coin.priceNaira || 0) * 0.99;
                      const change = coin.change24h || 0;
                      return (
                        <tr key={coin.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-3 py-2 flex items-center gap-2">
                            <div className={`w-6 h-6 ${meta.bg} flex items-center justify-center rounded-lg font-bold text-[10px]`}>{meta.icon}</div>
                            <span className="font-bold uppercase text-on-surface text-xs">{coin.symbol}</span>
                          </td>
                          <td className="px-3 py-2 text-on-surface font-semibold text-xs">${(coin.priceUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-status-success font-bold text-xs">{"\u20a6"}{buyRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-status-danger font-bold text-xs">{"\u20a6"}{sellRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className={`px-3 py-2 font-bold text-xs ${change >= 0 ? "text-status-success" : "text-status-danger"}`}>
                            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-status-success/10 text-status-success text-[10px] rounded-full uppercase font-bold">Trading</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Fee Structure */}
          <section className="lg:col-span-4 bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">percent</span>
              <h2 className="font-headline-md text-headline-md font-bold">Fee Structure</h2>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Withdrawal Fee", sub: "Fiat Output", val: withdrawalFee, setter: setWithdrawalFee },
                { label: "Deposit Fee", sub: "All Channels", val: depositFee, setter: setDepositFee },
                { label: "Swap Fee", sub: "Cross-Asset", val: swapFee, setter: setSwapFee },
                { label: "Platform Commission", sub: "P2P Escrow", val: p2pCommission, setter: setP2pCommission },
              ].map((f) => (
                <div key={f.label} className="flex justify-between items-center p-2.5 bg-surface-container-low border border-subtle rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-on-surface">{f.label}</p>
                    <p className="text-[9px] text-on-surface-variant uppercase font-bold">{f.sub}</p>
                  </div>
                  <input
                    className="bg-surface-deep border border-subtle text-secondary font-data-mono font-bold px-2 py-1 w-20 text-right rounded-lg focus:border-secondary outline-none text-xs"
                    type="text"
                    value={f.val}
                    onChange={(e) => f.setter(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Giftcard Rates */}
          <section className="lg:col-span-6 bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">featured_video</span>
                <h2 className="font-headline-md text-headline-md font-bold">Giftcard Asset Rates</h2>
              </div>
              <span className="text-[10px] font-bold font-data-mono text-on-surface-variant">{giftcards.length} rates</span>
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {gl ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-surface-container-low rounded-xl animate-pulse" />)
              ) : giftcards.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-body-sm bg-surface-container-low rounded-xl border border-subtle">No giftcard rates configured</div>
              ) : (
                giftcards.map((g: any) => (
                  <div key={g.id} className="flex justify-between items-center p-2.5 bg-surface-container-low border border-subtle rounded-xl hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-tertiary/10 text-tertiary rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">redeem</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface">{g.brandName || g.name || g.brand || "Giftcard"}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium">{g.currency || "USD"} &bull; {g.cardType || "All Types"}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className="font-label-caps text-[9px] text-on-surface-variant block font-bold">RATE</span>
                        <span className="font-data-mono text-xs font-bold text-tertiary">{"\u20a6"}{(g.ratePerUnit || g.rate || g.buyRate || 0).toLocaleString()}/$</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${g.isActive !== false ? "bg-status-success/10 text-status-success" : "bg-on-surface-variant/20 text-on-surface-variant"}`}>
                        {g.isActive !== false ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Airtime & Data Rates */}
          <section className="lg:col-span-6 bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-info text-[20px]">settings_cell</span>
                <h2 className="font-headline-md text-headline-md font-bold">Airtime &amp; Data Utility</h2>
              </div>
              <div className="flex gap-1">
                {["all", "mtn", "airtel", "glo", "9mobile"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNetworkFilter(n)}
                    className={`px-2 py-0.5 font-bold text-[10px] rounded-lg uppercase transition-colors ${
                      networkFilter === n
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low text-on-surface-variant border border-subtle hover:bg-surface-container"
                    }`}
                  >
                    {n === "all" ? "ALL" : n}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-surface-container-low border border-subtle p-2.5 rounded-xl space-y-1">
                <p className="font-label-caps text-[9px] text-on-surface-variant font-bold">AIRTIME DISCOUNT (%)</p>
                <input
                  className="w-full bg-surface-deep border border-subtle text-status-success font-data-mono font-bold p-1.5 rounded-lg focus:border-secondary outline-none text-xs"
                  type="text"
                  value={airtimeDiscount}
                  onChange={(e) => setAirtimeDiscount(e.target.value)}
                />
              </div>
              <div className="bg-surface-container-low border border-subtle p-2.5 rounded-xl space-y-1">
                <p className="font-label-caps text-[9px] text-on-surface-variant font-bold">DATA MARKUP (FIXED NGN)</p>
                <input
                  className="w-full bg-surface-deep border border-subtle text-status-danger font-data-mono font-bold p-1.5 rounded-lg focus:border-secondary outline-none text-xs"
                  type="text"
                  value={dataMarkup}
                  onChange={(e) => setDataMarkup(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
              {al ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-7 bg-surface-container-low rounded-xl animate-pulse" />)
              ) : filteredPlans.length === 0 ? (
                <div className="p-3 text-center text-on-surface-variant text-body-sm bg-surface-container-low rounded-xl border border-subtle">No plans for this network</div>
              ) : (
                filteredPlans.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-surface-container-low border border-subtle rounded-xl text-xs">
                    <div>
                      <span className="font-semibold text-on-surface text-xs">{p.name || p.planName || "Plan"}</span>
                      <span className="text-[9px] text-on-surface-variant font-bold ml-1.5 uppercase px-1 py-0.5 bg-surface-deep rounded">{p.network || p.provider || ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant font-data-mono line-through text-[10px]">{"\u20a6"}{(p.oldPrice || p.costPrice || 0).toLocaleString()}</span>
                      <span className="text-status-success font-data-mono font-bold text-xs">{"\u20a6"}{(p.price || p.sellPrice || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Min/Max Limits */}
          <section className="lg:col-span-12 bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">admin_panel_settings</span>
              <h2 className="font-headline-md text-headline-md font-bold">Transactional Guardrails (Limits)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[
                { title: "P2P EXCHANGE", titleColor: "text-primary", border: "border-primary/20", items: [
                  { label: "Min Per Order", val: p2pMin, setter: setP2pMin },
                  { label: "Max Per Order", val: p2pMax, setter: setP2pMax },
                ]},
                { title: "CRYPTO WITHDRAWALS", titleColor: "text-secondary", border: "border-secondary/20", items: [
                  { label: "Min Value", val: cryptoMin, setter: setCryptoMin },
                  { label: "Daily Total Max", val: cryptoMax, setter: setCryptoMax },
                ]},
                { title: "BILL PAYMENTS", titleColor: "text-tertiary", border: "border-tertiary/20", items: [
                  { label: "Min Payment", val: billMin, setter: setBillMin },
                  { label: "Single Cap", val: billMax, setter: setBillMax },
                ]},
              ].map((g) => (
                <div key={g.title} className="bg-surface-container-low border border-subtle p-3 rounded-xl space-y-2">
                  <h3 className={`font-label-caps text-[10px] font-bold ${g.titleColor} border-b ${g.border} pb-1.5`}>{g.title}</h3>
                  {g.items.map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium text-xs">{item.label}</span>
                      <input
                        className="bg-surface-deep border border-subtle w-24 text-right p-1 rounded-lg font-data-mono font-bold focus:border-secondary outline-none text-xs"
                        type="text"
                        value={item.val}
                        onChange={(e) => item.setter(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
