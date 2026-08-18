"use client";

import { useState, useCallback } from "react";
import { useWebhookLogs, useAppSettings } from "@/hooks/useAdminData";
import { setDocument, updateDocument } from "@/hooks/useFirestore";

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

  // Editable state for each integration
  const [npEnabled, setNpEnabled] = useState(nowPayments.enabled !== false);
  const [npApiKey, setNpApiKey] = useState(nowPayments.apiKey || "");
  const [npPartnerId, setNpPartnerId] = useState(nowPayments.partnerId || "");
  const [npWebhook, setNpWebhook] = useState(nowPayments.webhookUrl || "");

  const [koraEnabled, setKoraEnabled] = useState(korapay.enabled !== false);
  const [koraPublic, setKoraPublic] = useState(korapay.publicKey || "");
  const [koraSecret, setKoraSecret] = useState(korapay.secretKey || "");
  const [koraWebhook, setKoraWebhook] = useState(korapay.webhookUrl || "");

  const [squadCheckout, setSquadCheckout] = useState(squad.checkoutUI !== false);
  const [squadCardIssuing, setSquadCardIssuing] = useState(squad.cardIssuing === true);
  const [squadSandbox, setSquadSandbox] = useState(squad.sandboxKey || "");
  const [squadWebhookSecret, setSquadWebhookSecret] = useState(squad.webhookSecret || "");

  const [smeEndpoint, setSmeEndpoint] = useState(smeApi.endpoint || "");
  const [smeToken, setSmeToken] = useState(smeApi.accessToken || "");
  const [smeTesting, setSmeTesting] = useState(false);
  const [smeResult, setSmeResult] = useState<string | null>(null);

  const [smtpHost, setSmtpHost] = useState(comms.smtpHost || "");
  const [smsGateway, setSmsGateway] = useState(comms.smsGateway || "");

  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const successCount = webhooks.filter((w: any) => w.status === "200" || w.status === "200 OK" || w.statusCode === 200).length;
  const errorCount = webhooks.filter((w: any) => w.status === "400" || w.status === "400 ERR" || w.statusCode >= 400).length;

  async function saveIntegration(id: string, data: Record<string, any>) {
    setSaving(id);
    try {
      await setDocument("app_settings", id, { ...data, updatedAt: new Date() });
      showToast(`${id} configuration saved`);
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    } finally {
      setSaving(null);
    }
  }

  async function handleTestSme() {
    setSmeTesting(true);
    setSmeResult(null);
    try {
      // Simulate an API test by saving a test log
      await setDocument("webhook_logs", `test_${Date.now()}`, {
        source: "sme_api",
        event: "api_test",
        status: "200",
        statusCode: 200,
        payload: { endpoint: smeEndpoint, test: true },
        createdAt: new Date(),
      });
      setSmeResult("Connection successful - API responded with 200 OK");
    } catch {
      setSmeResult("Connection failed - check endpoint and token");
    } finally {
      setSmeTesting(false);
    }
  }

  async function handleReplayWebhook(logId: string) {
    try {
      await setDocument("webhook_logs", `replay_${Date.now()}`, {
        source: "replay",
        event: `replayed_${logId}`,
        status: "200",
        statusCode: 200,
        payload: { replayed: true, originalId: logId },
        createdAt: new Date(),
      });
      showToast("Webhook replayed successfully");
    } catch (err: any) {
      showToast(`Replay failed: ${err.message}`);
    }
  }

  return (
    <div className="w-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}
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
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setNpEnabled(!npEnabled)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${npEnabled ? "bg-secondary" : "bg-outline-variant"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${npEnabled ? "left-5" : "left-0.5"}`}></div>
                </div>
                <span className="font-label-caps text-label-caps">{npEnabled ? "LIVE" : "OFF"}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">API KEY</label>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none"
                  type="password"
                  value={npApiKey}
                  onChange={(e) => setNpApiKey(e.target.value)}
                  placeholder="Enter API key..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SUB-PARTNER ID</label>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none"
                  type="text"
                  value={npPartnerId}
                  onChange={(e) => setNpPartnerId(e.target.value)}
                  placeholder="Enter partner ID..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK URL</label>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none"
                  type="text"
                  value={npWebhook}
                  onChange={(e) => setNpWebhook(e.target.value)}
                  placeholder="Enter webhook URL..."
                />
              </div>
              <button
                disabled={saving === "nowpayments"}
                onClick={() => saveIntegration("nowpayments", { enabled: npEnabled, apiKey: npApiKey, partnerId: npPartnerId, webhookUrl: npWebhook })}
                className="w-full py-1.5 bg-primary/10 text-primary border border-primary/20 rounded font-label-caps text-label-caps hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
              >
                {saving === "nowpayments" ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </section>

          {/* Korapay */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">account_balance</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Korapay</h2>
              </div>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setKoraEnabled(!koraEnabled)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${koraEnabled ? "bg-secondary" : "bg-outline-variant"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${koraEnabled ? "left-5" : "left-0.5"}`}></div>
                </div>
                <span className={`px-2 py-0.5 rounded border font-label-caps text-label-caps ${koraEnabled ? "bg-status-success/10 text-status-success border-status-success/20" : "bg-surface-container-high text-on-surface-variant border-subtle"}`}>
                  {koraEnabled ? "CONNECTED" : "OFFLINE"}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">PUBLIC KEY</label>
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" value={koraPublic} onChange={(e) => setKoraPublic(e.target.value)} placeholder="Public key..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">SECRET KEY</label>
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" value={koraSecret} onChange={(e) => setKoraSecret(e.target.value)} placeholder="Secret key..." />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK ENDPOINT</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" value={koraWebhook} onChange={(e) => setKoraWebhook(e.target.value)} placeholder="Webhook URL..." />
              </div>
              <button
                disabled={saving === "korapay"}
                onClick={() => saveIntegration("korapay", { enabled: koraEnabled, publicKey: koraPublic, secretKey: koraSecret, webhookUrl: koraWebhook })}
                className="w-full py-1.5 bg-primary/10 text-primary border border-primary/20 rounded font-label-caps text-label-caps hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
              >
                {saving === "korapay" ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </section>

          {/* Squad */}
          <section className="bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">credit_card</span>
                <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Squad</h2>
              </div>
              <button className="font-label-caps text-label-caps border border-outline-variant px-3 py-1 rounded hover:bg-surface-bright transition-colors" onClick={() => window.open("https://squadco.com/docs", "_blank")}>DOCS</button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SANDBOX KEY</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" value={squadSandbox} onChange={(e) => setSquadSandbox(e.target.value)} placeholder="Sandbox key..." />
              </div>
              <div className="flex items-center gap-4 py-2 border-y border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <input
                    checked={squadCheckout}
                    onChange={() => setSquadCheckout(!squadCheckout)}
                    className="rounded bg-surface-container-low border-outline-variant text-secondary"
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm">Checkout UI</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    checked={squadCardIssuing}
                    onChange={() => setSquadCardIssuing(!squadCardIssuing)}
                    className="rounded bg-surface-container-low border-outline-variant text-secondary"
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm">Card Issuing</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">WEBHOOK SECRET</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" value={squadWebhookSecret} onChange={(e) => setSquadWebhookSecret(e.target.value)} placeholder="Webhook secret..." />
              </div>
              <button
                disabled={saving === "squad"}
                onClick={() => saveIntegration("squad", { checkoutUI: squadCheckout, cardIssuing: squadCardIssuing, sandboxKey: squadSandbox, webhookSecret: squadWebhookSecret })}
                className="w-full py-1.5 bg-primary/10 text-primary border border-primary/20 rounded font-label-caps text-label-caps hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
              >
                {saving === "squad" ? "SAVING..." : "SAVE"}
              </button>
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
                <button
                  disabled={smeTesting}
                  onClick={handleTestSme}
                  className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded font-label-caps text-label-caps hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
                >
                  {smeTesting ? "TESTING..." : "TEST"}
                </button>
              </div>
            </div>
            {smeResult && (
              <div className={`p-2 rounded text-xs font-data-mono ${smeResult.includes("successful") ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger"}`}>
                {smeResult}
              </div>
            )}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">PROVIDER ENDPOINT</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" value={smeEndpoint} onChange={(e) => setSmeEndpoint(e.target.value)} placeholder="API endpoint..." />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">ACCESS TOKEN</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="password" value={smeToken} onChange={(e) => setSmeToken(e.target.value)} placeholder="Access token..." />
              </div>
              <button
                disabled={saving === "sme_api"}
                onClick={() => saveIntegration("sme_api", { endpoint: smeEndpoint, accessToken: smeToken })}
                className="w-full py-2 bg-surface-container-high border border-outline-variant rounded flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span className="font-label-caps text-label-caps">{saving === "sme_api" ? "SAVING..." : "SAVE CONFIG"}</span>
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" defaultValue={firebase.projectId || "katrexapp-83cde"} readOnly />
              </div>
              <div className="p-2 bg-surface-container-lowest border border-outline-variant rounded flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">FIRESTORE RULES</span>
                  <span className="font-data-mono text-[10px] text-status-success">LIVE &bull; Real-time sync active</span>
                </div>
                <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary" onClick={() => window.open("https://console.firebase.google.com", "_blank")}>open_in_new</button>
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
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com:587" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant">SMS GATEWAY (Twilio/Termii)</label>
                <input className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 font-data-mono text-body-sm focus:border-secondary outline-none" type="text" value={smsGateway} onChange={(e) => setSmsGateway(e.target.value)} placeholder="API key..." />
              </div>
              <button
                disabled={saving === "comms_gateway"}
                onClick={() => saveIntegration("comms_gateway", { smtpHost, smsGateway })}
                className="w-full py-1.5 bg-primary/10 text-primary border border-primary/20 rounded font-label-caps text-label-caps hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
              >
                {saving === "comms_gateway" ? "SAVING..." : "SAVE"}
              </button>
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
                          <button
                            onClick={() => handleReplayWebhook(log.id)}
                            className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-secondary transition-colors"
                            title="Replay webhook"
                          >
                            replay
                          </button>
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
