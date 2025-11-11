
'use client';

import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function Header() {
    const { getItemCount } = useCart();
    const itemCount = getItemCount();
    const { _hasHydrated, setCartSheetOpen } = useStore();
    const pathname = usePathname();

    const navLinks = [
        { href: '/', label: 'Menu' },
        { href: '/product-locator', label: 'Product Locator' },
    ];

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center">
                        <Logo />
                    </Link>
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

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <Search className="h-5 w-5" />
                    </Button>
                    
                    <Button variant="ghost" size="icon" className="relative" onClick={() => setCartSheetOpen(true)}>
                       <ShoppingBag className="h-5 w-5" />
                       {_hasHydrated && itemCount > 0 && (
                           <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                               {itemCount}
                           </span>
                       )}
                    </Button>

                    <div className="hidden md:flex items-center gap-2">
                        <Button variant="ghost" asChild>
                            <Link href="/brand-login">
                              Login
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/brand-login">
                              Get Started
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
