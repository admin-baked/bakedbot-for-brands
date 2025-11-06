'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LogOut, Star, Pencil, Trash2, Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Chatbot from '@/components/chatbot';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useStore, type NavLink } from '@/hooks/use-store';
import { cn } from '@/lib/utils';
import EditLinkDialog from './components/edit-link-dialog';
import DeleteLinkDialog from './components/delete-link-dialog';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { isCeoMode, navLinks } = useStore();

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedLink, setSelectedLink] = React.useState<NavLink | null>(null);

  React.useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/brand-login');
    }
  }, [isUserLoading, user, router]);

  const handleSignOut = async () => {
    try {
      if(auth) {
        await signOut(auth);
      }
      router.push('/brand-login');
    } catch (error) {
      console.error('Sign out error', error);
    }
  };

  const handleEditClick = (link: NavLink) => {
    setSelectedLink(link);
    setIsEditOpen(true);
  };
  
  const handleDeleteClick = (link: NavLink) => {
    setSelectedLink(link);
    setIsDeleteOpen(true);
  };
  
  const handleAddClick = () => {
    setSelectedLink(null); // No link is selected for adding a new one
    setIsAddOpen(true);
  };

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  if (isUserLoading || !user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
  }

  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar>
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {navLinks.map((item) => {
                   const Icon = (LucideIcons as any)[item.icon] || LucideIcons.PanelRight;
                   return (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref legacyBehavior>
                      <SidebarMenuButton
                        as="a"
                        isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                        tooltip={item.label}
                        className={cn(isCeoMode && "pr-12")}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                     {isCeoMode && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                            <SidebarMenuAction tooltip="Edit" size="icon" className="h-6 w-6" onClick={() => handleEditClick(item)}>
                                <Pencil/>
                            </SidebarMenuAction>
                             <SidebarMenuAction tooltip="Delete" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(item)}>
                                <Trash2/>
                            </SidebarMenuAction>
                        </div>
                    )}
                  </SidebarMenuItem>
                   )
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                 {isCeoMode && (
                  <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Add Link" onClick={handleAddClick}>
                            <Plus />
                            <span>Add Link</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                )}
              <SidebarMenu>
                 <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton tooltip="Profile" className="w-full">
                           <Avatar className="h-7 w-7">
                              <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                           </Avatar>
                           <span className="truncate">{user?.email ?? 'Your Profile'}</span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset className="flex-1 !bg-background">
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 p-4 backdrop-blur-sm lg:justify-end">
              <SidebarTrigger className="lg:hidden" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                     <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                     </Avatar>
                     <span className="sr-only">User Profile</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </div>
        <Chatbot />
      </TooltipProvider>

      {/* Dialogs for CEO mode */}
      <EditLinkDialog 
        isOpen={isEditOpen} 
        setIsOpen={setIsEditOpen}
        link={selectedLink}
      />
      <DeleteLinkDialog 
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        link={selectedLink}
      />
      <EditLinkDialog
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        link={null} // Pass null for add mode
      />
    </SidebarProvider>
  );
}
