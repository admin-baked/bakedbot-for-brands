'use client';

import React, { useEffect, useState } from 'react';
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getOrdersAnalytics, type OrdersAnalyticsData } from '@/server/actions/dispensary-analytics';

interface Props {
    orgId: string;
}

const CHART_HEIGHT = 200;
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

function EmptyOrdersState() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Orders Analytics</CardTitle>
                <CardDescription className="text-xs">
                    We have not seen detailed order events for the last 30 days in this workspace yet.
                </CardDescription>
            </CardHeader>
            <CardContent className="py-8 text-sm text-muted-foreground">
                Once completed order events are flowing, basket size, discount rate, peak-hour demand, and channel split will populate here.
            </CardContent>
        </Card>
    );
}

function heatColor(count: number, max: number): string {
    if (max === 0 || count === 0) return 'rgba(100,116,139,0.15)';
    const pct = count / max;
    if (pct < 0.25) return 'rgba(34,197,94,0.25)';
    if (pct < 0.5) return 'rgba(34,197,94,0.5)';
    if (pct < 0.75) return 'rgba(34,197,94,0.75)';
    return 'rgba(34,197,94,1)';
}

function PeakHourHeatmap({ data }: { data: OrdersAnalyticsData['peakHourHeatmap'] }) {
    const maxCount = Math.max(...data.map((row) => row.transactionCount), 1);
    const hours = Array.from(new Set(data.map((row) => row.hour))).sort((left, right) => left - right);

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                <div className="mb-1 ml-12 flex">
                    {DOW_LABELS.map((label) => (
                        <div key={label} className="w-8 text-center text-xs text-muted-foreground">
                            {label}
                        </div>
                    ))}
                </div>
                {hours.map((hour) => {
                    const label = hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`;
                    return (
                        <div key={hour} className="mb-0.5 flex items-center">
                            <div className="w-12 pr-2 text-right text-xs text-muted-foreground">{label}</div>
                            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                                const cell = data.find(
                                    (row) => row.hour === hour && row.dayOfWeek === dayOfWeek,
                                );
                                const count = cell?.transactionCount ?? 0;
                                return (
                                    <div
                                        key={dayOfWeek}
                                        className="mx-px h-3.5 w-8 rounded-sm"
                                        style={{ backgroundColor: heatColor(count, maxCount) }}
                                        title={`${DOW_LABELS[dayOfWeek]} ${label}: ${count} txns`}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
                <div className="mt-2 ml-12 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Low</span>
                    {[0.1, 0.35, 0.6, 0.85, 1].map((pct) => (
                        <div
                            key={pct}
                            className="h-3 w-4 rounded-sm"
                            style={{ backgroundColor: heatColor(pct * 10, 10) }}
                        />
                    ))}
                    <span className="text-xs text-muted-foreground">High</span>
                </div>
            </div>
        </div>
    );
}

export function OrdersAnalyticsTab({ orgId }: Props) {
    const [data, setData] = useState<OrdersAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getOrdersAnalytics(orgId).then((result) => {
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
                {Array.from({ length: 4 }).map((_, index) => (
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

    const hasOnlineData = data.onlineVsInStoreSplit.some((row) => row.value > 0);
    const hasBasketTrend = data.basketSizeTrend.some((row) => row.avgBasket > 0);
    const hasUptTrend = data.uptTrend.some((row) => row.avgUnitsPerTransaction > 0);
    const hasDiscountTrend = data.discountRateTrend.some((row) => row.discountRate > 0);
    const hasHeatmapData = data.peakHourHeatmap.some((row) => row.transactionCount > 0);
    const hasAnyOrderSignals =
        hasBasketTrend ||
        hasUptTrend ||
        hasDiscountTrend ||
        hasHeatmapData ||
        hasOnlineData;

    if (!hasAnyOrderSignals) {
        return <EmptyOrdersState />;
    }

    const donutColors = ['#3b82f6', '#22c55e'];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Avg Basket Size</CardTitle>
                                <CardDescription className="text-xs">
                                    30-day rolling average transaction value
                                </CardDescription>
                            </div>
                            <AskPopsButton message="How can I increase my average basket size?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <LineChart data={data.basketSizeTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.45} />
                                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} interval={6} />
                                <YAxis
                                    tick={AXIS_TICK_STYLE}
                                    tickLine={false}
                                    axisLine={false}
                                    width={36}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={TOOLTIP_STYLE}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Avg Basket']}
                                />
                                <Line type="monotone" dataKey="avgBasket" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Units Per Transaction</CardTitle>
                                <CardDescription className="text-xs">
                                    Average items per order (30 days)
                                </CardDescription>
                            </div>
                            <AskPopsButton message="What bundle or upsell strategies would help increase units per transaction?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <LineChart data={data.uptTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.45} />
                                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} interval={6} />
                                <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={28} />
                                <Tooltip
                                    contentStyle={TOOLTIP_STYLE}
                                    formatter={(value: number) => [value.toFixed(1), 'Units/Txn']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avgUnitsPerTransaction"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-sm">Discount Rate Trend</CardTitle>
                            <CardDescription className="text-xs">
                                Your discount rate versus national and market benchmarks
                            </CardDescription>
                        </div>
                        <AskPopsButton message="My discount rate is trending high. What is driving it and how do I bring it down without losing customers?" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            National avg {(data.industryDiscountBenchmark * 100).toFixed(1)}%
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Market target {(data.marketDiscountTarget * 100).toFixed(1)}%
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                        <LineChart data={data.discountRateTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.45} />
                            <XAxis dataKey="date" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} interval={6} />
                            <YAxis
                                tick={AXIS_TICK_STYLE}
                                tickLine={false}
                                axisLine={false}
                                width={36}
                                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                            />
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Discount Rate']}
                            />
                            <ReferenceLine y={data.industryDiscountBenchmark} stroke="#ef4444" strokeDasharray="4 4" />
                            <ReferenceLine y={data.marketDiscountTarget} stroke="#f59e0b" strokeDasharray="4 4" />
                            <Line type="monotone" dataKey="discountRate" stroke="#a855f7" strokeWidth={2} dot={false} name="Discount Rate" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className={cn('grid gap-4', hasOnlineData ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
                <Card className={hasOnlineData ? 'lg:col-span-2' : ''}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm">Peak Hours Heatmap</CardTitle>
                                <CardDescription className="text-xs">
                                    Transaction intensity by hour of day and day of week
                                </CardDescription>
                            </div>
                            <AskPopsButton message="Based on my peak hours, when should I run flash promotions and staff heavier?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PeakHourHeatmap data={data.peakHourHeatmap} />
                    </CardContent>
                </Card>

                {hasOnlineData && (
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-sm">Online vs In-Store</CardTitle>
                                    <CardDescription className="text-xs">Order channel split</CardDescription>
                                </div>
                                <AskPopsButton message="How can I grow our online order share?" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                                <PieChart>
                                    <Pie
                                        data={data.onlineVsInStoreSplit}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={3}
                                    >
                                        {data.onlineVsInStoreSplit.map((_, index) => (
                                            <Cell key={index} fill={donutColors[index % donutColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
