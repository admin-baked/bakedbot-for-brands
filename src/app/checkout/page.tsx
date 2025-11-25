

'use client';

import { CheckoutForm } from '@/components/checkout-form';
import { useStore } from '@/hooks/use-store';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCheckoutData } from './checkout-layout-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin } from 'lucide-react';
import type { Retailer } from '@/types/domain';
import { useState, useMemo } from 'react';
import { applyCoupon } from './actions/applyCoupon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CheckoutPage() {
  const { cartItems, getCartTotal, selectedRetailerId } = useStore();
  const { locations } = useCheckoutData();
  const router = useRouter();
  const { toast } = useToast();

  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, amount: number} | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const selectedRetailer = locations.find((loc: Retailer) => loc.id === selectedRetailerId);

  const { subtotal } = getCartTotal();

  const totals = useMemo(() => {
    const discount = appliedDiscount?.amount ?? 0;
    const totalAfterDiscount = subtotal - discount;
    const taxes = totalAfterDiscount > 0 ? totalAfterDiscount * 0.15 : 0;
    const total = totalAfterDiscount + taxes;
    return { subtotal, discount, taxes, total };
  }, [subtotal, appliedDiscount]);


  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    // We need brandId to validate the coupon. We get it from the first item.
    if (cartItems.length === 0) return;
    const brandId = cartItems[0].brandId;

    setIsApplyingCoupon(true);
    const result = await applyCoupon(couponCode, { subtotal, brandId });
    setIsApplyingCoupon(false);

    if (result.success) {
        setAppliedDiscount({ code: result.code, amount: result.discountAmount });
        toast({ title: 'Coupon Applied!', description: result.message });
    } else {
        setAppliedDiscount(null);
        toast({ variant: 'destructive', title: 'Invalid Coupon', description: result.message });
    }
  };

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
          <CheckoutForm 
            onOrderSuccess={handleOrderSuccess} 
            selectedRetailer={selectedRetailer!} 
            couponCode={appliedDiscount?.code}
          />
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
          <div className="space-y-2 pt-4">
            <div className="flex gap-2">
                <Input 
                    placeholder="Enter coupon code" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value)}
                    disabled={isApplyingCoupon || !!appliedDiscount}
                />
                <Button 
                    onClick={handleApplyCoupon} 
                    disabled={isApplyingCoupon || !couponCode.trim() || !!appliedDiscount}
                >
                    Apply
                </Button>
            </div>
             {appliedDiscount && (
                <p className="text-sm text-primary">Coupon &quot;{appliedDiscount.code}&quot; applied!</p>
             )}
          </div>
          <div className="py-4 border-t border-dashed">
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                 {appliedDiscount && (
                    <div className="flex justify-between text-primary">
                        <span className="font-medium">Discount</span>
                        <span>-${totals.discount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes (est.)</span>
                    <span>${totals.taxes.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-semibold text-base pt-2">
                    <span>Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
