'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';

interface UpgradeGateProps {
    isFree: boolean;
    feature: string;
    children: ReactNode;
}

/**
 * Wraps dashboard page content — renders children for paid users,
 * shows an upgrade CTA card for free plan users.
 */
export function UpgradeGate({ isFree, feature, children }: UpgradeGateProps) {
    if (!isFree) return <>{children}</>;

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
            <div className="rounded-full bg-muted p-4 mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{feature} is a paid feature</h2>
            <p className="text-muted-foreground max-w-md mb-6">
                Upgrade your plan to unlock {feature} and dozens of other tools to grow your dispensary.
            </p>
            <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
                View Plans
            </Link>
        </div>
    );
}
