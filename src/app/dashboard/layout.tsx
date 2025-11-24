import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireUser(); // Secure the entire dashboard
  } catch (error) {
    redirect('/brand-login'); // If bypass is off and no user, redirect
  }
  
  return (
    <SidebarProvider>
        <div className="flex flex-1">
          <DashboardSidebar />
          <SidebarInset>
              <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                  <SidebarTrigger />
              </header>
              <main className="flex flex-1 flex-col p-4 sm:p-6">
                <DashboardHeader />
                {children}
              </main>
          </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
