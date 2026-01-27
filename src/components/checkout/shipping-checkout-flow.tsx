'use client';

/**
 * Shipping Checkout Flow for Hemp E-Commerce
 * - Shipping address collection with state validation
 * - Free shipping
 * - Authorize.net credit card payment
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { useUser } from '@/firebase/auth/use-user';
import { PaymentCreditCard } from './payment-credit-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Truck, AlertTriangle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { ShippingAddress } from '@/types/orders';
import { logger } from '@/lib/logger';

// States where hemp shipping is restricted
const RESTRICTED_STATES = ['ID', 'MS', 'SD', 'NE', 'KS'];

// US States for dropdown
const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' }
];

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

interface ShippingCheckoutFlowProps {
    brandId: string;
}

export function ShippingCheckoutFlow({ brandId }: ShippingCheckoutFlowProps) {
    const { cartItems, getCartTotal, clearCart } = useStore();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [step, setStep] = useState<CheckoutStep>('shipping');
    const [loading, setLoading] = useState(false);
    const [stateError, setStateError] = useState<string | null>(null);

    // Customer & Shipping Details
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        email: '',
        phone: '',
    });

    const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
        street: '',
        street2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
    });

    useEffect(() => {
        if (user) {
            setCustomerDetails({
                name: user.displayName || '',
                email: user.email || '',
                phone: user.phoneNumber || '',
            });
        }
    }, [user]);

    const { total, subtotal, tax } = getCartTotal();

    // Check if selected state is restricted
    const isStateRestricted = RESTRICTED_STATES.includes(shippingAddress.state);

    const handleStateChange = (stateCode: string) => {
        setShippingAddress({ ...shippingAddress, state: stateCode });
        if (RESTRICTED_STATES.includes(stateCode)) {
            setStateError(`Sorry, we cannot ship to ${US_STATES.find(s => s.code === stateCode)?.name || stateCode} due to state regulations.`);
        } else {
            setStateError(null);
        }
    };

    const handleShippingSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!customerDetails.name || !customerDetails.email) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in your name and email.' });
            return;
        }

        if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
            toast({ variant: 'destructive', title: 'Missing Address', description: 'Please complete your shipping address.' });
            return;
        }

        if (isStateRestricted) {
            toast({ variant: 'destructive', title: 'Shipping Restricted', description: stateError || 'Cannot ship to this state.' });
            return;
        }

        setStep('payment');
    };

    const handleOrderSubmit = async (paymentData?: any) => {
        setLoading(true);
        try {
            // Call API route instead of server action for better production reliability
            const response = await fetch('/api/checkout/shipping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cartItems,
                    customer: customerDetails,
                    shippingAddress,
                    brandId,
                    paymentMethod: 'authorize_net',
                    paymentData,
                    total,
                }),
            });

            const result = await response.json();

            if (result.success) {
                clearCart();
                router.push(`/order-confirmation/${result.orderId}`);
            } else {
                logger.error('[ShippingCheckout] Order creation failed', {
                    error: result.error,
                    brandId,
                    total,
                    statusCode: response.status
                });
                toast({ variant: 'destructive', title: 'Order Failed', description: result.error });
            }
        } catch (error) {
            logger.error('[ShippingCheckout] Order submission error', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                brandId,
                total
            });
            const errorMessage = error instanceof Error ? error.message : 'Unable to process your order.';
            toast({ variant: 'destructive', title: 'Order Failed', description: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
                <div className={`flex items-center ${step === 'shipping' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step !== 'shipping' ? 'border-primary bg-primary text-primary-foreground' : 'border-primary'}`}>
                        {step !== 'shipping' ? <CheckCircle className="h-4 w-4" /> : '1'}
                    </div>
                    <span className="ml-2 font-medium">Shipping</span>
                </div>
                <div className="w-16 h-0.5 bg-muted mx-4" />
                <div className={`flex items-center ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === 'payment' || step === 'confirmation' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                        2
                    </div>
                    <span className="ml-2 font-medium">Payment</span>
                </div>
            </div>

            {step === 'shipping' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Shipping Information
                        </CardTitle>
                        <CardDescription>Enter your details for delivery.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleShippingSubmit}>
                        <CardContent className="space-y-6">
                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-sm text-muted-foreground">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={customerDetails.name}
                                            onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                                            placeholder="Jane Doe"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone (Optional)</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={customerDetails.phone}
                                            onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
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
                            </div>

                            {/* Shipping Address */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium text-sm text-muted-foreground">Shipping Address</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="street">Street Address</Label>
                                    <Input
                                        id="street"
                                        value={shippingAddress.street}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                                        placeholder="123 Main St"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="street2">Apt, Suite, etc. (Optional)</Label>
                                    <Input
                                        id="street2"
                                        value={shippingAddress.street2}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
                                        placeholder="Apt 4B"
                                    />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={shippingAddress.city}
                                            onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                            placeholder="San Francisco"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Select value={shippingAddress.state} onValueChange={handleStateChange}>
                                            <SelectTrigger id="state">
                                                <SelectValue placeholder="Select state" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {US_STATES.map((state) => (
                                                    <SelectItem
                                                        key={state.code}
                                                        value={state.code}
                                                        disabled={RESTRICTED_STATES.includes(state.code)}
                                                    >
                                                        {state.name} {RESTRICTED_STATES.includes(state.code) && '(Restricted)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="zip">ZIP Code</Label>
                                        <Input
                                            id="zip"
                                            value={shippingAddress.zip}
                                            onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                                            placeholder="94102"
                                            pattern="[0-9]{5}"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* State Restriction Warning */}
                            {stateError && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>{stateError}</AlertDescription>
                                </Alert>
                            )}

                            {/* Free Shipping Notice */}
                            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                                <Package className="h-5 w-5 text-green-600" />
                                <span className="text-green-700 dark:text-green-400 font-medium">Free Shipping on All Orders!</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isStateRestricted}>
                                Continue to Payment
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {step === 'payment' && (
                <div className="space-y-6">
                    {/* Order Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span>{item.name} x {item.quantity}</span>
                                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Tax</span>
                                    <span>${tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Shipping</span>
                                    <span>FREE</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p><strong>Shipping to:</strong></p>
                                <p>{shippingAddress.street}{shippingAddress.street2 ? `, ${shippingAddress.street2}` : ''}</p>
                                <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment */}
                    <PaymentCreditCard
                        amount={total}
                        onSuccess={(result) => handleOrderSubmit(result)}
                        onError={(err) => toast({ variant: 'destructive', title: 'Payment Failed', description: err })}
                    />

                    <Button variant="ghost" onClick={() => setStep('shipping')} className="w-full">
                        Back to Shipping
                    </Button>
                </div>
            )}
        </div>
    );
}
