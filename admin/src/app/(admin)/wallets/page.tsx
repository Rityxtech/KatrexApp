"use client";

import WalletOverview from "@/components/WalletOverview";
import WalletDetails from "@/components/WalletDetails";

export default function WalletsPage() {
  return (
    <div className="w-full flex flex-col gap-3.5">
      <WalletOverview />
      <WalletDetails />
    </div>
  );
}
