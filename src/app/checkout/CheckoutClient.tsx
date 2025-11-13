'use client';

import { useStore } from '@/hooks/use-store';
import { useCart } from '@/hooks/use-cart';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import Header from '@/app/components/header';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutForm } from '@/app/checkout/components/checkout-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useMenuData } from '@/hooks/use-menu-data';
import { Footer } from '../components/footer';

export default function CheckoutClient() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'checking' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Subscribe to state
  const { _hasHydrated, selectedLocationId } = useStore();
  const { locations, isLoading: isMenuLoading } = useMenuData();
  const { items: cart, getCartTotal, clearCart } = useCart();
  
  useEffect(() => {
    // Wait for hydration and menu data
    if (!_hasHydrated || isMenuLoading) {
      setStatus('loading');
      return;
    }
    
    // If the cart is already empty when the user lands here,
    // they probably just finished an order or came here by mistake.
    // Don't run the redirect logic, just show an empty checkout state.
    if (cart.length === 0) {
        setStatus('ready');
        return;
    }
    
    setStatus('checking');
    
    // Small delay to ensure state is fully updated
    const timer = setTimeout(() => {
      // Check prerequisites for a NEW checkout attempt
      if (!selectedLocationId) {
        setErrorMessage('No location selected. Redirecting...');
        setStatus('error');
        setTimeout(() => router.replace('/?error=no-location'), 2000);
        return;
      }
      
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
      if (!selectedLocation) {
        setErrorMessage('Selected location could not be found. Redirecting...');
        setStatus('error');
        setTimeout(() => router.replace('/?error=location-not-found'), 2000);
        return;
      }
      
      setStatus('ready');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [_hasHydrated, selectedLocationId, locations, isMenuLoading, cart.length, router]);
  
  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const { subtotal, taxes, total } = getCartTotal();

  const handleOrderSuccess = (orderId: string, userId?: string) => {
    if (orderId) {
        clearCart();
        const confirmationUrl = `/order-confirmation/${orderId}`;
        router.push(confirmationUrl);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading checkout...</p>
      </div>
    );
  }
  
  // Checking state
  if (status === 'checking') {
     return (
      <div className="flex flex-col h-screen items-center justify-center text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Preparing your checkout...</p>
      </div>
    );
  }
  
  // Error state
  if (status === 'error') {
     return (
      <div className="flex flex-col h-screen items-center justify-center text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
        <p className="text-destructive mt-4">{errorMessage}</p>
      </div>
    );
  }

  // Final safety check before rendering - this prevents a crash if the location lookup fails
  if (status === 'ready' && !selectedLocation && cart.length > 0) {
     return (
       <div className="flex flex-col h-screen items-center justify-center text-center py-20">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-muted-foreground mt-4">Validating location...</p>
       </div>
     );
  }

  if (cart.length === 0) {
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


  // Render checkout
  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Form */}
          <div>
             <CheckoutForm onOrderSuccess={handleOrderSuccess} selectedLocation={selectedLocation!} />
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
                            <p className='font-medium mt-1'>{selectedLocation!.name}</p>
                            <p className='text-xs text-muted-foreground'>{selectedLocation!.address}, {selectedLocation!.city}</p>
                        </div>
                    
                        <Separator />
                    
                        <div className="space-y-2">
                            {cart.length > 0 ? cart.map(item => (
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
                        
                        {cart.length > 0 && (
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
