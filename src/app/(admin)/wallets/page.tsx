import WalletOverview from "@/components/WalletOverview";
import WalletDetails from "@/components/WalletDetails";

export default function WalletsPage() {
  return (
    <div className="px-4 max-w-[1600px] mx-auto w-full min-h-screen">
      <WalletOverview />
      <WalletDetails />
    </div>
  );
}
