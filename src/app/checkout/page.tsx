'use client';

// src/app/checkout/page.tsx
/**
 * Checkout page
 * Routes to appropriate checkout flow based on purchase mode:
 * - pickup: Local dispensary pickup (CheckoutFlow)
 * - shipping: Hemp e-commerce shipping (ShippingCheckoutFlow)
 */

import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { ShippingCheckoutFlow } from '@/components/checkout/shipping-checkout-flow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Truck, Store } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/hooks/use-store';
import { useEffect, useState } from 'react';
import { isShippingCheckoutEnabled } from '@/lib/feature-flags';

export default function CheckoutPage() {
  const { cartItems, selectedRetailerId, purchaseMode, selectedBrandId } = useStore();
  const [mounted, setMounted] = useState(false);
  const shippingCheckoutEnabled = isShippingCheckoutEnabled();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added any items yet.</p>
        <Link href="/">
          <Button>Start Shopping</Button>
        </Link>
      </div>
    );
  }

  const isShippingMode = purchaseMode === 'shipping' && selectedBrandId;
  const shippingDisabledForMode = isShippingMode && !shippingCheckoutEnabled;
  const backLink = isShippingMode
    ? `/${selectedBrandId}`
    : selectedRetailerId
      ? `/shop/${selectedRetailerId}`
      : '/';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={backLink} className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shopping
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            {shippingDisabledForMode ? (
              <>
                <Truck className="h-4 w-4" />
                Shipping checkout is currently disabled
              </>
            ) : isShippingMode ? (
              <>
                <Truck className="h-4 w-4" />
                Complete your order for shipping
              </>
            ) : (
              <>
                <Store className="h-4 w-4" />
                Complete your order for pickup
              </>
            )}
          </p>
        </div>

        {shippingDisabledForMode ? (
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            This checkout path is unavailable right now. Please return to shopping.
          </div>
        ) : isShippingMode ? (
          <ShippingCheckoutFlow brandId={selectedBrandId} />
        ) : (
          <CheckoutFlow />
        )}
      </div>
    </div>
  );
}
