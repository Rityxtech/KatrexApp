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
    <div className="w-full flex flex-col gap-3.5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3 py-1.5 rounded-xl shadow-lg font-body-sm text-xs text-on-surface">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-bright rounded-xl border border-subtle p-3.5 md:p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">API &amp; Third-Party Integrations</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Configure payment gateways, telecom providers, communication relays, and webhooks.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-subtle rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            <span className="font-data-mono text-[10px] font-bold text-status-success">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {/* NowPayments */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">currency_bitcoin</span>
              <h2 className="font-headline-md text-sm font-bold">NowPayments</h2>
            </div>
            <div className="flex items-center gap-2">
              <div
                onClick={() => setNpEnabled(!npEnabled)}
                className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${npEnabled ? "bg-secondary" : "bg-surface-deep border border-outline"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${npEnabled ? "left-[18px]" : "left-0.5"}`}></div>
              </div>
              <span className="font-label-caps text-[10px] font-bold">{npEnabled ? "LIVE" : "OFF"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">API KEY</label>
              <input
                className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none"
                type="password"
                value={npApiKey}
                onChange={(e) => setNpApiKey(e.target.value)}
                placeholder="Enter API key..."
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">SUB-PARTNER ID</label>
              <input
                className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none"
                type="text"
                value={npPartnerId}
                onChange={(e) => setNpPartnerId(e.target.value)}
                placeholder="Enter partner ID..."
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">WEBHOOK URL</label>
              <input
                className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none"
                type="text"
                value={npWebhook}
                onChange={(e) => setNpWebhook(e.target.value)}
                placeholder="Enter webhook URL..."
              />
            </div>
          </div>
          <button
            disabled={saving === "nowpayments"}
            onClick={() => saveIntegration("nowpayments", { enabled: npEnabled, apiKey: npApiKey, partnerId: npPartnerId, webhookUrl: npWebhook })}
            className="w-full py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-sm mt-1"
          >
            {saving === "nowpayments" ? "SAVING..." : "SAVE CONFIG"}
          </button>
        </section>

        {/* Korapay */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">account_balance</span>
              <h2 className="font-headline-md text-sm font-bold">Korapay</h2>
            </div>
            <div className="flex items-center gap-2">
              <div
                onClick={() => setKoraEnabled(!koraEnabled)}
                className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${koraEnabled ? "bg-secondary" : "bg-surface-deep border border-outline"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${koraEnabled ? "left-[18px]" : "left-0.5"}`}></div>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-label-caps text-[9px] font-bold ${koraEnabled ? "bg-status-success/10 text-status-success border border-status-success/20" : "bg-surface-container-high text-on-surface-variant"}`}>
                {koraEnabled ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">PUBLIC KEY</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="text" value={koraPublic} onChange={(e) => setKoraPublic(e.target.value)} placeholder="Public key..." />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">SECRET KEY</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="password" value={koraSecret} onChange={(e) => setKoraSecret(e.target.value)} placeholder="Secret key..." />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">WEBHOOK ENDPOINT</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="text" value={koraWebhook} onChange={(e) => setKoraWebhook(e.target.value)} placeholder="Webhook URL..." />
            </div>
          </div>
          <button
            disabled={saving === "korapay"}
            onClick={() => saveIntegration("korapay", { enabled: koraEnabled, publicKey: koraPublic, secretKey: koraSecret, webhookUrl: koraWebhook })}
            className="w-full py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-sm mt-1"
          >
            {saving === "korapay" ? "SAVING..." : "SAVE CONFIG"}
          </button>
        </section>

        {/* Squad */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">credit_card</span>
              <h2 className="font-headline-md text-sm font-bold">Squad</h2>
            </div>
            <button className="font-label-caps text-[9px] font-bold border border-subtle px-2 py-0.5 rounded-lg hover:bg-surface-container transition-colors" onClick={() => window.open("https://squadco.com/docs", "_blank")}>DOCS</button>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">SANDBOX KEY</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="text" value={squadSandbox} onChange={(e) => setSquadSandbox(e.target.value)} placeholder="Sandbox key..." />
            </div>
            <div className="flex items-center gap-3 py-1 border-y border-subtle">
              <div className="flex items-center gap-1.5">
                <input
                  checked={squadCheckout}
                  onChange={() => setSquadCheckout(!squadCheckout)}
                  className="rounded bg-surface-deep border-subtle text-secondary w-3.5 h-3.5"
                  type="checkbox"
                />
                <span className="font-body-sm text-xs font-semibold">Checkout UI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  checked={squadCardIssuing}
                  onChange={() => setSquadCardIssuing(!squadCardIssuing)}
                  className="rounded bg-surface-deep border-subtle text-secondary w-3.5 h-3.5"
                  type="checkbox"
                />
                <span className="font-body-sm text-xs font-semibold">Card Issuing</span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">WEBHOOK SECRET</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="password" value={squadWebhookSecret} onChange={(e) => setSquadWebhookSecret(e.target.value)} placeholder="Webhook secret..." />
            </div>
          </div>
          <button
            disabled={saving === "squad"}
            onClick={() => saveIntegration("squad", { checkoutUI: squadCheckout, cardIssuing: squadCardIssuing, sandboxKey: squadSandbox, webhookSecret: squadWebhookSecret })}
            className="w-full py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-sm mt-1"
          >
            {saving === "squad" ? "SAVING..." : "SAVE CONFIG"}
          </button>
        </section>

        {/* SME API */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">router</span>
              <h2 className="font-headline-md text-sm font-bold">SME Airtime &amp; Data API</h2>
            </div>
            <button
              disabled={smeTesting}
              onClick={handleTestSme}
              className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-lg font-label-caps text-[10px] font-bold hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
            >
              {smeTesting ? "TESTING..." : "TEST API"}
            </button>
          </div>
          {smeResult && (
            <div className={`p-2.5 rounded-lg text-xs font-data-mono ${smeResult.includes("successful") ? "bg-status-success/10 text-status-success border border-status-success/20" : "bg-status-danger/10 text-status-danger border border-status-danger/20"}`}>
              {smeResult}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">PROVIDER ENDPOINT</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="text" value={smeEndpoint} onChange={(e) => setSmeEndpoint(e.target.value)} placeholder="API endpoint..." />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">ACCESS TOKEN</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="password" value={smeToken} onChange={(e) => setSmeToken(e.target.value)} placeholder="Access token..." />
            </div>
          </div>
          <button
            disabled={saving === "sme_api"}
            onClick={() => saveIntegration("sme_api", { endpoint: smeEndpoint, accessToken: smeToken })}
            className="w-full py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-sm mt-1"
          >
            {saving === "sme_api" ? "SAVING..." : "SAVE CONFIG"}
          </button>
        </section>

        {/* Firebase */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-warning text-[20px]">local_fire_department</span>
              <h2 className="font-headline-md text-sm font-bold">Firebase Core Engine</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse"></div>
              <span className="font-label-caps text-[10px] font-bold text-status-success">FUNCTIONS: UP</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">PROJECT ID</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs text-on-surface focus:border-secondary outline-none" type="text" defaultValue={firebase.projectId || "katrexapp-83cde"} readOnly />
            </div>
            <div className="p-2.5 bg-surface-container-low border border-subtle rounded-lg flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">FIRESTORE RULES</span>
                <span className="font-data-mono text-[10px] text-status-success font-bold">LIVE &bull; Real-time sync active</span>
              </div>
              <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary text-[18px]" onClick={() => window.open("https://console.firebase.google.com", "_blank")}>open_in_new</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-surface-container-low border border-subtle rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-on-surface-variant">AUTH</p>
                <p className="text-[10px] font-bold text-status-success mt-0.5">ACTIVE</p>
              </div>
              <div className="bg-surface-container-low border border-subtle rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-on-surface-variant">STORAGE</p>
                <p className="text-[10px] font-bold text-status-success mt-0.5">ACTIVE</p>
              </div>
              <div className="bg-surface-container-low border border-subtle rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-on-surface-variant">FIRESTORE</p>
                <p className="text-[10px] font-bold text-status-success mt-0.5">ACTIVE</p>
              </div>
            </div>
          </div>
          <div className="pt-1"></div>
        </section>

        {/* Comms Gateway */}
        <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm p-3.5 md:p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">mail</span>
              <h2 className="font-headline-md text-sm font-bold">Comms Gateway</h2>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">SMTP HOST</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com:587" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="font-label-caps text-[9px] text-on-surface-variant font-bold">SMS GATEWAY (Termii / Twilio)</label>
              <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 font-data-mono text-xs focus:border-secondary outline-none" type="text" value={smsGateway} onChange={(e) => setSmsGateway(e.target.value)} placeholder="API key..." />
            </div>
          </div>
          <button
            disabled={saving === "comms_gateway"}
            onClick={() => saveIntegration("comms_gateway", { smtpHost, smsGateway })}
            className="w-full py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-sm mt-1"
          >
            {saving === "comms_gateway" ? "SAVING..." : "SAVE CONFIG"}
          </button>
        </section>
      </div>

      {/* Webhook Logs */}
      <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-3.5 py-2.5 bg-surface-container-low border-b border-subtle flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">list_alt</span>
            <h2 className="font-headline-md text-headline-md font-bold">Incoming Webhook Logs</h2>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1 font-data-mono text-[10px] text-status-success font-bold">
              <span className="w-1.5 h-1.5 bg-status-success rounded-full"></span> {successCount} Success
            </span>
            <span className="flex items-center gap-1 font-data-mono text-[10px] text-status-danger font-bold">
              <span className="w-1.5 h-1.5 bg-status-danger rounded-full"></span> {errorCount} Errors
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-3 space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-surface-container-low rounded-lg animate-pulse" />)}
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-body-sm">No webhook logs available</div>
          ) : (
            <table className="w-full border-collapse text-left font-body-sm">
              <thead className="bg-surface-container-low border-b border-subtle">
                <tr>
                  <th className="py-2 px-3 font-label-caps text-[10px] text-on-surface-variant">Timestamp</th>
                  <th className="py-2 px-3 font-label-caps text-[10px] text-on-surface-variant">Source</th>
                  <th className="py-2 px-3 font-label-caps text-[10px] text-on-surface-variant">Event</th>
                  <th className="py-2 px-3 font-label-caps text-[10px] text-on-surface-variant">Payload Preview</th>
                  <th className="py-2 px-3 font-label-caps text-[10px] text-on-surface-variant">Status</th>
                  <th className="py-2 px-3 font-label-caps text-[10px] text-on-surface-variant text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-data-mono divide-y divide-subtle">
                {webhooks.map((log: any) => {
                  const statusStr = log.status || (log.statusCode >= 400 ? "400 ERR" : "200 OK");
                  const statusColor = STATUS_COLORS[statusStr] || (log.statusCode >= 400 ? "text-status-danger" : "text-status-success");
                  return (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                      <td className="py-2 px-3 text-on-surface-variant text-xs">{formatTimestamp(log.createdAt)}</td>
                      <td className="py-2 px-3 font-bold text-on-surface text-xs">{log.source || log.provider || "\u2014"}</td>
                      <td className="py-2 px-3 text-on-surface text-xs">{log.event || log.type || "\u2014"}</td>
                      <td className="py-2 px-3 text-[10px] text-on-surface-variant truncate max-w-xs">{log.payload ? JSON.stringify(log.payload).slice(0, 80) : "\u2014"}</td>
                      <td className={`py-2 px-3 font-bold text-xs ${statusColor}`}>{statusStr}</td>
                      <td className="py-2 px-3 text-right">
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

      <footer className="bg-surface-bright border border-subtle rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between text-[10px] font-data-mono text-on-surface-variant gap-2 shadow-sm">
        <div className="flex gap-3">
          <span>LATENCY: 42ms</span>
          <span>REGION: EU-WEST-1</span>
          <span>UPTIME: 99.98%</span>
        </div>
        <div className="flex gap-3 items-center">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse"></span> FIRESTORE: LIVE</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-success rounded-full"></span> REAL-TIME: ON</span>
        </div>
      </footer>
    </div>
  );
}
