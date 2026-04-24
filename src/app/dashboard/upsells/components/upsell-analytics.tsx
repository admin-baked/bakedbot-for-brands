'use client';

import { useEffect, useState } from 'react';
import {
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
import { Eye, MessageSquare, MousePointer, ShoppingCart, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUpsellAnalytics } from '@/server/actions/upsell-analytics';
import type { DailyTrend, PlacementMetrics, StrategyMetrics } from '@/server/actions/upsell-analytics';

interface UpsellAnalyticsProps {
    orgId: string;
}

const PLACEMENT_LABELS: Record<string, string> = {
    product_detail: 'Product Detail',
    cart: 'Cart',
    checkout: 'Checkout',
    chatbot: 'Chatbot',
};

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

function UpsellEmptyState() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Upsell Analytics</CardTitle>
                <CardDescription className="text-xs">
                    We have not seen upsell impression, click, or conversion events in this workspace yet.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/60" />
                <p className="max-w-lg text-sm text-muted-foreground">
                    Once Smokey or Craig starts serving upsell suggestions in product detail, cart, checkout, or chat, the funnel, placement mix, and trend views will populate here.
                </p>
            </CardContent>
        </Card>
    );
}

export function UpsellAnalytics({ orgId }: UpsellAnalyticsProps) {
    const [loading, setLoading] = useState(true);
    const [placementData, setPlacementData] = useState<PlacementMetrics[]>([]);
    const [strategyData, setStrategyData] = useState<StrategyMetrics[]>([]);
    const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);

    useEffect(() => {
        async function loadAnalytics() {
            setLoading(true);
            try {
                const data = await getUpsellAnalytics(orgId);
                setPlacementData(data.placements);
                setStrategyData(data.strategies);
                setDailyTrend(data.dailyTrend);
            } catch (error) {
                console.error('Failed to load upsell analytics:', error);
            } finally {
                setLoading(false);
            }
        }

        loadAnalytics();
    }, [orgId]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const hasAnyData =
        placementData.length > 0 ||
        strategyData.length > 0 ||
        dailyTrend.some((row) => row.impressions > 0 || row.conversions > 0);

    if (!hasAnyData) {
        return <UpsellEmptyState />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle>Conversion Funnel by Placement</CardTitle>
                            <CardDescription>Performance across all customer touchpoints</CardDescription>
                        </div>
                        <AskPopsButton message="How should we increase upsell conversions across product detail, cart, checkout, and chat?" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {placementData.map((placement) => (
                            <div key={placement.placement} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        {PLACEMENT_LABELS[placement.placement] || placement.placement}
                                    </span>
                                    <Badge variant="secondary">{placement.rate}% conversion</Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Impressions:</span>
                                        <span className="font-medium">{placement.impressions.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Clicks:</span>
                                        <span className="font-medium">{placement.clicks.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Conversions:</span>
                                        <span className="font-medium">{placement.conversions.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${placement.rate}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Strategy Distribution</CardTitle>
                        <CardDescription>Upsell suggestions by pairing strategy</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={strategyData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name.replace(/_/g, ' ')} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {strategyData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                            {strategyData.map((strategy) => (
                                <div key={strategy.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: strategy.color }}
                                        />
                                        <span className="capitalize">{strategy.name.replace(/_/g, ' ')}</span>
                                    </div>
                                    <span className="font-medium">{strategy.value}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>7-Day Trend</CardTitle>
                        <CardDescription>Impressions and conversions over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.45} />
                                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} />
                                <YAxis tick={AXIS_TICK_STYLE} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="impressions"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    name="Impressions"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="conversions"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Conversions"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
