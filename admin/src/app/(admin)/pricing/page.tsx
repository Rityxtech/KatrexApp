"use client";

import { useMarketData, usePricingConfig, useGiftcardRates, useAirtimePlans } from "@/hooks/useAdminData";

function formatNaira(n: number) {
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

  return (
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
          <button className="bg-primary text-on-primary font-bold px-3 py-0.5 rounded text-xs hover:bg-white transition-colors">PUSH GLOBAL UPDATES</button>
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
                <div className="w-8 h-4 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-on-primary rounded-full"></div>
                </div>
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
                          <td className="p-gutter">
                            <input className="bg-surface-deep border border-outline-variant text-primary px-2 py-1 w-24 text-right focus:border-primary outline-none rounded" type="text" defaultValue={buyRate.toFixed(2)} />
                          </td>
                          <td className="p-gutter">
                            <input className="bg-surface-deep border border-outline-variant text-primary px-2 py-1 w-24 text-right focus:border-primary outline-none rounded" type="text" defaultValue={sellRate.toFixed(2)} />
                          </td>
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
                { label: "Withdrawal Fee", sub: "Fiat Output", val: feeConfig.withdrawalFee || "NGN 50" },
                { label: "Deposit Fee", sub: "All Channels", val: feeConfig.depositFee || "0%" },
                { label: "Swap Fee", sub: "Cross-Asset", val: feeConfig.swapFee || "0.5%" },
                { label: "Platform Commission", sub: "P2P Escrow", val: feeConfig.p2pCommission || "1%" },
              ].map((f) => (
                <div key={f.label} className="flex justify-between items-center p-gutter bg-surface-deep border border-subtle rounded-lg">
                  <div>
                    <p className="text-xs font-bold">{f.label}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">{f.sub}</p>
                  </div>
                  <input className="bg-surface-container-high border border-outline-variant text-secondary font-data-mono px-2 py-1 w-20 text-right rounded" type="text" defaultValue={String(f.val)} />
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
              <button className="flex items-center gap-unit text-[10px] font-bold uppercase text-primary border border-primary/20 px-2 py-0.5 rounded hover:bg-primary/10">
                <span className="material-symbols-outlined text-xs">add</span> ADD BRAND
              </button>
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
                        <p className="text-xs font-bold">{g.name || g.brand || "Giftcard"}</p>
                        <p className="text-[10px] text-on-surface-variant">{g.type || g.category || "All Types"}</p>
                      </div>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-label-caps text-label-caps text-on-surface-variant block">BUY RATE</span>
                      <span className="font-data-mono text-tertiary">{"\u20a6"}{g.rate || g.buyRate || 0}/$</span>
                    </div>
                    <div className="col-span-3">
                      <input className="w-full bg-surface-container-high border border-outline-variant text-xs font-data-mono p-1 rounded text-right" type="text" defaultValue={String(g.rate || g.buyRate || 0)} />
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
                <button className="px-3 py-1 bg-primary text-on-primary font-bold text-[10px] rounded uppercase">MTN</button>
                <button className="px-3 py-1 bg-surface-deep text-on-surface-variant font-bold text-[10px] rounded uppercase border border-subtle">AIRTEL</button>
                <button className="px-3 py-1 bg-surface-deep text-on-surface-variant font-bold text-[10px] rounded uppercase border border-subtle">GLO</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-gutter mb-gutter">
              <div className="bg-surface-deep border border-subtle p-gutter">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">GLOBAL AIRTIME DISCOUNT (%)</p>
                <input className="w-full bg-surface-container border border-outline-variant text-status-success font-data-mono p-1.5 rounded" type="text" defaultValue={String(feeConfig.airtimeDiscount || "3.00")} />
              </div>
              <div className="bg-surface-deep border border-subtle p-gutter">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">DATA MARKUP (FIXED NGN)</p>
                <input className="w-full bg-surface-container border border-outline-variant text-status-danger font-data-mono p-1.5 rounded" type="text" defaultValue={String(feeConfig.dataMarkup || "50.00")} />
              </div>
            </div>
            <div className="space-y-unit max-h-[160px] overflow-y-auto pr-1">
              {al ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-surface-deep/50 rounded animate-pulse" />)
              ) : airtimePlans.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-body-sm">No airtime plans configured</div>
              ) : (
                airtimePlans.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center p-gutter border-b border-outline-variant/30 text-xs">
                    <span className="font-medium">{p.name || p.planName || "Plan"}</span>
                    <div className="flex items-center gap-gutter">
                      <span className="text-on-surface-variant font-data-mono">{"\u20a6"}{p.oldPrice || p.costPrice || 0}</span>
                      <input className="w-16 bg-surface-deep border border-outline-variant text-[10px] p-1 text-right rounded" type="text" defaultValue={String(p.price || p.sellPrice || 0)} />
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
                  { label: "Min Per Order", val: limitsConfig.p2pMin || "\u20a65,000" },
                  { label: "Max Per Order", val: limitsConfig.p2pMax || "\u20a65,000,000" },
                ]},
                { title: "CRYPTO WITHDRAWALS", titleColor: "text-secondary", border: "border-secondary/20", items: [
                  { label: "Min Value", val: limitsConfig.cryptoMin || "$10.00" },
                  { label: "Daily Total Max", val: limitsConfig.cryptoMax || "$50,000" },
                ]},
                { title: "BILL PAYMENTS", titleColor: "text-tertiary", border: "border-tertiary/20", items: [
                  { label: "Min Payment", val: limitsConfig.billMin || "\u20a6100" },
                  { label: "Single Cap", val: limitsConfig.billMax || "\u20a6100,000" },
                ]},
              ].map((g) => (
                <div key={g.title} className="space-y-gutter">
                  <h3 className={`font-label-caps text-label-caps ${g.titleColor} border-b ${g.border} pb-1`}>{g.title}</h3>
                  {g.items.map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">{item.label}</span>
                      <input className="bg-surface-deep border border-outline-variant w-24 text-right p-1 rounded font-data-mono" type="text" defaultValue={String(item.val)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
