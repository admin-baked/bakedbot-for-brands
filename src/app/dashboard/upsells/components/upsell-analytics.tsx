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

interface UpsellAnalyticsProps {
    orgId: string;
}

// Mock data - will be replaced with real Firestore queries
const PLACEMENT_DATA = [
    { placement: 'Product Detail', impressions: 2834, clicks: 512, conversions: 94, rate: 18.4 },
    { placement: 'Cart', impressions: 1245, clicks: 289, conversions: 67, rate: 23.2 },
    { placement: 'Checkout', impressions: 892, clicks: 178, conversions: 42, rate: 23.6 },
    { placement: 'Chatbot', impressions: 567, clicks: 145, conversions: 38, rate: 26.2 },
];

const STRATEGY_DATA = [
    { name: 'Terpene Pairing', value: 42, color: '#8b5cf6' },
    { name: 'Category Complement', value: 28, color: '#3b82f6' },
    { name: 'Margin Boost', value: 15, color: '#10b981' },
    { name: 'Clearance', value: 10, color: '#f59e0b' },
    { name: 'Bundle Match', value: 5, color: '#ec4899' },
];

const DAILY_TREND = [
    { date: '2/5', impressions: 420, conversions: 76 },
    { date: '2/6', impressions: 445, conversions: 82 },
    { date: '2/7', impressions: 398, conversions: 71 },
    { date: '2/8', impressions: 512, conversions: 95 },
    { date: '2/9', impressions: 478, conversions: 88 },
    { date: '2/10', impressions: 534, conversions: 102 },
    { date: '2/11', impressions: 551, conversions: 108 },
];

export function UpsellAnalytics({ orgId }: UpsellAnalyticsProps) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate data fetch
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
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
                    <div className="space-y-4">
                        {PLACEMENT_DATA.map((placement) => (
                            <div key={placement.placement} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{placement.placement}</span>
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
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={STRATEGY_DATA}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {STRATEGY_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                            {STRATEGY_DATA.map((strategy) => (
                                <div key={strategy.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: strategy.color }}
                                        />
                                        <span>{strategy.name}</span>
                                    </div>
                                    <span className="font-medium">{strategy.value}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 7-Day Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>7-Day Trend</CardTitle>
                        <CardDescription>Impressions and conversions over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={DAILY_TREND}>
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
