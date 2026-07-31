export default function DashboardPage() {
  return (
    <div className="max-w-[1600px] mx-auto w-full p-gutter grid grid-cols-1 lg:grid-cols-12 gap-unit">
      {/* Section: Key Stats (Dense Grid) */}
      <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-unit">
        {/* Total Users */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
              Total Users
            </p>
            <p className="font-headline-lg text-headline-lg text-primary">
              48,291
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-success font-data-mono text-[10px]">
              +12.5%
            </span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-status-success/40 w-full h-[40%]" />
                <div className="bg-status-success/40 w-full h-[55%]" />
                <div className="bg-status-success/40 w-full h-[35%]" />
                <div className="bg-status-success/40 w-full h-[70%]" />
                <div className="bg-status-success/40 w-full h-[60%]" />
                <div className="bg-status-success w-full h-[85%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Volume (NGN) */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
              NGN Volume
            </p>
            <p className="font-headline-lg text-headline-lg text-secondary">
              &#8358;42.8M
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-success font-data-mono text-[10px]">
              +4.2%
            </span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-secondary/40 w-full h-[60%]" />
                <div className="bg-secondary/40 w-full h-[45%]" />
                <div className="bg-secondary/40 w-full h-[80%]" />
                <div className="bg-secondary/40 w-full h-[70%]" />
                <div className="bg-secondary/40 w-full h-[50%]" />
                <div className="bg-secondary w-full h-[90%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Volume */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
              Crypto Vol
            </p>
            <p className="font-headline-lg text-headline-lg text-on-surface">
              $128.5K
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-danger font-data-mono text-[10px]">
              -2.1%
            </span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-status-danger/40 w-full h-[80%]" />
                <div className="bg-status-danger/40 w-full h-[70%]" />
                <div className="bg-status-danger/40 w-full h-[60%]" />
                <div className="bg-status-danger/40 w-full h-[45%]" />
                <div className="bg-status-danger/40 w-full h-[50%]" />
                <div className="bg-status-danger w-full h-[30%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Platform Revenue */}
        <div className="bg-surface-bright border border-subtle p-3 rounded flex flex-col justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
              Daily Revenue
            </p>
            <p className="font-headline-lg text-headline-lg text-status-success">
              &#8358;1.2M
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-status-success font-data-mono text-[10px]">
              +18.0%
            </span>
            <div className="sparkline-container bg-surface-container-low rounded-sm overflow-hidden flex items-end px-1 pb-1">
              <div className="flex items-end gap-[1px] h-full w-full">
                <div className="bg-status-success/40 w-full h-[20%]" />
                <div className="bg-status-success/40 w-full h-[40%]" />
                <div className="bg-status-success/40 w-full h-[55%]" />
                <div className="bg-status-success/40 w-full h-[65%]" />
                <div className="bg-status-success/40 w-full h-[80%]" />
                <div className="bg-status-success w-full h-[95%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Service Splits */}
        <div className="col-span-2 bg-surface-bright border border-subtle p-3 rounded">
          <div className="flex justify-between items-center mb-4">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Volume by Service
            </p>
            <button className="material-symbols-outlined text-body-sm text-on-surface-variant">
              more_vert
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  settings_cell
                </span>
                <span className="font-body-sm">Airtime/Data</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-body-sm">&#8358;12.4M</span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: "65%" }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  redeem
                </span>
                <span className="font-body-sm">Giftcards</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-body-sm">&#8358;8.2M</span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary" style={{ width: "40%" }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  swap_horizontal_circle
                </span>
                <span className="font-body-sm">P2P Escrow</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-body-sm">&#8358;22.1M</span>
                <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "85%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Graph Area */}
        <div className="col-span-2 bg-surface-bright border border-subtle p-3 rounded relative overflow-hidden group">
          <div className="flex justify-between items-center mb-1">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Revenue Trend (24h)
            </p>
            <span className="font-data-mono text-status-success text-[10px]">
              Peak: &#8358;145k/hr
            </span>
          </div>
          <div className="h-32 w-full" />
        </div>
      </div>

      {/* Section: Live Activity Feed */}
      <div className="lg:col-span-4 bg-surface-bright border border-subtle flex flex-col rounded overflow-hidden">
        <div className="px-3 py-2 border-b border-subtle bg-surface-container-low flex justify-between items-center">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            Live Transactions
          </h3>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span className="text-[9px] font-label-caps text-status-success">
              STREAMING
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar max-h-[460px]">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-subtle">
              <tr className="hover:bg-surface-container-highest transition-colors cursor-pointer group">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[16px]">
                        currency_bitcoin
                      </span>
                    </div>
                    <div>
                      <p className="font-body-sm font-medium">BTC Sell</p>
                      <p className="text-[10px] text-on-surface-variant">
                        usr_8921
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <p className="font-data-mono text-body-sm">&#8358;450,000</p>
                  <p className="text-[10px] text-status-success">Completed</p>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-highest transition-colors cursor-pointer group">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[16px]">
                        settings_cell
                      </span>
                    </div>
                    <div>
                      <p className="font-body-sm font-medium">Data Purchase</p>
                      <p className="text-[10px] text-on-surface-variant">
                        usr_4432
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <p className="font-data-mono text-body-sm">&#8358;5,500</p>
                  <p className="text-[10px] text-status-warning">Pending</p>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-highest transition-colors cursor-pointer group">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-tertiary/10 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[16px]">
                        redeem
                      </span>
                    </div>
                    <div>
                      <p className="font-body-sm font-medium">Amazon GC</p>
                      <p className="text-[10px] text-on-surface-variant">
                        usr_1102
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <p className="font-data-mono text-body-sm">&#8358;125,000</p>
                  <p className="text-[10px] text-status-success">Completed</p>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-highest transition-colors cursor-pointer group">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-status-danger/10 flex items-center justify-center text-status-danger">
                      <span className="material-symbols-outlined text-[16px]">
                        account_balance_wallet
                      </span>
                    </div>
                    <div>
                      <p className="font-body-sm font-medium">Withdrawal</p>
                      <p className="text-[10px] text-on-surface-variant">
                        usr_7721
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <p className="font-data-mono text-body-sm">&#8358;1,200,000</p>
                  <p className="text-[10px] text-status-danger">Flagged</p>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-highest transition-colors cursor-pointer group">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[16px]">
                        swap_horizontal_circle
                      </span>
                    </div>
                    <div>
                      <p className="font-body-sm font-medium">P2P Trade</p>
                      <p className="text-[10px] text-on-surface-variant">
                        usr_0093
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <p className="font-data-mono text-body-sm">&#8358;85,000</p>
                  <p className="text-[10px] text-status-info">Processing</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-subtle bg-surface-container-low text-center">
          <button className="font-label-caps text-primary hover:underline">
            View All Records
          </button>
        </div>
      </div>

      {/* Lower Section: Alerts & System Health */}
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-unit">
        {/* Alerts Section */}
        <div className="bg-surface-bright border border-subtle p-3 rounded">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">
            Critical Alerts
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border-l-2 border-status-danger">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-status-danger">
                  priority_high
                </span>
                <span className="font-body-sm">
                  12 Pending Withdrawals (&gt; 2hrs)
                </span>
              </div>
              <span className="bg-status-danger/20 text-status-danger px-2 py-0.5 rounded text-[10px] font-bold">
                URGENT
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border-l-2 border-status-warning">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-status-warning">
                  support_agent
                </span>
                <span className="font-body-sm">5 Unresolved Tickets</span>
              </div>
              <span className="bg-status-warning/20 text-status-warning px-2 py-0.5 rounded text-[10px] font-bold">
                5 NEW
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border-l-2 border-status-info">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-status-info">
                  gavel
                </span>
                <span className="font-body-sm">3 Open P2P Disputes</span>
              </div>
              <span className="bg-status-info/20 text-status-info px-2 py-0.5 rounded text-[10px] font-bold">
                ACT
              </span>
            </div>
          </div>
        </div>

        {/* System Health Section */}
        <div className="bg-surface-bright border border-subtle p-3 rounded">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">
            Integration Gateway Health
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-body-sm">SMEPlug v4.1</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">
                Lat: 42ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-body-sm">NowPayments API</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">
                Lat: 118ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-warning" />
                <span className="font-body-sm">Korapay Node</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">
                Lat: 890ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-body-sm">Squad Core</span>
              </div>
              <span className="font-data-mono text-[10px] text-on-surface-variant">
                Lat: 24ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Column: System Summary / Audit */}
      <div className="lg:col-span-4 bg-surface-container border border-subtle p-3 rounded">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">
          System Snapshot
        </h3>
        <div className="space-y-4">
          <div className="p-3 bg-surface-deep rounded border border-subtle">
            <p className="font-label-caps text-label-caps text-primary mb-2">
              Escrow Exposure
            </p>
            <p className="font-headline-md text-headline-md">
              &#8358;14,821,000.00
            </p>
            <div className="mt-2 h-1 w-full bg-surface-container-highest rounded-full">
              <div className="h-full bg-primary" style={{ width: "72%" }} />
            </div>
          </div>
          <div className="p-3 bg-surface-deep rounded border border-subtle">
            <p className="font-label-caps text-label-caps text-secondary mb-2">
              Fiat Reservoir
            </p>
            <p className="font-headline-md text-headline-md">
              &#8358;92,104,250.21
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1">
              Across 4 partner banks
            </p>
          </div>
          <button className="w-full py-2 bg-primary text-on-primary font-headline-md rounded hover:opacity-90 transition-opacity">
            Manual Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
}
