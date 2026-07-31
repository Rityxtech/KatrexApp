"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "dashboard", href: "/" },
  { label: "Users", icon: "group", href: "/users" },
  { label: "Transactions", icon: "receipt_long", href: "/transactions" },
  { label: "Crypto", icon: "currency_bitcoin", href: "/crypto" },
  { label: "Airtime/Data", icon: "settings_cell", href: "/airtime-data" },
  { label: "Giftcard", icon: "redeem", href: "/giftcard" },
  { label: "Wallets", icon: "account_balance_wallet", href: "/wallets" },
  { label: "P2P Market", icon: "swap_horiz", href: "/p2p" },
  { label: "Support", icon: "support_agent", href: "/support" },
  { label: "KYC", icon: "fact_check", href: "/kyc" },
  { label: "Referrals", icon: "loyalty", href: "/referrals" },
  { label: "Reports", icon: "bar_chart", href: "/reports" },
  { label: "Notifications", icon: "campaign", href: "/notifications" },
  { label: "Pricing", icon: "sell", href: "/pricing" },
  { label: "API Integrations", icon: "api", href: "/api-integrations" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="group fixed left-0 top-0 h-full w-16 hover:w-64 z-40 transition-all duration-300 overflow-hidden bg-surface-container border-r border-subtle flex flex-col pt-12 pb-4">
      <div className="flex-1 overflow-y-auto no-scrollbar py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-3 transition-all duration-200 ease-in-out ${
                isActive
                  ? "bg-primary-container text-on-primary-container border-l-2 border-secondary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined shrink-0">
                {item.icon}
              </span>
              <span className="font-body-sm text-body-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
