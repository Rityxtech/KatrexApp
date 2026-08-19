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
    <div className="w-full flex flex-col gap-3.5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-container border border-border-subtle px-3 py-1.5 rounded-xl shadow-lg font-body-sm text-xs text-on-surface">
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="bg-surface-bright rounded-xl border border-subtle p-3.5 md:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Airtime &amp; Data Management</h1>
          <p className="text-body-sm text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
            Configure provider settings, API rates, and custom markups.
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={syncing}
            onClick={handleSync}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-subtle px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <span className={`material-symbols-outlined text-[16px] ${syncing ? "animate-spin" : ""}`}>sync</span> {syncing ? "Syncing..." : "Force Sync API"}
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-secondary text-on-secondary-fixed px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">save</span> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          {/* Provider Settings */}
          <section className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
              <h2 className="font-headline-md text-headline-md font-bold">Provider Settings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-label-caps text-[10px] text-on-surface-variant font-bold block">Active VTU Provider</label>
                <div className="flex bg-surface-deep p-1 border border-subtle rounded-lg w-fit">
                  <button
                    onClick={() => setActiveProvider("SMEPlug")}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${activeProvider === "SMEPlug" ? "bg-primary-container text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    SMEPlug
                  </button>
                  <button
                    onClick={() => setActiveProvider("SMEAPI")}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${activeProvider === "SMEAPI" ? "bg-primary-container text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    SMEAPI
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-label-caps text-[10px] text-on-surface-variant font-bold block">API Key ({activeProvider})</label>
                <div className="relative">
                  <input className="w-full bg-surface-deep border border-subtle rounded-lg px-2.5 py-1.5 text-data-mono text-xs text-primary focus:outline-none focus:border-secondary transition-colors" type="password" defaultValue="••••••••••••••••••••••••••••••" />
                  <span className="material-symbols-outlined absolute right-2 top-1.5 text-on-surface-variant cursor-pointer text-[16px]">visibility</span>
                </div>
              </div>
            </div>
          </section>

          {/* Real API Rates */}
          <section className="bg-surface-bright border border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-subtle bg-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">monitoring</span>
                <h2 className="font-headline-md text-headline-md font-bold">Real API Rates</h2>
              </div>
              <div className="flex gap-1.5 no-scrollbar overflow-x-auto">
                {[
                  { label: "MTN", value: "mtn" },
                  { label: "Airtel", value: "airtel" },
                  { label: "Glo", value: "glo" },
                  { label: "9Mobile", value: "9mobile" },
                ].map((n) => (
                  <button
                    key={n.value}
                    onClick={() => setNetworkFilter(networkFilter === n.value ? "all" : n.value)}
                    className={`px-2.5 py-0.5 rounded-full text-label-caps text-xs border transition-colors ${networkFilter === n.value ? "bg-secondary-container/20 text-secondary border-secondary/30" : "text-on-surface-variant border-subtle hover:text-on-surface"}`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              {pl ? (
                <div className="p-3 space-y-1.5">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />)}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-xs">
                  {networkFilter !== "all" ? `No ${networkFilter} plans configured` : "No plans configured"}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-deep/50 border-b border-subtle">
                      <th className="px-3 py-2 text-label-caps text-on-surface-variant text-[10px]">Plan Name</th>
                      <th className="px-3 py-2 text-label-caps text-on-surface-variant text-[10px]">Plan ID</th>
                      <th className="px-3 py-2 text-label-caps text-on-surface-variant text-[10px]">Cost Price</th>
                      <th className="px-3 py-2 text-label-caps text-on-surface-variant text-[10px]">Validity</th>
                      <th className="px-3 py-2 text-label-caps text-on-surface-variant text-right text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm divide-y divide-subtle">
                    {filteredPlans.map((p: any) => (
                      <tr key={p.id} className="hover:bg-primary-container/20 transition-colors">
                        <td className="px-3 py-1.5 font-bold text-xs">{p.name || p.planName || "Plan"}</td>
                        <td className="px-3 py-1.5 text-data-mono text-xs text-on-surface-variant">{p.planId || p.id?.slice(0, 12)}</td>
                        <td className="px-3 py-1.5 text-data-mono text-xs">{formatNaira(p.costPrice || p.price || 0)}</td>
                        <td className="px-3 py-1.5 text-xs">{p.validity || "30 Days"}</td>
                        <td className="px-3 py-1.5 text-right">
                          <span className={`w-2 h-2 rounded-full ${getPlanVisibility(p.id, p.visible) ? "bg-status-success" : "bg-status-warning"} inline-block`}></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          {/* Global Markups */}
          <section className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="material-symbols-outlined text-tertiary text-[18px]">percent</span>
              <h2 className="font-headline-md text-headline-md font-bold">Global Markups</h2>
            </div>
            <div className="space-y-2 px-0.5">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-xs text-on-surface-variant">MTN Profit Margin</span>
                <div className="flex items-center gap-1.5">
                  <input
                    className="w-12 bg-surface-deep border border-subtle rounded px-2 py-1 text-center text-data-mono text-xs focus:border-secondary focus:outline-none"
                    type="text"
                    value={mtnMargin}
                    onChange={(e) => setMtnMargin(e.target.value)}
                  />
                  <span className="text-xs text-on-surface-variant">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-xs text-on-surface-variant">Airtel Discount</span>
                <div className="flex items-center gap-1.5">
                  <input
                    className="w-12 bg-surface-deep border border-subtle rounded px-2 py-1 text-center text-data-mono text-xs focus:border-secondary focus:outline-none"
                    type="text"
                    value={airtelDiscount}
                    onChange={(e) => setAirtelDiscount(e.target.value)}
                  />
                  <span className="text-xs text-on-surface-variant">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-subtle pt-2">
                <span className="text-body-sm text-xs font-bold">Plan Override</span>
                <div
                  onClick={() => setPlanOverride(!planOverride)}
                  className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${planOverride ? "bg-secondary" : "bg-surface-deep border border-outline"}`}
                >
                  <div className={`absolute top-[2px] w-3 h-3 rounded-full transition-all ${planOverride ? "left-[14px] bg-white" : "left-[2px] bg-on-surface-variant"}`}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Network Display */}
          <section className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">sort</span>
              <h2 className="font-headline-md text-headline-md font-bold">Network Display</h2>
            </div>
            <div className="space-y-1.5">
              {["MTN", "Airtel", "Glo", "9Mobile"].map((name) => {
                const planExists = plans.some((p: any) => (p.network || p.provider || "").toLowerCase().includes(name.toLowerCase()));
                return (
                  <div key={name} className={`flex items-center justify-between p-2 bg-surface-container-low border border-subtle rounded-lg ${!planExists ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">drag_indicator</span>
                      <span className="text-body-sm text-xs font-bold">{name}</span>
                    </div>
                    <span className={`material-symbols-outlined ${planExists ? "text-status-success" : "text-on-surface-variant"} text-[16px]`}>
                      {planExists ? "visibility" : "visibility_off"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Plan Control */}
          <section className="bg-surface-bright border border-subtle p-3.5 md:p-4 rounded-xl shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">lists</span>
              <h2 className="font-headline-md text-headline-md font-bold">Plan Control</h2>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {pl ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-low rounded-lg animate-pulse" />)
              ) : plans.length === 0 ? (
                <div className="p-3 text-center text-on-surface-variant text-xs">No plans</div>
              ) : (
                plans.slice(0, 10).map((p: any) => {
                  const isVisible = getPlanVisibility(p.id, p.visible);
                  return (
                    <div key={p.id} className="p-2 border border-subtle rounded-lg bg-surface-container-low space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm font-bold text-xs">{p.name || p.planName || "Plan"}</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-[14px]">edit</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-on-surface-variant uppercase tracking-wider font-data-mono">
                        <span>ID: {p.planId || p.id?.slice(0, 8)}</span>
                        <div className="flex items-center gap-1">
                          <span className={isVisible ? "text-status-success font-bold" : "text-on-surface-variant"}>{isVisible ? "Visible" : "Hidden"}</span>
                          <div
                            onClick={() => togglePlanVisibility(p.id, isVisible)}
                            className={`w-5 h-3 ${isVisible ? "bg-secondary" : "bg-surface-variant"} rounded-full relative cursor-pointer`}
                          >
                            <div className={`absolute ${isVisible ? "right-0.5" : "left-0.5"} top-0.5 w-2 h-2 bg-white rounded-full transition-all`}></div>
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
