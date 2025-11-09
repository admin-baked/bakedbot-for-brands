'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/hooks/use-store';
import { useCart } from '@/hooks/use-cart';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Header from '@/app/menu/components/header';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutForm } from '@/app/menu/components/checkout-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  
  // Subscribe to individual pieces of state
  const hasHydrated = useStore((state) => state._hasHydrated);
  const selectedLocationId = useStore((state) => state.selectedLocationId);
  const locations = useStore((state) => state.locations);
  const { items: cart, getCartTotal, clearCart } = useCart();

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const { subtotal, taxes, total } = getCartTotal();

  const handleOrderSuccess = (orderId: string) => {
    if (orderId) {
        clearCart();
        router.push(`/order-confirmation/${orderId}`);
    }
  };
  
  // Wait for hydration, THEN check prerequisites
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    
    // Give it a tiny moment for state to stabilize
    const timer = setTimeout(() => {
      if (!selectedLocationId) {
        router.replace('/menu?error=no-location');
        return;
      }
      
      if (cart.length === 0) {
        router.replace('/menu?error=empty-cart');
        return;
      }
      
      setShowContent(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [hasHydrated, selectedLocationId, cart.length, router]);
  
  // Show loading during hydration or while checks are running
  if (!hasHydrated || !showContent) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Preparing your checkout...</p>
      </div>
    );
  }

  // Final safety check before rendering - this prevents a crash if the location lookup fails
  if (!selectedLocation) {
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
