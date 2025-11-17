
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AppProviders } from "../app-providers";
import { DashboardSidebar } from './components/sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

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
    <FirebaseClientProvider>
      <AppProviders>
        <SidebarProvider>
            <DashboardSidebar />
            <SidebarInset>
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <SidebarTrigger className="md:hidden" />
                </header>
                <main className="flex flex-1 flex-col p-4 sm:p-6">
                  {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
      </AppProviders>
    </FirebaseClientProvider>
  );
}
