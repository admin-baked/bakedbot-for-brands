'use client';

// src/components/checkout/age-verification.tsx
/**
 * Age verification component for cannabis purchases
 * Validates user is 21+ and stores verification in session
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertCircle, ShieldCheck } from 'lucide-react';

type AgeVerificationProps = {
    onVerified: () => void;
    onCancel?: () => void;
};

export function AgeVerification({ onVerified, onCancel }: AgeVerificationProps) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [year, setYear] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        // Check if already verified in this session
        const verified = sessionStorage.getItem('age_verified');
        if (verified === 'true') {
            onVerified();
        } else {
            setOpen(true);
        }
    }, [onVerified]);

    const calculateAge = (birthDate: Date): number => {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    };

    const handleVerify = () => {
        setError('');
        setIsVerifying(true);

        // Validate inputs
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);

        if (!monthNum || !dayNum || !yearNum) {
            setError('Please enter a complete date of birth');
            setIsVerifying(false);
            return;
        }

        if (monthNum < 1 || monthNum > 12) {
            setError('Month must be between 1 and 12');
            setIsVerifying(false);
            return;
        }

        if (dayNum < 1 || dayNum > 31) {
            setError('Day must be between 1 and 31');
            setIsVerifying(false);
            return;
        }

        const currentYear = new Date().getFullYear();
        if (yearNum < 1900 || yearNum > currentYear) {
            setError('Please enter a valid year');
            setIsVerifying(false);
            return;
        }

        // Create date and validate it's a real date
        const birthDate = new Date(yearNum, monthNum - 1, dayNum);
        if (
            birthDate.getMonth() !== monthNum - 1 ||
            birthDate.getDate() !== dayNum ||
            birthDate.getFullYear() !== yearNum
        ) {
            setError('Please enter a valid date');
            setIsVerifying(false);
            return;
        }

        // Check if future date
        if (birthDate > new Date()) {
            setError('Date of birth cannot be in the future');
            setIsVerifying(false);
            return;
        }

        // Calculate age
        const age = calculateAge(birthDate);

        if (age < 21) {
            setError('You must be at least 21 years old to purchase cannabis products');
            setIsVerifying(false);
            return;
        }

        // Store verification in session
        sessionStorage.setItem('age_verified', 'true');
        sessionStorage.setItem('age_verified_at', new Date().toISOString());

        // Success!
        setTimeout(() => {
            setIsVerifying(false);
            setOpen(false);
            onVerified();
        }, 500);
    };

    const handleCancel = () => {
        setOpen(false);
        onCancel?.();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-2xl">Age Verification Required</DialogTitle>
                    <DialogDescription className="text-center">
                        You must be 21 years or older to purchase cannabis products.
                        <br />
                        Please enter your date of birth to continue.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date of Birth
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <Input
                                    type="number"
                                    placeholder="MM"
                                    min="1"
                                    max="12"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="text-center"
                                    maxLength={2}
                                />
                                <p className="text-xs text-muted-foreground text-center">Month</p>
                            </div>
                            <div className="space-y-1">
                                <Input
                                    type="number"
                                    placeholder="DD"
                                    min="1"
                                    max="31"
                                    value={day}
                                    onChange={(e) => setDay(e.target.value)}
                                    className="text-center"
                                    maxLength={2}
                                />
                                <p className="text-xs text-muted-foreground text-center">Day</p>
                            </div>
                            <div className="space-y-1">
                                <Input
                                    type="number"
                                    placeholder="YYYY"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="text-center"
                                    maxLength={4}
                                />
                                <p className="text-xs text-muted-foreground text-center">Year</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        {onCancel && (
                            <Button variant="outline" onClick={handleCancel} className="flex-1">
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleVerify}
                            disabled={isVerifying || !month || !day || !year}
                            className="flex-1"
                        >
                            {isVerifying ? 'Verifying...' : 'Verify Age'}
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        By continuing, you confirm that the information provided is accurate and that you are
                        of legal age to purchase cannabis products.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Check if user has been age verified in this session
 */
export function isAgeVerified(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('age_verified') === 'true';
}

/**
 * Clear age verification (for testing or logout)
 */
export function clearAgeVerification(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('age_verified');
    sessionStorage.removeItem('age_verified_at');
}
