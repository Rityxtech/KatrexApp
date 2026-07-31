"use client";

import { useMarketData } from "@/hooks/useAdminData";
import ExchangeRatesTable from "@/components/ExchangeRatesTable";
import SystemHealthRow from "@/components/SystemHealthRow";

const COIN_META: Record<string, { color: string; icon: string; name: string }> = {
  btc: { color: "#F7931A", icon: "currency_bitcoin", name: "Bitcoin" },
  eth: { color: "#627EEA", icon: "drive_image", name: "Ethereum" },
  usdt: { color: "#26A17B", icon: "monetization_on", name: "Tether" },
  sol: { color: "#14F195", icon: "flare", name: "Solana" },
  bnb: { color: "#F3BA2F", icon: "whatshot", name: "BNB" },
  doge: { color: "#C2A633", icon: "pets", name: "Dogecoin" },
  xrp: { color: "#23292F", icon: "waves", name: "Ripple" },
  ada: { color: "#0033AD", icon: "stacked_line_chart", name: "Cardano" },
  matic: { color: "#8247E5", icon: "polygon", name: "Polygon" },
  trx: { color: "#EF0027", icon: "token", name: "TRON" },
  ton: { color: "#0098EA", icon: "diamond", name: "Toncoin" },
};

export default function CryptoPage() {
  const { data: market, loading } = useMarketData();

  const coins = market.filter((m: any) => m.id !== "_ngn_rate" && m.symbol);

  return (
    <div className="p-container-padding w-full">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-max-gap gap-stack-base">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">Crypto Asset Management</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Configure liquidity, rates, and operational visibility for supported assets.</p>
        </div>
        <div className="flex items-center gap-stack-base bg-surface-container p-2 border border-subtle rounded">
          <div className="flex items-center gap-2 px-2 border-r border-subtle mr-2">
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-status-warning" : "bg-status-success"} animate-pulse`}></span>
            <span className="font-label-caps text-label-caps text-on-surface">
              {loading ? "Connecting..." : "Live Market Data: Connected"}
            </span>
          </div>
          <button className="flex items-center gap-1 text-secondary hover:bg-surface-container-highest px-2 py-1 rounded transition-colors active:scale-95">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span className="font-label-caps text-label-caps">Manual Refresh</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-unit gap-y-max-gap md:gap-stack-base">
        {/* Coin List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-stack-base">
          <div className="bg-surface-container border border-subtle rounded overflow-hidden">
            <div className="bg-surface-container-high px-3 py-2 border-b border-subtle flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-secondary">Coin Asset Visibility</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] cursor-help">info</span>
            </div>
            <div className="p-1 space-y-[2px]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-surface-container-high/50 animate-pulse rounded" />
                ))
              ) : coins.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-body-sm">No coins configured</div>
              ) : (
                coins.map((coin: any) => {
                  const meta = COIN_META[coin.symbol?.toLowerCase()] || COIN_META[coin.id] || { color: "#888", icon: "token", name: coin.name || coin.symbol };
                  return (
                    <div key={coin.id} className="flex items-center justify-between p-2 hover:bg-surface-container-highest rounded border border-transparent hover:border-subtle group transition-all">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant drag-handle text-[20px]">drag_indicator</span>
                        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                          <span className="material-symbols-outlined" style={{ color: meta.color }}>{meta.icon}</span>
                        </div>
                        <div>
                          <div className="font-body-md text-body-md text-on-surface">{meta.name}</div>
                          <div className="font-data-mono text-data-mono text-on-surface-variant uppercase">{coin.symbol}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input checked={coin.visible !== false} className="sr-only peer" type="checkbox" readOnly />
                          <div className="w-8 h-4 bg-surface-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 bg-surface-container-low border-t border-subtle">
              <button className="w-full py-1.5 bg-secondary text-on-secondary-fixed font-label-caps text-label-caps rounded hover:brightness-110 active:scale-[0.98] transition-all">ADD NEW ASSET</button>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="bg-surface-container border border-subtle rounded">
            <div className="bg-surface-container-high px-3 py-2 border-b border-subtle">
              <span className="font-label-caps text-label-caps text-secondary">Global Fee Overrides</span>
            </div>
            <div className="p-3 space-y-4">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Buy Commission (%)</label>
                <div className="flex items-center gap-2">
                  <input className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none" step="0.01" type="number" defaultValue="1.25" />
                  <span className="text-on-surface-variant text-body-sm">%</span>
                </div>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Sell Spread (Fixed NGN)</label>
                <div className="flex items-center gap-2">
                  <input className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none" step="10" type="number" defaultValue="500" />
                  <span className="text-on-surface-variant text-body-sm">{"\u20a6"}</span>
                </div>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Swap Fee (%)</label>
                <input className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none" step="0.01" type="number" defaultValue="0.50" />
              </div>
              <button className="w-full border border-secondary text-secondary py-1.5 rounded font-label-caps text-label-caps hover:bg-secondary/10 transition-colors">UPDATE ALL FEES</button>
            </div>
          </div>
        </div>

        <ExchangeRatesTable />
        <SystemHealthRow />
      </div>
    </div>
  );
}
