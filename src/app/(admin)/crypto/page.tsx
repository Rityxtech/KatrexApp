import ExchangeRatesTable from "@/components/ExchangeRatesTable";
import SystemHealthRow from "@/components/SystemHealthRow";

export default function CryptoPage() {
  return (
    <div className="p-container-padding max-w-[1600px] mx-auto">
      {/* Page Header & Market Status */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-max-gap gap-stack-base">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Crypto Asset Management
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Configure liquidity, rates, and operational visibility for supported assets.
          </p>
        </div>
        <div className="flex items-center gap-stack-base bg-surface-container p-2 border border-subtle rounded">
          <div className="flex items-center gap-2 px-2 border-r border-subtle mr-2">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
            <span className="font-label-caps text-label-caps text-on-surface">
              Live Market Data: Connected
            </span>
          </div>
          <button className="flex items-center gap-1 text-secondary hover:bg-surface-container-highest px-2 py-1 rounded transition-colors active:scale-95">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span className="font-label-caps text-label-caps">Manual Refresh</span>
          </button>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-unit gap-y-max-gap md:gap-stack-base">
        {/* 1. Coin List (Left Column) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-stack-base">
          <div className="bg-surface-container border border-subtle rounded overflow-hidden">
            <div className="bg-surface-container-high px-3 py-2 border-b border-subtle flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-secondary">
                Coin Asset Visibility
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] cursor-help">
                info
              </span>
            </div>
            <div className="p-1 space-y-[2px]">
              {/* BTC */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-container-highest rounded border border-transparent hover:border-subtle group transition-all">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant drag-handle text-[20px]">
                    drag_indicator
                  </span>
                  <div className="w-8 h-8 rounded bg-[#F7931A]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#F7931A]">
                      currency_bitcoin
                    </span>
                  </div>
                  <div>
                    <div className="font-body-md text-body-md text-on-surface">Bitcoin</div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant uppercase">BTC</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-8 h-4 bg-surface-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                  </label>
                </div>
              </div>
              {/* ETH */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-container-highest rounded border border-transparent hover:border-subtle group transition-all">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant drag-handle text-[20px]">
                    drag_indicator
                  </span>
                  <div className="w-8 h-8 rounded bg-[#627EEA]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#627EEA]">
                      drive_image
                    </span>
                  </div>
                  <div>
                    <div className="font-body-md text-body-md text-on-surface">Ethereum</div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant uppercase">ETH</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-8 h-4 bg-surface-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                  </label>
                </div>
              </div>
              {/* USDT */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-container-highest rounded border border-transparent hover:border-subtle group transition-all">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant drag-handle text-[20px]">
                    drag_indicator
                  </span>
                  <div className="w-8 h-8 rounded bg-[#26A17B]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#26A17B]">
                      monetization_on
                    </span>
                  </div>
                  <div>
                    <div className="font-body-md text-body-md text-on-surface">Tether</div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant uppercase">USDT</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-8 h-4 bg-surface-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                  </label>
                </div>
              </div>
              {/* SOL */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-container-highest rounded border border-transparent hover:border-subtle group transition-all">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant drag-handle text-[20px]">
                    drag_indicator
                  </span>
                  <div className="w-8 h-8 rounded bg-[#14F195]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#14F195]">
                      flare
                    </span>
                  </div>
                  <div>
                    <div className="font-body-md text-body-md text-on-surface">Solana</div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant uppercase">SOL</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" readOnly />
                    <div className="w-8 h-4 bg-surface-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-status-success"></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-3 bg-surface-container-low border-t border-subtle">
              <button className="w-full py-1.5 bg-secondary text-on-secondary-fixed font-label-caps text-label-caps rounded hover:brightness-110 active:scale-[0.98] transition-all">
                ADD NEW ASSET
              </button>
            </div>
          </div>

          {/* Fee Settings Section */}
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
                  <span className="text-on-surface-variant text-body-sm">&#8358;</span>
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

        {/* 2. Buy/Sell Rates Table (Right Column) */}
        <ExchangeRatesTable />

        {/* 3. Liquidity & System Health (Bottom Row) */}
        <SystemHealthRow />
      </div>
    </div>
  );
}
