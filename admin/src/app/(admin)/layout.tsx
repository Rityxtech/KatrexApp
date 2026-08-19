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
      <main className="ml-16 pt-12 min-h-[calc(100vh-48px)] flex flex-col bg-surface-deep p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <BottomNavBar />
    </AuthGuard>
  );
}
