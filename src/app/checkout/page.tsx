
'use client';

import { Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutForm } from '@/app/menu/components/checkout-form';
import Header from '@/app/menu/components/header';
import { useCart } from '@/hooks/use-cart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';

function CheckoutPageClient() {
    const { items, getCartTotal, clearCart } = useCart();
    const { locations } = useMenuData();
    const router = useRouter();
    const { selectedLocationId, _hasHydrated } = useStore(state => ({
        selectedLocationId: state.selectedLocationId,
        _hasHydrated: state._hasHydrated,
    }));
    
    const processedOrderId = useRef<string | null>(null);

    const handleOrderSuccess = (orderId: string) => {
        if (orderId && orderId !== processedOrderId.current) {
            processedOrderId.current = orderId;
            clearCart();
            router.push(`/order-confirmation/${orderId}`);
        }
    };
    
    const selectedLocation = locations?.find(loc => loc.id === selectedLocationId);
    const { subtotal, taxes, total } = getCartTotal();
    
    // REDIRECT FIX: Do not run redirect logic until the store has hydrated on the client.
    if (!_hasHydrated) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Preparing your checkout...</p>
            </div>
        );
    }
    
    // Now that we are hydrated, we can safely check for the location.
    if (!selectedLocationId || !selectedLocation) {
        router.replace('/menu');
        // Return loading state while redirecting
        return (
            <div className="flex flex-col h-screen items-center justify-center text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">No location selected, returning to menu...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-muted/20">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left side - Form */}
                    <div>
                        <Button variant="outline" size="sm" asChild className="mb-4">
                            <Link href="/menu">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Menu
                            </Link>
                        </Button>
                        <CheckoutForm onOrderSuccess={handleOrderSuccess} selectedLocation={selectedLocation} />
                    </div>

                    {/* Right side - Summary */}
                    <div className="order-first md:order-last">
                         <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="text-sm">
                                    <p className="font-semibold text-muted-foreground">Pickup Location</p>
                                    <p className='font-medium'>{selectedLocation.name}</p>
                                    <p className='text-xs text-muted-foreground'>{selectedLocation.address}, {selectedLocation.city}</p>
                                 </div>
                               
                                <div className="space-y-2 border-t pt-4">
                                    {items.length > 0 ? items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-muted-foreground"> &times; {item.quantity}</span>
                                            </div>
                                            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    )) : (
                                        <p className='text-sm text-muted-foreground'>Your cart is empty.</p>
                                    )}
                                </div>
                                
                                {items.length > 0 && (
                                    <div className="space-y-1 border-t pt-4 text-sm">
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
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}


export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <CheckoutPageClient />
        </Suspense>
    );
}
