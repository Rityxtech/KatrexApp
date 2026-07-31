"use client";

import { useWebhookLogs, useAppSettings } from "@/hooks/useAdminData";

function formatTimestamp(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  "200": "text-status-success",
  "200 OK": "text-status-success",
  "400": "text-status-danger",
  "400 ERR": "text-status-danger",
  "500": "text-status-danger",
  "500 ERR": "text-status-danger",
};

export default function ApiIntegrationsPage() {
  const { data: webhooks, loading } = useWebhookLogs(30);
  const { data: settings } = useAppSettings();

  const nowPayments = settings.find((s: any) => s.id === "nowpayments") || {};
  const korapay = settings.find((s: any) => s.id === "korapay") || {};
  const squad = settings.find((s: any) => s.id === "squad") || {};
  const smeApi = settings.find((s: any) => s.id === "sme_api") || {};
  const firebase = settings.find((s: any) => s.id === "firebase") || {};
  const comms = settings.find((s: any) => s.id === "comms_gateway") || {};

  const successCount = webhooks.filter((w: any) => w.status === "200" || w.status === "200 OK" || w.statusCode === 200).length;
  const errorCount = webhooks.filter((w: any) => w.status === "400" || w.status === "400 ERR" || w.statusCode >= 400).length;

  return (
    <div className="w-full">
      <div className="bg-surface-container flex justify-between items-center px-gutter h-12 w-full z-40 border-b border-outline-variant sticky top-0">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary cursor-pointer active:opacity-80">grid_view</span>
          <h1 className="font-headline-md text-headline-md font-black tracking-tighter text-primary">INTEGRATIONS CONFIG</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-outline-variant rounded">
            <span className="material-symbols-outlined text-status-success text-[14px]">sensors</span>
            <span className="font-data-mono text-body-sm flex items-center gap-1">
              SYSTEM: OPERATIONAL <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant hover:bg-surface-bright p-1 rounded transition-colors cursor-pointer">notifications</span>
          <span className="material-symbols-outlined text-on-surface-variant hover:bg-surface-bright p-1 rounded transition-colors cursor-pointer">search</span>
        </div>
      </div>

      <div className="px-container-padding py-[20px] space-y-[20px]">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
          {/* NowPayments */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">currency_bitcoin</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">NowPayments</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input checked={nowPayments.enabled !== false} className="sr-only peer" type="checkbox" readOnly />
                <div className={`w-10 h-5 rounded-full border border-outline-variant transition-colors ${nowPayments.enabled !== false ? "bg-secondary" : "bg-outline-variant"}`}></div>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${nowPayments.enabled !== false ? "left-5" : "left-0.5"}`}></div>
                <span className="ml-2 font-label-caps text-label-caps">{nowPayments.enabled !== false ? "LIVE" : "OFF"}</span>
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">API KEY</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" readOnly type="password" defaultValue={nowPayments.apiKey || "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} />
                  <button className="absolute right-2 top-1.5 material-symbols-outlined text-on-surface-variant text-[16px]">visibility</button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SUB-PARTNER ID</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={nowPayments.partnerId || "NP-992-SEC-X"} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK URL</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={nowPayments.webhookUrl || "https://api.katrex.io/hooks/nowpayments"} />
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
              <span className={`px-2 py-0.5 rounded border font-label-caps text-label-caps ${korapay.enabled !== false ? "bg-status-success/10 text-status-success border-status-success/20" : "bg-surface-container-high text-on-surface-variant border-subtle"}`}>
                {korapay.enabled !== false ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">PUBLIC KEY</label>
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={korapay.publicKey || "pk_live_827..."} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">SECRET KEY</label>
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" defaultValue={korapay.secretKey || "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} />
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={korapay.webhookUrl || "https://api.katrex.io/hooks/korapay"} />
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={squad.sandboxKey || "sq_test_key_002991"} />
              </div>
              <div className="flex items-center gap-4 py-2 border-y border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <input checked={squad.checkoutUI !== false} className="rounded bg-surface-container-low border-outline-variant text-secondary" type="checkbox" readOnly />
                  <span className="font-body-sm text-body-sm">Checkout UI</span>
                </div>
                <div className="flex items-center gap-2">
                  <input checked={squad.cardIssuing === true} className="rounded bg-surface-container-low border-outline-variant text-secondary" type="checkbox" readOnly />
                  <span className="font-body-sm text-body-sm">Card Issuing</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK SECRET</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" defaultValue={squad.webhookSecret || "whsec_0918237"} />
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={smeApi.endpoint || "https://smeplug.ng/api/v2"} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">ACCESS TOKEN</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" defaultValue={smeApi.accessToken || "sme_tk_88301-229"} />
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={firebase.projectId || "katrexapp-83cde"} />
              </div>
              <div className="p-2 bg-surface-container-lowest border border-outline-variant rounded flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">FIRESTORE RULES</span>
                  <span className="font-data-mono text-[10px] text-status-success">LIVE {"\u2022"} Real-time sync active</span>
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
                  <p className="text-label-caps text-on-surface-variant">FIRESTORE</p>
                  <p className="text-body-sm font-bold text-status-success">ON</p>
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={comms.smtpHost || "smtp.postmarkapp.com:587"} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SMS GATEWAY (Twilio/Termii)</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={comms.smsGateway || "API_KEY_0x82772911"} />
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
                <span className="w-2 h-2 bg-status-success rounded-full"></span> {successCount} Success
              </span>
              <span className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant">
                <span className="w-2 h-2 bg-status-danger rounded-full"></span> {errorCount} Errors
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />)}
              </div>
            ) : webhooks.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No webhook logs</div>
            ) : (
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
                  {webhooks.map((log: any) => {
                    const statusStr = log.status || (log.statusCode >= 400 ? "400 ERR" : "200 OK");
                    const statusColor = STATUS_COLORS[statusStr] || (log.statusCode >= 400 ? "text-status-danger" : "text-status-success");
                    return (
                      <tr key={log.id} className="hover:bg-surface-container-high/50 border-b border-outline-variant/50">
                        <td className="py-2 px-4 text-on-surface-variant">{formatTimestamp(log.createdAt)}</td>
                        <td className="py-2 px-4">{log.source || log.provider || "\u2014"}</td>
                        <td className="py-2 px-4">{log.event || log.type || "\u2014"}</td>
                        <td className="py-2 px-4 text-[10px] text-outline truncate max-w-xs">{log.payload ? JSON.stringify(log.payload).slice(0, 80) : "\u2014"}</td>
                        <td className={`py-2 px-4 ${statusColor}`}>{statusStr}</td>
                        <td className="py-2 px-4 text-right">
                          <button className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-secondary">replay</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <footer className="h-8 bg-surface-container-lowest border-t border-outline-variant px-gutter flex items-center justify-between text-[10px] font-data-mono text-on-surface-variant">
        <div className="flex gap-4">
          <span>LATENCY: 42ms</span>
          <span>REGION: EU-WEST-1</span>
          <span>UPTIME: 99.98%</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse"></span> FIRESTORE: LIVE</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-success rounded-full"></span> REAL-TIME: ON</span>
        </div>
      </footer>
    </div>
  );
}
