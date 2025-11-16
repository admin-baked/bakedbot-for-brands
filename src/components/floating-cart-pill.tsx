
'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/hooks/use-hydrated';

export function FloatingCartPill() {
  // We no longer need useHydrated here.
  // The store's state is now reliable on first client render.
  const { getItemCount, setCartSheetOpen } = useStore();
  const itemCount = getItemCount();
  
  const showPill = itemCount > 0;

  return (
    <div
      data-testid="cart-pill"
      className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300", showPill ? 'opacity-100' : 'opacity-0 pointer-events-none')}
    >
      <Button
        onClick={() => setCartSheetOpen(true)}
        className="rounded-full shadow-lg h-14 pl-6 pr-8 text-base"
        aria-hidden={!showPill}
        tabIndex={showPill ? 0 : -1}
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
