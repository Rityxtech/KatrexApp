export default function ApiIntegrationsPage() {
  return (
    <div className="w-full">
      {/* Top App Bar */}
      <div className="bg-surface-container flex justify-between items-center px-gutter h-12 w-full z-40 border-b border-outline-variant sticky top-0">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary cursor-pointer active:opacity-80">grid_view</span>
          <h1 className="font-headline-md text-headline-md font-black tracking-tighter text-primary">INTEGRATIONS CONFIG</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-outline-variant rounded">
            <span className="material-symbols-outlined text-status-success text-[14px]">sensors</span>
            <span className="font-data-mono text-body-sm">SYSTEM: OPERATIONAL</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant hover:bg-surface-bright p-1 rounded transition-colors cursor-pointer">notifications</span>
          <span className="material-symbols-outlined text-on-surface-variant hover:bg-surface-bright p-1 rounded transition-colors cursor-pointer">search</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="px-container-padding py-[20px] space-y-[20px]">
        {/* Grid Layout for Settings Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
          {/* NowPayments */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">currency_bitcoin</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">NowPayments</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input checked className="sr-only peer" type="checkbox" readOnly />
                <div className="w-10 h-5 bg-secondary rounded-full border border-outline-variant transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                <span className="ml-2 font-label-caps text-label-caps">LIVE</span>
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">API KEY</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" readOnly type="password" defaultValue={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} />
                  <button className="absolute right-2 top-1.5 material-symbols-outlined text-on-surface-variant text-[16px]">visibility</button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SUB-PARTNER ID</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="NP-992-SEC-X" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK URL</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="https://api.terminal.ops/hooks/nowpayments" />
              </div>
            </div>
          </section>

          {/* Korapay */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">account_balance</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Korapay</h2>
              </div>
              <span className="bg-status-success/10 text-status-success px-2 py-0.5 rounded border border-status-success/20 font-label-caps text-label-caps">CONNECTED</span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">PUBLIC KEY</label>
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="pk_live_827..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">SECRET KEY</label>
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" defaultValue={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">VIRTUAL ACC. SETTINGS</label>
                <select className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm focus:border-secondary outline-none appearance-none">
                  <option>Static Accounts Enabled</option>
                  <option>Dynamic Collection Only</option>
                  <option>Manual Settlement</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK ENDPOINT</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="https://api.terminal.ops/hooks/korapay" />
              </div>
            </div>
          </section>

          {/* Squad */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">credit_card</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Squad</h2>
              </div>
              <button className="font-label-caps text-label-caps border border-outline-variant px-3 py-1 rounded hover:bg-surface-bright transition-colors">DOCS</button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SANDBOX KEY</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="sq_test_key_002991" />
              </div>
              <div className="flex items-center gap-4 py-2 border-y border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <input checked className="rounded bg-surface-container-low border-outline-variant text-secondary" type="checkbox" readOnly />
                  <span className="font-body-sm text-body-sm">Checkout UI</span>
                </div>
                <div className="flex items-center gap-2">
                  <input className="rounded bg-surface-container-low border-outline-variant text-secondary" type="checkbox" readOnly />
                  <span className="font-body-sm text-body-sm">Card Issuing</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK SECRET</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" defaultValue="whsec_0918237" />
              </div>
            </div>
          </section>

          {/* SME API */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">router</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">SME API</h2>
              </div>
              <div className="flex gap-2">
                <button className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded font-label-caps text-label-caps hover:bg-primary hover:text-on-primary transition-all">TEST</button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">PROVIDER ENDPOINT</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="https://smeplug.ng/api/v2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">ACCESS TOKEN</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" defaultValue="sme_tk_88301-229" />
              </div>
              <button className="w-full py-2 bg-surface-container-high border border-outline-variant rounded flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
                <span className="font-label-caps text-label-caps">VIEW LIVE RATES</span>
              </button>
            </div>
          </section>

          {/* Firebase */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-warning" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Firebase</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-status-success rounded-full animate-pulse"></div>
                <span className="font-label-caps text-label-caps">CLD FUNCTIONS: UP</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">PROJECT ID</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="terminal-production-v3" />
              </div>
              <div className="p-2 bg-surface-container-lowest border border-outline-variant rounded flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">FIRESTORE RULES</span>
                  <span className="font-data-mono text-[10px] text-status-warning">v18 Published 2h ago</span>
                </div>
                <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary">open_in_new</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-container-low border border-outline-variant rounded p-2 text-center">
                  <p className="text-label-caps text-on-surface-variant">AUTH</p>
                  <p className="text-body-sm font-bold text-status-success">ON</p>
                </div>
                <div className="bg-surface-container-low border border-outline-variant rounded p-2 text-center">
                  <p className="text-label-caps text-on-surface-variant">STORAGE</p>
                  <p className="text-body-sm font-bold text-status-success">ON</p>
                </div>
                <div className="bg-surface-container-low border border-outline-variant rounded p-2 text-center">
                  <p className="text-label-caps text-on-surface-variant">HOSTING</p>
                  <p className="text-body-sm font-bold text-status-danger">OFF</p>
                </div>
              </div>
            </div>
          </section>

          {/* Comms Gateway */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">mail</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Comms Gateway</h2>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SMTP HOST</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="smtp.postmarkapp.com:587" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SMS GATEWAY (Twilio/Termii)</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue="API_KEY_0x82772911" />
              </div>
              <a className="block w-full py-2 bg-secondary/10 border border-secondary/20 text-secondary rounded flex items-center justify-center gap-2 hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer" href="#">
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span className="font-label-caps text-label-caps">OPEN TEMPLATE EDITOR</span>
              </a>
            </div>
          </section>
        </div>

        {/* Webhook Logs */}
        <section className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="px-4 py-3 bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">list_alt</span>
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Incoming Webhook Logs</h2>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant">
                <span className="w-2 h-2 bg-status-success rounded-full"></span> 2.4k Success
              </span>
              <span className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant">
                <span className="w-2 h-2 bg-status-danger rounded-full"></span> 12 Errors
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="text-left py-2 px-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Timestamp</th>
                  <th className="text-left py-2 px-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Source</th>
                  <th className="text-left py-2 px-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Event</th>
                  <th className="text-left py-2 px-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Payload Preview</th>
                  <th className="text-left py-2 px-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Status</th>
                  <th className="text-right py-2 px-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Action</th>
                </tr>
              </thead>
              <tbody className="font-data-mono text-body-sm">
                {[
                  { ts: "14:22:01.092", source: "NowPayments", event: "payment_confirmed", payload: '{ "id": "4491", "amt": "0.002 BTC", "status": "finished" }', status: "200 OK", statusColor: "text-status-success", sourceColor: "" },
                  { ts: "14:20:55.210", source: "Korapay", event: "transfer.success", payload: '{ "reference": "TRF-902-XK", "bank": "WEMA", "status": "true" }', status: "200 OK", statusColor: "text-status-success", sourceColor: "" },
                  { ts: "14:18:12.883", source: "Squad", event: "card_verification", payload: '{ "token": "v_sq_882...", "error": "insufficient_funds" }', status: "400 ERR", statusColor: "text-status-danger", sourceColor: "text-status-warning" },
                  { ts: "14:15:01.002", source: "SME API", event: "balance_low", payload: '{ "provider": "MTN", "balance": "102.50", "currency": "NGN" }', status: "200 OK", statusColor: "text-status-success", sourceColor: "" },
                ].map((log) => (
                  <tr key={log.ts} className="hover:bg-surface-container-high/50 border-b border-outline-variant/50">
                    <td className="py-2 px-4 text-on-surface-variant">{log.ts}</td>
                    <td className={`py-2 px-4 ${log.sourceColor}`}>{log.source}</td>
                    <td className="py-2 px-4">{log.event}</td>
                    <td className="py-2 px-4 text-[10px] text-outline truncate max-w-xs">{log.payload}</td>
                    <td className={`py-2 px-4 ${log.statusColor}`}>{log.status}</td>
                    <td className="py-2 px-4 text-right">
                      <button className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-secondary">replay</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Footer / Global Stats */}
      <footer className="h-8 bg-surface-container-lowest border-t border-outline-variant px-gutter flex items-center justify-between text-[10px] font-data-mono text-on-surface-variant">
        <div className="flex gap-4">
          <span>LATENCY: 42ms</span>
          <span>REGION: EU-WEST-1</span>
          <span>UPTIME: 99.98%</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-success rounded-full"></span> NODE_A: ACTIVE</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-success rounded-full"></span> NODE_B: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}
