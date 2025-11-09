
'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/app/menu/components/header';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutForm } from '@/app/menu/components/checkout-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
    const { items, getCartTotal, clearCart } = useCart();
    const { locations, selectedLocationId, _hasHydrated } = useStore(state => ({
        locations: state.locations,
        selectedLocationId: state.selectedLocationId,
        _hasHydrated: state._hasHydrated,
    }));
    const router = useRouter();

    const handleOrderSuccess = (orderId: string) => {
        if (orderId) {
            clearCart();
            router.push(`/order-confirmation/${orderId}`);
        }
    };
    
    const selectedLocation = locations?.find(loc => loc.id === selectedLocationId);
    const { subtotal, taxes, total } = getCartTotal();

    useEffect(() => {
        // Only run this effect after the store has been hydrated on the client.
        if (_hasHydrated && !selectedLocationId) {
            router.replace('/menu');
        }
    }, [_hasHydrated, selectedLocationId, router]);


    // State 1: Hydrating. Show a full-page loader.
    if (!_hasHydrated) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Preparing your checkout...</p>
            </div>
        );
    }

    // State 2: Post-Hydration Check. If no location is selected after hydration, show a redirecting message.
    if (!selectedLocation) {
         return (
            <div className="flex flex-col h-screen items-center justify-center text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">No location selected, returning to menu...</p>
            </div>
        );
    }
    
    // State 3: Render the full checkout page.
    return (
        <div className="min-h-screen bg-muted/20">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left side - Form */}
                    <div>
                         <CheckoutForm onOrderSuccess={handleOrderSuccess} selectedLocation={selectedLocation} />
                    </div>

                    {/* Right side - Summary */}
                    <div className="order-first md:order-last">
                         <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className='space-y-4'>
                                    <div className="text-sm">
                                        <p className="font-semibold text-muted-foreground flex items-center gap-2"><MapPin className='h-4 w-4'/> Pickup Location</p>
                                        <p className='font-medium mt-1'>{selectedLocation.name}</p>
                                        <p className='text-xs text-muted-foreground'>{selectedLocation.address}, {selectedLocation.city}</p>
                                    </div>
                                
                                    <Separator />
                                
                                    <div className="space-y-2">
                                        {items.length > 0 ? items.map(item => (
                                            <div key={item.id} className="flex justify-between items-center text-sm">
                                                <div>
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-muted-foreground"> &times; {item.quantity}</span>
                                                </div>
                                                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        )) : (
                                            <p className='text-sm text-muted-foreground text-center py-4'>Your cart is empty.</p>
                                        )}
                                    </div>
                                    
                                    {items.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Subtotal</span>
                                                    <span>${subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Taxes (est.)</span>
                                                    <span>${taxes.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-base mt-2">
                                                    <span>Total</span>
                                                    <span>${total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                 <Button variant="outline" className="w-full" asChild>
                                    <Link href="/menu">
                                        Edit Cart
                                    </Link>
                                 </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
