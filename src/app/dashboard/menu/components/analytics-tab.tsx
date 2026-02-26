'use client';

/**
 * MenuAnalyticsTab
 *
 * Dashboard analytics widgets for the menu:
 * 1. Category Performance Table (sortable, color-coded margin)
 * 2. SKU Rationalization Flags (alert list of slow-moving items)
 * 3. Price Tier Distribution (horizontal stacked visual)
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getMenuAnalytics, type MenuAnalyticsData } from '@/server/actions/dispensary-analytics';

interface Props {
    orgId: string;
}

type SortKey = 'category' | 'revenue' | 'marginPct' | 'velocity' | 'daysOnHand' | 'skuCount';

function AskPopsButton({ message }: { message: string }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-primary gap-1"
            onClick={() => {
                window.location.href = `/dashboard/inbox?message=${encodeURIComponent(message)}`;
            }}
        >
            <MessageSquare className="h-3 w-3" />
            Ask Pops →
        </Button>
    );
}

function WidgetSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 mt-1" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[180px] w-full" />
            </CardContent>
        </Card>
    );
}

/** Color-code margin % */
function marginColor(pct: number): string {
    if (pct >= 0.55) return 'text-green-400';
    if (pct >= 0.40) return 'text-amber-400';
    return 'text-red-400';
}

export function MenuAnalyticsTab({ orgId }: Props) {
    const [data, setData] = useState<MenuAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('revenue');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getMenuAnalytics(orgId).then(result => {
            if (cancelled) return;
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error ?? 'Failed to load menu analytics');
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [orgId]);

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <WidgetSkeleton key={i} />)}
            </div>
        );
    }

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error ?? 'No data available'}</AlertDescription>
            </Alert>
        );
    }

    // Sorted category performance
    const sortedCategories = [...data.categoryPerformance].sort((a, b) => {
        const av = a[sortKey] as number;
        const bv = b[sortKey] as number;
        return sortDir === 'desc' ? bv - av : av - bv;
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return null;
        return sortDir === 'desc'
            ? <ChevronDown className="h-3 w-3 inline ml-0.5" />
            : <ChevronUp className="h-3 w-3 inline ml-0.5" />;
    };

    // Price tier bar widths
    const maxPct = Math.max(...data.priceTierDistribution.map(t => t.revenuePct), 0.01);
    const tierColors: Record<string, string> = {
        Value: 'bg-blue-500',
        Mid: 'bg-emerald-500',
        Premium: 'bg-purple-500',
    };

    return (
        <div className="space-y-4">
            {/* 1. Category Performance Table */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm">Category Performance</CardTitle>
                            <CardDescription className="text-xs">Click column headers to sort. Margin: 🟢≥55% 🟡40-55% 🔴&lt;40%</CardDescription>
                        </div>
                        <AskPopsButton message="Which menu categories should I expand and which should I rationalize based on margin and velocity?" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground border-b border-white/10">
                                    {(
                                        [
                                            ['category', 'Category'],
                                            ['revenue', 'Revenue (30d)'],
                                            ['marginPct', 'Margin %'],
                                            ['velocity', 'Units/Day'],
                                            ['daysOnHand', 'Days on Hand'],
                                            ['skuCount', 'SKUs'],
                                        ] as [SortKey, string][]
                                    ).map(([key, label]) => (
                                        <th
                                            key={key}
                                            className={cn(
                                                'pb-2 font-medium cursor-pointer hover:text-foreground transition-colors text-right first:text-left',
                                                sortKey === key && 'text-foreground'
                                            )}
                                            onClick={() => handleSort(key)}
                                        >
                                            {label}
                                            <SortIcon k={key} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedCategories.map(row => (
                                    <tr key={row.category}>
                                        <td className="py-2 pr-4 font-medium">{row.category}</td>
                                        <td className="py-2 pr-4 text-right">${row.revenue.toLocaleString()}</td>
                                        <td className={cn('py-2 pr-4 text-right font-medium', marginColor(row.marginPct))}>
                                            {(row.marginPct * 100).toFixed(0)}%
                                        </td>
                                        <td className="py-2 pr-4 text-right text-muted-foreground">{row.velocity}</td>
                                        <td className="py-2 pr-4 text-right text-muted-foreground">
                                            {row.daysOnHand === 999 ? '—' : row.daysOnHand}
                                        </td>
                                        <td className="py-2 text-right text-muted-foreground">{row.skuCount}</td>
                                    </tr>
                                ))}
                                {sortedCategories.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                                            No category data — connect your POS to populate analytics
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* 2. SKU Rationalization Flags */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                SKU Rationalization
                            </CardTitle>
                            <CardDescription className="text-xs">Slow-moving SKUs that need markdown or liquidation action</CardDescription>
                        </div>
                        <AskPopsButton message="Create a markdown pricing plan for my slow-moving inventory to free up shelf space" />
                    </div>
                </CardHeader>
                <CardContent>
                    {data.skuRationalizationFlags.length === 0 ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            All SKUs healthy — no immediate rationalization needed
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.skuRationalizationFlags.map(sku => (
                                <div
                                    key={sku.productId}
                                    className={cn(
                                        'flex items-center justify-between p-3 rounded-lg border text-sm',
                                        sku.action === 'liquidate'
                                            ? 'bg-red-500/10 border-red-500/20'
                                            : 'bg-amber-500/10 border-amber-500/20'
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{sku.name}</p>
                                        <p className="text-xs text-muted-foreground">{sku.category} · {sku.daysSinceLastSale === 999 ? 'Never sold' : `${sku.daysSinceLastSale}d since last sale`}</p>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4 shrink-0">
                                        <span className="text-xs text-muted-foreground">${sku.estimatedAtRisk.toLocaleString()} at risk</span>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-xs capitalize',
                                                sku.action === 'liquidate'
                                                    ? 'border-red-500/40 text-red-400'
                                                    : 'border-amber-500/40 text-amber-400'
                                            )}
                                        >
                                            {sku.action}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Price Tier Distribution */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm">Price Tier Distribution</CardTitle>
                            <CardDescription className="text-xs">Value (&lt;$20) · Mid ($20-$49) · Premium ($50+) by revenue share</CardDescription>
                        </div>
                        <AskPopsButton message="Is my price tier mix optimal for my market? Should I shift toward value or premium SKUs?" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {data.priceTierDistribution.map(tier => (
                        <div key={tier.tier} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{tier.tier}</span>
                                <span className="text-muted-foreground">{tier.skuCount} SKUs · {(tier.revenuePct * 100).toFixed(0)}% revenue</span>
                            </div>
                            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className={cn('h-full rounded-full transition-all', tierColors[tier.tier] ?? 'bg-primary')}
                                    style={{ width: `${(tier.revenuePct / maxPct) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {data.priceTierDistribution.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4">No price tier data available</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
