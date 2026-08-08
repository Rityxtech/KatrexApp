"use client";

import { useUsers } from "@/hooks/useAdminData";
import UserTable from "@/components/UserTable";
import TableFooter from "@/components/TableFooter";

export default function UsersPage() {
  const { data: users, loading } = useUsers(1000);

  return (
    <>
      <div className="p-container-padding flex flex-col md:flex-row md:items-center justify-between gap-stack-base bg-surface-dim border-b border-subtle">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">User Management</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            Manage total {loading ? "..." : users.length.toLocaleString()} platform users
            {!loading && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" /> LIVE</span>}
          </p>
        </div>
        <div className="flex items-center gap-stack-base overflow-x-auto pb-1 md:pb-0">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-body-sm font-medium">
            <span className="material-symbols-outlined">upload</span> CSV
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant border border-subtle rounded-lg hover:bg-surface-container-high transition-colors text-body-sm font-medium">
            <span className="material-symbols-outlined">picture_as_pdf</span> PDF
          </button>
          <button className="flex items-center gap-1 px-4 py-1.5 bg-secondary text-on-secondary-container rounded-lg hover:opacity-90 transition-all text-body-sm font-bold ml-2">
            <span className="material-symbols-outlined">person_add</span> Add User
          </button>
        </div>
      </div>
      <div className="p-container-padding grid grid-cols-1 md:grid-cols-12 gap-unit bg-surface border-b border-subtle items-center">
        <div className="md:col-span-5 relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
          <input className="w-full h-8 pl-9 pr-4 bg-surface-container-low border border-subtle rounded-md text-body-sm focus:border-secondary focus:ring-0 text-on-surface placeholder:text-outline-variant" placeholder="Search name, email, or UID..." type="text" />
        </div>
        <div className="md:col-span-2">
          <select className="w-full h-8 bg-surface-container-low border border-subtle rounded-md text-body-sm px-2 focus:border-secondary focus:ring-0 text-on-surface">
            <option>KYC Tier: All</option>
            <option>Tier 1</option>
            <option>Tier 2</option>
            <option>Tier 3</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <select className="w-full h-8 bg-surface-container-low border border-subtle rounded-md text-body-sm px-2 focus:border-secondary focus:ring-0 text-on-surface">
            <option>Status: All</option>
            <option>Verified</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
        </div>
        <div className="md:col-span-3 flex justify-end gap-stack-tight">
          <button className="h-8 px-3 flex items-center gap-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-md text-body-sm">
            <span className="material-symbols-outlined">tune</span> More Filters
          </button>
          <button className="h-8 px-3 text-secondary hover:bg-secondary/10 transition-colors rounded-md text-body-sm font-bold">Clear</button>
        </div>
      </div>
      <UserTable />
      <TableFooter />
      <button className="fixed right-6 bottom-20 md:bottom-8 w-12 h-12 bg-secondary text-on-secondary-container rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined">person_add</span>
      </button>
    </>
  );
}
