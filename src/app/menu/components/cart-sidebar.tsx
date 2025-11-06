
'use client';

import * as React from 'react';
import { useCart } from '@/hooks/use-cart';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Minus, Plus, Trash2, PartyPopper, Loader2, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore, type Location } from '@/hooks/use-store';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { haversineDistance } from '@/lib/utils';
import { submitOrder } from '@/app/dashboard/menu/checkout/actions';

type LocationWithDistance = Location & { distance?: number };

const CheckoutForm = ({ onOrderSuccess }: { onOrderSuccess: () => void }) => {
    const { items, getCartTotal, clearCart } = useCart();
    const { locations: storeLocations, isDemoMode } = useStore();
    const { user } = useUser();
    const { toast } = useToast();
    const formRef = React.useRef<HTMLFormElement>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [userCoords, setUserCoords] = React.useState<{ lat: number, lon: number } | null>(null);
    const [isLocating, setIsLocating] = React.useState(true);
    const [sortedLocations, setSortedLocations] = React.useState<LocationWithDistance[]>([]);

    const locations = isDemoMode
        ? [
            { id: 'demo1', name: 'Green Leaf Central', address: '123 Main St', city: 'Metropolis', state: 'IL', zip: '12345', phone: '(555) 123-4567', lat: 40.7128, lon: -74.0060 },
            { id: 'demo2', name: 'Herbal Haven Downtown', address: '456 Oak Ave', city: 'Metropolis', state: 'IL', zip: '12346', phone: '(555) 987-6543', lat: 40.7580, lon: -73.9855 },
            { id: 'demo3', name: 'Bloom Apothecary North', address: '789 Pine Ln', city: 'Springfield', state: 'IL', zip: '67890', phone: '(555) 234-5678', lat: 39.7817, lon: -89.6501 },
        ]
        : storeLocations;

    React.useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
                    setIsLocating(false);
                },
                () => {
                    setSortedLocations(locations);
                    setIsLocating(false);
                }
            );
        } else {
            setSortedLocations(locations);
            setIsLocating(false);
        }
    }, []);

    React.useEffect(() => {
        if (userCoords) {
            const locationsWithDistance = locations
                .map(loc => {
                    if (loc.lat && loc.lon) {
                        const distance = haversineDistance(userCoords, { lat: loc.lat, lon: loc.lon });
                        return { ...loc, distance };
                    }
                    return loc;
                })
                .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
            setSortedLocations(locationsWithDistance);
        } else {
            setSortedLocations(locations);
        }
    }, [userCoords, locations]);

    const subtotal = getCartTotal();
    const taxes = subtotal * 0.15;
    const total = subtotal + taxes;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        setIsSubmitting(true);
        const formData = new FormData(formRef.current);
        formData.append('cartItems', JSON.stringify(items));
        formData.append('userId', user?.uid || 'guest');
        formData.append('totalAmount', String(total));

        const result = await submitOrder(null, formData);

        setIsSubmitting(false);
        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Order Failed',
                description: result.message,
            });
        } else {
            clearCart();
            onOrderSuccess();
        }
    };

    return (
        <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">Your Information</h3>
                <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="customerName" required defaultValue={user?.displayName || ''} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="customerPhone" type="tel" placeholder="(555) 123-4567" required defaultValue={user?.phoneNumber || ''} />
                    </div>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold">Pickup Location</h3>
                <div className="mt-4 space-y-1">
                    <Label htmlFor="location">Select a dispensary</Label>
                    <Select name="locationId" required>
                        <SelectTrigger id="location" disabled={isLocating}>
                            <SelectValue placeholder={isLocating ? 'Finding nearby locations...' : 'Choose a pickup location'} />
                        </SelectTrigger>
                        <SelectContent>
                            {isLocating ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                             sortedLocations.length > 0 ? (
                                sortedLocations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name} {loc.distance && `(${loc.distance.toFixed(1)} mi)`}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>No locations found.</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Taxes (est.)</span>
                    <span>${taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Order
            </Button>
        </form>
    );
};

export default function CartSidebar() {
  const {
    isCartOpen,
    toggleCart,
    items,
    updateQuantity,
    removeFromCart,
    getCartTotal,
  } = useCart();

  const [step, setStep] = React.useState<'cart' | 'checkout' | 'success'>('cart');

  React.useEffect(() => {
    // Reset to cart view when cart is opened or items change
    if (isCartOpen) {
        setStep(items.length > 0 ? 'cart' : 'cart');
    }
  }, [isCartOpen, items]);

  const handleOrderSuccess = () => {
    setStep('success');
  }

  const subtotal = getCartTotal();

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
                    <SheetHeader className="px-6">
                        <SheetTitle>Checkout</SheetTitle>
                        <SheetDescription>Confirm your details and place your order.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="flex-1 px-6 py-4">
                        <CheckoutForm onOrderSuccess={handleOrderSuccess} />
                    </ScrollArea>
                    <SheetFooter className="border-t pt-4 px-6">
                         <Button variant="outline" className="w-full" onClick={() => setStep('cart')}>
                            Back to Cart
                        </Button>
                    </SheetFooter>
                </>
            );
        case 'cart':
        default:
            return (
                <>
                 <SheetHeader className="px-6">
                    <SheetTitle>Your Cart</SheetTitle>
                 </SheetHeader>
                {items.length > 0 ? (
                <>
                    <ScrollArea className="flex-1 -mx-6">
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
                        <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <Button className="w-full" onClick={() => setStep('checkout')}>
                            Proceed to Checkout
                        </Button>
                    </div>
                    </SheetFooter>
                </>
                ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
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
