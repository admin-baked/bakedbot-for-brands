'use client';

// src/app/dashboard/analytics/components/creator-analytics-dashboard.tsx
/**
 * Creator Analytics Dashboard
 * Shows performance metrics for influencers and content creators
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    MousePointerClick,
    DollarSign,
    TrendingUp,
    Eye,
    ShoppingCart,
    Users,
    ExternalLink,
    ArrowUpRight,
    ArrowDownRight,
    Copy,
    Calendar,
} from 'lucide-react';

interface CreatorMetrics {
    totalClicks: number;
    uniqueVisitors: number;
    checkouts: number;
    conversions: number;
    conversionRate: number;
    totalCommissions: number;
    pendingCommissions: number;
    paidCommissions: number;
    avgOrderValue: number;
    topProducts: ProductPerformance[];
    topReferrers: ReferrerPerformance[];
    dailyMetrics: DailyMetric[];
}

interface ProductPerformance {
    productId: string;
    productName: string;
    brandName: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commissionEarned: number;
}

interface ReferrerPerformance {
    source: string;
    medium: string;
    clicks: number;
    conversions: number;
}

interface DailyMetric {
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
}

interface CreatorAnalyticsDashboardProps {
    creatorId: string;
    creatorName?: string;
    affiliateCode?: string;
    metrics: CreatorMetrics;
    onPeriodChange?: (period: 'day' | 'week' | 'month' | 'all') => void;
    period?: 'day' | 'week' | 'month' | 'all';
}

export default function CreatorAnalyticsDashboard({
    creatorId,
    creatorName = 'Creator',
    affiliateCode,
    metrics,
    onPeriodChange,
    period = 'month',
}: CreatorAnalyticsDashboardProps) {
    const [copiedCode, setCopiedCode] = useState(false);

    // Calculate trends (mock - would compare to previous period in real impl)
    const trends = useMemo(() => ({
        clicks: { value: 12.5, up: true },
        conversions: { value: 8.3, up: true },
        earnings: { value: 15.2, up: true },
        aov: { value: -3.1, up: false },
    }), []);

    const handleCopyCode = () => {
        if (affiliateCode) {
            navigator.clipboard.writeText(affiliateCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    // Simple bar chart using divs
    const maxEarnings = Math.max(...metrics.dailyMetrics.map(d => d.earnings), 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Welcome back, {creatorName}! 👋</h2>
                    <p className="text-muted-foreground">
                        Track your earnings and performance metrics
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {affiliateCode && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyCode}
                            className="gap-2"
                        >
                            <Copy className="h-4 w-4" />
                            {copiedCode ? 'Copied!' : affiliateCode}
                        </Button>
                    )}
                    <Select value={period} onValueChange={(v) => onPeriodChange?.(v as any)}>
                        <SelectTrigger className="w-[130px]">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            Total Earnings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            ${metrics.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`flex items-center text-sm ${trends.earnings.up ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trends.earnings.up ? (
                                <ArrowUpRight className="h-4 w-4" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" />
                            )}
                            {trends.earnings.value}% vs last period
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <MousePointerClick className="h-4 w-4 text-blue-600" />
                            Total Clicks
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics.totalClicks.toLocaleString()}
                        </div>
                        <div className={`flex items-center text-sm ${trends.clicks.up ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trends.clicks.up ? (
                                <ArrowUpRight className="h-4 w-4" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" />
                            )}
                            {trends.clicks.value}% vs last period
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-purple-600" />
                            Conversions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics.conversions.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {metrics.conversionRate.toFixed(1)}% rate
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            Avg Order Value
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${metrics.avgOrderValue.toFixed(2)}
                        </div>
                        <div className={`flex items-center text-sm ${trends.aov.up ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trends.aov.up ? (
                                <ArrowUpRight className="h-4 w-4" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" />
                            )}
                            {Math.abs(trends.aov.value)}% vs last period
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Commission Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Commission Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span>Paid</span>
                            </div>
                            <span className="font-semibold">
                                ${metrics.paidCommissions.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <span>Pending</span>
                            </div>
                            <span className="font-semibold">
                                ${metrics.pendingCommissions.toFixed(2)}
                            </span>
                        </div>
                        <Progress
                            value={(metrics.paidCommissions / (metrics.totalCommissions || 1)) * 100}
                            className="h-2"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Earnings Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Earnings Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-end gap-1">
                        {metrics.dailyMetrics.slice(-14).map((day, idx) => (
                            <div
                                key={day.date}
                                className="flex-1 flex flex-col items-center"
                            >
                                <div
                                    className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors"
                                    style={{
                                        height: `${(day.earnings / maxEarnings) * 100}%`,
                                        minHeight: day.earnings > 0 ? '4px' : '0',
                                    }}
                                    title={`${day.date}: $${day.earnings.toFixed(2)}`}
                                />
                                <span className="text-xs text-muted-foreground mt-1">
                                    {new Date(day.date).getDate()}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for detailed data */}
            <Tabs defaultValue="products" className="w-full">
                <TabsList>
                    <TabsTrigger value="products">Top Products</TabsTrigger>
                    <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead className="text-right">Clicks</TableHead>
                                        <TableHead className="text-right">Sales</TableHead>
                                        <TableHead className="text-right">Earnings</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {metrics.topProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                No product data yet. Share your affiliate links to start earning!
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        metrics.topProducts.map((product) => (
                                            <TableRow key={product.productId}>
                                                <TableCell className="font-medium">
                                                    {product.productName}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{product.brandName}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {product.clicks.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {product.conversions.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-emerald-600">
                                                    ${product.commissionEarned.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sources" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Medium</TableHead>
                                        <TableHead className="text-right">Clicks</TableHead>
                                        <TableHead className="text-right">Conversions</TableHead>
                                        <TableHead className="text-right">Conv. Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {metrics.topReferrers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                No referrer data yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        metrics.topReferrers.map((ref, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    {ref.source}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{ref.medium}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {ref.clicks.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {ref.conversions.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {ref.clicks > 0
                                                        ? ((ref.conversions / ref.clicks) * 100).toFixed(1)
                                                        : '0'}%
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Export sample data generator for testing
export function generateSampleCreatorMetrics(): CreatorMetrics {
    return {
        totalClicks: 12453,
        uniqueVisitors: 8234,
        checkouts: 892,
        conversions: 456,
        conversionRate: 3.66,
        totalCommissions: 2847.50,
        pendingCommissions: 523.25,
        paidCommissions: 2324.25,
        avgOrderValue: 62.45,
        topProducts: [
            { productId: '1', productName: 'Blue Dream Flower', brandName: 'Cookies', clicks: 1234, conversions: 89, revenue: 4450, commissionEarned: 445 },
            { productId: '2', productName: 'Gelato Vape', brandName: 'Stiiizy', clicks: 987, conversions: 67, revenue: 3350, commissionEarned: 335 },
            { productId: '3', productName: 'Indica Gummies', brandName: 'Kiva', clicks: 756, conversions: 54, revenue: 1620, commissionEarned: 162 },
        ],
        topReferrers: [
            { source: 'instagram', medium: 'social', clicks: 5432, conversions: 234 },
            { source: 'tiktok', medium: 'social', clicks: 3211, conversions: 145 },
            { source: 'youtube', medium: 'video', clicks: 1876, conversions: 67 },
        ],
        dailyMetrics: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
            clicks: Math.floor(Math.random() * 500) + 100,
            conversions: Math.floor(Math.random() * 30) + 5,
            earnings: Math.round((Math.random() * 150 + 50) * 100) / 100,
        })),
    };
}
