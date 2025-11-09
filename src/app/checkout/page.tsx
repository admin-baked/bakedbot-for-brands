
'use client';

import { useMemo, Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckoutForm } from '@/app/menu/components/checkout-form';
import Header from '@/app/menu/components/header';
import { useCart } from '@/hooks/use-cart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMenuData } from '@/hooks/use-menu-data';

function CheckoutPageClient() {
    const { items, getCartTotal, clearCart } = useCart();
    const { locations } = useMenuData();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedLocationId = searchParams.get('locationId');
    const processedOrderId = useRef<string | null>(null);

    const selectedLocation = useMemo(() => {
        return locations?.find(loc => loc.id === selectedLocationId);
    }, [locations, selectedLocationId]);

    const { subtotal, taxes, total } = getCartTotal();

    const handleOrderSuccess = (orderId: string) => {
        if (orderId && orderId !== processedOrderId.current) {
            processedOrderId.current = orderId;
            clearCart();
            router.push(`/order/${orderId}?userId=guest`);
        }
    };
    
    // Redirect if location not selected or cart is empty
    useEffect(() => {
        if (!selectedLocationId || items.length === 0) {
            router.replace('/menu');
        }
    }, [selectedLocationId, items, router]);


    if (!selectedLocationId || !selectedLocation) {
         return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <h1 className="text-2xl font-bold">Location Not Selected</h1>
                <p className="text-muted-foreground mt-2">
                    Please return to the menu and select a pickup location to proceed.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/menu">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Menu
                    </Link>
                </Button>
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
