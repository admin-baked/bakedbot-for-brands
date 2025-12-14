
'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingBag } from 'lucide-react';
import { useHydrated } from '@/hooks/use-hydrated';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

export function FloatingCartPill() {
    const { getItemCount, getCartTotal, setCartSheetOpen } = useStore();
    const hydrated = useHydrated();
    const itemCount = getItemCount();
    const { total } = getCartTotal();

    if (!hydrated || itemCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <Button
                data-testid="cart-pill"
                size="lg"
                className={cn(
                    "rounded-full shadow-lg transition-all duration-300",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "animate-in slide-in-from-bottom-10"
                )}
                onClick={() => setCartSheetOpen(true)}
            >
                <ShoppingBag className="mr-3" />
                <span>Hemp Cart</span>
                <span className="ml-3 font-bold bg-background/20 text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">
                    {formatNumber(itemCount)}
                </span>
                <span className="mx-2 h-4 w-px bg-primary-foreground/50" />
                <span>${total.toFixed(2)}</span>
            </Button>
        </div>
    );
}
