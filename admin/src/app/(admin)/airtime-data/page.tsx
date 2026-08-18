"use client";

import { useState, useMemo, useCallback } from "react";
import { useAirtimePlans, useTransactions } from "@/hooks/useAdminData";
import { updateDocument, setDocument } from "@/hooks/useFirestore";

function formatNaira(n: number) {
  return `\u20a6${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_BADGES: Record<string, { class: string; label: string }> = {
  completed: { class: "bg-status-success/10 text-status-success", label: "SUCCESS" },
  pending: { class: "bg-status-warning/10 text-status-warning", label: "PENDING" },
  failed: { class: "bg-status-danger/10 text-status-danger", label: "FAILED" },
};

export default function AirtimeDataPage() {
  const { data: plans, loading: pl } = useAirtimePlans();
  const { data: txns, loading: tl } = useTransactions(100);

  const [activeProvider, setActiveProvider] = useState<"SMEPlug" | "SMEAPI">("SMEPlug");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [mtnMargin, setMtnMargin] = useState("15");
  const [airtelDiscount, setAirtelDiscount] = useState("2.5");
  const [planOverride, setPlanOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [planVisibility, setPlanVisibility] = useState<Record<string, boolean>>({});

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const airtimeTxns = txns.filter((t: any) => t.type === "airtime" || t.type === "data").slice(0, 10);

  const filteredPlans = useMemo(() => {
    if (networkFilter === "all") return plans;
    return plans.filter((p: any) => (p.network || p.provider || "").toLowerCase().includes(networkFilter.toLowerCase()));
  }, [plans, networkFilter]);

  function getPlanVisibility(planId: string, defaultVisible: boolean | undefined): boolean {
    if (planVisibility.hasOwnProperty(planId)) return planVisibility[planId];
    return defaultVisible !== false;
  }

  async function togglePlanVisibility(planId: string, currentVisible: boolean) {
    const newVal = !currentVisible;
    setPlanVisibility((prev) => ({ ...prev, [planId]: newVal }));
    try {
      await updateDocument("airtime_plans", planId, { visible: newVal, updatedAt: new Date() });
      showToast(`Plan ${newVal ? "shown" : "hidden"}`);
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
      setPlanVisibility((prev) => ({ ...prev, [planId]: currentVisible }));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setDocument("pricing_config", "airtime_fees", {
        mtnMargin,
        airtelDiscount,
        planOverride,
        activeProvider,
        updatedAt: new Date(),
      });
      showToast("Settings saved successfully");
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      // Trigger a refresh by updating a timestamp in app_settings
      await setDocument("app_settings", "airtime_sync", {
        lastSync: new Date(),
        provider: activeProvider,
        status: "synced",
      });
      showToast("API sync completed successfully");
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  function exportCSV() {
    const headers = ["User", "Type", "Amount (NGN)", "Status", "Date"];
    const rows = airtimeTxns.map((t: any) => [
      t.uid || "",
      `${t.type} ${t.description || ""}`.trim(),
      t.amountNaira || 0,
      t.status || "",
      t.createdAt?.toDate ? t.createdAt.toDate().toISOString() : (t.createdAt || ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airtime-data-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported");
  }

  return (
    <div className="p-container-padding w-full space-y-max-gap py-stack-base">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-4 py-2 rounded shadow-lg font-body-sm text-body-sm text-on-surface">
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Airtime &amp; Data Management</h1>
          <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
            Configure provider settings, API rates, and custom markups.
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={syncing}
            onClick={handleSync}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-subtle px-4 py-1.5 rounded text-body-sm flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            <span className={`material-symbols-outlined text-[18px] ${syncing ? "animate-spin" : ""}`}>sync</span> {syncing ? "Syncing..." : "Force Sync API"}
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-secondary text-on-secondary-fixed px-4 py-1.5 rounded text-body-sm font-bold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">save</span> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        {/* Left Column */}
        <div className="md:col-span-8 space-y-gutter">
          {/* Provider Settings */}
          <section className="bg-surface-bright border border-subtle p-stack-base rounded-lg">
            <div className="flex items-center gap-2 mb-stack-base px-2">
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
              <h2 className="font-headline-md text-headline-md">Provider Settings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant block">Active VTU Provider</label>
                <div className="flex bg-surface-deep p-1 border border-subtle rounded w-fit">
                  <button
                    onClick={() => setActiveProvider("SMEPlug")}
                    className={`px-4 py-1 text-body-sm rounded transition-colors ${activeProvider === "SMEPlug" ? "bg-primary-container text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    SMEPlug
                  </button>
                  <button
                    onClick={() => setActiveProvider("SMEAPI")}
                    className={`px-4 py-1 text-body-sm rounded transition-colors ${activeProvider === "SMEAPI" ? "bg-primary-container text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    SMEAPI
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant block">API Key ({activeProvider})</label>
                <div className="relative">
                  <input className="w-full bg-surface-deep border border-subtle rounded px-3 py-1.5 text-data-mono text-primary focus:outline-none focus:border-secondary transition-colors" type="password" defaultValue="••••••••••••••••••••••••••••••" />
                  <span className="material-symbols-outlined absolute right-2 top-1.5 text-on-surface-variant cursor-pointer text-[18px]">visibility</span>
                </div>
              </div>
            </div>
          </section>

          {/* Real API Rates */}
          <section className="bg-surface-bright border border-subtle rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-stack-base border-b border-subtle bg-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">monitoring</span>
                <h2 className="font-headline-md text-headline-md">Real API Rates</h2>
              </div>
              <div className="flex gap-2 no-scrollbar overflow-x-auto">
                {[
                  { label: "MTN", value: "mtn" },
                  { label: "Airtel", value: "airtel" },
                  { label: "Glo", value: "glo" },
                  { label: "9Mobile", value: "9mobile" },
                ].map((n) => (
                  <button
                    key={n.value}
                    onClick={() => setNetworkFilter(networkFilter === n.value ? "all" : n.value)}
                    className={`px-3 py-0.5 rounded-full text-label-caps border transition-colors ${networkFilter === n.value ? "bg-secondary-container/20 text-secondary border-secondary/30" : "text-on-surface-variant border-subtle hover:text-on-surface"}`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              {pl ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />)}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="p-6 text-center text-on-surface-variant text-body-sm">
                  {networkFilter !== "all" ? `No ${networkFilter} plans configured` : "No plans configured"}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-deep/50 border-b border-subtle">
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Plan Name</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Plan ID</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Cost Price</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Validity</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm divide-y divide-subtle">
                    {filteredPlans.map((p: any) => (
                      <tr key={p.id} className="hover:bg-primary-container/20 transition-colors">
                        <td className="px-4 py-1.5">{p.name || p.planName || "Plan"}</td>
                        <td className="px-4 py-1.5 text-data-mono text-on-surface-variant">{p.planId || p.id?.slice(0, 12)}</td>
                        <td className="px-4 py-1.5 text-data-mono">{formatNaira(p.costPrice || p.price || 0)}</td>
                        <td className="px-4 py-1.5">{p.validity || "30 Days"}</td>
                        <td className="px-4 py-1.5 text-right">
                          <span className={`w-2 h-2 rounded-full ${getPlanVisibility(p.id, p.visible) ? "bg-status-success" : "bg-status-warning"} inline-block`}></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Recent Transactions */}
          <section className="bg-surface-bright border border-subtle rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-stack-base border-b border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                <h2 className="font-headline-md text-headline-md">Recent Transactions</h2>
              </div>
              <button
                onClick={exportCSV}
                className="text-label-caps text-secondary flex items-center gap-1 hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              {tl ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />)}
                </div>
              ) : airtimeTxns.length === 0 ? (
                <div className="p-6 text-center text-on-surface-variant text-body-sm">No airtime/data transactions</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-deep/50 border-b border-subtle">
                    <tr>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">User</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Type</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Amount</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant">Status</th>
                      <th className="px-4 py-2 text-label-caps text-on-surface-variant text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm divide-y divide-subtle">
                    {airtimeTxns.map((t: any) => {
                      const badge = STATUS_BADGES[t.status] || STATUS_BADGES.pending;
                      return (
                        <tr key={t.id} className="hover:bg-primary-container/20 transition-colors">
                          <td className="px-4 py-2">{t.uid?.slice(0, 20) || "\u2014"}</td>
                          <td className="px-4 py-2 capitalize">{t.type} {t.description?.slice(0, 20) || ""}</td>
                          <td className="px-4 py-2 text-data-mono">{formatNaira(t.amountNaira || 0)}</td>
                          <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded ${badge.class} text-[10px] font-bold`}>{badge.label}</span></td>
                          <td className="px-4 py-2 text-right text-on-surface-variant">{formatDate(t.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="md:col-span-4 space-y-gutter">
          {/* Global Markups */}
          <section className="bg-surface-bright border border-subtle p-stack-base rounded-lg">
            <div className="flex items-center gap-2 mb-stack-base px-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">percent</span>
              <h2 className="font-headline-md text-headline-md">Global Markups</h2>
            </div>
            <div className="space-y-3 px-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-on-surface-variant">MTN Profit Margin</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-12 bg-surface-deep border border-subtle rounded px-2 py-1 text-center text-data-mono focus:border-secondary focus:outline-none"
                    type="text"
                    value={mtnMargin}
                    onChange={(e) => setMtnMargin(e.target.value)}
                  />
                  <span className="text-body-sm">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-on-surface-variant">Airtel Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-12 bg-surface-deep border border-subtle rounded px-2 py-1 text-center text-data-mono focus:border-secondary focus:outline-none"
                    type="text"
                    value={airtelDiscount}
                    onChange={(e) => setAirtelDiscount(e.target.value)}
                  />
                  <span className="text-body-sm">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-subtle pt-3">
                <span className="text-body-sm font-bold">Plan Override</span>
                <div
                  onClick={() => setPlanOverride(!planOverride)}
                  className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${planOverride ? "bg-secondary" : "bg-surface-deep border border-outline"}`}
                >
                  <div className={`absolute top-[2px] w-3 h-3 rounded-full transition-all ${planOverride ? "left-[18px] bg-white" : "left-[2px] bg-on-surface-variant"}`}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Network Display */}
          <section className="bg-surface-bright border border-subtle p-stack-base rounded-lg">
            <div className="flex items-center gap-2 mb-stack-base px-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">sort</span>
              <h2 className="font-headline-md text-headline-md">Network Display</h2>
            </div>
            <div className="space-y-1">
              {["MTN", "Airtel", "Glo", "9Mobile"].map((name) => {
                const planExists = plans.some((p: any) => (p.network || p.provider || "").toLowerCase().includes(name.toLowerCase()));
                return (
                  <div key={name} className={`flex items-center justify-between p-2 bg-surface-deep border border-subtle rounded ${!planExists ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">drag_indicator</span>
                      <span className="text-body-sm font-bold">{name}</span>
                    </div>
                    <span className={`material-symbols-outlined ${planExists ? "text-status-success" : "text-on-surface-variant"} text-[18px]`}>
                      {planExists ? "visibility" : "visibility_off"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Plan Control */}
          <section className="bg-surface-bright border border-subtle p-stack-base rounded-lg">
            <div className="flex items-center gap-2 mb-stack-base px-2">
              <span className="material-symbols-outlined text-primary text-[20px]">lists</span>
              <h2 className="font-headline-md text-headline-md">Plan Control</h2>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {pl ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-surface-deep rounded animate-pulse" />)
              ) : plans.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-body-sm">No plans</div>
              ) : (
                plans.slice(0, 10).map((p: any) => {
                  const isVisible = getPlanVisibility(p.id, p.visible);
                  return (
                    <div key={p.id} className="p-2 border border-subtle rounded bg-surface-deep space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm font-bold">{p.name || p.planName || "Plan"}</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">edit</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-on-surface-variant uppercase tracking-wider">
                        <span>ID: {p.planId || p.id?.slice(0, 8)}</span>
                        <div className="flex items-center gap-2">
                          <span className={isVisible ? "text-status-success" : "text-on-surface-variant"}>{isVisible ? "Visible" : "Hidden"}</span>
                          <div
                            onClick={() => togglePlanVisibility(p.id, isVisible)}
                            className={`w-6 h-3 ${isVisible ? "bg-secondary" : "bg-surface-variant"} rounded-full relative cursor-pointer`}
                          >
                            <div className={`absolute ${isVisible ? "right-0.5" : "left-0.5"} top-0.5 w-2 h-2 bg-white rounded-full`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
