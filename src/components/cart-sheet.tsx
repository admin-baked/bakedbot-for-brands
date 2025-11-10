'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { useMenuData } from '@/hooks/use-menu-data';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CartSheet() {
  const { isCartSheetOpen, setCartSheetOpen, selectedLocationId } = useStore();
  const { locations } = useMenuData();
  const { items, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const router = useRouter();

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const { subtotal, taxes, total } = getCartTotal();

  const handleCheckout = () => {
    setCartSheetOpen(false);
    router.push('/checkout');
  };

  return (
    <Sheet open={isCartSheetOpen} onOpenChange={setCartSheetOpen}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
          {selectedLocation && (
            <SheetDescription className="flex items-center gap-2 pt-2 text-xs">
                <MapPin className="h-4 w-4 text-primary" /> 
                <span>Pickup from: <strong>{selectedLocation.name}</strong></span>
            </SheetDescription>
          )}
        </SheetHeader>
        
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-4">
            {items.length > 0 ? (
                <div className="space-y-4">
                    {items.map(item => (
                        <div key={item.id} className="flex gap-4">
                            <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeFromCart(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                    <p>Your cart is empty.</p>
                </div>
            )}
          </ScrollArea>
        </div>

        {items.length > 0 && (
          <SheetFooter className="pt-4 border-t">
            <div className="w-full space-y-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (est.)</span>
                  <span>${taxes.toFixed(2)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button size="lg" className="w-full" onClick={handleCheckout}>
                Proceed to Checkout
              </Button>
              <Button variant="outline" className="w-full" onClick={() => clearCart()}>
                Clear Cart
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
