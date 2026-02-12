'use client';

/**
 * Top Pairings Component
 *
 * Shows best-performing product pairings with conversion rates,
 * revenue impact, and pairing reasoning.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Sparkles, Leaf, DollarSign } from 'lucide-react';
import { getUpsellAnalytics } from '@/server/actions/upsell-analytics';
import type { TopPairing } from '@/server/actions/upsell-analytics';
import type { UpsellStrategy } from '@/types/upsell';

interface TopPairingsProps {
    orgId: string;
}

const STRATEGY_ICONS: Record<UpsellStrategy, typeof Leaf> = {
    terpene_pairing: Leaf,
    effect_stacking: Sparkles,
    category_complement: ArrowRight,
    potency_ladder: TrendingUp,
    clearance: DollarSign,
    margin_boost: DollarSign,
    bundle_match: ArrowRight,
    popular_pairing: TrendingUp,
};

const STRATEGY_COLORS: Record<UpsellStrategy, string> = {
    terpene_pairing: 'bg-purple-100 text-purple-800',
    effect_stacking: 'bg-blue-100 text-blue-800',
    category_complement: 'bg-green-100 text-green-800',
    potency_ladder: 'bg-orange-100 text-orange-800',
    clearance: 'bg-red-100 text-red-800',
    margin_boost: 'bg-yellow-100 text-yellow-800',
    bundle_match: 'bg-pink-100 text-pink-800',
    popular_pairing: 'bg-teal-100 text-teal-800',
};

export function TopPairings({ orgId }: TopPairingsProps) {
    const [loading, setLoading] = useState(true);
    const [pairings, setPairings] = useState<TopPairing[]>([]);

    useEffect(() => {
        async function loadPairings() {
            setLoading(true);
            try {
                const data = await getUpsellAnalytics(orgId);
                setPairings(data.topPairings);
            } catch (error) {
                console.error('Failed to load top pairings:', error);
            } finally {
                setLoading(false);
            }
        }
        loadPairings();
    }, [orgId]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Best Performing Pairings</CardTitle>
                    <CardDescription>
                        Top product recommendations by conversion rate and revenue impact
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pairings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No pairing data yet. Upsell conversions will appear here as they occur.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pairings.map((pairing, index) => {
                            const StrategyIcon = STRATEGY_ICONS[pairing.strategy];
                            const strategyColor = STRATEGY_COLORS[pairing.strategy];

                            return (
                                <div
                                    key={index}
                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-medium text-sm">
                                                    {pairing.anchorProduct}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {pairing.anchorCategory}
                                                </Badge>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">
                                                    {pairing.suggestedProduct}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {pairing.suggestedCategory}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={`text-xs ${strategyColor}`}>
                                                    <StrategyIcon className="h-3 w-3 mr-1" />
                                                    {pairing.strategy.replace(/_/g, ' ')}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {pairing.reason}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600">
                                                {pairing.conversionRate}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                conversion rate
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Impressions:</span>
                                            <span className="ml-2 font-medium">
                                                {pairing.impressions.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Conversions:</span>
                                            <span className="ml-2 font-medium">
                                                {pairing.conversions.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Revenue:</span>
                                            <span className="ml-2 font-medium text-green-600">
                                                ${pairing.revenue.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
