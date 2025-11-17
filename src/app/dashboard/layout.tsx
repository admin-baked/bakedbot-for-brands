
import { redirect } from 'next/navigation';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { DashboardSidebar } from './components/sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

// This is a server-side guard for the dashboard layout.
// It ensures that only authenticated users can access any page under /dashboard.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;

  try {
    if (sessionCookie) {
      // verifySessionCookie() will throw if the cookie is invalid.
      await auth.verifySessionCookie(sessionCookie, true);
    } else {
      // If no cookie, redirect to login.
      redirect('/brand-login');
    }
  } catch (error) {
    // If cookie verification fails, redirect to login.
    console.warn("Dashboard auth check failed:", error);
    redirect('/brand-login');
  }

  // If we reach here, the user is authenticated.
  return (
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
  );
}
