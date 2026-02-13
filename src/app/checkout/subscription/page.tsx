'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { findPricingPlan } from '@/lib/config/pricing';
import { PaymentCreditCard } from '@/components/checkout/payment-credit-card';
import { createSubscription } from '../actions/createSubscription';

import { validateCoupon } from '../actions/validateCoupon';

function SubscriptionCheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const planId = searchParams?.get('plan') || '';
    const plan = planId ? findPricingPlan(planId) : undefined;

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'details' | 'payment'>('details');
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        email: '',
        phone: '',
    });

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountValue: number; discountType: 'percentage' | 'fixed' } | null>(null);
    const [finalPrice, setFinalPrice] = useState(plan?.price);

    useEffect(() => {
        if (plan?.price !== null && plan?.price !== undefined) {
            setFinalPrice(plan.price);
            return;
        }
        setFinalPrice(undefined);
    }, [plan?.id, plan?.price]);

    if (!planId) {
        if (typeof window !== 'undefined') {
            router.replace('/pricing');
        }
        return (
            <div className="max-w-3xl mx-auto text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h1 className="text-2xl font-semibold">Redirecting to pricing...</h1>
                <p className="text-muted-foreground mt-2">Select a plan first, then continue to checkout.</p>
                <div className="mt-6">
                    <Button asChild>
                        <Link href="/pricing">Go to Pricing</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-destructive">Invalid Plan Selected</h1>
                <Link href="/pricing"><Button variant="link">Back to Pricing</Button></Link>
            </div>
        );
    }

    if (plan.price === null) {
        return (
            <div className="text-center py-12 space-y-4">
                <h1 className="text-2xl font-bold">Custom Plan</h1>
                <p className="text-muted-foreground">The {plan.name} plan requires a custom quote from sales.</p>
                <div className="flex items-center justify-center gap-3">
                    <Link href="/pricing"><Button variant="outline">Back to Pricing</Button></Link>
                    <Link href="/get-started"><Button>Contact Sales</Button></Link>
                </div>
            </div>
        );
    }

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) return;
        const normalizedCode = couponCode.trim().toUpperCase();

        setIsValidatingCoupon(true);
        try {
            const result = await validateCoupon(normalizedCode, plan.id);
            if (result.isValid) {
                setAppliedCoupon({
                    code: normalizedCode,
                    discountValue: result.discountValue || 0,
                    discountType: result.discountType || 'fixed'
                });
                setCouponCode(normalizedCode);
                setFinalPrice(result.newPrice);
                toast({ title: 'Coupon Applied', description: `Discount applied successfully!` });
            } else {
                setAppliedCoupon(null);
                setFinalPrice(plan.price);
                toast({ variant: 'destructive', title: 'Invalid Coupon', description: result.message });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to validate coupon.' });
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('payment');
    };

    const handleSubscriptionSubmit = async (paymentData?: any) => {
        setLoading(true);
        try {
            const result = await createSubscription({
                planId: plan.id,
                customer: customerDetails,
                paymentData,
                couponCode: appliedCoupon ? appliedCoupon.code : undefined
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Subscription created successfully!' });
                // Redirect to a success page or dashboard
                router.push(`/onboarding?subscription=${result.subscriptionId}`);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unable to process subscription. Please verify your payment information and try again.';
            toast({ variant: 'destructive', title: 'Subscription Error', description: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="md:col-span-1 order-2 md:order-2">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between font-medium">
                            <span>{plan.name} Plan</span>
                            <span>{plan.priceDisplay}</span>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Discount ({appliedCoupon.code})</span>
                                <span>
                                    {appliedCoupon.discountType === 'fixed'
                                        ? `-$${appliedCoupon.discountValue}`
                                        : `-${appliedCoupon.discountValue}%`}
                                </span>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">{plan.desc}</p>
                        <ul className="text-sm space-y-2 pt-2 border-t">
                            {plan.features.map(f => (
                                <li key={f} className="flex gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4 font-bold">
                        <span>Total Due Today</span>
                        <span>{finalPrice === 0 ? 'Free' : `$${finalPrice?.toFixed(2)}`}</span>
                    </CardFooter>
                </Card>
            </div>

            {/* Checkout Form */}
            <div className="md:col-span-2 order-1 md:order-1 space-y-6">
                {step === 'details' ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Details</CardTitle>
                            <CardDescription>Create your account for {plan.name}.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleDetailsSubmit}>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        required
                                        value={customerDetails.name}
                                        onChange={e => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={customerDetails.email}
                                        onChange={e => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        value={customerDetails.phone}
                                        onChange={e => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full">Continue to Payment</Button>
                            </CardFooter>
                        </form>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <Button variant="ghost" onClick={() => setStep('details')} className="pl-0">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
                        </Button>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex gap-2 items-end">
                                    <div className="grid w-full gap-1.5">
                                        <Label htmlFor="coupon">Promo Code</Label>
                                        <Input
                                            id="coupon"
                                            placeholder="Enter code"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            disabled={!!appliedCoupon}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (appliedCoupon) {
                                                setAppliedCoupon(null);
                                                setCouponCode('');
                                                setFinalPrice(plan.price);
                                            } else {
                                                handleValidateCoupon();
                                            }
                                        }}
                                        disabled={isValidatingCoupon || (!couponCode && !appliedCoupon)}
                                    >
                                        {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : (appliedCoupon ? 'Remove' : 'Apply')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {finalPrice && finalPrice > 0 ? (
                            <PaymentCreditCard
                                amount={finalPrice}
                                onSuccess={handleSubscriptionSubmit}
                                onError={(err) => toast({ variant: 'destructive', title: 'Payment Failed', description: err })}
                            />
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Confirm Free Subscription</CardTitle>
                                    <CardDescription>No payment required for the Free plan.</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => handleSubscriptionSubmit()} disabled={loading} className="w-full">
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Free Trial"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SubscriptionCheckoutPage() {
    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <div className="mb-8">
                <Link href="/pricing" className="flex items-center text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Plans
                </Link>
            </div>

            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <SubscriptionCheckoutContent />
            </Suspense>
        </div>
    );
}
