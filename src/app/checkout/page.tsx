

'use client';

import { CheckoutForm } from '@/components/checkout-form';
import { useStore } from '@/hooks/use-store';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCheckoutData } from './checkout-layout-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin } from 'lucide-react';

export default function CheckoutPage() {
  const { cartItems, getCartTotal, selectedRetailerId } = useStore();
  const { locations } = useCheckoutData();
  const router = useRouter();

  const selectedRetailer = locations.find(loc => loc.id === selectedRetailerId);

  const { subtotal, taxes, total } = getCartTotal();

  const handleOrderSuccess = (orderId: string) => {
    // Redirect to a confirmation page with the order ID
    router.push(`/order-confirmation/${orderId}`);
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Checkout</h1>
           {!selectedRetailer && (
             <Alert variant="destructive">
              <MapPin className="h-4 w-4" />
              <AlertTitle>No Pickup Location Selected</AlertTitle>
              <AlertDescription>
                Please go back to the menu and select a dispensary.
              </AlertDescription>
            </Alert>
           )}
          <CheckoutForm onOrderSuccess={handleOrderSuccess} selectedRetailer={selectedRetailer!} />
        </div>
        <div className="space-y-6 rounded-lg bg-muted/50 p-6">
          <h2 className="text-2xl font-bold">Order Summary</h2>
          <div className="space-y-4">
            {cartItems.length > 0 ? cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            )) : (
              <p className="text-muted-foreground">Your cart is empty.</p>
            )}
          </div>
          <div className="py-4 border-t border-dashed">
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes (est.)</span>
                    <span>${taxes.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-semibold text-base pt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

