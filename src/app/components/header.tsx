'use client';

import Link from 'next/link';
import { Search, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';

export default function Header() {
    const { getItemCount } = useCart();
    const itemCount = getItemCount();
    const { _hasHydrated } = useStore();

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center">
                    <Logo />
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <Search className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/brand-login">
                          <User className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="relative" asChild>
                        <Link href="/checkout">
                           <ShoppingBag className="h-5 w-5" />
                           {_hasHydrated && itemCount > 0 && (
                               <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                   {itemCount}
                               </span>
                           )}
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
