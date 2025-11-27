'use client';

// src/components/checkout/checkout-flow.tsx
/**
 * Main checkout flow component
 * Orchestrates age verification, customer details, and payment
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { useUser } from '@/firebase/auth/use-user';
import { AgeVerification, isAgeVerified } from './age-verification';
import { PaymentSmokey } from './payment-smokey';
import { PaymentCreditCard } from './payment-credit-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, MapPin, User, CreditCard, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '@/app/checkout/actions/createOrder';
import { useRouter } from 'next/navigation';

type CheckoutStep = 'details' | 'payment' | 'confirmation';

export function CheckoutFlow() {
    const { cartItems, getCartTotal, selectedRetailerId, clearCart } = useStore();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [step, setStep] = useState<CheckoutStep>('details');
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(false);

    // Customer Details
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        email: '',
        phone: '',
    });

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'cannpay'>('card');
    const [paymentResult, setPaymentResult] = useState<any>(null);

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

    const { total } = getCartTotal();

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
            const result = await createOrder({
                items: cartItems,
                customer: customerDetails,
                retailerId: selectedRetailerId!,
                paymentMethod: paymentMethod === 'card' ? 'authorize_net' : (paymentMethod === 'cannpay' ? 'cannpay' : 'cash'),
                paymentData,
                total,
            });

            if (result.success) {
                clearCart();
                router.push(`/order-confirmation/${result.orderId}`);
            } else {
                toast({ variant: 'destructive', title: 'Order Failed', description: result.error });
            }
        } catch (error) {
            console.error('Order submission error:', error);
            toast({ variant: 'destructive', title: 'Order Failed', description: 'Something went wrong. Please try again.' });
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
                        <Button onClick={() => setVerified(false)} className="w-full">
                            Verify Age
                        </Button>
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

            {step === 'payment' && (
                <div className="space-y-6">
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
                                                Pay Online (SmokeyPay / CannPay)
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
