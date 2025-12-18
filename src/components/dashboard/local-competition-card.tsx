'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, MapPin, Tag, ExternalLink, RefreshCw } from 'lucide-react';
import { getLocalCompetition, type LocalCompetitionData } from '@/server/services/leafly-connector';

interface LocalCompetitionCardProps {
    state: string;
    city?: string;
    className?: string;
}

/**
 * Reusable component showing local competitive intel
 * For use in Brand and Dispensary dashboards
 */
export function LocalCompetitionCard({ state, city, className }: LocalCompetitionCardProps) {
    const [data, setData] = useState<LocalCompetitionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        if (!state) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await getLocalCompetition(state, city);
            setData(result);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [state, city]);

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Local Competition
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Local Competition
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Unable to load competitive data
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!data || (data.competitors.length === 0 && data.pricingByCategory.length === 0)) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Local Competition
                    </CardTitle>
                    <CardDescription>
                        {city ? `${city}, ${state}` : state}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No competitive data available for your area yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Local Competition
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadData}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {city ? `${city}, ${state}` : state}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Pricing Bands */}
                {data.pricingByCategory.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="h-4 w-4" />
                            Market Pricing
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {data.pricingByCategory.slice(0, 4).map(p => (
                                <div key={p.category} className="rounded-md border p-2">
                                    <div className="text-xs text-muted-foreground capitalize">{p.category}</div>
                                    <div className="text-sm font-medium">
                                        ${p.min.toFixed(0)} - ${p.max.toFixed(0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        avg ${p.avg.toFixed(0)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Nearby Competitors */}
                {data.competitors.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-medium">
                            Nearby Competitors ({data.competitors.length})
                        </div>
                        <div className="space-y-1">
                            {data.competitors.slice(0, 3).map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="truncate">{c.name}</span>
                                    {c.rating && (
                                        <Badge variant="secondary" className="text-xs">
                                            {c.rating}★
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Deals */}
                {data.activeDeals > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Tag className="h-4 w-4" />
                            Active Deals ({data.activeDeals})
                        </div>
                        <div className="space-y-1">
                            {data.topPromos.slice(0, 2).map((p, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{p.dispensaryName}:</span> {p.title}
                                    {p.discountPercent && (
                                        <Badge variant="outline" className="ml-1 text-xs">
                                            {p.discountPercent}% off
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Data Freshness */}
                {data.dataFreshness && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                        Updated: {data.dataFreshness.toLocaleDateString()}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
