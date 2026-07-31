export default function SystemHealthRow() {
  return (
    <div className="col-span-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-base">
        {/* API Provider */}
        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">database</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">API Provider</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-body-md text-body-md">CoinGecko Pro</div>
            <div className="text-[10px] text-status-success font-bold">OPTIMAL</div>
          </div>
        </div>
        {/* Last Update */}
        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-status-warning">history</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Last Update</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-data-mono text-data-mono">14s ago</div>
            <div className="text-[10px] text-on-surface-variant">Next in 46s</div>
          </div>
        </div>
        {/* Rate Limit */}
        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-status-danger">security</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Rate Limit</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-body-md text-body-md">2.4k / 10k</div>
            <div className="text-[10px] text-on-surface-variant">24h Period</div>
          </div>
        </div>
        {/* Hot Wallet Balance */}
        <div className="bg-surface-container border border-subtle p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Hot Wallet Bal.</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="font-data-mono text-data-mono">$1.24M</div>
            <div className="text-[10px] text-status-success">HEALTHY</div>
          </div>
        </div>
      </div>
    </div>
  );
}
