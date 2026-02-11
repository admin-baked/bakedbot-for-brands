'use client';
/**
 * Media Generation Costs Tab
 *
 * Dashboard for tracking image and video generation costs across the platform.
 * Shows cost breakdown by provider, type, and tenant with trend charts.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DollarSign,
    Image,
    Video,
    TrendingUp,
    TrendingDown,
    Sparkles,
    Clock,
    CheckCircle,
    XCircle,
    BarChart3,
} from 'lucide-react';
import { getGlobalMediaCosts, getMonthlyProjection } from '@/server/actions/media-costs';

interface CostsData {
    totalCostUsd: number;
    totalGenerations: number;
    byTenant: { tenantId: string; costUsd: number; count: number }[];
    byProvider: { provider: string; costUsd: number; count: number }[];
    dailyTrend: { date: string; costUsd: number; count: number }[];
}

interface Projection {
    currentMonth: number;
    projectedMonth: number;
    dailyAverage: number;
    daysRemaining: number;
}

export default function CostsTab() {
    const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
    const [data, setData] = useState<CostsData | null>(null);
    const [projection, setProjection] = useState<Projection | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [costsData, projData] = await Promise.all([
                    getGlobalMediaCosts(period),
                    getMonthlyProjection('global'),
                ]);
                setData(costsData);
                setProjection(projData);
            } catch (error) {
                console.error('Failed to fetch costs data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [period]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'gemini-flash':
            case 'gemini-pro':
                return <Image className="h-4 w-4" />;
            case 'veo':
            case 'sora':
                return <Video className="h-4 w-4" />;
            default:
                return <Sparkles className="h-4 w-4" />;
        }
    };

    const getProviderLabel = (provider: string) => {
        switch (provider) {
            case 'gemini-flash':
                return 'Gemini Flash (Image)';
            case 'gemini-pro':
                return 'Gemini Pro (Image)';
            case 'veo':
                return 'Veo 3.1 (Video)';
            case 'sora':
                return 'Sora 2 (Video)';
            default:
                return provider;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">No cost data available</p>
                </CardContent>
            </Card>
        );
    }

    const avgCostPerGen = data.totalGenerations > 0
        ? data.totalCostUsd / data.totalGenerations
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Media Generation Costs</h2>
                    <p className="text-muted-foreground">
                        Track image and video generation spend across the platform
                    </p>
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                        <SelectItem value="quarter">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalCostUsd)}</div>
                        <p className="text-xs text-muted-foreground">
                            {period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This quarter'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Generations</CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalGenerations.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(avgCostPerGen)} avg per generation
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(projection?.dailyAverage || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Per day</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Month Projection</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(projection?.projectedMonth || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projection?.daysRemaining} days remaining
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for detailed breakdown */}
            <Tabs defaultValue="providers" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="providers">By Provider</TabsTrigger>
                    <TabsTrigger value="tenants">By Tenant</TabsTrigger>
                    <TabsTrigger value="trend">Daily Trend</TabsTrigger>
                </TabsList>

                <TabsContent value="providers">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cost by Provider</CardTitle>
                            <CardDescription>
                                Breakdown of costs by AI model provider
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.byProvider.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No generation data yet
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {data.byProvider.map((provider) => (
                                        <div key={provider.provider} className="flex items-center">
                                            <div className="flex items-center gap-3 w-48">
                                                {getProviderIcon(provider.provider)}
                                                <span className="font-medium">
                                                    {getProviderLabel(provider.provider)}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-primary h-full rounded-full"
                                                            style={{
                                                                width: `${(provider.costUsd / data.totalCostUsd) * 100}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="w-24 text-right font-mono text-sm">
                                                        {formatCurrency(provider.costUsd)}
                                                    </div>
                                                    <Badge variant="secondary" className="w-20 justify-center">
                                                        {provider.count} gen
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tenants">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cost by Tenant</CardTitle>
                            <CardDescription>
                                Media generation costs per organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.byTenant.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No generation data yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {data.byTenant.slice(0, 10).map((tenant, index) => (
                                        <div
                                            key={tenant.tenantId}
                                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-muted-foreground font-mono text-sm w-6">
                                                    #{index + 1}
                                                </span>
                                                <span className="font-medium">{tenant.tenantId}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline">{tenant.count} generations</Badge>
                                                <span className="font-mono font-bold">
                                                    {formatCurrency(tenant.costUsd)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="trend">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Trend</CardTitle>
                            <CardDescription>
                                Generation costs over time
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.dailyTrend.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No generation data yet
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {/* Simple bar chart representation */}
                                    <div className="flex items-end gap-1 h-40">
                                        {data.dailyTrend.slice(-14).map((day) => {
                                            const maxCost = Math.max(...data.dailyTrend.map(d => d.costUsd));
                                            const height = maxCost > 0 ? (day.costUsd / maxCost) * 100 : 0;
                                            return (
                                                <div
                                                    key={day.date}
                                                    className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors group relative"
                                                    style={{ height: `${Math.max(height, 2)}%` }}
                                                    title={`${day.date}: ${formatCurrency(day.costUsd)} (${day.count} gen)`}
                                                >
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                                        <div className="font-medium">{day.date}</div>
                                                        <div>{formatCurrency(day.costUsd)}</div>
                                                        <div className="text-muted-foreground">{day.count} gen</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* X-axis labels */}
                                    <div className="flex gap-1 text-xs text-muted-foreground">
                                        {data.dailyTrend.slice(-14).map((day, i) => (
                                            <div key={day.date} className="flex-1 text-center truncate">
                                                {i === 0 || i === 6 || i === 13
                                                    ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                    : ''
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Cost Alerts Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Cost Insights</CardTitle>
                    <CardDescription>
                        Recommendations and alerts based on usage patterns
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.byProvider.some(p => p.provider === 'sora' && p.costUsd > 10) && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                                <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-yellow-900">Sora Usage High</p>
                                    <p className="text-sm text-yellow-700">
                                        Consider using Veo for similar quality at lower cost
                                    </p>
                                </div>
                            </div>
                        )}

                        {avgCostPerGen > 0.50 && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-blue-900">Cost Optimization Available</p>
                                    <p className="text-sm text-blue-700">
                                        Average cost per generation is {formatCurrency(avgCostPerGen)}.
                                        Use Gemini Flash for images to reduce costs.
                                    </p>
                                </div>
                            </div>
                        )}

                        {data.totalGenerations === 0 && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                <Sparkles className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">No Generations Yet</p>
                                    <p className="text-sm text-gray-700">
                                        Start generating images and videos to see cost tracking
                                    </p>
                                </div>
                            </div>
                        )}

                        {data.totalGenerations > 0 && data.totalCostUsd < 5 && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-green-900">Costs Under Control</p>
                                    <p className="text-sm text-green-700">
                                        Your media generation costs are within budget
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
