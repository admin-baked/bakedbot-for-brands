
'use client';

import Link from 'next/link';
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


export function DashboardSidebar() {
  const { navLinks, current } = useDashboardConfig();
  const { user } = useUser();
  const { auth } = useFirebase();
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
      // Redirect to login page after sign out
      window.location.href = '/brand-login';
    } catch (error) {
      console.error('Sign out error', error);
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
        <SidebarMenu>
          {navLinks.filter(link => !link.hidden).map((link) => {
            const iconKey = (link.icon ?? 'Folder') as keyof typeof LucideIcons;
            const Icon = (LucideIcons as any)[iconKey] || LucideIcons.Folder as ElementType;
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton asChild isActive={link.href === current?.href} tooltip={link.label}>
                  <Link href={link.href}>
                    <Icon />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
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
      </SidebarFooter>
    </Sidebar>
  );
}
