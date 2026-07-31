import TopAppBar from "@/components/TopAppBar";
import Sidebar from "@/components/Sidebar";
import BottomNavBar from "@/components/BottomNavBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopAppBar />
      <Sidebar />
      <main className="ml-16 md:pt-12 pb-16 md:pb-0 min-h-screen flex flex-col">
        {children}
      </main>
      <BottomNavBar />
    </>
  );
}
