'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LogOut, Star, Pencil, Eye, EyeOff, Plus, FlaskConical, Trash2, MenuSquare, Shield, MapPin, Package, ExternalLink } from 'lucide-react';
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
import { FirebaseContext } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useStore, type NavLink } from '@/hooks/use-store';
import { cn } from '@/lib/utils';
import EditLinkDialog from './components/edit-link-dialog';
import DeleteLinkDialog from './components/delete-link-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';


const SidebarAdminControls = ({ link, onEdit, onToggle, onDelete }: { link: NavLink, onEdit: (link: NavLink) => void, onToggle: (href: string) => void, onDelete: (link: NavLink) => void }) => {
  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
        <SidebarMenuAction tooltip="Edit" size="icon" className="h-6 w-6" onClick={() => onEdit(link)}>
            <Pencil/>
        </SidebarMenuAction>
        <SidebarMenuAction
          tooltip={link.hidden ? 'Show' : 'Hide'}
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => onToggle(link.href)}
        >
            {link.hidden ? <Eye /> : <EyeOff />}
        </SidebarMenuAction>
        <SidebarMenuAction tooltip="Delete" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(link)}>
            <Trash2/>
        </SidebarMenuAction>
    </div>
  );
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const firebaseContext = React.useContext(FirebaseContext);
  const auth = firebaseContext?.auth;
  const user = firebaseContext?.user;
  const isUserLoading = firebaseContext?.isUserLoading ?? true;

  const { isCeoMode, navLinks, toggleNavLinkVisibility, _hasHydrated } = useStore();

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedLink, setSelectedLink] = React.useState<NavLink | null>(null);
  
  const [showClientContent, setShowClientContent] = React.useState(false);
  
  React.useEffect(() => {
    setShowClientContent(true);

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
  
  const handleToggleVisibilityClick = (href: string) => {
    toggleNavLinkVisibility(href);
  };
  
  const handleAddClick = () => {
    setSelectedLink(null);
    setIsAddOpen(true);
  };
  
  const handleDeleteClick = (link: NavLink) => {
    setSelectedLink(link);
    setIsDeleteOpen(true);
  };

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };
  
  const shouldShowAdminControls = showClientContent && isCeoMode && _hasHydrated;
  const visibleLinks = shouldShowAdminControls ? navLinks : navLinks.filter(link => !link.hidden);

  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {showClientContent && visibleLinks.map((item) => {
                   const Icon = (LucideIcons as any)[item.icon] || LucideIcons.PanelRight;
                   return (
                  <SidebarMenuItem key={item.href} className={cn(shouldShowAdminControls && item.hidden && "opacity-50 hover:opacity-100")}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                        tooltip={item.label}
                        className={cn(shouldShowAdminControls && "pr-16")}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                     {shouldShowAdminControls && (
                        <SidebarAdminControls
                            link={item}
                            onEdit={handleEditClick}
                            onToggle={handleToggleVisibilityClick}
                            onDelete={handleDeleteClick}
                        />
                    )}
                  </SidebarMenuItem>
                   )
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                 {shouldShowAdminControls && (
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
                        <SidebarMenuButton tooltip="Profile" className="w-full" disabled={isUserLoading}>
                           {isUserLoading ? (
                             <>
                               <Skeleton className="h-7 w-7 rounded-full" />
                               <Skeleton className="h-4 w-20" />
                             </>
                           ) : (
                             <>
                               <Avatar className="h-7 w-7">
                                  <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                               </Avatar>
                               <span className="truncate">{user?.email ?? 'Your Profile'}</span>
                             </>
                           )}
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => router.push('/ceo')}>
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Admin Controls</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <Link href="/menu" target="_blank">
                             <ExternalLink className="mr-2 h-4 w-4" />
                             <span>Public Menu</span>
                           </Link>
                        </DropdownMenuItem>
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
                  <Button variant="ghost" size="icon" className="rounded-full" disabled={isUserLoading}>
                    {isUserLoading ? (
                       <Skeleton className="h-8 w-8 rounded-full" />
                    ) : (
                       <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                       </Avatar>
                    )}
                     <span className="sr-only">User Profile</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/ceo')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Controls</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem asChild>
                     <Link href="/menu" target="_blank">
                       <ExternalLink className="mr-2 h-4 w-4" />
                       <span>Public Menu</span>
                     </Link>
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
      <EditLinkDialog
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        link={null} // Pass null for add mode
      />
       <DeleteLinkDialog
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        link={selectedLink}
      />
    </SidebarProvider>
  );
}
