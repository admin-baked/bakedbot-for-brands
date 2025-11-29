// [AI-THREAD P0-INT-DEEBO-AGEGATE]
// [Dev1-Claude @ 2025-11-29]:
//   Integrated Deebo state-aware age verification.
//   Now uses deeboCheckAge() to determine minAge based on state (18+ medical vs 21+ recreational).
//   Provides state-specific error messages for better UX.

/**
 * Age Gate Component
 * Verifies user age before allowing access to cannabis products
 * Uses Deebo compliance engine for state-specific age requirements
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { deeboCheckAge, deeboCheckStateAllowed } from '@/server/agents/deebo';

interface AgeGateProps {
    onVerified: () => void;
    state?: string; // Two-letter state code (e.g., "IL", "CA")
    minimumAge?: number; // Override if you want to bypass state detection
}

export function AgeGate({ onVerified, state, minimumAge }: AgeGateProps) {
    const [detectedMinAge, setDetectedMinAge] = useState(minimumAge || 21);
    const [stateName, setStateName] = useState('');
    const [stateBlocked, setStateBlocked] = useState(false);
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [year, setYear] = useState('');
    const [error, setError] = useState('');

    // Detect state-specific age requirement on mount
    useEffect(() => {
        if (!minimumAge && state) {
            // Check if state allows cannabis sales
            const stateCheck = deeboCheckStateAllowed(state);
            if (!stateCheck.allowed) {
                setStateBlocked(true);
                setError(stateCheck.reason || 'Cannabis sales are not available in your state');
                return;
            }

            // Get state-specific minimum age (18+ for medical, 21+ for recreational)
            const testDob = new Date(2000, 0, 1).toISOString().split('T')[0]; // Test DOB
            const ageCheck = deeboCheckAge(testDob, state);
            setDetectedMinAge(ageCheck.minAge);
        }
    }, [state, minimumAge]);

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

        // Create ISO date string for Deebo validation
        const dateOfBirth = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

        // Use Deebo for state-aware age validation
        const userState = state || 'IL'; // Default to IL if no state provided
        const ageCheck = deeboCheckAge(dateOfBirth, userState);

        if (!ageCheck.allowed) {
            setError(ageCheck.reason || `You must be at least ${detectedMinAge} years old to access this site`);
            return;
        }

        // Store verification in localStorage (expires in 24 hours)
        const verification = {
            verified: true,
            dateOfBirth,
            state: userState,
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
                        {stateBlocked
                            ? 'Cannabis sales are not available in your state'
                            : `You must be ${detectedMinAge} or older to access this site`
                        }
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

                        <Button type="submit" className="w-full" disabled={stateBlocked}>
                            {stateBlocked ? 'Not Available' : 'Verify Age'}
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
