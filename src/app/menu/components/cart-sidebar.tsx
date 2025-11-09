
'use client';

import * as React from 'react';
import { useCart } from '@/hooks/use-cart';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Minus, Plus, Trash2, MapPin, ExternalLink, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/hooks/use-store';
import { useMenuData } from '@/hooks/use-menu-data';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SelectedLocationHeader = () => {
    const { selectedLocationId } = useStore();
    const { locations } = useMenuData();
    const selectedLocation = locations?.find(loc => loc.id === selectedLocationId);

    if (!selectedLocation) {
        return (
             <div className="px-6 py-4 bg-destructive/10 border-b border-destructive/20">
                <Alert variant="destructive" className="p-0 bg-transparent border-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <AlertDescription className="text-destructive/90 pl-2">
                        Please select a dispensary from the menu to see final pricing and proceed to checkout.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedLocation.name}, ${selectedLocation.address}, ${selectedLocation.city}, ${selectedLocation.state} ${selectedLocation.zip}`)}`;

    return (
        <div className="px-6 py-4 bg-muted/50 border-b">
            <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-sm">Pickup Location</p>
                    <p className="text-sm text-muted-foreground">{selectedLocation.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedLocation.address}, {selectedLocation.city}</p>
                     <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs mt-1">
                        <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                           View on Map <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function CartSidebar() {
  const {
    isCartOpen,
    toggleCart,
    items,
    updateQuantity,
    removeFromCart,
    getCartTotal,
  } = useCart();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const { selectedLocationId } = useStore();

  const { subtotal } = getCartTotal();
  const isCheckoutDisabled = items.length === 0 || !selectedLocationId;
  
  const checkoutUrl = selectedLocationId ? `/checkout?locationId=${selectedLocationId}` : '/checkout';

  return (
    <Sheet open={isCartOpen} onOpenChange={toggleCart}>
      <SheetContent className="flex flex-col p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Your Cart</SheetTitle>
          </SheetHeader>
          <SelectedLocationHeader />
        {isClient && items.length > 0 ? (
        <>
            <ScrollArea className="flex-1">
            <div className="px-6 divide-y">
                {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 py-4">
                            <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                objectFit="cover"
                            />
                            </div>
                            <div className="flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center">{item.quantity}</span>
                                <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            </div>
                            <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() => removeFromCart(item.id)}
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
            </div>
            </ScrollArea>
            <SheetFooter className="mt-auto border-t pt-6 px-6">
            <div className="w-full space-y-4">
                <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>${subtotal}</span>
                </div>
                <Button 
                    className="w-full"
                    disabled={isCheckoutDisabled}
                    asChild
                    onClick={toggleCart}
                >
                    <Link href={checkoutUrl}>Proceed to Checkout</Link>
                </Button>
            </div>
            </SheetFooter>
        </>
        ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-lg font-semibold">Your cart is empty</p>
            <p className="text-muted-foreground mt-1">Add some products to get started.</p>
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
