'use client';

/**
 * Coverage Packs Pricing Component
 * Displays tiered pricing for competitive intelligence features
 */

import { useState } from 'react';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { COVERAGE_PACKS, type CoveragePack, type CoveragePackTier } from '@/types/subscriptions';

interface CoveragePacksProps {
    currentPack?: CoveragePackTier;
    onSelect?: (packId: CoveragePackTier) => void;
    loading?: boolean;
}

const TIER_ICONS: Record<CoveragePackTier, React.ReactNode> = {
    starter: <Zap className="w-6 h-6" />,
    pro: <Sparkles className="w-6 h-6" />,
    enterprise: <Building2 className="w-6 h-6" />,
};

const TIER_COLORS: Record<CoveragePackTier, string> = {
    starter: 'border-slate-200 bg-white',
    pro: 'border-green-500 bg-gradient-to-b from-green-50 to-white shadow-xl shadow-green-100',
    enterprise: 'border-slate-800 bg-gradient-to-b from-slate-900 to-slate-800 text-white',
};

export default function CoveragePacksPricing({ currentPack, onSelect, loading }: CoveragePacksProps) {
    const [selectedPack, setSelectedPack] = useState<CoveragePackTier | null>(null);

    const handleSelect = (packId: CoveragePackTier) => {
        setSelectedPack(packId);
        onSelect?.(packId);
    };

    return (
        <div className="py-12">
            <div className="text-center mb-12">
                <Badge variant="secondary" className="mb-4">Competitive Intelligence</Badge>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                    Choose Your Coverage Pack
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Track competitor prices, monitor inventory changes, and get AI-powered insights to stay ahead.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
                {COVERAGE_PACKS.map((pack) => (
                    <Card
                        key={pack.id}
                        className={cn(
                            'relative transition-all duration-300 hover:scale-105',
                            TIER_COLORS[pack.id],
                            currentPack === pack.id && 'ring-2 ring-green-500',
                            pack.recommended && 'scale-105'
                        )}
                    >
                        {pack.recommended && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge className="bg-green-500 text-white shadow-lg">Most Popular</Badge>
                            </div>
                        )}

                        <CardHeader className="text-center pb-4">
                            <div className={cn(
                                'w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center',
                                pack.id === 'enterprise' ? 'bg-white/10' : 'bg-slate-100'
                            )}>
                                {TIER_ICONS[pack.id]}
                            </div>
                            <CardTitle className="text-xl">{pack.name}</CardTitle>
                            <CardDescription className={pack.id === 'enterprise' ? 'text-slate-400' : ''}>
                                {pack.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-center">
                            <div className="mb-6">
                                <span className="text-4xl font-black">
                                    {pack.price === 0 ? 'Free' : `$${(pack.price / 100).toFixed(0)}`}
                                </span>
                                {pack.price > 0 && (
                                    <span className={cn(
                                        'text-sm',
                                        pack.id === 'enterprise' ? 'text-slate-400' : 'text-muted-foreground'
                                    )}>
                                        /month
                                    </span>
                                )}
                            </div>

                            <ul className="space-y-3 text-left">
                                {pack.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <Check className={cn(
                                            'w-5 h-5 flex-shrink-0 mt-0.5',
                                            pack.id === 'enterprise' ? 'text-green-400' : 'text-green-500'
                                        )} />
                                        <span className={cn(
                                            'text-sm',
                                            pack.id === 'enterprise' ? 'text-slate-300' : ''
                                        )}>
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>

                        <CardFooter>
                            <Button
                                className={cn(
                                    'w-full',
                                    pack.id === 'pro' && 'bg-green-600 hover:bg-green-700',
                                    pack.id === 'enterprise' && 'bg-white text-slate-900 hover:bg-slate-100'
                                )}
                                variant={pack.id === 'starter' ? 'outline' : 'default'}
                                disabled={loading || currentPack === pack.id}
                                onClick={() => handleSelect(pack.id)}
                            >
                                {currentPack === pack.id
                                    ? 'Current Plan'
                                    : pack.price === 0
                                        ? 'Get Started'
                                        : 'Upgrade Now'
                                }
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="text-center mt-12 text-sm text-muted-foreground">
                <p>All plans include 14-day free trial. Cancel anytime.</p>
            </div>
        </div>
    );
}
