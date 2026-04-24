'use client';

import React, { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AlertTriangle, MessageSquare, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getProductsAnalytics, type ProductsAnalyticsData } from '@/server/actions/dispensary-analytics';

interface Props {
    orgId: string;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#06b6d4', '#eab308'];
const CHART_HEIGHT = 200;
const AXIS_TICK_STYLE = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' };
const GRID_STROKE = 'hsl(var(--border))';
const TOOLTIP_STYLE = {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 11,
    color: 'hsl(var(--foreground))',
};

function AskPopsButton({ message }: { message: string }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-muted-foreground hover:text-primary"
            onClick={() => {
                window.location.href = `/dashboard/inbox?message=${encodeURIComponent(message)}`;
            }}
        >
            <MessageSquare className="h-3 w-3" />
            Ask Pops
        </Button>
    );
}

function WidgetSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1 h-3 w-64" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[200px] w-full" />
            </CardContent>
        </Card>
    );
}

function EmptyChartState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex h-[200px] flex-col items-center justify-center px-6 text-center">
            <TrendingUp className="mb-3 h-7 w-7 text-muted-foreground/60" />
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
        </div>
    );
}

export function ProductsAnalyticsTab({ orgId }: Props) {
    const [data, setData] = useState<ProductsAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getProductsAnalytics(orgId).then((result) => {
            if (cancelled) return;
            if (result.success && result.data) {
                setData(result.data);
                setError(null);
            } else {
                setError(result.error ?? 'Failed to load analytics');
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [orgId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 5 }).map((_, index) => (
                    <WidgetSkeleton key={index} />
                ))}
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

    const velocityKeys =
        data.velocityData.length > 0
            ? Object.keys(data.velocityData[0]).filter((key) => key !== 'date')
            : [];
    const hasVelocityData = data.velocityData.some((row) =>
        velocityKeys.some((key) => typeof row[key] === 'number' && Number(row[key]) > 0),
    );
    const hasCategoryMix = data.categoryMix.some((item) => item.revenue > 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Revenue Velocity</CardTitle>
                                <CardDescription className="text-xs">
                                    Derived run-rate trend from 7-day and 30-day sales snapshots
                                </CardDescription>
                            </div>
                            <AskPopsButton message="Analyze my revenue velocity trends and tell me which categories are underperforming." />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hasVelocityData ? (
                            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                                <LineChart data={data.velocityData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.45} />
                                    <XAxis
                                        dataKey="date"
                                        tick={AXIS_TICK_STYLE}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={6}
                                    />
                                    <YAxis
                                        tick={AXIS_TICK_STYLE}
                                        tickLine={false}
                                        axisLine={false}
                                        width={36}
                                        tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                                    {velocityKeys.map((key, index) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChartState
                                title="Not enough sales movement yet"
                                description="Velocity trends populate once category-level sales snapshots have enough movement to compare recent pace against the 30-day baseline."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Category Revenue Mix</CardTitle>
                                <CardDescription className="text-xs">
                                    30-day revenue share by product category
                                </CardDescription>
                            </div>
                            <AskPopsButton message="Which categories should I expand or reduce based on my revenue mix?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hasCategoryMix ? (
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
                                        {data.categoryMix.map((_, index) => (
                                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChartState
                                title="No category revenue mix yet"
                                description="As products accumulate recent sales, this chart will show which categories are carrying the business."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Inventory Aging</CardTitle>
                                <CardDescription className="text-xs">
                                    Dollar value at risk by days since last sale
                                </CardDescription>
                            </div>
                            <AskPopsButton message="Help me create a markdown strategy for aging inventory." />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart data={data.agingData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.45} />
                                <XAxis dataKey="bucket" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
                                <YAxis
                                    tick={AXIS_TICK_STYLE}
                                    tickLine={false}
                                    axisLine={false}
                                    width={36}
                                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                                />
                                <Tooltip
                                    contentStyle={TOOLTIP_STYLE}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'At-Risk Value']}
                                />
                                <Bar dataKey="dollarValue" name="$ at risk" radius={[3, 3, 0, 0]} maxBarSize={48}>
                                    {data.agingData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Price Tier Distribution</CardTitle>
                                <CardDescription className="text-xs">
                                    SKU count and revenue by price tier
                                </CardDescription>
                            </div>
                            <AskPopsButton message="Analyze my price tier distribution and recommend adjustments." />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart
                                layout="vertical"
                                data={data.priceTierData}
                                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={GRID_STROKE}
                                    strokeOpacity={0.45}
                                    horizontal={false}
                                />
                                <XAxis
                                    type="number"
                                    tick={AXIS_TICK_STYLE}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="tier"
                                    tick={AXIS_TICK_STYLE}
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                />
                                <Tooltip
                                    contentStyle={TOOLTIP_STYLE}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-2 flex flex-wrap gap-3">
                            {data.priceTierData.map((tier) => (
                                <div key={tier.tier} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{tier.tier}</span>: {tier.skuCount} SKUs
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                Margin Drain Alert
                            </CardTitle>
                            <CardDescription className="text-xs">
                                High-revenue SKUs with contribution margin below 15%
                            </CardDescription>
                        </div>
                        <AskPopsButton message="Which margin drain products should I reprice or discontinue, and what should I set the new prices to?" />
                    </div>
                </CardHeader>
                <CardContent>
                    {data.marginDrains.length === 0 ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-green-600 dark:text-green-400">
                            <TrendingUp className="h-4 w-4" />
                            All high-revenue SKUs are above the 15% margin threshold.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">Product</th>
                                        <th className="pb-2 text-left font-medium">Category</th>
                                        <th className="pb-2 text-right font-medium">Revenue (30d)</th>
                                        <th className="pb-2 text-right font-medium">Contrib Margin</th>
                                        <th className="pb-2 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {data.marginDrains.map((sku) => (
                                        <tr key={sku.productId}>
                                            <td className="max-w-[220px] truncate py-2 pr-4 font-medium">{sku.name}</td>
                                            <td className="py-2 pr-4 text-xs text-muted-foreground">{sku.category}</td>
                                            <td className="py-2 pr-4 text-right">${Math.round(sku.revenue).toLocaleString()}</td>
                                            <td className="py-2 pr-4 text-right">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-xs',
                                                        sku.contributionMarginPct < 0.05
                                                            ? 'border-red-500/40 text-red-400'
                                                            : 'border-amber-500/40 text-amber-400',
                                                    )}
                                                >
                                                    {(sku.contributionMarginPct * 100).toFixed(1)}%
                                                </Badge>
                                            </td>
                                            <td className="py-2 text-right">
                                                <Badge variant="secondary" className="text-xs capitalize">
                                                    {sku.actionRecommendation}
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
