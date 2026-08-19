"use client";

import WalletOverview from "@/components/WalletOverview";
import WalletDetails from "@/components/WalletDetails";

export default function WalletsPage() {
  return (
    <div className="px-4 w-full">
      <WalletOverview />
      <WalletDetails />
    </div>
  );
}
