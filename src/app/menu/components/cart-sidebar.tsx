'use client';

import * as React from 'react';
import { useCart } from '@/hooks/use-cart';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Minus, Plus, Trash2, PartyPopper, MapPin, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import CheckoutForm from './checkout-form';
import { useStore } from '@/hooks/use-store';
import { useMenuData } from '@/hooks/use-menu-data';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const SelectedLocationHeader = () => {
    const { selectedLocationId } = useStore();
    const { locations } = useMenuData();
    const selectedLocation = locations?.find(loc => loc.id === selectedLocationId);

    if (!selectedLocation) {
        return null;
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
  
  const { selectedLocationId } = useStore();
  const { toast } = useToast();

  const [step, setStep] = React.useState<'cart' | 'checkout' | 'success'>('cart');

  React.useEffect(() => {
    // Reset to cart view when cart is opened or items change, unless it's on success step
    if (isCartOpen && step !== 'success') {
        setStep(items.length > 0 ? 'cart' : 'cart');
    }
  }, [isCartOpen, items, step]);

  const handleOrderSuccess = () => {
    setStep('success');
  }

  const handleProceedToCheckout = () => {
    if (!selectedLocationId) {
        toast({
            variant: 'destructive',
            title: 'No Location Selected',
            description: 'Please select a pickup location before proceeding.',
        });
        return;
    }
    setStep('checkout');
  }

  const subtotal = getCartTotal(selectedLocationId);

  const renderContent = () => {
    switch (step) {
        case 'success':
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <PartyPopper className="h-16 w-16 text-primary mb-4" />
                    <SheetTitle className="text-2xl">Order Submitted!</SheetTitle>
                    <SheetDescription className="mt-2">
                        You'll receive a notification when it's ready for pickup.
                    </SheetDescription>
                    <Button onClick={toggleCart} className="mt-6 w-full">Continue Shopping</Button>
                </div>
            );
        case 'checkout':
            return (
                <>
                    <SheetHeader className="px-6 pt-6">
                        <SheetTitle>Checkout</SheetTitle>
                        <SheetDescription>Confirm your details and place your order.</SheetDescription>
                    </SheetHeader>
                    <SelectedLocationHeader />
                    <ScrollArea className="flex-1 px-6 py-4">
                        <CheckoutForm onOrderSuccess={handleOrderSuccess} onBack={() => setStep('cart')} />
                    </ScrollArea>
                </>
            );
        case 'cart':
        default:
            return (
                <>
                 <SheetHeader className="px-6 pt-6">
                    <SheetTitle>Your Cart</SheetTitle>
                 </SheetHeader>
                 <SelectedLocationHeader />
                {items.length > 0 ? (
                <>
                    <ScrollArea className="flex-1">
                    <div className="px-6 divide-y">
                        {items.map((item) => {
                            const price = selectedLocationId ? item.prices[selectedLocationId] ?? item.price : item.price;
                            return (
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
                                    <p className="text-sm text-muted-foreground">${price.toFixed(2)}</p>
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
                            );
                        })}
                    </div>
                    </ScrollArea>
                    <SheetFooter className="mt-auto border-t pt-6 px-6">
                    <div className="w-full space-y-4">
                        <div className="flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <Button className="w-full" onClick={handleProceedToCheckout} disabled={items.length === 0}>
                            Proceed to Checkout
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
                </>
            );
        }
    }


  return (
    <Sheet open={isCartOpen} onOpenChange={toggleCart}>
      <SheetContent className="flex flex-col p-0">
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
