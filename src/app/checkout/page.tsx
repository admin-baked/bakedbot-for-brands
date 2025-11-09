
'use client';

import { useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckoutForm } from '@/app/menu/components/checkout-form';
import Header from '@/app/menu/components/header';
import { useCart } from '@/hooks/use-cart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMenuData } from '@/hooks/use-menu-data';

function CheckoutPageClient() {
    const { items, getCartTotal } = useCart();
    const { locations } = useMenuData();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedLocationId = searchParams.get('locationId');

    const selectedLocation = useMemo(() => {
        return locations?.find(loc => loc.id === selectedLocationId);
    }, [locations, selectedLocationId]);

    const totals = getCartTotal();

    const handleOrderSuccess = (orderId: string) => {
        router.push(`/order/${orderId}?userId=guest`);
    };

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
                                            <span>${totals.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Taxes (est.)</span>
                                            <span>${(totals * 0.15).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-base mt-2">
                                            <span>Total</span>
                                            <span>${(totals * 1.15).toFixed(2)}</span>
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
