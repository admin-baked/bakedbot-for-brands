/**
 * Simplified Age Gate - Yes/No Buttons
 *
 * Streamlined age verification without birthday input.
 * Always requires 21+ with no state-specific detection.
 *
 * Features:
 * - Two large buttons: "Yes, I'm 21+" and "No, I'm under 21"
 * - 24-hour localStorage verification
 * - Polite rejection message for underage users
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, PartyPopper, X } from 'lucide-react';
import { logger } from '@/lib/logger';

interface AgeGateSimpleProps {
    onVerified: () => void;
}

export function AgeGateSimple({ onVerified }: AgeGateSimpleProps) {
    const [showUnderage, setShowUnderage] = useState(false);

    const handleYes = () => {
        try {
            // Store age verification in localStorage (24-hour expiration)
            const verification = {
                verified: true,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            localStorage.setItem('age_verified', JSON.stringify(verification));

            logger.info('[AgeGateSimple] User verified as 21+');
            onVerified();
        } catch (err) {
            logger.error('[AgeGateSimple] Failed to store verification', {
                error: err instanceof Error ? err.message : String(err)
            });
            // Still allow through even if localStorage fails
            onVerified();
        }
    };

    const handleNo = () => {
        logger.info('[AgeGateSimple] User indicated under 21');
        setShowUnderage(true);
    };

    if (showUnderage) {
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
