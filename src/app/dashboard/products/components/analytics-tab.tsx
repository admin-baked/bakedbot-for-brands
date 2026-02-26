'use client';

/**
 * ProductsAnalyticsTab
 *
 * Dashboard widget for products analytics:
 * 1. Revenue Velocity (line chart by category)
 * 2. Margin Drain Alert (table)
 * 3. Inventory Aging (bar chart)
 * 4. Category Mix (donut chart)
 * 5. Price Tier Distribution (horizontal bar)
 */

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, MessageSquare, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getProductsAnalytics, type ProductsAnalyticsData } from '@/server/actions/dispensary-analytics';

interface Props {
    orgId: string;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#06b6d4', '#eab308'];
const CHART_HEIGHT = 200;

function AskPopsButton({ message }: { message: string }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-primary gap-1"
            onClick={() => {
                const encoded = encodeURIComponent(message);
                window.location.href = `/dashboard/inbox?message=${encoded}`;
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
                <Skeleton className="h-[200px] w-full" />
            </CardContent>
        </Card>
    );
}

export function ProductsAnalyticsTab({ orgId }: Props) {
    const [data, setData] = useState<ProductsAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getProductsAnalytics(orgId).then(result => {
            if (cancelled) return;
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error ?? 'Failed to load analytics');
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [orgId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <WidgetSkeleton key={i} />)}
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

    // Derive line keys from velocity data (all keys except 'date')
    const velocityKeys = data.velocityData.length > 0
        ? Object.keys(data.velocityData[0]).filter(k => k !== 'date')
        : [];

    return (
        <div className="space-y-4">
            {/* Row 1: Velocity + Category Mix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Revenue Velocity */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Revenue Velocity</CardTitle>
                                <CardDescription className="text-xs">30-day daily revenue by top categories</CardDescription>
                            </div>
                            <AskPopsButton message="Analyze my revenue velocity trends and tell me which categories are underperforming" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <LineChart data={data.velocityData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={6}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={36}
                                    tickFormatter={v => `$${Math.round(v / 1000)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                                    formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]}
                                />
                                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                                {velocityKeys.map((key, i) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 4. Category Mix */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Category Revenue Mix</CardTitle>
                                <CardDescription className="text-xs">30-day revenue share by product category</CardDescription>
                            </div>
                            <AskPopsButton message="Which categories should I expand or reduce based on my revenue mix?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <PieChart>
                                <Pie
                                    data={data.categoryMix}
                                    dataKey="revenue"
                                    nameKey="name"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                >
                                    {data.categoryMix.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                                    formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]}
                                />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Inventory Aging + Price Tier */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 3. Inventory Aging */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Inventory Aging</CardTitle>
                                <CardDescription className="text-xs">Dollar value at risk by days since last sale</CardDescription>
                            </div>
                            <AskPopsButton message="Help me create a markdown strategy for aging inventory" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart data={data.agingData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'At-Risk Value']} />
                                <Bar dataKey="dollarValue" name="$ at risk" radius={[3, 3, 0, 0]} maxBarSize={48}>
                                    {data.agingData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 5. Price Tier Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Price Tier Distribution</CardTitle>
                                <CardDescription className="text-xs">SKU count and revenue by price tier</CardDescription>
                            </div>
                            <AskPopsButton message="Analyze my price tier distribution and recommend adjustments" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart
                                layout="vertical"
                                data={data.priceTierData}
                                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                                <YAxis type="category" dataKey="tier" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={52} />
                                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex gap-3 mt-2">
                            {data.priceTierData.map(t => (
                                <div key={t.tier} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{t.tier}</span>: {t.skuCount} SKUs
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Margin Drain Alert (full width) */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                Margin Drain Alert
                            </CardTitle>
                            <CardDescription className="text-xs">High-revenue SKUs with contribution margin &lt;15%</CardDescription>
                        </div>
                        <AskPopsButton message="Which margin drain products should I reprice or discontinue, and what should I set the new prices to?" />
                    </div>
                </CardHeader>
                <CardContent>
                    {data.marginDrains.length === 0 ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-green-400">
                            <TrendingUp className="h-4 w-4" />
                            All high-revenue SKUs are above the 15% margin threshold
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground border-b border-white/10">
                                        <th className="text-left pb-2 font-medium">Product</th>
                                        <th className="text-left pb-2 font-medium">Category</th>
                                        <th className="text-right pb-2 font-medium">Revenue (30d)</th>
                                        <th className="text-right pb-2 font-medium">Contrib Margin</th>
                                        <th className="text-right pb-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {data.marginDrains.map(s => (
                                        <tr key={s.productId}>
                                            <td className="py-2 pr-4 font-medium truncate max-w-[160px]">{s.name}</td>
                                            <td className="py-2 pr-4 text-muted-foreground text-xs">{s.category}</td>
                                            <td className="py-2 pr-4 text-right">${Math.round(s.revenue).toLocaleString()}</td>
                                            <td className="py-2 pr-4 text-right">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-xs',
                                                        s.contributionMarginPct < 0.05
                                                            ? 'border-red-500/40 text-red-400'
                                                            : 'border-amber-500/40 text-amber-400'
                                                    )}
                                                >
                                                    {(s.contributionMarginPct * 100).toFixed(1)}%
                                                </Badge>
                                            </td>
                                            <td className="py-2 text-right">
                                                <Badge variant="secondary" className="text-xs capitalize">
                                                    {s.actionRecommendation}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
