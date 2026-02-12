'use client';

// src/components/checkout/checkout-flow.tsx
/**
 * Main checkout flow component
 * Orchestrates age verification, customer details, and payment
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/hooks/use-store';
import { useUser } from '@/firebase/auth/use-user';
import { AgeVerification, isAgeVerified } from './age-verification';
import { PaymentSmokey } from './payment-smokey';
import { PaymentCreditCard } from './payment-credit-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, CreditCard, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '@/app/checkout/actions/createOrder';
import { submitOrder } from '@/app/checkout/actions/submitOrder';
import { applyCoupon } from '@/app/checkout/actions/applyCoupon';
import { useRouter } from 'next/navigation';

import { logger } from '@/lib/logger';
import { ProductUpsellRow } from '@/components/upsell/product-upsell-row';
import { fetchCheckoutUpsells } from '@/server/actions/upsell';
import type { Product } from '@/types/domain';

type CheckoutStep = 'details' | 'payment' | 'confirmation';

export function CheckoutFlow() {
    const { cartItems, getCartTotal, selectedRetailerId, clearCart, addToCart, addToCartForShipping, purchaseMode, selectedBrandId } = useStore();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [step, setStep] = useState<CheckoutStep>('details');
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
    const [couponValidatedSubtotal, setCouponValidatedSubtotal] = useState<number | null>(null);
    const [couponValidatedBrandId, setCouponValidatedBrandId] = useState<string | null>(null);

    // Customer Details
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        email: '',
        phone: '',
    });

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'cannpay'>('card');

    useEffect(() => {
        setVerified(isAgeVerified());

        if (user) {
            setCustomerDetails({
                name: user.displayName || '',
                email: user.email || '',
                phone: user.phoneNumber || '',
            });
        }
    }, [user]);

    useEffect(() => {
        if (selectedRetailerId && paymentMethod === 'card') {
            setPaymentMethod('cash');
        }

        if (!selectedRetailerId && (paymentMethod === 'cash' || paymentMethod === 'cannpay')) {
            setPaymentMethod('card');
        }
    }, [selectedRetailerId, paymentMethod]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedCouponCode = localStorage.getItem('bakedbot_first_order_coupon');
        if (storedCouponCode) {
            setCouponCode(storedCouponCode);
        }
    }, []);

    const { subtotal } = getCartTotal();
    const currentBrandId = cartItems[0]?.brandId || null;

    const cartItemIds = cartItems.map((item) => item.id);
    const fetchUpsells = useCallback(() => {
        if (!currentBrandId || cartItemIds.length === 0) {
            return Promise.resolve({ suggestions: [], placement: 'checkout' as const, generatedAt: Date.now() });
        }
        return fetchCheckoutUpsells(cartItemIds, currentBrandId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentBrandId, cartItemIds.join(',')]);

    const handleAddUpsellToCart = useCallback((product: Product) => {
        if (purchaseMode === 'shipping' && selectedBrandId) {
            addToCartForShipping(product, selectedBrandId);
        } else if (selectedRetailerId) {
            addToCart(product, selectedRetailerId);
        }
    }, [purchaseMode, selectedBrandId, selectedRetailerId, addToCart, addToCartForShipping]);
    const discount = Number((appliedCoupon?.discountAmount || 0).toFixed(2));
    const discountedSubtotal = Number(Math.max(0, subtotal - discount).toFixed(2));
    const tax = Number((discountedSubtotal * 0.15).toFixed(2));
    const total = Number((discountedSubtotal + tax).toFixed(2));

    useEffect(() => {
        const subtotalChanged = couponValidatedSubtotal !== null && Math.abs(subtotal - couponValidatedSubtotal) > 0.01;
        const brandChanged = couponValidatedBrandId !== null && currentBrandId !== couponValidatedBrandId;

        if (appliedCoupon && (subtotalChanged || brandChanged)) {
            setAppliedCoupon(null);
            setCouponValidatedSubtotal(null);
            setCouponValidatedBrandId(null);
        }
    }, [subtotal, currentBrandId, appliedCoupon, couponValidatedSubtotal, couponValidatedBrandId]);

    const handleApplyCoupon = async () => {
        const normalizedCode = couponCode.trim().toUpperCase();
        if (!normalizedCode) {
            toast({ variant: 'destructive', title: 'Coupon Required', description: 'Enter a coupon code first.' });
            return;
        }

        const brandId = currentBrandId;
        if (!brandId) {
            toast({ variant: 'destructive', title: 'Coupon Error', description: 'Could not resolve brand for coupon validation.' });
            return;
        }

        setIsApplyingCoupon(true);
        try {
            const result = await applyCoupon(normalizedCode, { subtotal, brandId });
            if (!result.success) {
                toast({ variant: 'destructive', title: 'Invalid Coupon', description: result.message });
                return;
            }

            setAppliedCoupon({
                code: result.code,
                discountAmount: result.discountAmount,
            });
            setCouponValidatedSubtotal(subtotal);
            setCouponValidatedBrandId(brandId);
            setCouponCode(result.code);
            if (typeof window !== 'undefined') {
                localStorage.setItem('bakedbot_first_order_coupon', result.code);
            }
            toast({
                title: 'Coupon Applied',
                description: `${result.code} saved $${result.discountAmount.toFixed(2)} on this order.`,
            });
        } catch (error) {
            logger.error('[Checkout] Coupon validation failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            toast({ variant: 'destructive', title: 'Coupon Error', description: 'Unable to validate coupon right now.' });
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponValidatedSubtotal(null);
        setCouponValidatedBrandId(null);
    };

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerDetails.name || !customerDetails.email || !customerDetails.phone) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in all details.' });
            return;
        }
        setStep('payment');
    };

    const handleOrderSubmit = async (paymentData?: any) => {
        setLoading(true);
        try {
            if (!selectedRetailerId) {
                toast({ variant: 'destructive', title: 'Retailer Required', description: 'Please choose a pickup location before checkout.' });
                return;
            }

            const brandId = currentBrandId;
            if (!brandId) {
                toast({ variant: 'destructive', title: 'Order Failed', description: 'Unable to determine brand for this order.' });
                return;
            }

            if (paymentMethod === 'cannpay') {
                const result = await submitOrder({
                    items: cartItems,
                    customer: customerDetails,
                    retailerId: selectedRetailerId,
                    organizationId: brandId,
                    couponCode: appliedCoupon?.code,
                });

                if (result.ok && result.orderId) {
                    clearCart();
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('bakedbot_first_order_coupon');
                    }

                    if (result.checkoutUrl) {
                        if (result.checkoutUrl.startsWith('/')) {
                            router.push(result.checkoutUrl);
                        } else {
                            window.location.assign(result.checkoutUrl);
                        }
                        return;
                    }

                    router.push(`/order-confirmation/${result.orderId}`);
                } else {
                    toast({ variant: 'destructive', title: 'Order Failed', description: result.error || 'Unable to start Smokey Pay checkout.' });
                }
                return;
            }

            const result = await createOrder({
                items: cartItems,
                customer: customerDetails,
                retailerId: selectedRetailerId,
                brandId,
                couponCode: appliedCoupon?.code,
                paymentMethod: paymentMethod === 'card' ? 'authorize_net' : 'cash',
                paymentData,
                total,
            });

            if (result.success) {
                clearCart();
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('bakedbot_first_order_coupon');
                }
                router.push(`/order-confirmation/${result.orderId}`);
            } else {
                toast({ variant: 'destructive', title: 'Order Failed', description: result.error });
            }
        } catch (error) {
            logger.error('[Checkout] Order submission error', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                retailerId: selectedRetailerId,
                paymentMethod,
                total
            });
            const errorMessage = error instanceof Error ? error.message : 'Unable to process your order. Please check your payment information and try again.';
            toast({ variant: 'destructive', title: 'Order Failed', description: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    if (!verified) {
        return (
            <div className="max-w-md mx-auto py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Age Verification</CardTitle>
                        <CardDescription>Please verify your age to continue checkout.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Complete the date-of-birth check below to continue.
                        </p>
                    </CardContent>
                </Card>
                <AgeVerification onVerified={() => setVerified(true)} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
                <div className={`flex items-center ${step === 'details' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === 'details' || step === 'payment' || step === 'confirmation' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                        1
                    </div>
                    <span className="ml-2 font-medium">Details</span>
                </div>
                <div className="w-16 h-0.5 bg-muted mx-4" />
                <div className={`flex items-center ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === 'payment' || step === 'confirmation' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                        2
                    </div>
                    <span className="ml-2 font-medium">Payment</span>
                </div>
            </div>

            {step === 'details' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Information</CardTitle>
                        <CardDescription>Enter your details for order pickup.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleDetailsSubmit}>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={customerDetails.name}
                                    onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                                    placeholder="Jane Doe"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={customerDetails.email}
                                    onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                                    placeholder="jane@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={customerDetails.phone}
                                    onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                                    placeholder="(555) 123-4567"
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">Continue to Payment</Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {/* Last Chance Deals - Upsells before payment */}
            {step === 'details' && currentBrandId && (
                <div className="mt-4">
                    <ProductUpsellRow
                        heading="Last Chance Deals"
                        fetchUpsells={fetchUpsells}
                        onAddToCart={handleAddUpsellToCart}
                        compact
                    />
                </div>
            )}

            {step === 'payment' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coupon Code</CardTitle>
                            <CardDescription>Apply a valid promo code before placing your order.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="Enter coupon code"
                                    disabled={loading || isApplyingCoupon}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleApplyCoupon}
                                    disabled={loading || isApplyingCoupon || !couponCode.trim()}
                                >
                                    {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                </Button>
                            </div>
                            {appliedCoupon && (
                                <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
                                    <span>
                                        {appliedCoupon.code} applied (-${appliedCoupon.discountAmount.toFixed(2)})
                                    </span>
                                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                                        Remove
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-700">
                                    <span>Discount</span>
                                    <span>-${discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span>Tax</span>
                                <span>${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-base font-semibold">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Method</CardTitle>
                            <CardDescription>Choose how you'd like to pay.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                                {selectedRetailerId ? (
                                    // Dispensary / Cannabis Flow
                                    <>
                                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-2">
                                            <RadioGroupItem value="cannpay" id="cannpay" />
                                            <Label htmlFor="cannpay" className="flex-1 cursor-pointer flex items-center gap-2">
                                                <Smartphone className="h-4 w-4" />
                                                Smokey Pay (Secure Checkout)
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                            <RadioGroupItem value="cash" id="cash" />
                                            <Label htmlFor="cash" className="flex-1 cursor-pointer flex items-center gap-2">
                                                <DollarSignIcon className="h-4 w-4" />
                                                Pay at Pickup (Cash/Debit)
                                            </Label>
                                        </div>
                                    </>
                                ) : (
                                    // Hemp / Direct Flow
                                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                        <RadioGroupItem value="card" id="card" />
                                        <Label htmlFor="card" className="flex-1 cursor-pointer flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            Credit Card (Secure)
                                        </Label>
                                    </div>
                                )}
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* Render Payment Component based on selection */}
                    {paymentMethod === 'cannpay' && (
                        <PaymentSmokey
                            amount={total}
                            onSuccess={(result) => handleOrderSubmit(result)}
                            onError={(err) => toast({ variant: 'destructive', title: 'Payment Failed', description: err })}
                        />
                    )}

                    {paymentMethod === 'card' && !selectedRetailerId && (
                        <PaymentCreditCard
                            amount={total}
                            onSuccess={(result) => handleOrderSubmit(result)}
                            onError={(err) => toast({ variant: 'destructive', title: 'Payment Failed', description: err })}
                        />
                    )}

                    {paymentMethod === 'cash' && (
                        <Button
                            onClick={() => handleOrderSubmit()}
                            className="w-full"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Place Order for Pickup
                        </Button>
                    )}

                    <Button variant="ghost" onClick={() => setStep('details')} className="w-full">
                        Back to Details
                    </Button>
                </div>
            )}
        </div>
    );
}

function DollarSignIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
