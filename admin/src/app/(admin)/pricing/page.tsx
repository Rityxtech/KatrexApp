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

  const feeConfig = pricing.find((p: any) => p.id === "fees") || {};
  const limitsConfig = pricing.find((p: any) => p.id === "limits") || {};

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
    setWithdrawalFee(feeConfig.withdrawalFee || "NGN 50");
    setDepositFee(feeConfig.depositFee || "0%");
    setSwapFee(feeConfig.swapFee || "0.5%");
    setP2pCommission(feeConfig.p2pCommission || "1%");
    setAirtimeDiscount(String(feeConfig.airtimeDiscount || "3.00"));
    setDataMarkup(String(feeConfig.dataMarkup || "50.00"));
    setP2pMin(limitsConfig.p2pMin || "\u20a65,000");
    setP2pMax(limitsConfig.p2pMax || "\u20a65,000,000");
    setCryptoMin(limitsConfig.cryptoMin || "$10.00");
    setCryptoMax(limitsConfig.cryptoMax || "$50,000");
    setBillMin(limitsConfig.billMin || "\u20a6100");
    setBillMax(limitsConfig.billMax || "\u20a6100,000");
  }, [feeConfig, limitsConfig]);

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

      <div className="w-full">
        <div className="flex justify-between items-center px-gutter h-8 w-full z-40 bg-surface-container border-b border-subtle sticky top-0">
          <div className="flex items-center gap-stack-base">
            <span className="font-headline-md text-headline-md font-black tracking-tighter text-primary">PRICING &amp; RATES</span>
            <span className="h-4 w-px bg-outline-variant"></span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">NODE: TERMINAL-PRICING-ALPHA</span>
          </div>
          <div className="flex items-center gap-max-gap">
            <div className="flex items-center gap-unit text-status-success">
              <span className="material-symbols-outlined text-[14px]">sensors</span>
              <span className="font-label-caps text-label-caps flex items-center gap-1">
                LIVE FEED ACTIVE <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              </span>
            </div>
            <button
              onClick={pushGlobalUpdates}
              disabled={saving}
              className="bg-primary text-on-primary font-bold px-3 py-0.5 rounded text-xs hover:bg-white transition-colors disabled:opacity-50"
            >
              {saving ? "PUSHING..." : "PUSH GLOBAL UPDATES"}
            </button>
          </div>
        </div>

        <div className="p-max-gap space-y-max-gap pb-20">
          <div className="grid grid-cols-12 gap-max-gap">
            {/* Crypto Exchange Rates */}
            <section className="col-span-12 lg:col-span-8 bg-surface-container-low border border-subtle p-container-padding">
              <div className="flex items-center justify-between mb-container-padding">
                <div className="flex items-center gap-stack-base">
                  <span className="material-symbols-outlined text-primary">currency_bitcoin</span>
                  <h2 className="font-headline-md text-headline-md">CRYPTO EXCHANGE RATES</h2>
                </div>
                <div className="flex items-center gap-gutter bg-surface-deep px-3 py-1 rounded border border-subtle">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">AUTO-ADJUST VIA ORACLE</span>
                  <span className="text-[10px] font-bold text-status-success">ACTIVE</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-subtle bg-surface-container-high/50">
                      <th className="p-gutter font-label-caps text-label-caps text-on-surface-variant">COIN</th>
                      <th className="p-gutter font-label-caps text-label-caps text-on-surface-variant">LIVE PRICE (USD)</th>
                      <th className="p-gutter font-label-caps text-label-caps text-on-surface-variant">BUY RATE (NGN)</th>
                      <th className="p-gutter font-label-caps text-label-caps text-on-surface-variant">SELL RATE (NGN)</th>
                      <th className="p-gutter font-label-caps text-label-caps text-on-surface-variant">24H CHANGE</th>
                      <th className="p-gutter font-label-caps text-label-caps text-on-surface-variant">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="font-data-mono text-data-mono">
                    {ml ? (
                      Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-gutter"><div className="h-8 bg-surface-container-high rounded animate-pulse" /></td></tr>)
                    ) : coins.length === 0 ? (
                      <tr><td colSpan={6} className="p-gutter text-center text-on-surface-variant text-body-sm">No market data</td></tr>
                    ) : (
                      coins.map((coin: any) => {
                        const meta = COIN_ICONS[coin.symbol?.toLowerCase()] || { icon: coin.symbol?.[0] || "?", bg: "bg-surface-container-high text-on-surface" };
                        const buyRate = (coin.priceNaira || 0) * 1.01;
                        const sellRate = (coin.priceNaira || 0) * 0.99;
                        const change = coin.change24h || 0;
                        return (
                          <tr key={coin.id} className="border-b border-outline-variant/30 hover:bg-primary/5 transition-colors">
                            <td className="p-gutter flex items-center gap-gutter">
                              <div className={`w-6 h-6 ${meta.bg} flex items-center justify-center rounded`}>{meta.icon}</div>
                              <span className="font-bold uppercase">{coin.symbol}</span>
                            </td>
                            <td className="p-gutter">${(coin.priceUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="p-gutter text-status-success font-bold">{"\u20a6"}{buyRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="p-gutter text-status-danger font-bold">{"\u20a6"}{sellRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className={`p-gutter ${change >= 0 ? "text-status-success" : "text-status-danger"}`}>
                              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                            </td>
                            <td className="p-gutter">
                              <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[10px] rounded uppercase font-bold">Trading</span>
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
            <section className="col-span-12 lg:col-span-4 bg-surface-container border border-subtle p-container-padding">
              <div className="flex items-center gap-stack-base mb-container-padding">
                <span className="material-symbols-outlined text-secondary">percent</span>
                <h2 className="font-headline-md text-headline-md">FEE STRUCTURE</h2>
              </div>
              <div className="space-y-gutter">
                {[
                  { label: "Withdrawal Fee", sub: "Fiat Output", val: withdrawalFee, setter: setWithdrawalFee },
                  { label: "Deposit Fee", sub: "All Channels", val: depositFee, setter: setDepositFee },
                  { label: "Swap Fee", sub: "Cross-Asset", val: swapFee, setter: setSwapFee },
                  { label: "Platform Commission", sub: "P2P Escrow", val: p2pCommission, setter: setP2pCommission },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between items-center p-gutter bg-surface-deep border border-subtle rounded-lg">
                    <div>
                      <p className="text-xs font-bold">{f.label}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase">{f.sub}</p>
                    </div>
                    <input
                      className="bg-surface-container-high border border-outline-variant text-secondary font-data-mono px-2 py-1 w-24 text-right rounded focus:border-secondary outline-none"
                      type="text"
                      value={f.val}
                      onChange={(e) => f.setter(e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Giftcard Rates */}
            <section className="col-span-12 lg:col-span-6 bg-surface-container border border-subtle p-container-padding">
              <div className="flex items-center justify-between mb-container-padding">
                <div className="flex items-center gap-stack-base">
                  <span className="material-symbols-outlined text-tertiary">featured_video</span>
                  <h2 className="font-headline-md text-headline-md">GIFTCARD ASSET RATES</h2>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant">{giftcards.length} rates</span>
              </div>
              <div className="space-y-unit max-h-[300px] overflow-y-auto pr-1">
                {gl ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-surface-deep/50 rounded animate-pulse" />)
                ) : giftcards.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant text-body-sm">No giftcard rates configured</div>
                ) : (
                  giftcards.map((g: any) => (
                    <div key={g.id} className="grid grid-cols-12 gap-gutter p-gutter bg-surface-deep/50 border border-subtle items-center hover:bg-surface-bright/30 transition-colors">
                      <div className="col-span-6 flex items-center gap-gutter">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          <span className="material-symbols-outlined text-tertiary text-sm">redeem</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold">{g.brandName || g.name || g.brand || "Giftcard"}</p>
                          <p className="text-[10px] text-on-surface-variant">{g.currency || "USD"} &bull; {g.cardType || "All Types"}</p>
                        </div>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="font-label-caps text-label-caps text-on-surface-variant block">RATE</span>
                        <span className="font-data-mono text-tertiary">{"\u20a6"}{(g.ratePerUnit || g.rate || g.buyRate || 0).toLocaleString()}/$</span>
                      </div>
                      <div className="col-span-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.isActive !== false ? "bg-status-success/10 text-status-success" : "bg-on-surface-variant/20 text-on-surface-variant"}`}>
                          {g.isActive !== false ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Airtime & Data Rates */}
            <section className="col-span-12 lg:col-span-6 bg-surface-container border border-subtle p-container-padding">
              <div className="flex items-center justify-between mb-container-padding">
                <div className="flex items-center gap-stack-base">
                  <span className="material-symbols-outlined text-status-info">settings_cell</span>
                  <h2 className="font-headline-md text-headline-md">AIRTIME &amp; DATA UTILITY</h2>
                </div>
                <div className="flex gap-unit">
                  {["all", "mtn", "airtel", "glo", "9mobile"].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNetworkFilter(n)}
                      className={`px-3 py-1 font-bold text-[10px] rounded uppercase transition-colors ${
                        networkFilter === n
                          ? "bg-primary text-on-primary"
                          : "bg-surface-deep text-on-surface-variant border border-subtle hover:bg-surface-container-high"
                      }`}
                    >
                      {n === "all" ? "ALL" : n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-gutter mb-gutter">
                <div className="bg-surface-deep border border-subtle p-gutter">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">GLOBAL AIRTIME DISCOUNT (%)</p>
                  <input
                    className="w-full bg-surface-container border border-outline-variant text-status-success font-data-mono p-1.5 rounded focus:border-secondary outline-none"
                    type="text"
                    value={airtimeDiscount}
                    onChange={(e) => setAirtimeDiscount(e.target.value)}
                  />
                </div>
                <div className="bg-surface-deep border border-subtle p-gutter">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">DATA MARKUP (FIXED NGN)</p>
                  <input
                    className="w-full bg-surface-container border border-outline-variant text-status-danger font-data-mono p-1.5 rounded focus:border-secondary outline-none"
                    type="text"
                    value={dataMarkup}
                    onChange={(e) => setDataMarkup(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-unit max-h-[160px] overflow-y-auto pr-1">
                {al ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-surface-deep/50 rounded animate-pulse" />)
                ) : filteredPlans.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant text-body-sm">No plans for this network</div>
                ) : (
                  filteredPlans.slice(0, 10).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-gutter border-b border-outline-variant/30 text-xs">
                      <div>
                        <span className="font-medium">{p.name || p.planName || "Plan"}</span>
                        <span className="text-[10px] text-on-surface-variant ml-2">{p.network || p.provider || ""}</span>
                      </div>
                      <div className="flex items-center gap-gutter">
                        <span className="text-on-surface-variant font-data-mono">{"\u20a6"}{(p.oldPrice || p.costPrice || 0).toLocaleString()}</span>
                        <span className="text-status-success font-data-mono font-bold">{"\u20a6"}{(p.price || p.sellPrice || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Min/Max Limits */}
            <section className="col-span-12 bg-surface-container-high border border-subtle p-container-padding">
              <div className="flex items-center gap-stack-base mb-container-padding">
                <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
                <h2 className="font-headline-md text-headline-md uppercase">TRANS-ACTIONAL GUARDRAILS (LIMITS)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-max-gap">
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
                  <div key={g.title} className="space-y-gutter">
                    <h3 className={`font-label-caps text-label-caps ${g.titleColor} border-b ${g.border} pb-1`}>{g.title}</h3>
                    {g.items.map((item) => (
                      <div key={item.label} className="flex justify-between items-center text-xs">
                        <span className="text-on-surface-variant">{item.label}</span>
                        <input
                          className="bg-surface-deep border border-outline-variant w-24 text-right p-1 rounded font-data-mono focus:border-secondary outline-none"
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
      </div>
    </>
  );
}
