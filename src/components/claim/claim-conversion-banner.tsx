
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, Zap, AlertCircle, Clock } from 'lucide-react';

interface ClaimConversionBannerProps {
    entityType: 'dispensary' | 'brand';
    entityName: string;
    entitySlug: string;
    triggerType?: 'high_traffic' | 'multi_zip' | 'wide_distribution' | 'default';
    metrics?: {
        weeklyClicks?: number;
        zipCount?: number;
        retailerCount?: number;
        city?: string;
    };
    showFoundersOffer?: boolean;
    foundersRemaining?: number;
}

export default function ClaimConversionBanner({
    entityType,
    entityName,
    entitySlug,
    triggerType = 'default',
    metrics,
    showFoundersOffer = false,
    foundersRemaining = 75
}: ClaimConversionBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const claimUrl = entityType === 'dispensary'
        ? `/claim/dispensary/${entitySlug}`
        : `/claim/brand/${entitySlug}`;

    const getMessage = () => {
        // Variant A: Demand/traffic banner triggers
        // "You’re getting noticed. 75 Founders slots left"
        if (triggerType === 'high_traffic' || triggerType === 'default') {
            return {
                icon: <TrendingUp className="h-5 w-5 text-green-500" />,
                headline: 'You’re getting noticed.',
                subtext: 'This page is receiving organic traffic.',
                badge: `${foundersRemaining} Founders slots left`,
                cta: 'Claim to capture this demand →',
                secondaryCta: `Get Founders Pricing ($79/mo)`
            };
        }

        switch (triggerType) {
            case 'multi_zip':
                return {
                    icon: <Zap className="h-5 w-5 text-amber-500" />,
                    headline: `${entityName} appears in ${metrics?.zipCount || 'multiple'} areas`,
                    subtext: 'Customers are searching for you across multiple ZIP codes.',
                    badge: `${foundersRemaining} Founders slots left`,
                    cta: 'Claim to control your presence →',
                    secondaryCta: 'Get Founders Pricing ($79/mo)'
                };
            case 'wide_distribution':
                return {
                    icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
                    headline: `${entityName} has wide distribution`,
                    subtext: `Found at ${metrics?.retailerCount || 'many'} retailers. Own your brand page.`,
                    badge: `${foundersRemaining} Founders slots left`,
                    cta: 'Claim your brand page →',
                    secondaryCta: 'Get Founders Pricing ($79/mo)'
                };
            default:
                // Fallback (redundant due to first if, but kept for type safety)
                return {
                    icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
                    headline: 'You’re getting noticed.',
                    subtext: 'This page is receiving organic traffic.',
                    badge: `${foundersRemaining} Founders slots left`,
                    cta: 'Claim to capture this demand →',
                    secondaryCta: `Get Founders Pricing ($79/mo)`
                };
        }
    };

    const message = getMessage();

    return (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/5 relative overflow-hidden">
            {/* Dismiss button */}
            <button
                onClick={() => setDismissed(true)}
                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>

            <CardContent className="py-4 px-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                        {message.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{message.headline}</h3>
                            {showFoundersOffer && (
                                <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                    <Clock className="h-3 w-3" />
                                    {message.badge}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {message.subtext}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3">
                            <Link href={claimUrl}>
                                <Button size="sm" className="gap-1">
                                    {message.cta}
                                </Button>
                            </Link>
                            {showFoundersOffer && (
                                <Link href={`${claimUrl}?plan=founders`}>
                                    <Button size="sm" variant="outline" className="gap-1 bg-white">
                                        {message.secondaryCta}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
