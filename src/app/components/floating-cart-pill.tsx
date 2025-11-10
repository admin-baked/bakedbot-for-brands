'use client';

import { useCart } from '@/hooks/use-cart';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/hooks/use-store';

export function FloatingCartPill() {
  const { getItemCount, _hasHydrated: isCartHydrated } = useCart();
  const itemCount = getItemCount();
  const { _hasHydrated: isStoreHydrated, setCartSheetOpen } = useStore();

  const isHydrated = isCartHydrated && isStoreHydrated;

  if (!isHydrated || itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Button
        onClick={() => setCartSheetOpen(true)}
        className="rounded-full shadow-lg h-14 pl-6 pr-8 text-base"
      >
        
          <ShoppingBag className="mr-4" />
          <span>View Cart</span>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-foreground text-primary font-bold text-xs">
            {itemCount}
          </span>
        
      </Button>
    </div>
  );
}
