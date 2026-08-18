"use client";
// v2 — typed props interface

function formatDate(date: any) {
  if (!date) return "\u2014";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

interface Props {
  users: any[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onViewUser: (user: any) => void;
  onMessageUser: (user: any) => void;
  onSuspendUser: (uid: string) => void;
  menuUserId: string | null;
  onToggleMenu: (id: string) => void;
}

export default function UserTable({
  users,
  loading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onViewUser,
  onMessageUser,
  onSuspendUser,
  menuUserId,
  onToggleMenu,
}: Props) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  return (
    <div className="flex-1 overflow-x-auto bg-surface-deep">
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_80px] px-container-padding py-2 bg-surface-container-low border-b border-subtle items-center">
          <div className="flex items-center justify-center">
            <input
              className="w-3.5 h-3.5 rounded border-outline-variant bg-surface-container-highest text-secondary focus:ring-0 cursor-pointer"
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
            />
          </div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">User Identity</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Status</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">KYC Tier</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Wallet Balance</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Joined Date</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right pr-2">Actions</div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="divide-y divide-subtle">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-container-high/50 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-body-sm">No users match your filters</div>
        ) : (
          <div className="divide-y divide-subtle">
            {users.map((user: any) => {
              const status = user.kycStatus || (user.verified ? "verified" : "pending");
              const badgeClass =
                status === "verified" || status === "completed"
                  ? "bg-status-success/10 text-status-success border-status-success/20"
                  : status === "pending"
                  ? "bg-status-warning/10 text-status-warning border-status-warning/20"
                  : status === "suspended" || status === "rejected"
                  ? "bg-status-danger/10 text-status-danger border-status-danger/20"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant";
              const dotClass =
                status === "verified" || status === "completed"
                  ? "bg-status-success"
                  : status === "pending"
                  ? "bg-status-warning"
                  : "bg-status-danger";
              const tier = user.kycTier ? `Tier ${user.kycTier}` : "Tier 1";
              const balance = user.nairaBalance || 0;
              const isSelected = selectedIds.has(user.id);

              return (
                <div
                  key={user.id}
                  className={`grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_80px] px-container-padding py-2 hover:bg-surface-container-high transition-colors items-center ${isSelected ? "bg-secondary/5" : ""}`}
                >
                  <div className="flex items-center justify-center">
                    <input
                      className="w-3.5 h-3.5 rounded border-outline-variant bg-surface-container-highest text-secondary focus:ring-0 cursor-pointer"
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(user.id)}
                    />
                  </div>
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onViewUser(user)}
                  >
                    <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center text-secondary border border-outline-variant text-[12px] font-bold">
                      {getInitials(user.fullName || user.displayName || user.name || user.email || "")}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-md text-on-surface font-semibold truncate">
                        {user.fullName || user.displayName || user.name || "Unknown"}
                      </span>
                      <span className="font-body-sm text-on-surface-variant text-[11px] truncate">
                        {user.email || ""} &bull; ID: {user.id?.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeClass}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${dotClass}`}></span> {status}
                    </span>
                  </div>
                  <div>
                    <span className="font-data-mono text-data-mono text-tertiary">{tier}</span>
                  </div>
                  <div className="font-data-mono text-data-mono text-on-surface">
                    {"\u20a6"}{balance.toLocaleString()}{" "}
                    <span className="text-[10px] text-on-surface-variant">NGN</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">
                    {formatDate(user.createdAt)}
                  </div>
                  <div className="flex justify-end gap-1 relative">
                    <button
                      onClick={() => onViewUser(user)}
                      className="p-1 hover:bg-surface-container-highest rounded transition-colors material-symbols-outlined text-outline"
                      title="View / Edit user"
                    >
                      visibility
                    </button>
                    <button
                      onClick={() => onToggleMenu(user.id)}
                      className="p-1 hover:bg-surface-container-highest rounded transition-colors material-symbols-outlined text-outline"
                      title="More actions"
                    >
                      more_vert
                    </button>

                    {/* Dropdown menu */}
                    {menuUserId === user.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => onToggleMenu(user.id)} />
                        <div className="absolute right-0 top-8 z-40 w-44 bg-surface-bright border border-subtle rounded-lg shadow-xl py-1">
                          <button
                            onClick={() => { onViewUser(user); onToggleMenu(user.id); }}
                            className="w-full px-3 py-2 text-left text-body-sm hover:bg-surface-container-high transition-colors flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Edit User
                          </button>
                          <button
                            onClick={() => { onMessageUser(user); onToggleMenu(user.id); }}
                            className="w-full px-3 py-2 text-left text-body-sm hover:bg-surface-container-high transition-colors flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]">mail</span>
                            Send Email
                          </button>
                          <button
                            onClick={() => { onSuspendUser(user.id); }}
                            className="w-full px-3 py-2 text-left text-body-sm hover:bg-surface-container-high transition-colors flex items-center gap-2 text-status-danger"
                          >
                            <span className="material-symbols-outlined text-[16px]">block</span>
                            Suspend User
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
