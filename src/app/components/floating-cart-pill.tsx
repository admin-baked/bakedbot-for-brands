
'use client';

import { useCart } from '@/hooks/use-cart';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/hooks/use-store';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function FloatingCartPill() {
  const { getItemCount, _hasHydrated: isCartHydrated } = useCart();
  const itemCount = getItemCount();
  const { _hasHydrated: isStoreHydrated, setCartSheetOpen } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isHydrated = isCartHydrated && isStoreHydrated && mounted;
  const showPill = isHydrated && itemCount > 0;

  return (
    <div className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300", showPill ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
      <Button
        onClick={() => setCartSheetOpen(true)}
        className="rounded-full shadow-lg h-14 pl-6 pr-8 text-base"
        aria-hidden={!showPill}
        tabIndex={showPill ? 0 : -1}
      >
        <ShoppingBag className="mr-4" />
        <span>View Cart</span>
        <span 
            className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-foreground text-primary font-bold text-xs"
            suppressHydrationWarning
        >
          {isHydrated ? itemCount : 0}
        </span>
      </Button>
    </div>
  );
}
