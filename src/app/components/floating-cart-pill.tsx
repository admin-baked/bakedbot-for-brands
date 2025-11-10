
'use client';

import { useCart } from '@/hooks/use-cart';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useStore } from '@/hooks/use-store';

export function FloatingCartPill() {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const { _hasHydrated } = useStore();


  if (!_hasHydrated || itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Button
        asChild
        className="rounded-full shadow-lg h-14 pl-6 pr-8 text-base"
      >
        <Link href="/checkout">
          <ShoppingBag className="mr-4" />
          <span>View Cart</span>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-foreground text-primary font-bold text-xs">
            {itemCount}
          </span>
        </Link>
      </Button>
    </div>
  );
}
