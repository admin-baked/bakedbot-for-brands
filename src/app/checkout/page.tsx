
'use client';
export const dynamic = 'force-dynamic';

import { useStore } from '@/hooks/use-store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import Header from '@/app/components/header';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutForm } from '@/app/checkout/components/checkout-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useMenuData } from '@/hooks/use-menu-data';
import { Footer } from '../components/footer';
import { useHydrated } from '@/hooks/useHydrated';
import { Skeleton } from '@/components/ui/skeleton';

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  
  // Subscribe to state from the unified store
  const { cartItems, getCartTotal, clearCart, selectedRetailerId } = useStore();
  const { locations: retailers, isLoading: isMenuLoading } = useMenuData();
  
  const selectedRetailer = retailers.find(loc => loc.id === selectedRetailerId);
  const { subtotal, taxes, total } = getCartTotal();

  const handleOrderSuccess = (orderId: string, userId?: string) => {
    if (orderId) {
        clearCart();
        const confirmationUrl = `/order-confirmation/${orderId}`;
        router.push(confirmationUrl);
    }
  };

  const isLoading = isMenuLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading checkout...</p>
      </div>
    );
  }
  
  if (hydrated && cartItems.length === 0) {
      return (
          <div className="min-h-screen bg-muted/20 flex flex-col">
              <Header />
              <main className="container mx-auto px-4 py-8 text-center flex-1">
                  <Card className="max-w-md mx-auto">
                      <CardHeader>
                          <CardTitle>Your Cart is Empty</CardTitle>
                          <CardDescription>Add some products to your cart to get started.</CardDescription>
                      </CardHeader>
                      <CardFooter>
                          <Button asChild className="w-full">
                              <Link href="/">
                                  Return to Menu
                              </Link>
                          </Button>
                      </CardFooter>
                  </Card>
              </main>
              <Footer />
          </div>
      )
  }
  
  // Final safety check before rendering - this prevents a crash if the location lookup fails
  if (!selectedRetailer) {
     return (
       <div className="flex flex-col h-screen items-center justify-center text-center py-20">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-muted-foreground mt-4">Validating location...</p>
         <p className="text-destructive text-sm mt-2">No location selected. Please go back and select a location.</p>
          <Button asChild variant="outline" className="mt-4">
              <Link href="/">
                  Return to Menu
              </Link>
          </Button>
       </div>
     );
  }

  // Render checkout
  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Form */}
          <div>
             <CheckoutForm onOrderSuccess={handleOrderSuccess} selectedRetailer={selectedRetailer} />
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
                            <p className='font-medium mt-1'>{selectedRetailer.name}</p>
                            <p className='text-xs text-muted-foreground'>{selectedRetailer.address}, {selectedRetailer.city}</p>
                        </div>
                    
                        <Separator />

                        {!hydrated ? (
                          <div className="space-y-4">
                            <div className="flex justify-between"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-16" /></div>
                            <div className="flex justify-between"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-16" /></div>
                            <Separator />
                            <div className="flex justify-between"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-24" /></div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                                {cartItems.length > 0 ? cartItems.map(item => (
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
                            
                            {cartItems.length > 0 && (
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
                          </>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                     <Button variant="outline" className="w-full" asChild>
                        <Link href="/">
                            Edit Cart
                        </Link>
                     </Button>
                </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

    