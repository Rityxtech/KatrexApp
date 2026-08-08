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
      <main className="ml-16 md:pt-12 pb-16 md:pb-0 min-h-screen flex flex-col">
        {children}
      </main>
      <BottomNavBar />
    </AuthGuard>
  );
}
