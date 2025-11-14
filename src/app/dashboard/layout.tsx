'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LogOut, Star, Pencil, Eye, EyeOff, Plus, FlaskConical, Trash2, MenuSquare, Shield, MapPin, Package, ExternalLink, Loader2 } from 'lucide-react';
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
import Chatbot from '@/components/chatbot';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { useStore, type NavLink } from '@/hooks/use-store';
import { cn } from '@/lib/utils';
import EditLinkDialog from './components/edit-link-dialog';
import DeleteLinkDialog from './components/delete-link-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, onSnapshot } from 'firebase/firestore';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';


const SidebarAdminControls = ({ link, onEdit, onToggle, onDelete }: { link: NavLink, onEdit: (link: NavLink) => void, onToggle: (href: string) => void, onDelete: (link: NavLink) => void }) => {
    return (
        <TooltipProvider>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(link)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                <Tooltip>
                   <TooltipTrigger asChild>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => onToggle(link.href)}
                        >
                            {link.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                   </TooltipTrigger>
                   <TooltipContent>{link.hidden ? 'Show' : 'Hide'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(link)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const { isCeoMode, navLinks, toggleNavLinkVisibility, _hasHydrated, setIsCeoMode } = useStore();
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (user && firestore) {
      setIsProfileLoading(true);
      const userDocRef = doc(firestore, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        const data = doc.data();
        setUserProfile(data);
        if (data?.role === 'owner' || data?.isCeo) {
            setIsCeoMode(true);
        } else {
            setIsCeoMode(false);
        }
        setIsProfileLoading(false);
      }, () => {
        setIsProfileLoading(false);
        setIsCeoMode(false);
      });
      return () => unsubscribe();
    } else if (!isUserLoading) {
      setIsProfileLoading(false);
      setUserProfile(null);
      setIsCeoMode(false);
    }
  }, [user, firestore, isUserLoading, setIsCeoMode]);


  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedLink, setSelectedLink] = React.useState<NavLink | null>(null);
  
  React.useEffect(() => {
    const isLoginPage = pathname.startsWith('/customer-login') || 
                       pathname.startsWith('/brand-login') || 
                       pathname.startsWith('/dispensary-login');
    const isAuthCallback = pathname.startsWith('/auth/');
    
    // ✅ CRITICAL: Never interfere with login pages or auth callbacks
    // Let the LoginForm handle all post-authentication redirects
    if (isLoginPage || isAuthCallback) {
        console.log('🔓 Layout: Ignoring login/auth page, letting LoginForm handle redirect');
        return;
    }

    // Don't redirect if still loading
    if (isUserLoading || isProfileLoading) {
        console.log('⏳ Layout: Still loading user/profile data');
        return;
    }

    if (user && userProfile) {
        // ✅ User is authenticated - enforce role-based access ONLY on protected routes
        if (userProfile.onboardingCompleted === false && pathname !== '/onboarding') {
            console.log('📝 Layout: User needs onboarding');
            router.replace('/onboarding');
        } else if (userProfile.role === 'dispensary' && !pathname.startsWith('/dashboard/orders') && !pathname.startsWith('/dashboard/settings')) {
            console.log('🏪 Layout: Dispensary user accessing wrong page');
            router.replace('/dashboard/orders');
        }
        // Note: We don't redirect brand/customer users here - they can access any dashboard page
    } else if (!user) {
        // ✅ User is NOT authenticated - protect dashboard/account routes
        const isProtectedRoute = pathname.startsWith('/dashboard') || 
                                pathname.startsWith('/account') || 
                                pathname === '/onboarding';
        
        if (isProtectedRoute) {
            console.log('🔒 Layout: Protected route without auth, redirecting to login');
            router.replace('/customer-login');
        }
    }
}, [user, userProfile, isUserLoading, isProfileLoading, pathname, router]);


  const handleSignOut = async () => {
    try {
      if(auth) {
        await signOut(auth);
      }
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
      router.push('/');
    } catch (error) {
      console.error('Sign out error', error);
       toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "Could not sign you out. Please try again.",
      });
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
  
  const shouldShowAdminControls = isCeoMode && _hasHydrated;
  
  const visibleLinks = React.useMemo(() => {
    let links = navLinks;
    if (userProfile?.role === 'dispensary') {
        links = navLinks.filter(link => link.href === '/dashboard/orders' || link.href === '/dashboard/settings');
    } else if (userProfile?.role === 'brand' || userProfile?.role === 'owner') {
        links = navLinks.filter(link => link.href !== '/dashboard/orders');
    } else if (userProfile) { 
        links = []; 
    }
    
    if (shouldShowAdminControls) {
      return links; 
    }
    return links.filter(link => !link.hidden);

  }, [navLinks, userProfile, shouldShowAdminControls]);


  const isLoading = isUserLoading || isProfileLoading;
  
  const isExcludedFromLayout = 
    pathname.startsWith('/customer-login') || 
    pathname.startsWith('/brand-login') || 
    pathname.startsWith('/dispensary-login') ||
    pathname.startsWith('/auth/') || 
    pathname.startsWith('/account') ||
    pathname === '/onboarding';

  if (isLoading && !isExcludedFromLayout) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (user && isProfileLoading && !isExcludedFromLayout) {
      return (
         <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  if (!user && !isExcludedFromLayout && pathname !== '/') {
      return null;
  }
  
  if (isExcludedFromLayout) {
      return children;
  }

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
                {_hasHydrated && visibleLinks.map((item) => {
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
                           <Link href="/" target="_blank">
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
                     <Link href="/" target="_blank">
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

      <EditLinkDialog 
        isOpen={isEditOpen} 
        setIsOpen={setIsEditOpen}
        link={selectedLink}
      />
      <EditLinkDialog
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        link={null}
      />
       <DeleteLinkDialog
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        link={selectedLink}
      />
    </SidebarProvider>
  );
}
