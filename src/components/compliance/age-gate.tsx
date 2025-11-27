/**
 * Age Gate Component
 * Verifies user age before allowing access to cannabis products
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface AgeGateProps {
    onVerified: () => void;
    minimumAge?: number;
}

export function AgeGate({ onVerified, minimumAge = 21 }: AgeGateProps) {
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [year, setYear] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate inputs
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        const yearNum = parseInt(year);

        if (!monthNum || !dayNum || !yearNum) {
            setError('Please enter a valid date');
            return;
        }

        if (monthNum < 1 || monthNum > 12) {
            setError('Please enter a valid month (1-12)');
            return;
        }

        if (dayNum < 1 || dayNum > 31) {
            setError('Please enter a valid day');
            return;
        }

        if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
            setError('Please enter a valid year');
            return;
        }

        // Calculate age
        const birthDate = new Date(yearNum, monthNum - 1, dayNum);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < minimumAge) {
            setError(`You must be at least ${minimumAge} years old to access this site`);
            return;
        }

        // Store verification in localStorage (expires in 24 hours)
        const verification = {
            verified: true,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        localStorage.setItem('age_verified', JSON.stringify(verification));

        onVerified();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <AlertCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Age Verification Required</CardTitle>
                    <CardDescription>
                        You must be {minimumAge} or older to access this site
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Date of Birth</Label>
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
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full">
                            Verify Age
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
