
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
    const { toggleCart, getItemCount } = useCart();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const itemCount = getItemCount();
    const pathname = usePathname();

    const isLocatorActive = pathname === '/product-locator';

    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/menu" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT
        </Link>
        <nav className="hidden md:flex items-center gap-6 font-semibold text-sm">
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/menu#about" className="text-muted-foreground hover:text-foreground">About Us</Link>
            <Link href="/product-locator" className={isLocatorActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>Product Locator</Link>
            <Link href="/menu#partners" className="text-muted-foreground hover:text-foreground">Our Partners</Link>
            <Link href="/menu#careers" className="text-muted-foreground hover:text-foreground">Careers</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/brand-login">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <div className="relative">
             <Button variant="ghost" size="icon" onClick={toggleCart}>
              <ShoppingBag className="h-5 w-5" />
            </Button>
            {isClient && itemCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0"
                >
                    {itemCount}
                </Badge>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
