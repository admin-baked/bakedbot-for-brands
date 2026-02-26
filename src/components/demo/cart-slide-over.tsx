'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Leaf,
  ArrowRight,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useCallback } from 'react';
import type { Product } from '@/types/domain';
import { ProductUpsellRow } from '@/components/upsell/product-upsell-row';
import { fetchCartUpsells } from '@/server/actions/upsell';

interface CartItem extends Product {
  quantity: number;
}

interface CartSlideOverProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout?: () => void;
  primaryColor?: string;
  orgId?: string;
  onAddUpsellToCart?: (product: Product) => void;
}

export function CartSlideOver({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  primaryColor = '#16a34a',
  orgId,
  onAddUpsellToCart,
}: CartSlideOverProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.25; // Cannabis tax
  const total = subtotal + tax;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const cartItemIds = items.map((item) => item.id);
  const fetchUpsells = useCallback(() => {
    if (!orgId || cartItemIds.length === 0) {
      return Promise.resolve({ suggestions: [], placement: 'cart' as const, generatedAt: Date.now() });
    }
    return fetchCartUpsells(cartItemIds, orgId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, cartItemIds.join(',')]);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" style={{ color: primaryColor }} />
            Your Cart
            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalItems} item{totalItems > 1 ? 's' : ''}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <ShoppingBag className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground text-center mb-6">
              Browse our products and add items to your cart
            </p>
            <Button onClick={onClose} style={{ backgroundColor: primaryColor }}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-auto py-4 -mx-6 px-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    {/* Product Image */}
                    <div className="h-20 w-20 rounded-lg bg-background flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Leaf className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      {item.strainType && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {item.strainType}
                        </Badge>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price & Remove */}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: primaryColor }}>
                            ${((item.price ?? 0) * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upsell Suggestions */}
            {orgId && onAddUpsellToCart && items.length > 0 && (
              <div className="px-6 -mx-6 py-3 border-t">
                <ProductUpsellRow
                  heading="Complete Your Order"
                  fetchUpsells={fetchUpsells}
                  onAddToCart={onAddUpsellToCart}
                  primaryColor={primaryColor}
                  compact
                />
              </div>
            )}

            {/* Cart Summary */}
            <div className="border-t pt-4 space-y-4">
              {/* Promo Suggestion */}
              {subtotal < 50 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Add ${(50 - subtotal).toFixed(2)} more for free delivery!
                  </p>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cannabis Tax (25%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  className="w-full h-12 font-bold text-base"
                  style={{ backgroundColor: primaryColor }}
                  onClick={onCheckout}
                >
                  Proceed to Checkout
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={onClearCart}
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>

              {/* Trust Badge */}
              <p className="text-xs text-center text-muted-foreground">
                Payment collected at pickup. Bring valid ID (21+).
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
