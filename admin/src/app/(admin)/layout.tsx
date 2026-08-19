import TopAppBar from "@/components/TopAppBar";
import Sidebar from "@/components/Sidebar";
import BottomNavBar from "@/components/BottomNavBar";
import AuthGuard from "@/components/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TopAppBar />
      <Sidebar />
      <main className="ml-16 min-h-screen flex flex-col bg-surface-deep pt-16 md:pt-[70px] px-2.5 md:px-3.5 lg:px-4 pb-4 md:pb-6">
        {children}
      </main>
      <BottomNavBar />
    </AuthGuard>
  );
}
