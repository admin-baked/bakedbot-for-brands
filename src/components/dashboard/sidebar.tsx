
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { usePlanInfo } from '@/hooks/use-plan-info';
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
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { LogOut, Crown, Zap, Sparkles, UserPlus, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ElementType } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { InviteUserDialog } from '@/components/invitations/invite-user-dialog';


import { SuperAdminSidebar } from '@/components/dashboard/super-admin-sidebar';
import { BrandSidebar } from '@/components/dashboard/brand-sidebar';
import { DispensarySidebar } from '@/components/dashboard/dispensary-sidebar';
import { SharedSidebarHistory } from '@/components/dashboard/shared-sidebar-history';
import { logger } from '@/lib/logger';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { UserRole, isBrandRole, isDispensaryRole, normalizeRole } from '@/types/roles';

// Loading fallback for sidebar components that use useSearchParams (required in Next.js 15+)
function SidebarLoading() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { navLinks, current, role } = useDashboardConfig();
  const { user } = useUser();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const { loginRoute, orgId } = useUserRole();
  const { planName, planId, isScale, isEnterprise, isGrowthOrHigher, isPaid } = usePlanInfo();
  const { isSuperAdmin } = useSuperAdmin();
  const normalizedRole = role ? normalizeRole(role) : null;

  // Show Super Admin Sidebar if explicitly on CEO path OR if authenticated as Super Admin (and not impersonating/shopping)
  // We exclude brand/dispensary roles to allow impersonation dashboards to render correctly.
  // We exclude /dashboard/shop to allow testing the customer flow
  const isBusinessRole = normalizedRole ? isBrandRole(normalizedRole) || isDispensaryRole(normalizedRole) : false;
  const isCeoDashboard = pathname?.startsWith('/dashboard/ceo') ||
                         (isSuperAdmin && !isBusinessRole && !pathname?.startsWith('/dashboard/shop'));

  // Show Brand Sidebar for brand users (including brand_admin, brand_member)
  const isBrandDashboard = !isCeoDashboard && (normalizedRole ? isBrandRole(normalizedRole) : false);

  // Show Dispensary Sidebar for dispensary users (including dispensary_admin, dispensary_staff)
  const isDispensaryDashboard = !isCeoDashboard && !isBrandDashboard &&
                                 (normalizedRole ? isDispensaryRole(normalizedRole) : false);

  const inviteAllowedRoles: UserRole[] = (() => {
    if (!normalizedRole) return [];

    if (normalizedRole === 'super_user') {
      return ['brand_admin', 'brand_member', 'dispensary_admin', 'dispensary_staff', 'customer'];
    }

    if (normalizedRole === 'brand_admin') {
      return ['brand_member'];
    }

    if (normalizedRole === 'dispensary_admin') {
      return ['dispensary_staff', 'budtender'];
    }

    return [];
  })();

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

  // Plan badge styling based on tier
  const getPlanBadge = () => {
    if (isEnterprise) {
      return (
        <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 gap-1">
          <Crown className="h-3 w-3" />
          Enterprise
        </Badge>
      );
    }
    if (isScale) {
      return (
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 gap-1">
          <Zap className="h-3 w-3" />
          Scale
        </Badge>
      );
    }
    if (isGrowthOrHigher) {
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 gap-1">
          <Sparkles className="h-3 w-3" />
          Growth
        </Badge>
      );
    }
    if (isPaid) {
      return (
        <Badge variant="secondary" className="gap-1">
          {planName}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        {isCeoDashboard ? (
          /* CEO Dashboard: Show Super Admin Navigation */
          /* Wrapped in Suspense because SuperAdminSidebar uses useSearchParams */
          <Suspense fallback={<SidebarLoading />}>
            <SuperAdminSidebar />
          </Suspense>
        ) : isBrandDashboard ? (
          /* Brand Dashboard: Show Brand Navigation */
          <>
            <SharedSidebarHistory />
            <BrandSidebar />
          </>
        ) : isDispensaryDashboard ? (
          /* Dispensary Dashboard: Show Dispensary Navigation */
          <>
            <SharedSidebarHistory />
            <DispensarySidebar />
          </>
        ) : (
          /* Default: Show role-filtered navigation */
          <>
            <SharedSidebarHistory />
            <SidebarMenu>
              {navLinks.filter(link => !link.hidden).map((link) => {
                // Convert kebab-case to PascalCase for Lucide icons (e.g. 'message-circle' -> 'MessageCircle')
                const iconName = (link.icon ?? 'Folder')
                  .split('-')
                  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                  .join('');
                
                const Icon = (LucideIcons as any)[iconName] || LucideIcons.Folder as ElementType;

                const isComingSoon = link.badge === 'coming-soon';
                // If badge is 'locked', hide it completely for non-owners
                if (link.badge === 'locked' && role !== 'super_user') {
                  return null;
                }
                // Unlock more features for paid tiers
                const isLocked = isComingSoon && role !== 'super_user' && !isGrowthOrHigher;

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

        
        {/* Invite Team Member Action - only show for default nav (not CEO, Brand, or Dispensary sidebars which have their own) */}
        {!isCeoDashboard && !isBrandDashboard && !isDispensaryDashboard && user && orgId && inviteAllowedRoles.length > 0 && (
            <div className="mt-auto p-4">
               <InviteUserDialog 
                    orgId={orgId || undefined}
                    allowedRoles={inviteAllowedRoles}
                    trigger={
                        <div className="w-full flex items-center justify-start gap-2 px-4 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md cursor-pointer transition-colors">
                            <UserPlus className="h-4 w-4" />
                            <span>Invite Member</span>
                        </div>
                    }
               />
            </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        {/* Plan Badge */}
        {isPaid && (
          <div className="px-2 mb-2 group-data-[collapsible=icon]:hidden">
            {getPlanBadge()}
          </div>
        )}
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
        <div className="text-xs text-muted-foreground mt-2 px-2 group-data-[collapsible=icon]:hidden">
          {role && <span className="capitalize">{role}</span>}
          {isPaid && <span className="ml-1">• {planName}</span>}
        </div>
      </SidebarFooter>
    </Sidebar >
  );
}
