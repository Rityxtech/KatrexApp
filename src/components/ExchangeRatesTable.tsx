export default function ExchangeRatesTable() {
  return (
    <div className="col-span-12 lg:col-span-8">
      <div className="bg-surface-container border border-subtle rounded h-full flex flex-col">
        <div className="bg-surface-container-high px-3 py-2 border-b border-subtle flex justify-between items-center">
          <div className="flex items-center gap-stack-base">
            <span className="font-label-caps text-label-caps text-secondary">NGN Exchange Rates</span>
            <span className="bg-status-success/10 text-status-success px-2 py-0.5 rounded text-[10px] font-bold">AUTO-UPDATE ON</span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <input className="bg-surface-deep border border-subtle rounded-full px-8 py-1 text-body-sm focus:w-48 transition-all outline-none" placeholder="Search rates..." type="text" />
              <span className="material-symbols-outlined absolute left-2 top-1.5 text-on-surface-variant text-[16px]">search</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Asset</th>
                <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Buy Rate (NGN)</th>
                <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Sell Rate (NGN)</th>
                <th className="text-center px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Manual Override</th>
                <th className="text-right px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-b border-subtle">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {/* BTC/NGN */}
              <tr className="hover:bg-primary-container/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#F7931A]/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#F7931A] text-[14px]">currency_bitcoin</span>
                    </div>
                    <span className="font-data-mono text-data-mono">BTC/NGN</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 98,245,120.00</span></td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 97,110,450.00</span></td>
                <td className="px-4 py-3 text-center">
                  <button className="bg-surface-container-highest p-1.5 rounded border border-subtle hover:border-secondary hover:text-secondary transition-all">
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right"><span className="text-status-success font-data-mono text-[11px]">+1.15%</span></td>
              </tr>
              {/* ETH/NGN */}
              <tr className="hover:bg-primary-container/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#627EEA]/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#627EEA] text-[14px]">drive_image</span>
                    </div>
                    <span className="font-data-mono text-data-mono">ETH/NGN</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 4,245,800.00</span></td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 4,198,300.00</span></td>
                <td className="px-4 py-3 text-center">
                  <button className="bg-surface-container-highest p-1.5 rounded border border-subtle hover:border-secondary hover:text-secondary transition-all">
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right"><span className="text-status-success font-data-mono text-[11px]">+1.12%</span></td>
              </tr>
              {/* USDT/NGN */}
              <tr className="hover:bg-primary-container/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#26A17B]/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#26A17B] text-[14px]">monetization_on</span>
                    </div>
                    <span className="font-data-mono text-data-mono">USDT/NGN</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 1,520.45</span></td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 1,505.20</span></td>
                <td className="px-4 py-3 text-center">
                  <button className="bg-surface-container-highest p-1.5 rounded border border-subtle hover:border-secondary hover:text-secondary transition-all">
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right"><span className="text-status-success font-data-mono text-[11px]">+1.01%</span></td>
              </tr>
              {/* DOGE/NGN - Manual override */}
              <tr className="bg-surface-container-low border-l-2 border-status-warning">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-status-warning/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-status-warning text-[14px]">warning</span>
                    </div>
                    <span className="font-data-mono text-data-mono">DOGE/NGN</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-data-mono text-data-mono text-on-surface">&#8358; 215.10</span>
                    <span className="material-symbols-outlined text-status-warning text-[14px]">lock</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><span className="font-data-mono text-data-mono text-on-surface">&#8358; 210.05</span></td>
                <td className="px-4 py-3 text-center">
                  <button className="bg-status-warning text-on-tertiary-fixed p-1.5 rounded border border-transparent active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[18px]">emergency_home</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right"><span className="text-status-warning font-data-mono text-[11px]">MANUAL</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Mini Analytics / Sparkline Area */}
        <div className="p-3 border-t border-subtle grid grid-cols-1 md:grid-cols-3 gap-stack-base">
          <div className="bg-surface-container-low p-2 rounded flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">Daily Vol.</div>
              <div className="font-headline-md text-headline-md text-primary">&#8358;2.4B</div>
            </div>
            <div className="w-16 h-8 bg-status-success/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline fill="none" points="0,35 10,30 20,38 30,25 40,30 50,20 60,25 70,10 80,15 90,5 100,8" stroke="#10B981" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="bg-surface-container-low p-2 rounded flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">Active Swaps</div>
              <div className="font-headline-md text-headline-md text-primary">482</div>
            </div>
            <div className="w-16 h-8 bg-secondary/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline fill="none" points="0,20 10,25 20,22 30,18 40,20 50,15 60,12 70,14 80,10 90,8 100,5" stroke="#7bd0ff" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="bg-surface-container-low p-2 rounded flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">System Spread</div>
              <div className="font-headline-md text-headline-md text-status-success">1.08%</div>
            </div>
            <div className="w-16 h-8 bg-status-info/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline fill="none" points="0,30 20,30 40,25 60,25 80,20 100,20" stroke="#0EA5E9" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
