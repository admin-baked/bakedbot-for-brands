
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Search, TrendingUp, TrendingDown, Globe, CheckCircle,
    AlertCircle, FileText, Building2, Store, MapPin, Map,
    RefreshCw, ExternalLink, Target
} from 'lucide-react';

interface SeoKpisData {
    indexedPages: {
        zip: number;
        dispensary: number;
        brand: number;
        city: number;
        state: number;
        total: number;
    };
    claimMetrics: {
        totalUnclaimed: number;
        totalClaimed: number;
        claimRate: number;
        pendingClaims: number;
    };
    pageHealth: {
        freshPages: number;
        stalePages: number;
        healthScore: number;
    };
    searchConsole: {
        impressions: number | null;
        clicks: number | null;
        ctr: number | null;
        avgPosition: number | null;
        top3Keywords: number | null;
        top10Keywords: number | null;
        dataAvailable: boolean;
    };
    lastUpdated: Date;
}

interface MrrLadder {
    currentTier: string;
    nextMilestone: number;
    progress: number;
    claimsNeeded: number;
}

interface SeoKpisWidgetProps {
    data?: SeoKpisData;
    mrrLadder?: MrrLadder;
    currentMrr?: number;
    onRefresh?: () => void;
    isLoading?: boolean;
}

// Quick stat card
function StatCard({ label, value, icon: Icon, color = 'text-primary' }: {
    label: string;
    value: number | string;
    icon: any;
    color?: string;
}) {
    return (
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className={`p-2 rounded-lg bg-background ${color}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

export default function SeoKpisWidget({
    data,
    mrrLadder,
    currentMrr = 0,
    onRefresh,
    isLoading = false
}: SeoKpisWidgetProps) {
    // Mock data for when no data is provided
    const mockData: SeoKpisData = {
        indexedPages: { zip: 0, dispensary: 0, brand: 0, city: 0, state: 0, total: 0 },
        claimMetrics: { totalUnclaimed: 0, totalClaimed: 0, claimRate: 0, pendingClaims: 0 },
        pageHealth: { freshPages: 0, stalePages: 0, healthScore: 100 },
        searchConsole: { impressions: null, clicks: null, ctr: null, avgPosition: null, top3Keywords: null, top10Keywords: null, dataAvailable: false },
        lastUpdated: new Date()
    };

    const kpis = data || mockData;
    const ladder = mrrLadder || { currentTier: 'Pre-Launch', nextMilestone: 10000, progress: 0, claimsNeeded: 100 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        SEO KPIs
                    </h3>
                    <p className="text-sm text-muted-foreground">Organic growth metrics</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* MRR Ladder Progress */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{ladder.currentTier}</span>
                        </div>
                        <Badge variant="outline">
                            ${currentMrr.toLocaleString()} / ${ladder.nextMilestone.toLocaleString()}
                        </Badge>
                    </div>
                    <Progress value={ladder.progress} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">
                        {ladder.claimsNeeded > 0
                            ? `~${ladder.claimsNeeded} more Claim Pro needed for next milestone`
                            : 'Milestone reached! 🎉'}
                    </p>
                </CardContent>
            </Card>

            {/* Indexed Pages */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Indexed Pages
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <StatCard label="ZIPs" value={kpis.indexedPages.zip} icon={MapPin} color="text-blue-500" />
                        <StatCard label="Dispensaries" value={kpis.indexedPages.dispensary} icon={Store} color="text-green-500" />
                        <StatCard label="Brands" value={kpis.indexedPages.brand} icon={Building2} color="text-purple-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <StatCard label="Cities" value={kpis.indexedPages.city} icon={Map} color="text-orange-500" />
                        <StatCard label="States" value={kpis.indexedPages.state} icon={FileText} color="text-red-500" />
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg text-center">
                        <p className="text-3xl font-bold">{kpis.indexedPages.total.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Pages</p>
                    </div>
                </CardContent>
            </Card>

            {/* Claim Conversion */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Claim Conversion
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Claim Rate</span>
                        <span className="text-2xl font-bold">{kpis.claimMetrics.claimRate}%</span>
                    </div>
                    <Progress value={kpis.claimMetrics.claimRate} className="h-2" />
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-xl font-bold text-green-600">{kpis.claimMetrics.totalClaimed}</p>
                            <p className="text-xs text-muted-foreground">Claimed</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-amber-600">{kpis.claimMetrics.totalUnclaimed}</p>
                            <p className="text-xs text-muted-foreground">Unclaimed</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Page Health */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        {kpis.pageHealth.healthScore >= 80 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : kpis.pageHealth.healthScore >= 50 ? (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        Page Health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Health Score</span>
                        <Badge variant={kpis.pageHealth.healthScore >= 80 ? 'default' : kpis.pageHealth.healthScore >= 50 ? 'secondary' : 'destructive'}>
                            {kpis.pageHealth.healthScore}%
                        </Badge>
                    </div>
                    <Progress value={kpis.pageHealth.healthScore} className="h-2 mb-4" />
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                        <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                            <p className="font-semibold text-green-700">{kpis.pageHealth.freshPages}</p>
                            <p className="text-xs text-green-600">Fresh (7d)</p>
                        </div>
                        <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                            <p className="font-semibold text-red-700">{kpis.pageHealth.stalePages}</p>
                            <p className="text-xs text-red-600">Stale (30d+)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search Console Placeholder */}
            <Card className="border-dashed">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Search Console
                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </CardTitle>
                    <CardDescription>
                        Connect Google Search Console for impressions, clicks, and ranking data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {kpis.searchConsole.dataAvailable ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">{kpis.searchConsole.impressions?.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Impressions</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpis.searchConsole.clicks?.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Clicks</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpis.searchConsole.ctr}%</p>
                                <p className="text-xs text-muted-foreground">CTR</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpis.searchConsole.avgPosition}</p>
                                <p className="text-xs text-muted-foreground">Avg Position</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                                Search Console integration not configured.
                            </p>
                            <Button variant="outline" size="sm" disabled>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Connect Search Console
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Last Updated */}
            <p className="text-xs text-muted-foreground text-center">
                Last updated: {kpis.lastUpdated.toLocaleString()}
            </p>
        </div>
    );
}
