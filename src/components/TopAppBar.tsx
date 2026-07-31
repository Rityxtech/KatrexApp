"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function TopAppBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.email?.[0]?.toUpperCase() || "A";

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-deep text-primary border-b border-subtle flex justify-between items-center px-gutter h-12">
      <div className="flex items-center gap-stack-base">
        <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high transition-colors p-2 cursor-pointer active:opacity-80">
          menu
        </button>
        <span className="font-headline-lg text-headline-lg font-bold text-secondary">
          KatrexApp Admin
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full border border-subtle">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          <span className="font-label-caps text-on-surface-variant">
            System Online
          </span>
        </div>
        {user && (
          <span className="font-data-mono text-[10px] text-on-surface-variant hidden md:inline">
            {user.email}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 hover:border-status-danger/50 transition-colors group"
          title="Sign out"
        >
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center group-hover:bg-status-danger/10 transition-colors">
            <span className="font-bold text-[12px] text-on-surface-variant group-hover:text-status-danger transition-colors">
              {initials}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
