
'use client';

import Link from 'next/link';
import { Search, ShoppingBag, User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/logo';
import { useUser } from '@/firebase/auth/use-user';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFirebase } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/use-store';
import { useHydrated } from '@/hooks/use-hydrated';


export default function Header() {
    const { getItemCount, setCartSheetOpen } = useStore();
    const itemCount = getItemCount();
    const pathname = usePathname();
    const { user, isUserLoading } = useUser();
    const { auth } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const hydrated = useHydrated();

    const navLinks = [
        { href: '/menu/default', label: 'Demo Menu' },
        { href: '/product-locator', label: 'Product Locator' },
    ];
    
     const handleSignOut = async () => {
        if (!auth) return;
        try {
          await signOut(auth);
          toast({
            title: "Signed Out",
            description: "You have been successfully logged out.",
          });
          // Force a full page reload to clear all state
          window.location.href = '/';
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
        <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Logo />
                    <nav className="hidden md:flex items-center gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    pathname === link.href ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon">
                        <Search className="h-5 w-5" />
                    </Button>
                    
                    <Button variant="ghost" size="icon" className="relative" onClick={() => setCartSheetOpen(true)}>
                       <ShoppingBag className="h-5 w-5" />
                       {hydrated && itemCount > 0 && (
                           <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                               {itemCount}
                           </span>
                       )}
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6 hidden md:block"/>

                    <div className="hidden md:flex items-center gap-2">
                        {hydrated && user ? (
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                     <Button variant="ghost" className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7">
                                            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                                        </Avatar>
                                        My Account
                                     </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/account')}>
                                        <User className="mr-2" />
                                        Account Details
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => router.push('/account/dashboard')}>
                                        <User className="mr-2" />
                                        Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut}>
                                        <LogOut className="mr-2" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                        ) : hydrated && !user ? (
                            <>
                                <Button variant="ghost" asChild>
                                    <Link href="/customer-login">
                                    Login
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/onboarding">
                                    Get Started
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <div className="h-10 w-44" /> // Placeholder to prevent layout shift
                        )}
                    </div>

                    {/* Mobile Menu */}
                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {navLinks.map(link => (
                                     <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                                        {link.label}
                                     </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                {hydrated && user ? (
                                    <>
                                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => router.push('/account/dashboard')}>Dashboard</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push('/account')}>Account Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                                    </>
                                ) : hydrated && !user ? (
                                    <>
                                        <DropdownMenuItem onClick={() => router.push('/customer-login')}>Login</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push('/onboarding')}>Get Started</DropdownMenuItem>
                                    </>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
}
