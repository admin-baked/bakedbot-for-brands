'use client';

/**
 * Competitive Intelligence Card Component
 *
 * Displays pricing recommendations from weekly competitive intelligence reports.
 * Shows market trends, top deals, and AI-generated pricing suggestions.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    Eye,
    Lightbulb,
    RefreshCw,
    ExternalLink,
    AlertTriangle,
    CheckCircle,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLatestCompetitiveIntel } from '@/server/actions/competitive-pricing';
import type { CompetitiveIntelSummary, PricingRecommendation } from '@/server/actions/competitive-pricing';

interface CompetitiveIntelCardProps {
    orgId: string;
    className?: string;
}

export function CompetitiveIntelCard({ orgId, className }: CompetitiveIntelCardProps) {
    const [loading, setLoading] = useState(true);
    const [intel, setIntel] = useState<CompetitiveIntelSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchIntel = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const result = await getLatestCompetitiveIntel(orgId);

            if (result.success && result.data) {
                setIntel(result.data);
                setError(null);
            } else {
                setError(result.error || 'Failed to load competitive intelligence');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchIntel();
        }
    }, [orgId]);

    const getPriorityIcon = (priority: PricingRecommendation['priority']) => {
        switch (priority) {
            case 'high':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'medium':
                return <Info className="h-4 w-4 text-amber-500" />;
            case 'low':
                return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        }
    };

    const getPriorityColor = (priority: PricingRecommendation['priority']) => {
        switch (priority) {
            case 'high':
                return 'destructive';
            case 'medium':
                return 'default';
            case 'low':
                return 'secondary';
        }
    };

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !intel) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-purple-500" />
                        Competitive Intelligence
                    </CardTitle>
                    <CardDescription>
                        AI-powered pricing recommendations from market analysis
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Eye className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">{error || 'No competitive intelligence available'}</p>
                        <p className="text-xs mt-1">Weekly reports are generated automatically via Ezal.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => fetchIntel(true)}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-purple-500" />
                            Competitive Intelligence
                        </CardTitle>
                        <CardDescription>
                            AI-powered recommendations from {intel.competitorsTracked} competitor(s) · {intel.totalDeals} deals tracked
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchIntel(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Top Deal Alert */}
                {intel.topDeal && (
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-3">
                            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                    Best Deal in Market
                                </p>
                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                    {intel.topDeal.competitor}: {intel.topDeal.deal} at <span className="font-semibold">${intel.topDeal.price.toFixed(2)}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pricing Recommendations */}
                {intel.pricingRecommendations.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Pricing Recommendations
                        </h4>
                        <div className="space-y-3">
                            {intel.pricingRecommendations.map((rec, index) => (
                                <div
                                    key={index}
                                    className="p-3 rounded-lg border bg-card"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {getPriorityIcon(rec.priority)}
                                            <span className="font-medium truncate">{rec.category}</span>
                                        </div>
                                        <Badge variant={getPriorityColor(rec.priority)} className="shrink-0">
                                            {rec.priority}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <span>Competitor Avg:</span>
                                            <span className="font-mono font-medium">${rec.competitorAvg.toFixed(2)}</span>
                                            <Badge variant="outline" className="ml-auto">
                                                {rec.marketPosition === 'above' && (
                                                    <>
                                                        <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                                                        Above Market
                                                    </>
                                                )}
                                                {rec.marketPosition === 'below' && (
                                                    <>
                                                        <TrendingDown className="h-3 w-3 mr-1 text-emerald-500" />
                                                        Below Market
                                                    </>
                                                )}
                                                {rec.marketPosition === 'competitive' && (
                                                    <>
                                                        <CheckCircle className="h-3 w-3 mr-1 text-blue-500" />
                                                        Competitive
                                                    </>
                                                )}
                                            </Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground italic">
                                            {rec.opportunity}
                                        </p>

                                        <div className="pt-2 mt-2 border-t">
                                            <p className="text-xs font-medium text-foreground">
                                                💡 {rec.suggestedAction}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Market Trends */}
                {intel.marketTrends.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-3">Market Trends</h4>
                        <div className="space-y-2">
                            {intel.marketTrends.slice(0, 3).map((trend, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                    <span className={cn(
                                        "shrink-0 mt-0.5",
                                        trend.impact === 'positive' && "text-emerald-500",
                                        trend.impact === 'negative' && "text-red-500",
                                        trend.impact === 'neutral' && "text-muted-foreground"
                                    )}>
                                        {trend.impact === 'positive' && '📈'}
                                        {trend.impact === 'negative' && '📉'}
                                        {trend.impact === 'neutral' && '➡️'}
                                    </span>
                                    <p className="text-muted-foreground">{trend.trend}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* General Recommendations */}
                {intel.recommendations.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-3">Ezal's Recommendations</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {intel.recommendations.slice(0, 3).map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-purple-500 shrink-0">•</span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* View Full Report */}
                <div className="pt-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open('/dashboard/competitive-intel', '_blank')}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Report
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                        Report generated: {new Date(intel.generatedAt).toLocaleDateString()}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
