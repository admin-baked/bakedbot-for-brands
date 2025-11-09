
'use client';

import { useStore } from '@/hooks/use-store';
import { useCart } from '@/hooks/use-cart';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Header from '@/app/menu/components/header';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutForm } from '@/app/menu/components/checkout-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useMenuData } from '@/hooks/use-menu-data';

export default function CheckoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'checking' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Subscribe to state
  const { _hasHydrated, selectedLocationId } = useStore();
  const { locations } = useMenuData();
  const { items: cart, getCartTotal, clearCart } = useCart();
  
  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) {
      setStatus('loading');
      return;
    }
    
    setStatus('checking');
    
    // Small delay to ensure state is fully updated
    const timer = setTimeout(() => {
      // Check prerequisites
      if (!selectedLocationId) {
        setErrorMessage('No location selected. Redirecting...');
        setStatus('error');
        setTimeout(() => router.replace('/menu?error=no-location'), 2000);
        return;
      }
      
      if (locations.length === 0) {
        setErrorMessage('Locations not loaded. Redirecting...');
        setStatus('error');
        setTimeout(() => router.replace('/menu?error=no-locations'), 2000);
        return;
      }
      
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
      if (!selectedLocation) {
        setErrorMessage('Selected location could not be found. Redirecting...');
        setStatus('error');
        setTimeout(() => router.replace('/menu?error=location-not-found'), 2000);
        return;
      }
      
      if (cart.length === 0) {
        setErrorMessage('Your cart is empty. Redirecting...');
        setStatus('error');
        setTimeout(() => router.replace('/menu?error=empty-cart'), 2000);
        return;
      }
      
      setStatus('ready');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [_hasHydrated, selectedLocationId, locations, cart.length, router]);
  
  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const { subtotal, taxes, total } = getCartTotal();

  const handleOrderSuccess = (orderId: string) => {
    if (orderId) {
        clearCart();
        router.push(`/order-confirmation/${orderId}`);
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
  if (status === 'ready' && !selectedLocation) {
     return (
       <div className="flex flex-col h-screen items-center justify-center text-center py-20">
         <Loader2 className="h-8 w-8 animate-spin text-destructive" />
         <p className="text-destructive mt-4">Selected location not found. Redirecting...</p>
       </div>
     );
  }


  // Render checkout
  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
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
