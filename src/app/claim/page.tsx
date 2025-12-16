'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Building2, User, Mail, Phone, Loader2, ArrowLeft, ArrowRight, CreditCard, Lock } from 'lucide-react';
import { PlanSelectionCards } from '@/components/claim/plan-selection-cards';
import { useAcceptJs, formatCardNumber, formatExpiryDate, parseExpirationDate } from '@/hooks/useAcceptJs';

type PlanId = 'claim-pro' | 'founders-claim';

interface ClaimFormData {
    // Step 1: Business Info
    businessName: string;
    businessAddress: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    role: string;
    // Step 2: Plan Selection
    planId: PlanId;
}

interface PaymentFormData {
    cardNumber: string;
    expiry: string;
    cvv: string;
    zip: string;
}

function ClaimWizard() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [foundersRemaining, setFoundersRemaining] = useState<number>(247);

    // Accept.js integration
    const { isLoaded: acceptLoaded, isLoading: tokenizing, error: acceptError, tokenizeCard } = useAcceptJs({
        clientKey: process.env.NEXT_PUBLIC_AUTHNET_CLIENT_KEY || '',
        apiLoginId: process.env.NEXT_PUBLIC_AUTHNET_API_LOGIN_ID || ''
    });

    const [formData, setFormData] = useState<ClaimFormData>({
        businessName: '',
        businessAddress: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        role: '',
        planId: 'claim-pro'
    });

    const [paymentData, setPaymentData] = useState<PaymentFormData>({
        cardNumber: '',
        expiry: '',
        cvv: '',
        zip: ''
    });

    // Load founders claim count
    useEffect(() => {
        async function loadFoundersCount() {
            try {
                const { getFoundersClaimCount } = await import('@/server/actions/createClaimSubscription');
                const count = await getFoundersClaimCount();
                setFoundersRemaining(Math.max(0, 250 - count));
            } catch (e) {
                // Ignore errors, use default
            }
        }
        loadFoundersCount();
    }, []);

    useEffect(() => {
        const name = searchParams?.get('name');
        if (name) {
            setFormData(prev => ({ ...prev, businessName: name }));
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        let formattedValue = value;
        if (id === 'cardNumber') {
            formattedValue = formatCardNumber(value);
        } else if (id === 'expiry') {
            formattedValue = formatExpiryDate(value);
        } else if (id === 'cvv') {
            formattedValue = value.replace(/\D/g, '').substr(0, 4);
        } else if (id === 'zip') {
            formattedValue = value.replace(/\D/g, '').substr(0, 5);
        }

        setPaymentData({ ...paymentData, [id]: formattedValue });
    };

    const handlePlanSelect = (planId: PlanId) => {
        setFormData({ ...formData, planId });
    };

    const validateStep1 = () => {
        return formData.businessName && formData.contactName &&
            formData.contactEmail && formData.contactPhone;
    };

    const validatePayment = () => {
        const expiry = parseExpirationDate(paymentData.expiry);
        return (
            paymentData.cardNumber.replace(/\s/g, '').length >= 15 &&
            expiry !== null &&
            paymentData.cvv.length >= 3 &&
            paymentData.zip.length === 5
        );
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!validatePayment()) {
            setError('Please fill in all payment fields correctly');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Parse expiration date
            const expiry = parseExpirationDate(paymentData.expiry);
            if (!expiry) {
                throw new Error('Invalid expiration date');
            }

            // Tokenize card with Accept.js
            const opaqueData = await tokenizeCard({
                cardNumber: paymentData.cardNumber,
                expirationMonth: expiry.month,
                expirationYear: expiry.year,
                cvv: paymentData.cvv
            });

            // Call the server action to create the claim with subscription
            const { createClaimWithSubscription } = await import('@/server/actions/createClaimSubscription');

            const result = await createClaimWithSubscription({
                ...formData,
                opaqueData,
                zip: paymentData.zip
            });

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || 'Failed to submit claim');
            }
        } catch (err: any) {
            setError(acceptError || err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container flex min-h-screen flex-col items-center justify-center py-12">
                <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Claim Submitted!</CardTitle>
                        <CardDescription>
                            We've received your claim request for <strong>{formData.businessName}</strong>.
                            {formData.planId === 'founders-claim' && (
                                <span className="block mt-2 text-orange-600 font-medium">
                                    🔥 Your Founders Claim rate is locked in!
                                </span>
                            )}
                            <span className="block mt-2">
                                Our team will verify your ownership within 24-48 hours.
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button asChild>
                            <a href="/">Return Home</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-3xl py-12">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight">Claim Your Business</h1>
                <p className="mt-2 text-muted-foreground">
                    Take control of your listing and unlock powerful features
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8 flex items-center justify-center gap-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${step >= s
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                            {s}
                        </div>
                        <span className={`text-sm hidden sm:inline ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {s === 1 ? 'Business Info' : s === 2 ? 'Select Plan' : 'Payment'}
                        </span>
                        {s < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                ))}
            </div>

            <Card>
                {/* Step 1: Business Info */}
                {step === 1 && (
                    <>
                        <CardHeader>
                            <CardTitle>Business Information</CardTitle>
                            <CardDescription>
                                Tell us about your business to start the verification process.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="businessName">Business Name</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="businessName"
                                            className="pl-9"
                                            placeholder="e.g. Green Planet Dispensary"
                                            value={formData.businessName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="businessAddress">Address</Label>
                                    <Input
                                        id="businessAddress"
                                        placeholder="e.g. 123 Main St, Los Angeles, CA"
                                        value={formData.businessAddress}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-medium">Contact Information</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="contactName">Your Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="contactName"
                                                className="pl-9"
                                                placeholder="John Doe"
                                                value={formData.contactName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role">Your Role</Label>
                                        <Input
                                            id="role"
                                            placeholder="e.g. Owner, Manager"
                                            value={formData.role}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="contactEmail">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="contactEmail"
                                                type="email"
                                                className="pl-9"
                                                placeholder="john@example.com"
                                                value={formData.contactEmail}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="contactPhone">Phone</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="contactPhone"
                                                type="tel"
                                                className="pl-9"
                                                placeholder="(555) 123-4567"
                                                value={formData.contactPhone}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleNext} disabled={!validateStep1()}>
                                    Continue to Plan Selection
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Step 2: Plan Selection */}
                {step === 2 && (
                    <>
                        <CardHeader>
                            <CardTitle>Choose Your Plan</CardTitle>
                            <CardDescription>
                                Select the plan that works best for your business.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <PlanSelectionCards
                                selectedPlan={formData.planId}
                                onSelectPlan={handlePlanSelect}
                                foundersRemaining={foundersRemaining}
                            />

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={handleBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button onClick={handleNext}>
                                    Continue to Payment
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Step 3: Payment */}
                {step === 3 && (
                    <>
                        <CardHeader>
                            <CardTitle>Complete Your Subscription</CardTitle>
                            <CardDescription>
                                Enter your payment details to activate your {formData.planId === 'founders-claim' ? 'Founders Claim' : 'Claim Pro'} subscription.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Order Summary */}
                            <div className="rounded-lg bg-muted/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{formData.businessName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formData.planId === 'founders-claim' ? 'Founders Claim' : 'Claim Pro'} Subscription
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">
                                            ${formData.planId === 'founders-claim' ? '79' : '99'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">/month</p>
                                    </div>
                                </div>
                            </div>

                            {/* Secure Payment Badge */}
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Lock className="h-4 w-4" />
                                <span>Secured by Authorize.Net</span>
                            </div>

                            {/* Payment Form */}
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cardNumber">Card Number</Label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="cardNumber"
                                            className="pl-9"
                                            placeholder="4111 1111 1111 1111"
                                            value={paymentData.cardNumber}
                                            onChange={handlePaymentChange}
                                            maxLength={19}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="expiry">Expiration</Label>
                                        <Input
                                            id="expiry"
                                            placeholder="MM/YY"
                                            value={paymentData.expiry}
                                            onChange={handlePaymentChange}
                                            maxLength={5}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="cvv">CVV</Label>
                                        <Input
                                            id="cvv"
                                            placeholder="123"
                                            type="password"
                                            value={paymentData.cvv}
                                            onChange={handlePaymentChange}
                                            maxLength={4}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="zip">Billing ZIP</Label>
                                        <Input
                                            id="zip"
                                            placeholder="12345"
                                            value={paymentData.zip}
                                            onChange={handlePaymentChange}
                                            maxLength={5}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={handleBack} disabled={loading}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || tokenizing || !acceptLoaded || !validatePayment()}
                                    className="min-w-[200px]"
                                >
                                    {loading || tokenizing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {tokenizing ? 'Securing...' : 'Processing...'}
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="mr-2 h-4 w-4" />
                                            Pay ${formData.planId === 'founders-claim' ? '79' : '99'}/mo
                                        </>
                                    )}
                                </Button>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                Your subscription will begin immediately. You can cancel anytime from your dashboard.
                                <br />
                                By subscribing, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}

export default function ClaimPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <ClaimWizard />
        </Suspense>
    );
}
