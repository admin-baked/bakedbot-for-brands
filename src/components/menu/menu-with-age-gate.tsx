/**
 * Menu with Age Gate Wrapper
 *
 * Reusable wrapper that adds age verification + email capture to any menu page.
 * Used by:
 * - BakedBot-hosted brand pages (bakedbot.ai/thrivesyracuse)
 * - Custom domain brand pages (ecstaticedibles.com)
 * - Dispensary menu pages
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { AgeGateWithEmail, isAgeVerified } from '@/components/compliance/age-gate-with-email';

interface MenuWithAgeGateProps {
    children: ReactNode;
    brandId?: string;
    dispensaryId?: string;
    state?: string; // Two-letter state code
    source?: string;
}

export function MenuWithAgeGate({
    children,
    brandId,
    dispensaryId,
    state = 'IL',
    source = 'menu'
}: MenuWithAgeGateProps) {
    const [showAgeGate, setShowAgeGate] = useState(false);

    useEffect(() => {
        if (!isAgeVerified()) {
            setShowAgeGate(true);
        }
    }, []);

    return (
        <>
            {showAgeGate && (
                <AgeGateWithEmail
                    onVerified={() => setShowAgeGate(false)}
                    brandId={brandId}
                    dispensaryId={dispensaryId}
                    state={state}
                    source={source}
                />
            )}
            {children}
        </>
    );
}
