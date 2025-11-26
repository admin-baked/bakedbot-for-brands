'use client';

// src/components/floating-cart-button.tsx
/**
 * Floating cart button that appears when items are in cart
 */

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cart-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function FloatingCartButton() {
    const router = useRouter();
    const { items, getTotal } = useCartStore();
    const { itemCount, total } = getTotal();

    if (itemCount === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Button
                size="lg"
                onClick={() => router.push('/checkout')}
                className={cn(
                    "rounded-full pr-6 pl-5 shadow-lg hover:shadow-xl transition-all",
                    "animate-in slide-in-from-bottom-8 duration-300"
                )}
            >
                <div className="relative mr-3">
                    <ShoppingCart className="h-5 w-5" />
                    <Badge
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                        {itemCount}
                    </Badge>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-xs opacity-90">Cart Total</span>
                    <span className="font-bold">${total.toFixed(2)}</span>
                </div>
            </Button>
        </div>
    );
}
