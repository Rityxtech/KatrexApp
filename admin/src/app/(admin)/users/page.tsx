"use client";

import { useState, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useUsers, useWallets } from "@/hooks/useAdminData";
import UserTable from "@/components/UserTable";
import TableFooter from "@/components/TableFooter";
import UserEditDrawer from "@/components/UserEditDrawer";
import MessageUserDrawer from "@/components/MessageUserDrawer";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const { data: users, loading } = useUsers(1000);
  const { data: wallets } = useWallets();

  // Build wallet lookup map: uid → wallet data
  const walletMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const w of wallets) {
      if (w.uid) map.set(w.uid, w);
    }
    return map;
  }, [wallets]);

  // ─── Filter state ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ─── Selection & pagination ────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // ─── Drawers & modals ──────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<any>(null);
  const [messagingUser, setMessagingUser] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", displayName: "", password: "" });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  // ─── Action menu ───────────────────────────────────────────────
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ─── Filtered users (enriched with wallet balance) ────────────
  const filtered = useMemo(() => {
    let list = users.map((u: any) => {
      const wallet = walletMap.get(u.id);
      return { ...u, nairaBalance: wallet?.nairaBalance || 0 };
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u: any) =>
          (u.displayName || u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.id || "").toLowerCase().includes(q)
      );
    }
    if (kycFilter !== "all") {
      const tier = parseInt(kycFilter.replace("tier", "").trim());
      list = list.filter((u: any) => (u.kycTier ?? 1) === tier);
    }
    if (statusFilter !== "all") {
      list = list.filter((u: any) => {
        const s = u.kycStatus || (u.verified ? "verified" : "pending");
        if (statusFilter === "verified") return s === "verified" || s === "completed";
        if (statusFilter === "pending") return s === "pending";
        if (statusFilter === "suspended") return s === "suspended" || u.isActive === false;
        return true;
      });
    }
    return list;
  }, [users, walletMap, search, kycFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // ─── Wallet lookup (for edit drawer) ───────────────────────────
  const getWalletForUser = (user: any) => {
    // UserEditDrawer expects a wallet object; we pass user's own wallet fields
    return user;
  };

  // ─── Selection helpers ─────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (paged.every((u: any) => selectedIds.has(u.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map((u: any) => u.id)));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setKycFilter("all");
    setStatusFilter("all");
    setPage(0);
  };

  // ─── CSV Export ────────────────────────────────────────────────
  const exportCsv = () => {
    const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const header = ["Name", "Email", "UID", "Status", "KYC Tier", "Balance (NGN)", "Joined"].map(escape).join(",");
    const rows = filtered.map((u: any) =>
      [
        u.displayName || u.name || "",
        u.email || "",
        u.id || "",
        u.kycStatus || (u.verified ? "verified" : "pending"),
        `Tier ${u.kycTier ?? 1}`,
        u.nairaBalance || 0,
        u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : u.createdAt || "",
      ].map(escape).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katrex-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF Export ────────────────────────────────────────────────
  const exportPdf = async () => {
    // Dynamic import to avoid SSR issues
    const { default: jsPDF } = await import("jspdf" as any);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Katrex Users", 14, 16);
    doc.setFontSize(8);
    doc.text(`Exported ${new Date().toLocaleString()} — ${filtered.length} users`, 14, 22);

    const headers = ["Name", "Email", "Status", "Tier", "Balance"];
    const data = filtered.slice(0, 200).map((u: any) => [
      (u.displayName || u.name || "Unknown").slice(0, 25),
      (u.email || "").slice(0, 30),
      u.kycStatus || (u.verified ? "verified" : "pending"),
      `Tier ${u.kycTier ?? 1}`,
      `\u20a6${(u.nairaBalance || 0).toLocaleString()}`,
    ]);

    let y = 30;
    // Header row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    headers.forEach((h, i) => doc.text(h, 14 + i * 38, y));
    y += 5;
    doc.setFont("helvetica", "normal");
    data.forEach((row) => {
      if (y > 280) {
        doc.addPage();
        y = 14;
      }
      row.forEach((cell, i) => doc.text(String(cell), 14 + i * 38, y));
      y += 4.5;
    });

    doc.save(`katrex-users-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ─── Add User ──────────────────────────────────────────────────
  const handleAddUser = async () => {
    if (!addForm.email.trim() || !addForm.displayName.trim() || !addForm.password) {
      setAddMsg("All fields are required.");
      return;
    }
    setAdding(true);
    setAddMsg(null);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "createUser",
        email: addForm.email.trim(),
        displayName: addForm.displayName.trim(),
        password: addForm.password,
      });
      setAddMsg("User created successfully!");
      setAddForm({ email: "", displayName: "", password: "" });
      setTimeout(() => {
        setShowAddModal(false);
        setAddMsg(null);
      }, 1500);
    } catch (e: any) {
      setAddMsg(e?.message || "Failed to create user.");
    } finally {
      setAdding(false);
    }
  };

  // ─── Bulk Actions ──────────────────────────────────────────────
  const handleBulkBlock = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Suspend ${selectedIds.size} selected user(s)?`)) return;
    setBulkActionLoading(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      for (const uid of selectedIds) {
        await adminApi({ action: "suspendUser", targetUid: uid }).catch(() => {});
      }
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Bulk block failed:", e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`DELETE ${selectedIds.size} user(s)? This cannot be undone.`)) return;
    setBulkActionLoading(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      for (const uid of selectedIds) {
        await adminApi({ action: "deleteUser", targetUid: uid }).catch(() => {});
      }
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Bulk delete failed:", e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ─── Row-level actions ─────────────────────────────────────────
  const handleSuspendUser = async (uid: string) => {
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({ action: "suspendUser", targetUid: uid });
    } catch (e) {
      console.error("Suspend failed:", e);
    }
    setMenuUserId(null);
  };

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="p-container-padding flex flex-col md:flex-row md:items-center justify-between gap-stack-base bg-surface-dim border-b border-subtle">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">User Management</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            Manage total {loading ? "..." : filtered.length.toLocaleString()} platform users
            {!loading && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>}
          </p>
        </div>
        <div className="flex items-center gap-stack-base overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-body-sm font-medium"
          >
            <span className="material-symbols-outlined">upload</span> CSV
          </button>
          <button
            onClick={exportPdf}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-body-sm font-medium"
          >
            <span className="material-symbols-outlined">picture_as_pdf</span> PDF
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-4 py-1.5 bg-secondary text-on-secondary-container rounded-lg hover:opacity-90 transition-all text-body-sm font-bold ml-2"
          >
            <span className="material-symbols-outlined">person_add</span> Add User
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="p-container-padding grid grid-cols-1 md:grid-cols-12 gap-unit bg-surface border-b border-subtle items-center">
        <div className="md:col-span-5 relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
          <input
            className="w-full h-8 pl-9 pr-4 bg-surface-container-low border border-subtle rounded-md text-body-sm focus:border-secondary focus:ring-0 text-on-surface placeholder:text-outline-variant"
            placeholder="Search name, email, or UID..."
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="md:col-span-2">
          <select
            className="w-full h-8 bg-surface-container-low border border-subtle rounded-md text-body-sm px-2 focus:border-secondary focus:ring-0 text-on-surface"
            value={kycFilter}
            onChange={(e) => { setKycFilter(e.target.value); setPage(0); }}
          >
            <option value="all">KYC Tier: All</option>
            <option value="tier0">Tier 0</option>
            <option value="tier1">Tier 1</option>
            <option value="tier2">Tier 2</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            className="w-full h-8 bg-surface-container-low border border-subtle rounded-md text-body-sm px-2 focus:border-secondary focus:ring-0 text-on-surface"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="all">Status: All</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="md:col-span-3 flex justify-end gap-stack-tight">
          <button
            onClick={clearFilters}
            className="h-8 px-3 text-secondary hover:bg-secondary/10 transition-colors rounded-md text-body-sm font-bold"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <UserTable
        users={paged}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={toggleSelectAll}
        onViewUser={(u) => setEditingUser(u)}
        onMessageUser={(u) => setMessagingUser(u)}
        onSuspendUser={handleSuspendUser}
        menuUserId={menuUserId}
        onToggleMenu={(id) => setMenuUserId(menuUserId === id ? null : id)}
      />

      {/* ── Footer ──────────────────────────────────────────────── */}
      <TableFooter
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        currentPage={safePage}
        onPageChange={setPage}
        selectedCount={selectedIds.size}
        onBulkBlock={handleBulkBlock}
        onBulkDelete={handleBulkDelete}
        bulkLoading={bulkActionLoading}
      />

      {/* ── Floating Add User ───────────────────────────────────── */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed right-6 bottom-20 md:bottom-8 w-12 h-12 bg-secondary text-on-secondary-container rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined">person_add</span>
      </button>

      {/* ── Edit Drawer ─────────────────────────────────────────── */}
      {editingUser && (
        <UserEditDrawer
          user={editingUser}
          wallet={getWalletForUser(editingUser)}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* ── Message Drawer ──────────────────────────────────────── */}
      {messagingUser && (
        <MessageUserDrawer
          user={messagingUser}
          onClose={() => setMessagingUser(null)}
        />
      )}

      {/* ── Add User Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !adding && setShowAddModal(false)}>
          <div className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary">Create New User</h3>
              <button onClick={() => !adding && setShowAddModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Display Name</label>
                <input
                  className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  type="text"
                  placeholder="John Doe"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Email</label>
                <input
                  className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  type="email"
                  placeholder="user@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">Password (min 6 chars)</label>
                <input
                  className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary outline-none"
                  type="password"
                  placeholder="••••••••"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                />
              </div>
            </div>
            {addMsg && (
              <div className={`text-body-sm font-medium px-3 py-2 rounded ${addMsg.includes("success") ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger"}`}>
                {addMsg}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={adding}
                className="flex-1 py-2 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={adding}
                className="flex-1 py-2 bg-secondary text-on-secondary-container rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {adding ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
