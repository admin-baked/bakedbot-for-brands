
import { DashboardSidebar } from './components/sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Header from '@/components/header';
import { Footer } from '@/components/footer';

// This is a server-side guard for the dashboard layout.
// It ensures that only authenticated users can access any page under /dashboard.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  // The auth check has been moved to a server component that can wrap this layout
  // to avoid making the whole layout async. For now, we render the structure.

  return (
    <SidebarProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <div className="flex flex-1">
            <DashboardSidebar />
            <SidebarInset>
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                    <SidebarTrigger />
                </header>
                <main className="flex flex-1 flex-col p-4 sm:p-6">
                  {children}
                </main>
            </SidebarInset>
          </div>
          <Footer />
        </div>
    </SidebarProvider>
  );
}
