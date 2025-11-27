/**
 * Age-Gated Menu Page
 * Wraps menu with age verification
 */

'use client';

import { useState, useEffect } from 'react';
import { AgeGate, isAgeVerified } from '@/components/compliance/age-gate';

export function AgeGatedMenu({ children }: { children: React.ReactNode }) {
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setVerified(isAgeVerified());
        setLoading(false);
    }, []);

    if (loading) {
        return null; // Or loading spinner
    }

    if (!verified) {
        return <AgeGate onVerified={() => setVerified(true)} />;
    }

    return <>{children}</>;
}
