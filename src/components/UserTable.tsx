import { userRows } from "@/data/users";

export default function UserTable() {
  return (
    <div className="flex-1 overflow-x-auto bg-surface-deep">
      <div className="min-w-[900px]">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_80px] px-container-padding py-2 bg-surface-container-low border-b border-subtle items-center">
          <div className="flex items-center justify-center">
            <input className="w-3.5 h-3.5 rounded border-outline-variant bg-surface-container-highest text-secondary focus:ring-0" type="checkbox" />
          </div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">User Identity</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Status</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">KYC Tier</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Wallet Balance</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Joined Date</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right pr-2">Actions</div>
        </div>
        {/* Table Rows */}
        <div className="divide-y divide-subtle">
          {userRows.map((user) => (
            <div key={user.id} className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_80px] px-container-padding py-2 hover:bg-surface-container-high transition-colors items-center">
              <div className="flex items-center justify-center">
                <input className="w-3.5 h-3.5 rounded border-outline-variant bg-surface-container-highest text-secondary focus:ring-0" type="checkbox" />
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center ${user.avatarColor} border ${user.borderClass || "border-outline-variant"} text-[12px] font-bold`}>
                  {user.initials}
                </div>
                <div className="flex flex-col">
                  <span className="font-body-md text-on-surface font-semibold truncate">{user.name}</span>
                  <span className="font-body-sm text-on-surface-variant text-[11px]">{user.email} &bull; ID: {user.id}</span>
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${user.badgeClass}`}>
                  <span className={`w-1 h-1 rounded-full ${user.dotClass}`}></span> {user.status}
                </span>
              </div>
              <div>
                <span className="font-data-mono text-data-mono text-tertiary">{user.tier}</span>
              </div>
              <div className="font-data-mono text-data-mono text-on-surface">
                {user.balance} <span className="text-[10px] text-on-surface-variant">USD</span>
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                {user.joined}
              </div>
              <div className="flex justify-end gap-1">
                <button className="p-1 hover:bg-surface-container-highest rounded transition-colors material-symbols-outlined text-outline">visibility</button>
                <button className="p-1 hover:bg-surface-container-highest rounded transition-colors material-symbols-outlined text-outline">more_vert</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
