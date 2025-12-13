
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import { useUser } from '@/firebase/auth/use-user';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ElementType } from 'react';
import { useUserRole } from '@/hooks/use-user-role';


import { SuperAdminSidebar } from '@/components/dashboard/super-admin-sidebar';
import { SharedSidebarHistory } from '@/components/dashboard/shared-sidebar-history';
import { logger } from '@/lib/logger';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { navLinks, current, role } = useDashboardConfig();
  const { user } = useUser();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const { loginRoute } = useUserRole();

  // Hide nav links on CEO dashboard (Super Admin has access via tabs)
  const isCeoDashboard = pathname?.startsWith('/dashboard/ceo');

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
      // Redirect to role-specific login page after sign out
      window.location.href = loginRoute;
    } catch (error) {
      logger.error('Sign out error', error instanceof Error ? error : new Error(String(error)));
      toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "Could not sign you out. Please try again.",
      });
    }
  };

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        {isCeoDashboard ? (
          /* CEO Dashboard: Show Super Admin Navigation */
          <SuperAdminSidebar />
        ) : (
          <>
            <SharedSidebarHistory />
            <SidebarMenu>
              {navLinks.filter(link => !link.hidden).map((link) => {
                const iconKey = (link.icon ?? 'Folder') as keyof typeof LucideIcons;
                const Icon = (LucideIcons as any)[iconKey] || LucideIcons.Folder as ElementType;

                const isComingSoon = link.badge === 'coming-soon';
                // If badge is 'locked', hide it completely for non-owners
                if (link.badge === 'locked' && role !== 'owner') {
                  return null;
                }
                const isLocked = isComingSoon && role !== 'owner';

                if (isLocked) {
                  return (
                    <SidebarMenuItem key={link.href}>
                      <div className="flex w-full items-center gap-2 p-2 px-3 text-sm text-muted-foreground/50 cursor-not-allowed">
                        <Icon className="h-4 w-4" />
                        <span>{link.label}</span>
                        <span className="ml-auto text-[10px] uppercase font-bold bg-muted-foreground/20 px-1.5 py-0.5 rounded text-muted-foreground">
                          Soon
                        </span>
                      </div>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={link.href === current?.href} tooltip={link.label}>
                      <Link href={link.href} className="flex items-center gap-2">
                        <Icon />
                        <span>{link.label}</span>
                        {link.badge === 'beta' && (
                          <span className="ml-auto text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-medium">BETA</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                </Avatar>
                <div className='overflow-hidden group-data-[collapsible=icon]:hidden'>
                  <p className="text-sm font-medium truncate">{user.displayName || 'My Account'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.assign('/account')}>Account</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="text-xs text-muted-foreground mt-2 px-2">
          Debug: Role={role || 'null'}, Links={navLinks.length}
        </div>
      </SidebarFooter>
    </Sidebar >
  );
}
