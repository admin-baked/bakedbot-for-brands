'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/hooks/useHydrated';
import { SafeBadge } from '@/components/ui/SafeBadge';

export function FloatingCartPill() {
  const { getItemCount, setCartSheetOpen } = useStore();
  const hydrated = useHydrated();
  const itemCount = getItemCount();
  
  const showPill = hydrated && itemCount > 0;

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
        <SafeBadge value={itemCount} />
      </Button>
    </div>
  );
}
