'use client';

/**
 * Upsell Analytics Component
 *
 * Displays performance metrics, conversion funnels, and strategy breakdown
 * for upsell suggestions across all placements.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Eye, MousePointer, ShoppingCart } from 'lucide-react';
import { getUpsellAnalytics } from '@/server/actions/upsell-analytics';
import type { PlacementMetrics, StrategyMetrics, DailyTrend } from '@/server/actions/upsell-analytics';

interface UpsellAnalyticsProps {
    orgId: string;
}

const PLACEMENT_LABELS: Record<string, string> = {
    product_detail: 'Product Detail',
    cart: 'Cart',
    checkout: 'Checkout',
    chatbot: 'Chatbot',
};

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

    return (
        <div className="space-y-6">
            {/* Conversion Funnel */}
            <Card>
                <CardHeader>
                    <CardTitle>Conversion Funnel by Placement</CardTitle>
                    <CardDescription>Performance across all customer touchpoints</CardDescription>
                </CardHeader>
                <CardContent>
                    {placementData.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No upsell data yet. Start generating upsell suggestions to see analytics here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {placementData.map((placement) => (
                                <div key={placement.placement} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{PLACEMENT_LABELS[placement.placement] || placement.placement}</span>
                                    <Badge variant="secondary">{placement.rate}% conversion</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
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
                                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-500"
                                        style={{ width: `${placement.rate}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Strategy Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Strategy Distribution</CardTitle>
                        <CardDescription>Upsell suggestions by pairing strategy</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {strategyData.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No strategy data available</p>
                            </div>
                        ) : (
                            <>
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
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {strategyData.map((strategy) => (
                                        <div key={strategy.name} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: strategy.color }}
                                                />
                                                <span className="capitalize">{strategy.name.replace(/_/g, ' ')}</span>
                                            </div>
                                            <span className="font-medium">{strategy.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* 7-Day Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>7-Day Trend</CardTitle>
                        <CardDescription>Impressions and conversions over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyTrend.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No trend data available</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={dailyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
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
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
