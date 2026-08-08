"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const bottomNavItems = [
  { icon: "dashboard", label: "Home", href: "/" },
  { icon: "group", label: "Users", href: "/users" },
  { icon: "receipt_long", label: "Txns", href: "/transactions" },
  { icon: "account_balance_wallet", label: "Wallet", href: "/wallets" },
  { icon: "settings", label: "Config", href: "/settings" },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full z-50 md:hidden bg-surface-container-highest text-secondary border-t border-subtle flex justify-around items-center h-16 px-4 shadow-lg">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.icon}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 scale-95 transition-transform ${
              isActive
                ? "text-secondary bg-surface-container-low rounded-xl"
                : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
