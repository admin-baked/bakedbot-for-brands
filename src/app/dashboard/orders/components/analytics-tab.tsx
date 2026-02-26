'use client';

/**
 * OrdersAnalyticsTab
 *
 * Dashboard analytics widgets for orders:
 * 1. Basket Size Trend (line, 30d)
 * 2. Discount Rate Trend (line, 30d, dual benchmark reference lines) — THE KEY CHART
 * 3. Units Per Transaction Trend (line, 30d)
 * 4. Peak Hour Heatmap (custom grid: 7 days × 18 hours)
 * 5. Online vs In-Store Split (donut, hidden when both 0)
 */

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getOrdersAnalytics, type OrdersAnalyticsData } from '@/server/actions/dispensary-analytics';

interface Props {
    orgId: string;
}

const CHART_HEIGHT = 200;
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
                <Skeleton className="h-[200px] w-full" />
            </CardContent>
        </Card>
    );
}

/** Intensity color for heatmap cell */
function heatColor(count: number, max: number): string {
    if (max === 0 || count === 0) return 'rgba(100,116,139,0.15)';
    const pct = count / max;
    if (pct < 0.25) return 'rgba(34,197,94,0.25)';
    if (pct < 0.5) return 'rgba(34,197,94,0.5)';
    if (pct < 0.75) return 'rgba(34,197,94,0.75)';
    return 'rgba(34,197,94,1)';
}

/** Peak Hour Heatmap: 7 columns (Mon-Sun) × hours (6am-11pm) */
function PeakHourHeatmap({ data }: { data: OrdersAnalyticsData['peakHourHeatmap'] }) {
    const maxCount = Math.max(...data.map(d => d.transactionCount), 1);

    // Group by hour
    const hours = Array.from(new Set(data.map(d => d.hour))).sort((a, b) => a - b);

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                {/* Day headers */}
                <div className="flex ml-12 mb-1">
                    {DOW_LABELS.map(d => (
                        <div key={d} className="w-8 text-center text-xs text-muted-foreground">{d}</div>
                    ))}
                </div>
                {/* Hour rows */}
                {hours.map(hour => {
                    const label = hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`;
                    return (
                        <div key={hour} className="flex items-center mb-0.5">
                            <div className="w-12 text-xs text-muted-foreground text-right pr-2">{label}</div>
                            {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                                const cell = data.find(d => d.hour === hour && d.dayOfWeek === dow);
                                const count = cell?.transactionCount ?? 0;
                                return (
                                    <div
                                        key={dow}
                                        className="w-8 h-3.5 rounded-sm mx-px"
                                        style={{ backgroundColor: heatColor(count, maxCount) }}
                                        title={`${DOW_LABELS[dow]} ${label}: ${count} txns`}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
                {/* Legend */}
                <div className="flex items-center gap-1 mt-2 ml-12">
                    <span className="text-xs text-muted-foreground">Low</span>
                    {[0.1, 0.35, 0.6, 0.85, 1].map(pct => (
                        <div key={pct} className="w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(pct * 10, 10) }} />
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
        getOrdersAnalytics(orgId).then(result => {
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
                {Array.from({ length: 4 }).map((_, i) => <WidgetSkeleton key={i} />)}
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

    const hasOnlineData = data.onlineVsInStoreSplit.some(d => d.value > 0);
    const donutColors = ['#3b82f6', '#22c55e'];

    return (
        <div className="space-y-4">
            {/* Row 1: Basket Size + Units Per Transaction */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Basket Size Trend */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Avg Basket Size</CardTitle>
                                <CardDescription className="text-xs">30-day rolling average transaction value</CardDescription>
                            </div>
                            <AskPopsButton message="How can I increase my average basket size?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <LineChart data={data.basketSizeTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} interval={6} />
                                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `$${v}`} />
                                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Avg Basket']} />
                                <Line type="monotone" dataKey="avgBasket" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 3. Units Per Transaction Trend */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Units Per Transaction</CardTitle>
                                <CardDescription className="text-xs">Average items per order (30 days)</CardDescription>
                            </div>
                            <AskPopsButton message="What bundle or upsell strategies would help increase units per transaction?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <LineChart data={data.uptTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} interval={6} />
                                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={28} />
                                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [v.toFixed(1), 'Units/Txn']} />
                                <Line type="monotone" dataKey="avgUnitsPerTransaction" stroke="#22c55e" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Discount Rate (full-width — THE key chart) */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm">Discount Rate Trend</CardTitle>
                            <CardDescription className="text-xs">
                                Your discount rate vs national average ({(data.industryDiscountBenchmark * 100).toFixed(1)}%) and your market target ({(data.marketDiscountTarget * 100).toFixed(1)}%)
                            </CardDescription>
                        </div>
                        <AskPopsButton message="My discount rate is trending high — what's driving it and how do I bring it down without losing customers?" />
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                        <LineChart data={data.discountRateTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} interval={6} />
                            <YAxis
                                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }}
                                tickLine={false}
                                axisLine={false}
                                width={36}
                                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                            />
                            <Tooltip
                                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                                formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Discount Rate']}
                            />
                            {/* National avg — dashed red */}
                            <ReferenceLine
                                y={data.industryDiscountBenchmark}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                label={{ value: 'National avg', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }}
                            />
                            {/* Market target — dashed amber */}
                            <ReferenceLine
                                y={data.marketDiscountTarget}
                                stroke="#f59e0b"
                                strokeDasharray="4 4"
                                label={{ value: 'Your market target', fill: '#f59e0b', fontSize: 9, position: 'insideBottomRight' }}
                            />
                            <Line type="monotone" dataKey="discountRate" stroke="#a855f7" strokeWidth={2} dot={false} name="Discount Rate" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row 3: Peak Heatmap + Online Split */}
            <div className={cn('grid gap-4', hasOnlineData ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
                {/* 4. Peak Hour Heatmap */}
                <Card className={hasOnlineData ? 'lg:col-span-2' : ''}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Peak Hours Heatmap</CardTitle>
                                <CardDescription className="text-xs">Transaction intensity by hour of day and day of week</CardDescription>
                            </div>
                            <AskPopsButton message="Based on my peak hours, when should I run flash promotions and staff heavier?" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PeakHourHeatmap data={data.peakHourHeatmap} />
                    </CardContent>
                </Card>

                {/* 5. Online vs In-Store (only if data exists) */}
                {hasOnlineData && (
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
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
                                        {data.onlineVsInStoreSplit.map((_, i) => (
                                            <Cell key={i} fill={donutColors[i % donutColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
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
