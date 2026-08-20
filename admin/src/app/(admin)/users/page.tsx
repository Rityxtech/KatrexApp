"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useUsers, useWallets } from "@/hooks/useAdminData";
import UserTable from "@/components/UserTable";
import TableFooter from "@/components/TableFooter";
import UserEditDrawer from "@/components/UserEditDrawer";
import MessageUserDrawer from "@/components/MessageUserDrawer";
import ConfirmModal from "@/components/ConfirmModal";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const { data: rawUsers, loading: usersLoading } = useUsers(1000);
  const { data: wallets } = useWallets();

  // Toast / notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

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

  // ─── Confirm modal state ───────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    requireReason?: boolean;
    reasonPlaceholder?: string;
    loading?: boolean;
    onConfirm: (reason?: string) => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // ─── Action menu ───────────────────────────────────────────────
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ─── Filtered users (enriched with wallet balance) ────────────
  const filtered = useMemo(() => {
    let list = rawUsers.map((u: any) => {
      const wallet = walletMap.get(u.id);
      return { ...u, nairaBalance: wallet?.nairaBalance || 0 };
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u: any) =>
          (u.fullName || u.displayName || u.name || "").toLowerCase().includes(q) ||
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
        const kycTierNum = u.kycTier ?? 0;
        const isDeleted = Boolean(u.deletedAt);
        const isActive = u.isActive ?? true;

        if (statusFilter === "deleted") return isDeleted;
        if (statusFilter === "suspended") return !isActive && !isDeleted;
        if (statusFilter === "verified") return isActive && !isDeleted && kycTierNum >= 1;
        if (statusFilter === "pending") return isActive && !isDeleted && kycTierNum < 1;
        return true;
      });
    }
    return list;
  }, [rawUsers, walletMap, search, kycFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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

  // ─── Shared helpers ─────────────────────────────────────────────
  const getStatus = (u: any) => {
    if (u.deletedAt) return "deleted";
    if (u.isActive === false) return "suspended";
    return (u.kycTier ?? 0) >= 1 ? "verified" : "pending";
  };

  // ─── Server CSV Export ──────────────────────────────────────────
  const exportCsv = async () => {
    try {
      showToast("Generating production CSV export...");
      const adminApi = httpsCallable(functions, "adminApi");
      const res: any = await adminApi({
        action: "exportUsersCsv",
        filters: { kycTier: kycFilter, status: statusFilter, search },
      });
      const csvContent = res.data?.result?.csv || res.data?.csv || res?.result?.csv;
      if (!csvContent) {
        throw new Error("No CSV data returned from server");
      }
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `katrex-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV export completed");
    } catch (e: any) {
      showToast(e?.message || "CSV export failed", "error");
    }
  };

  // ─── PDF Export ────────────────────────────────────────────────
  const exportPdf = async () => {
    try {
      showToast("Generating PDF report...");
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Katrex Users Report", 14, 16);
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toLocaleString()} — ${filtered.length} users`, 14, 22);

      const headers = ["Name", "Email", "Status", "Tier", "Balance"];
      const data = filtered.slice(0, 200).map((u: any) => [
        (u.fullName || u.displayName || u.name || "Unknown").slice(0, 25),
        (u.email || "").slice(0, 30),
        getStatus(u),
        `Tier ${u.kycTier ?? 0}`,
        `\u20a6${(u.nairaBalance || 0).toLocaleString()}`,
      ]);

      let y = 30;
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
      showToast("PDF report exported");
    } catch (e: any) {
      showToast(e?.message || "PDF export failed", "error");
    }
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
      showToast("New user account created");
      setTimeout(() => {
        setShowAddModal(false);
        setAddMsg(null);
      }, 1200);
    } catch (e: any) {
      setAddMsg(e?.message || "Failed to create user.");
    } finally {
      setAdding(false);
    }
  };

  // ─── Bulk Block / Suspend ──────────────────────────────────────
  const handleBulkBlock = () => {
    if (selectedIds.size === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: "Bulk Suspend Users",
      message: `Are you sure you want to suspend ${selectedIds.size} selected user account(s)? Suspended users will not be able to log in or transact.`,
      confirmText: "Suspend Users",
      isDanger: true,
      requireReason: true,
      reasonPlaceholder: "Enter compliance reason for bulk suspension...",
      onConfirm: async (reason) => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          const adminApi = httpsCallable(functions, "adminApi");
          await adminApi({
            action: "bulkSuspendUsers",
            targetUids: Array.from(selectedIds),
            reason,
          });
          setSelectedIds(new Set());
          showToast(`Successfully suspended ${selectedIds.size} users`);
        } catch (e: any) {
          showToast(e?.message || "Bulk suspension failed", "error");
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  // ─── Bulk Delete (Soft Delete) ─────────────────────────────────
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: "Bulk Delete Users",
      message: `Are you sure you want to soft-delete ${selectedIds.size} user account(s)? Accounts can be restored later by an admin.`,
      confirmText: "Soft Delete Users",
      isDanger: true,
      requireReason: true,
      reasonPlaceholder: "Enter audit reason for bulk soft-deletion...",
      onConfirm: async (reason) => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          const adminApi = httpsCallable(functions, "adminApi");
          await adminApi({
            action: "bulkDeleteUsers",
            targetUids: Array.from(selectedIds),
            reason,
          });
          setSelectedIds(new Set());
          showToast(`Successfully soft-deleted ${selectedIds.size} users`);
        } catch (e: any) {
          showToast(e?.message || "Bulk deletion failed", "error");
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  // ─── Row Action: Suspend / Unsuspend ───────────────────────────
  const handleToggleSuspendUser = (uid: string, currentActive: boolean) => {
    const actionName = currentActive ? "Suspend" : "Unsuspend";
    setConfirmConfig({
      isOpen: true,
      title: `${actionName} User Account`,
      message: `Are you sure you want to ${actionName.toLowerCase()} user ${uid}?`,
      confirmText: actionName,
      isDanger: currentActive,
      requireReason: true,
      reasonPlaceholder: `Enter reason to ${actionName.toLowerCase()} user...`,
      onConfirm: async (reason) => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          const adminApi = httpsCallable(functions, "adminApi");
          if (currentActive) {
            await adminApi({ action: "suspendUser", targetUid: uid, reason });
            showToast("User account suspended");
          } else {
            await adminApi({ action: "bulkUnsuspendUsers", targetUids: [uid], reason });
            showToast("User account unsuspended");
          }
        } catch (e: any) {
          showToast(e?.message || `Failed to ${actionName.toLowerCase()} user`, "error");
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  // ─── Row Action: Soft Delete ───────────────────────────────────
  const handleDeleteUser = (uid: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Soft Delete User Account",
      message: `Are you sure you want to soft-delete user ${uid}? The user will be hidden from standard operations but can be restored by a superadmin.`,
      confirmText: "Soft Delete",
      isDanger: true,
      requireReason: true,
      reasonPlaceholder: "Enter audit reason for user deletion...",
      onConfirm: async (reason) => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          const adminApi = httpsCallable(functions, "adminApi");
          await adminApi({ action: "deleteUser", targetUid: uid, reason });
          showToast("User account soft-deleted");
        } catch (e: any) {
          showToast(e?.message || "Failed to delete user", "error");
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  // ─── Row Action: Restore User ─────────────────────────────────
  const handleRestoreUser = (uid: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Restore Soft-Deleted User",
      message: `Are you sure you want to restore user ${uid}? This will reactivate the user document.`,
      confirmText: "Restore Account",
      isDanger: false,
      requireReason: true,
      reasonPlaceholder: "Enter audit reason for restoring user...",
      onConfirm: async (reason) => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          const adminApi = httpsCallable(functions, "adminApi");
          await adminApi({ action: "restoreUser", targetUid: uid, reason });
          showToast("User account restored successfully");
        } catch (e: any) {
          showToast(e?.message || "Failed to restore user", "error");
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  return (
    <div className="w-full flex flex-col gap-3.5 relative">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg text-white font-medium text-xs flex items-center gap-2 shadow-2xl transition-all animate-bounce ${
            toast.type === "error" ? "bg-status-danger" : "bg-status-success"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          {toast.message}
        </div>
      )}

      {/* ── Main User Workspace Card ── */}
      <div className="w-full bg-surface-bright rounded-xl border border-subtle overflow-hidden shadow-sm flex flex-col">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-dim border-b border-subtle">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">User Management</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
              Manage total {usersLoading ? "..." : filtered.length.toLocaleString()} platform users
              {!usersLoading && <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>}
            </p>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-xs font-medium"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span> CSV
            </button>
            <button
              onClick={exportPdf}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-xs font-medium"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> PDF
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-secondary text-on-secondary-container rounded-lg hover:opacity-90 transition-all text-xs font-bold shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span> Add User
            </button>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="p-2.5 md:p-3 grid grid-cols-1 md:grid-cols-12 gap-2 bg-surface-container-low border-b border-subtle items-center">
          <div className="md:col-span-5 relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              className="w-full h-8 pl-9 pr-3 bg-surface-deep border border-subtle rounded-lg text-xs focus:border-secondary focus:ring-0 text-on-surface placeholder:text-outline-variant outline-none"
              placeholder="Search name, email, or UID..."
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <div className="md:col-span-2">
            <select
              className="w-full h-8 bg-surface-deep border border-subtle rounded-lg text-xs px-2.5 focus:border-secondary focus:ring-0 text-on-surface outline-none cursor-pointer"
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
              className="w-full h-8 bg-surface-deep border border-subtle rounded-lg text-xs px-2.5 focus:border-secondary focus:ring-0 text-on-surface outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <option value="all">Status: All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            <button
              onClick={clearFilters}
              className="h-8 px-3 text-secondary hover:bg-secondary/10 transition-colors rounded-lg text-xs font-bold border border-secondary/20"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────── */}
        <UserTable
          users={paged}
          loading={usersLoading}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          onViewUser={(u) => setEditingUser(u)}
          onMessageUser={(u) => setMessagingUser(u)}
          onSuspendUser={handleToggleSuspendUser}
          onDeleteUser={handleDeleteUser}
          onRestoreUser={handleRestoreUser}
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
      </div>

      {/* ── Floating Add User Button ────────────────────────────── */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed right-8 bottom-8 w-14 h-14 bg-secondary text-on-secondary-container rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
      >
        <span className="material-symbols-outlined text-[24px]">person_add</span>
      </button>

      {/* ── Edit Drawer ─────────────────────────────────────────── */}
      {editingUser && (
        <UserEditDrawer
          user={editingUser}
          wallet={editingUser}
          onClose={() => setEditingUser(null)}
          onRefresh={() => showToast("User profile refreshed")}
        />
      )}

      {/* ── Message Drawer ──────────────────────────────────────── */}
      {messagingUser && (
        <MessageUserDrawer
          user={messagingUser}
          onClose={() => setMessagingUser(null)}
        />
      )}

      {/* ── Confirm Modal ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDanger={confirmConfig.isDanger}
        requireReason={confirmConfig.requireReason}
        reasonPlaceholder={confirmConfig.reasonPlaceholder}
        loading={confirmConfig.loading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ── Add User Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !adding && setShowAddModal(false)}>
          <div className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Create New User</h3>
              <button onClick={() => !adding && setShowAddModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {addMsg && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${addMsg.includes("successfully") ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger"}`}>
                {addMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Display / Full Name</label>
                <input
                  type="text"
                  className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary focus:ring-0 outline-none"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary focus:ring-0 outline-none"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="e.g. user@example.com"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Initial Password</label>
                <input
                  type="password"
                  className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary focus:ring-0 outline-none"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-subtle">
              <button
                type="button"
                disabled={adding}
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adding}
                onClick={handleAddUser}
                className="px-4 py-2 text-xs font-bold bg-secondary text-on-secondary-container rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                {adding && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
