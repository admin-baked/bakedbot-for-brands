/**
 * Simplified Age Gate with Email Capture
 *
 * Two-step age verification:
 * 1. Simple Yes/No age confirmation (always 21+)
 * 2. Optional email capture with first-order discount incentive
 *
 * Features:
 * - Streamlined Yes/No buttons (no birthday input)
 * - Optional email + name capture after verification
 * - 20% first-order discount offer
 * - Email marketing opt-in checkbox
 * - 24-hour localStorage verification
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, PartyPopper, X, Mail, Sparkles, Gift } from 'lucide-react';
import { captureEmailLead } from '@/server/actions/email-capture';
import { checkFirstOrderEligibility } from '@/lib/checkout/first-order-discount';
import { createFirstOrderCoupon } from '@/app/actions/first-order-coupon';
import { setAgeVerificationCookie } from '@/server/actions/age-verification';
import { logger } from '@/lib/logger';

interface AgeGateSimpleWithEmailProps {
    onVerified: () => void;
    brandId?: string;
    dispensaryId?: string;
    source?: string;
}

export function AgeGateSimpleWithEmail({
    onVerified,
    brandId,
    dispensaryId,
    source = 'menu'
}: AgeGateSimpleWithEmailProps) {
    const [step, setStep] = useState<'age-check' | 'email-capture' | 'underage'>('age-check');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [emailConsent, setEmailConsent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [discountCode, setDiscountCode] = useState<string | null>(null);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleYes = async () => {
        logger.info('[AgeGateSimpleWithEmail] User verified as 21+');
        // Verify immediately and let user into the site without blocking email capture
        const verification = {
            verified: true,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        localStorage.setItem('age_verified', JSON.stringify(verification));
        await setAgeVerificationCookie();
        onVerified();
    };

    const handleNo = () => {
        logger.info('[AgeGateSimpleWithEmail] User indicated under 21');
        setStep('underage');
    };

    const handleSkip = async () => {
        // Store age verification (client-side for UX)
        const verification = {
            verified: true,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        localStorage.setItem('age_verified', JSON.stringify(verification));

        // CRITICAL: Set HTTP-only cookie for server-side enforcement
        // This prevents bypass via JavaScript disabling
        await setAgeVerificationCookie();

        logger.info('[AgeGateSimpleWithEmail] User skipped email capture');
        onVerified();
    };

    const handleSubmitEmail = async () => {
        setError('');

        // Allow submission with just name (email optional for skip case)
        // But if email is provided, validate it
        if (email && !validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        try {
            // Store age verification (client-side for UX)
            const verification = {
                verified: true,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            localStorage.setItem('age_verified', JSON.stringify(verification));

            // CRITICAL: Set HTTP-only cookie for server-side enforcement
            // This prevents bypass via JavaScript disabling
            await setAgeVerificationCookie();

            // Check first-order discount eligibility and generate code
            let generatedDiscountCode: string | undefined;
            if (email && brandId) {
                try {
                    const eligibility = await checkFirstOrderEligibility(email, brandId);
                    if (eligibility.eligible && eligibility.discountCode) {
                        // Create the coupon in Firestore
                        await createFirstOrderCoupon(eligibility.discountCode, brandId);
                        generatedDiscountCode = eligibility.discountCode;
                        setDiscountCode(eligibility.discountCode);
                        localStorage.setItem('bakedbot_first_order_coupon', eligibility.discountCode);

                        logger.info('[AgeGateSimpleWithEmail] Generated first-order discount', {
                            email,
                            code: eligibility.discountCode
                        });
                    }
                } catch (err) {
                    logger.error('[AgeGateSimpleWithEmail] Error generating discount code', {
                        error: err instanceof Error ? err.message : String(err)
                    });
                    // Continue without discount if error occurs
                }
            }

            // Capture email lead if email provided
            if (email) {
                const leadResult = await captureEmailLead({
                    email,
                    firstName: firstName || undefined,
                    emailConsent,
                    smsConsent: false, // No SMS in simplified flow
                    brandId,
                    dispensaryId,
                    source,
                    ageVerified: true,
                    firstOrderDiscountCode: generatedDiscountCode,
                });

                if (!leadResult.success) {
                    logger.error('[AgeGateSimpleWithEmail] Failed to capture lead', {
                        error: leadResult.error,
                        email
                    });
                    // Show warning but still let them through
                    setError('Age verified! However, we couldn\'t save your contact info. You can still access the site.');
                    setTimeout(() => {
                        setIsSubmitting(false);
                        onVerified();
                    }, 3000);
                    return;
                } else {
                    logger.info('[AgeGateSimpleWithEmail] Successfully captured lead', {
                        leadId: leadResult.leadId,
                        email
                    });
                }
            }

            setIsSubmitting(false);
            onVerified();
        } catch (err) {
            logger.error('[AgeGateSimpleWithEmail] Submission error', {
                error: err instanceof Error ? err.message : String(err)
            });
            setError('Something went wrong. Please try again.');
            setIsSubmitting(false);
        }
    };

    // Underage screen
    if (step === 'underage') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
                <Card className="w-full max-w-md mx-4">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <X className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl">Access Restricted</CardTitle>
                        <CardDescription>
                            You must be 21 or older to access this site
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            We appreciate your honesty. Please come back when you're of legal age.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            By law, cannabis products are only available to adults 21 and older.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Email capture screen
    if (step === 'email-capture') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
                <Card className="w-full max-w-md mx-4">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Get 20% Off Your First Order!</CardTitle>
                        <CardDescription>
                            Enter your email to receive your exclusive discount code
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* First Name */}
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-sm">
                                    First Name <span className="text-xs text-muted-foreground">(Optional)</span>
                                </Label>
                                <Input
                                    id="firstName"
                                    type="text"
                                    placeholder="Your name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email <span className="text-xs text-muted-foreground">(Optional)</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                {email && (
                                    <div className="flex items-start space-x-2 pt-1">
                                        <Checkbox
                                            id="emailConsent"
                                            checked={emailConsent}
                                            onCheckedChange={(checked) => setEmailConsent(checked as boolean)}
                                        />
                                        <label
                                            htmlFor="emailConsent"
                                            className="text-xs text-muted-foreground leading-tight cursor-pointer"
                                        >
                                            I agree to receive promotional emails and my 20% discount code. You can unsubscribe anytime.
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                <p className="text-xs text-emerald-800 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Be the first to know about new drops, exclusive deals, and special events
                                </p>
                            </div>

                            {discountCode && (
                                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                                    Your first-order code is ready: <strong>{discountCode}</strong>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSubmitEmail}
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Get My Discount'}
                                </Button>
                                <Button
                                    onClick={handleSkip}
                                    variant="ghost"
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    Skip
                                </Button>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                By entering this site, you agree to our Terms of Service and Privacy Policy
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Age check screen (initial)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <AlertCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Age Verification Required</CardTitle>
                    <CardDescription>
                        You must be 21 or older to access this site
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-center text-sm font-semibold mb-4">
                        Are you 21 years of age or older?
                    </p>

                    <Button
                        onClick={handleYes}
                        className="w-full h-14 text-lg font-semibold"
                        size="lg"
                    >
                        <PartyPopper className="mr-2 h-5 w-5" />
                        Yes, I'm 21 or older
                    </Button>

                    <Button
                        onClick={handleNo}
                        variant="outline"
                        className="w-full h-14 text-lg"
                        size="lg"
                    >
                        <X className="mr-2 h-5 w-5" />
                        No, I'm under 21
                    </Button>

                    <p className="text-xs text-center text-muted-foreground pt-4">
                        By entering this site, you agree to our Terms of Service and Privacy Policy
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Check if user has valid age verification
 */
export function isAgeVerified(): boolean {
    if (typeof window === 'undefined') return false;

    const stored = localStorage.getItem('age_verified');
    if (!stored) return false;

    try {
        const verification = JSON.parse(stored);
        return verification.verified && Date.now() < verification.expiresAt;
    } catch {
        return false;
    }
}
