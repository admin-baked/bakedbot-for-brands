/**
 * Age-Gated Menu Page
 * Wraps menu with simplified age verification + email capture
 */

'use client';

import { useState, useEffect } from 'react';
import { AgeGateSimpleWithEmail, isAgeVerified } from '@/components/compliance/age-gate-simple-with-email';

interface AgeGatedMenuProps {
    children: React.ReactNode;
    brandId?: string;
    dispensaryId?: string;
    source?: string;
}

export function AgeGatedMenu({ children, brandId, dispensaryId, source = 'menu' }: AgeGatedMenuProps) {
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
        return (
            <AgeGateSimpleWithEmail
                onVerified={() => setVerified(true)}
                brandId={brandId}
                dispensaryId={dispensaryId}
                source={source}
            />
        );
    }

    return <>{children}</>;
}
