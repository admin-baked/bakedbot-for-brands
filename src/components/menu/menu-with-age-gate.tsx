/**
 * Menu with Simplified Age Gate Wrapper
 *
 * Reusable wrapper that adds simplified age verification (Yes/No) + email capture to any menu page.
 * Now features streamlined flow with first-order discount incentive.
 *
 * Used by:
 * - BakedBot-hosted brand pages (bakedbot.ai/thrivesyracuse)
 * - Custom domain brand pages (ecstaticedibles.com)
 * - Dispensary menu pages
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { AgeGateSimpleWithEmail, isAgeVerified } from '@/components/compliance/age-gate-simple-with-email';

interface MenuWithAgeGateProps {
    children: ReactNode;
    brandId?: string;
    dispensaryId?: string;
    source?: string;
}

export function MenuWithAgeGate({
    children,
    brandId,
    dispensaryId,
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
                <AgeGateSimpleWithEmail
                    onVerified={() => setShowAgeGate(false)}
                    brandId={brandId}
                    dispensaryId={dispensaryId}
                    source={source}
                />
            )}
            {children}
        </>
    );
}
