"use client";

import { useState } from "react";
import { useMarketData, useAppSettings } from "@/hooks/useAdminData";
import { updateDocument, setDocument } from "@/hooks/useFirestore";
import ExchangeRatesTable from "@/components/ExchangeRatesTable";
import SystemHealthRow from "@/components/SystemHealthRow";

const COIN_META: Record<string, { color: string; logo: string; name: string }> = {
  btc: { color: "#F7931A", logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", name: "Bitcoin" },
  eth: { color: "#627EEA", logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", name: "Ethereum" },
  usdt: { color: "#26A17B", logo: "https://assets.coingecko.com/coins/images/325/large/Tether.png", name: "Tether" },
  sol: { color: "#14F195", logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png", name: "Solana" },
  bnb: { color: "#F3BA2F", logo: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", name: "BNB" },
  doge: { color: "#C2A633", logo: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", name: "Dogecoin" },
  xrp: { color: "#23292F", logo: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-128.png", name: "Ripple" },
  ada: { color: "#0033AD", logo: "https://assets.coingecko.com/coins/images/975/large/cardano.png", name: "Cardano" },
  matic: { color: "#8247E5", logo: "https://assets.coingecko.com/coins/images/4713/large/polygon.png", name: "Polygon" },
  trx: { color: "#EF0027", logo: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png", name: "TRON" },
  ton: { color: "#0098EA", logo: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png", name: "Toncoin" },
};

function formatNaira(n: number) {
  if (n >= 1_000_000_000_000) return `\u20a6${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `\u20a6${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `\u20a6${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20a6${(n / 1_000).toFixed(2)}K`;
  return `\u20a6${n.toFixed(2)}`;
}

export default function CryptoPage() {
  const { data: market, loading } = useMarketData();
  const { data: settings } = useAppSettings();

  const [toggling, setToggling] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoin, setNewCoin] = useState({ symbol: "", name: "" });
  const [adding, setAdding] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeMessage, setFeeMessage] = useState<string | null>(null);

  const coins = market.filter((m: any) => m.id !== "_ngn_rate" && m.symbol);
  const visibleCount = coins.filter((c: any) => c.visible !== false).length;
  const hiddenCount = coins.length - visibleCount;

  const feeSettings = settings.find((s: any) => s.id === "trade_fees") || {};

  const handleToggle = async (coin: any) => {
    setToggling(coin.id);
    try {
      const newVisible = coin.visible === false ? true : false;
      await updateDocument("market_data", coin.id, { visible: newVisible });
    } catch (err) {
      console.error("Failed to toggle coin:", err);
    } finally {
      setToggling(null);
    }
  };

  const handleAddCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoin.symbol || !newCoin.name) return;
    setAdding(true);
    try {
      const id = newCoin.symbol.toLowerCase();
      await setDocument("market_data", id, {
        symbol: newCoin.symbol.toUpperCase(),
        name: newCoin.name,
        priceUsd: 0,
        priceNaira: 0,
        change24h: 0,
        change1h: 0,
        change7d: 0,
        marketCap: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        ath: 0,
        circulatingSupply: 0,
        sparkline: [],
        ngnRate: 1450,
        visible: true,
        updatedAt: new Date(),
      });
      setNewCoin({ symbol: "", name: "" });
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add coin:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeSaving(true);
    setFeeMessage(null);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      await setDocument("app_config", "trade_fees", {
        buyFeePercent: parseFloat(formData.get("buyFeePercent") as string) || 0,
        sellFeePercent: parseFloat(formData.get("sellFeePercent") as string) || 0,
        swapFeePercent: parseFloat(formData.get("swapFeePercent") as string) || 0,
        sendFeePercent: parseFloat(formData.get("sendFeePercent") as string) || 0,
        updatedAt: new Date(),
      });
      setFeeMessage("Fees updated successfully");
      setTimeout(() => setFeeMessage(null), 3000);
    } catch (err) {
      setFeeMessage("Failed to update fees");
    } finally {
      setFeeSaving(false);
    }
  };

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
          <div className="flex items-center gap-2 px-2 border-r border-subtle mr-2">
            <span className="font-label-caps text-label-caps text-status-success">{visibleCount}</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">Visible</span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">{hiddenCount}</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">Hidden</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-unit gap-y-max-gap md:gap-stack-base">
        {/* Coin List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-stack-base">
          <div className="bg-surface-container border border-subtle rounded overflow-hidden">
            <div className="bg-surface-container-high px-3 py-2 border-b border-subtle flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-secondary">Coin Asset Visibility</span>
              <span className="font-data-mono text-[10px] text-on-surface-variant">{coins.length} coins in Firestore</span>
            </div>
            <div className="p-1 space-y-[2px]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-surface-container-high/50 animate-pulse rounded" />
                ))
              ) : coins.length === 0 ? (
                <div className="p-6 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2 block">search_off</span>
                  <p className="text-on-surface-variant text-body-sm mb-3">No coins in market_data collection</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-secondary font-label-caps hover:underline"
                  >
                    + Add your first asset
                  </button>
                </div>
              ) : (
                coins.map((coin: any) => {
                  const meta = COIN_META[coin.symbol?.toLowerCase()] || COIN_META[coin.id] || { color: "#888", logo: "", name: coin.name || coin.symbol };
                  const isVisible = coin.visible !== false;
                  const isToggling = toggling === coin.id;
                  return (
                    <div
                      key={coin.id}
                      className={`flex items-center justify-between p-2 hover:bg-surface-container-highest rounded border border-transparent hover:border-subtle group transition-all ${!isVisible ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant drag-handle text-[20px]">drag_indicator</span>
                        <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${meta.color}20` }}>
                          {meta.logo ? (
                            <img src={meta.logo} alt={meta.name} className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="font-data-mono text-[10px] font-bold" style={{ color: meta.color }}>{coin.symbol?.slice(0, 3)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-body-md text-body-md text-on-surface">{meta.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="font-data-mono text-data-mono text-on-surface-variant uppercase">{coin.symbol}</span>
                            {coin.priceNaira != null && coin.priceNaira > 0 && (
                              <span className="font-data-mono text-[10px] text-on-surface-variant">{formatNaira(coin.priceNaira)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isToggling ? (
                          <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              checked={isVisible}
                              className="sr-only peer"
                              type="checkbox"
                              onChange={() => handleToggle(coin)}
                            />
                            <div className="w-8 h-4 bg-surface-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Asset Form */}
            {showAddForm && (
              <div className="p-3 bg-surface-container-low border-t border-subtle">
                <form onSubmit={handleAddCoin} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="bg-surface-deep border border-subtle rounded px-2 py-1.5 text-data-mono text-data-mono text-on-surface w-24 focus:ring-1 focus:ring-secondary outline-none uppercase"
                      placeholder="BTC"
                      type="text"
                      value={newCoin.symbol}
                      onChange={(e) => setNewCoin({ ...newCoin, symbol: e.target.value })}
                      required
                    />
                    <input
                      className="bg-surface-deep border border-subtle rounded px-2 py-1.5 text-body-sm text-on-surface flex-1 focus:ring-1 focus:ring-secondary outline-none"
                      placeholder="Bitcoin"
                      type="text"
                      value={newCoin.name}
                      onChange={(e) => setNewCoin({ ...newCoin, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={adding}
                      className="flex-1 py-1.5 bg-secondary text-on-secondary-fixed font-label-caps text-label-caps rounded hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {adding ? "ADDING..." : "ADD ASSET"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 border border-subtle font-label-caps text-label-caps rounded hover:bg-surface-container-highest transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!showAddForm && (
              <div className="p-3 bg-surface-container-low border-t border-subtle">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-1.5 bg-secondary text-on-secondary-fixed font-label-caps text-label-caps rounded hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  + ADD NEW ASSET
                </button>
              </div>
            )}
          </div>

          {/* Fee Settings */}
          <div className="bg-surface-container border border-subtle rounded">
            <div className="bg-surface-container-high px-3 py-2 border-b border-subtle">
              <span className="font-label-caps text-label-caps text-secondary">Global Fee Overrides</span>
            </div>
            <form onSubmit={handleSaveFees} className="p-3 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Buy Fee (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none"
                      step="0.01"
                      min="0"
                      max="100"
                      type="number"
                      name="buyFeePercent"
                      defaultValue={feeSettings.buyFeePercent ?? 0.5}
                    />
                    <span className="text-on-surface-variant text-body-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Sell Fee (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none"
                      step="0.01"
                      min="0"
                      max="100"
                      type="number"
                      name="sellFeePercent"
                      defaultValue={feeSettings.sellFeePercent ?? 0.5}
                    />
                    <span className="text-on-surface-variant text-body-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Send Fee (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none"
                      step="0.01"
                      min="0"
                      max="100"
                      type="number"
                      name="sendFeePercent"
                      defaultValue={feeSettings.sendFeePercent ?? 1.0}
                    />
                    <span className="text-on-surface-variant text-body-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Swap Fee (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-surface-deep border border-subtle rounded px-2 py-1 text-data-mono text-data-mono text-on-surface w-full focus:ring-1 focus:ring-secondary outline-none"
                      step="0.01"
                      min="0"
                      max="100"
                      type="number"
                      name="swapFeePercent"
                      defaultValue={feeSettings.swapFeePercent ?? 0.5}
                    />
                    <span className="text-on-surface-variant text-body-sm">%</span>
                  </div>
                </div>
              </div>
              {feeMessage && (
                <div className={`text-body-sm font-label-caps ${feeMessage.includes("success") ? "text-status-success" : "text-status-danger"}`}>
                  {feeMessage}
                </div>
              )}
              <button
                type="submit"
                disabled={feeSaving}
                className="w-full border border-secondary text-secondary py-1.5 rounded font-label-caps text-label-caps hover:bg-secondary/10 transition-colors disabled:opacity-50"
              >
                {feeSaving ? "SAVING..." : "UPDATE ALL FEES"}
              </button>
            </form>
          </div>
        </div>

        <ExchangeRatesTable />
        <SystemHealthRow />
      </div>
    </div>
  );
}
