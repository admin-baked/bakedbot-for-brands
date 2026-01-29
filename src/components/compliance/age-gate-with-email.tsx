/**
 * Age Gate with Email Capture
 *
 * Enhanced age verification that also captures email/phone for marketing.
 * Turns compliance friction into funnel growth - a key differentiator.
 *
 * Features:
 * - State-aware age verification (18+ medical, 21+ recreational)
 * - Optional email + phone capture
 * - Marketing consent checkboxes (TCPA/CAN-SPAM compliant)
 * - Stores leads in Firestore + triggers Craig welcome email
 * - Beautiful UI with value prop messaging
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Mail, Phone, Sparkles } from 'lucide-react';
import { verifyAgeForGate, checkStateAllowed, getMinimumAge } from '@/server/actions/age-verification';
import { captureEmailLead } from '@/server/actions/email-capture';
import { logger } from '@/lib/logger';

interface AgeGateWithEmailProps {
    onVerified: () => void;
    state?: string; // Two-letter state code (e.g., "IL", "CA")
    brandId?: string; // For brand-specific tracking
    dispensaryId?: string; // For dispensary-specific tracking
    source?: string; // Where they came from (e.g., "menu", "demo-shop", "homepage")
    minimumAge?: number; // Override if you want to bypass state detection
}

export function AgeGateWithEmail({
    onVerified,
    state,
    brandId,
    dispensaryId,
    source = 'website',
    minimumAge
}: AgeGateWithEmailProps) {
    const [detectedMinAge, setDetectedMinAge] = useState(minimumAge || 21);
    const [stateBlocked, setStateBlocked] = useState(false);

    // Age verification fields
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [year, setYear] = useState('');

    // Email capture fields (optional)
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [emailConsent, setEmailConsent] = useState(false);
    const [smsConsent, setSmsConsent] = useState(false);

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detect state-specific age requirement on mount
    useEffect(() => {
        async function checkState() {
            if (!minimumAge && state) {
                // Check if state allows cannabis sales
                const stateCheck = await checkStateAllowed(state);
                if (!stateCheck.allowed) {
                    setStateBlocked(true);
                    setError(stateCheck.reason || 'Cannabis sales are not available in your state');
                    return;
                }

                // Get state-specific minimum age
                const minAge = await getMinimumAge(state);
                setDetectedMinAge(minAge);
            }
        }

        checkState();
    }, [state, minimumAge]);

    const formatPhoneNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
            return [match[1], match[2], match[3]].filter(Boolean).join('-');
        }
        return value;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhone(formatted);
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Validate age inputs
            const monthNum = parseInt(month);
            const dayNum = parseInt(day);
            const yearNum = parseInt(year);

            if (!monthNum || !dayNum || !yearNum) {
                setError('Please enter a valid date of birth');
                setIsSubmitting(false);
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                setError('Please enter a valid month (1-12)');
                setIsSubmitting(false);
                return;
            }

            if (dayNum < 1 || dayNum > 31) {
                setError('Please enter a valid day');
                setIsSubmitting(false);
                return;
            }

            if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
                setError('Please enter a valid year');
                setIsSubmitting(false);
                return;
            }

            // Create ISO date string for age validation
            const dateOfBirth = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

            // Verify age using server action
            const userState = state || 'IL';
            const ageCheck = await verifyAgeForGate(dateOfBirth, userState);

            if (!ageCheck.allowed) {
                setError(ageCheck.reason || `You must be at least ${detectedMinAge} years old to access this site`);
                setIsSubmitting(false);
                return;
            }

            // Validate email if provided
            if (email && !validateEmail(email)) {
                setError('Please enter a valid email address');
                setIsSubmitting(false);
                return;
            }

            // Validate phone if provided
            if (phone && phone.replace(/\D/g, '').length !== 10) {
                setError('Please enter a valid 10-digit phone number');
                setIsSubmitting(false);
                return;
            }

            // Store age verification in localStorage
            const verification = {
                verified: true,
                dateOfBirth,
                state: userState,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            localStorage.setItem('age_verified', JSON.stringify(verification));

            // Capture email lead if provided (synchronously to catch errors)
            if (email || phone) {
                try {
                    const leadResult = await captureEmailLead({
                        email: email || undefined,
                        phone: phone ? phone.replace(/\D/g, '') : undefined,
                        firstName: firstName || undefined,
                        emailConsent,
                        smsConsent,
                        brandId,
                        dispensaryId,
                        state: userState,
                        source,
                        ageVerified: true,
                        dateOfBirth,
                    });

                    if (!leadResult.success) {
                        logger.error('[AgeGateWithEmail] Failed to capture lead', {
                            error: leadResult.error,
                            email,
                            phone,
                            source
                        });
                        // Show warning but still let them through
                        setError('Age verified! However, we couldn\'t save your contact info. You can still access the site.');
                        // Clear error after 5 seconds
                        setTimeout(() => setError(''), 5000);
                    } else {
                        logger.info('[AgeGateWithEmail] Successfully captured lead', {
                            leadId: leadResult.leadId,
                            source
                        });
                    }
                } catch (err) {
                    logger.error('[AgeGateWithEmail] Exception while capturing lead', {
                        error: err instanceof Error ? err.message : String(err),
                        email,
                        phone,
                        source
                    });
                    // Show warning but still let them through
                    setError('Age verified! However, we couldn\'t save your contact info. You can still access the site.');
                    // Clear error after 5 seconds
                    setTimeout(() => setError(''), 5000);
                }
            }

            setIsSubmitting(false);
            onVerified();
        } catch (err) {
            logger.error('[AgeGateWithEmail] Submission error', {
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            setError('Something went wrong. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <AlertCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Age Verification Required</CardTitle>
                    <CardDescription>
                        {stateBlocked
                            ? 'Cannabis sales are not available in your state'
                            : `You must be ${detectedMinAge} or older to access this site`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Date of Birth - REQUIRED */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Date of Birth <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Input
                                        type="number"
                                        placeholder="MM"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        min="1"
                                        max="12"
                                        required
                                        disabled={stateBlocked}
                                    />
                                </div>
                                <div>
                                    <Input
                                        type="number"
                                        placeholder="DD"
                                        value={day}
                                        onChange={(e) => setDay(e.target.value)}
                                        min="1"
                                        max="31"
                                        required
                                        disabled={stateBlocked}
                                    />
                                </div>
                                <div>
                                    <Input
                                        type="number"
                                        placeholder="YYYY"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        required
                                        disabled={stateBlocked}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Optional Lead Capture Section */}
                        {!stateBlocked && (
                            <div className="border-t border-border/40 pt-4 space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">Get exclusive deals & updates</span>
                                    <span className="text-xs">(Optional)</span>
                                </div>

                                {/* First Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-sm">
                                        First Name
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
                                        Email
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
                                                I agree to receive promotional emails. You can unsubscribe anytime.
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5" />
                                        Phone Number
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="555-123-4567"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        maxLength={12}
                                    />
                                    {phone && (
                                        <div className="flex items-start space-x-2 pt-1">
                                            <Checkbox
                                                id="smsConsent"
                                                checked={smsConsent}
                                                onCheckedChange={(checked) => setSmsConsent(checked as boolean)}
                                            />
                                            <label
                                                htmlFor="smsConsent"
                                                className="text-xs text-muted-foreground leading-tight cursor-pointer"
                                            >
                                                I agree to receive promotional texts. Message & data rates may apply. Reply STOP to opt out.
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground italic">
                                    💡 Be the first to know about new drops, exclusive deals, and special events
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={stateBlocked || isSubmitting}
                        >
                            {isSubmitting ? 'Verifying...' : stateBlocked ? 'Not Available' : 'Enter Site'}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            By entering this site, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </form>
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
