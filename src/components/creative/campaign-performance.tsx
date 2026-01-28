'use client';

/**
 * Campaign Performance Dashboard
 *
 * Displays comprehensive analytics for campaign performance including:
 * - Aggregated metrics (impressions, engagement, CTR)
 * - Conversion funnel visualization
 * - Time-series performance chart
 * - Top performing content
 * - Platform and status breakdowns
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Eye,
    Users,
    Heart,
    MessageCircle,
    Share2,
    QrCode,
    Target,
    BarChart3,
    Award,
    Calendar,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
    CampaignPerformance,
    CampaignMetricSnapshot,
    TopPerformingContent,
    SocialPlatform,
    ContentStatus,
} from '@/types/creative-content';
import { cn } from '@/lib/utils';

interface CampaignPerformanceProps {
    campaignId: string;
    performance: CampaignPerformance;
    timeSeries: CampaignMetricSnapshot[];
    topPerformingContent: TopPerformingContent[];
    className?: string;
}

export function CampaignPerformanceDashboard({
    campaignId,
    performance,
    timeSeries,
    topPerformingContent,
    className,
}: CampaignPerformanceProps) {
    const [selectedMetric, setSelectedMetric] = useState<'impressions' | 'engagement' | 'qrScans'>(
        'impressions'
    );

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatPercentage = (num: number): string => {
        return `${num.toFixed(1)}%`;
    };

    const platformIcons: Record<SocialPlatform, string> = {
        instagram: '📸',
        tiktok: '🎵',
        linkedin: '💼',
        twitter: '🐦',
        facebook: '👍',
    };

    const statusColors: Record<ContentStatus, string> = {
        published: 'bg-green-500/20 text-green-400',
        scheduled: 'bg-blue-500/20 text-blue-400',
        approved: 'bg-purple-500/20 text-purple-400',
        pending: 'bg-amber-500/20 text-amber-400',
        revision: 'bg-orange-500/20 text-orange-400',
        draft: 'bg-gray-500/20 text-gray-400',
        failed: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Campaign Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h2 className="text-2xl font-bold text-baked-text-primary flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-purple-400" />
                        {performance.campaignName}
                    </h2>
                    <p className="text-sm text-baked-text-muted mt-1">
                        {performance.totalContent} content items • Last updated:{' '}
                        {new Date(performance.lastUpdated).toLocaleString()}
                    </p>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Campaign Analytics
                </Badge>
            </motion.div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    icon={Eye}
                    label="Total Impressions"
                    value={formatNumber(performance.aggregatedMetrics.totalImpressions)}
                    color="text-blue-400"
                    bgColor="bg-blue-400/10"
                />
                <MetricCard
                    icon={Users}
                    label="Total Reach"
                    value={formatNumber(performance.aggregatedMetrics.totalReach)}
                    color="text-purple-400"
                    bgColor="bg-purple-400/10"
                />
                <MetricCard
                    icon={Heart}
                    label="Avg Engagement Rate"
                    value={formatPercentage(performance.aggregatedMetrics.avgEngagementRate)}
                    color="text-red-400"
                    bgColor="bg-red-400/10"
                />
                <MetricCard
                    icon={QrCode}
                    label="Total QR Scans"
                    value={formatNumber(performance.aggregatedMetrics.totalQRScans)}
                    color="text-green-400"
                    bgColor="bg-green-400/10"
                />
            </div>

            {/* Conversion Funnel */}
            <Card className="bg-baked-card border-baked-border shadow-none">
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        Conversion Funnel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <FunnelStage
                            label="Impressions"
                            value={formatNumber(performance.conversionFunnel.impressions)}
                            percentage={100}
                            color="bg-blue-400"
                        />
                        <FunnelStage
                            label="Clicks"
                            value={formatNumber(performance.conversionFunnel.clicks)}
                            percentage={performance.conversionFunnel.rates.clickRate}
                            color="bg-purple-400"
                        />
                        <FunnelStage
                            label="QR Scans"
                            value={formatNumber(performance.conversionFunnel.qrScans)}
                            percentage={performance.conversionFunnel.rates.scanRate}
                            color="bg-green-400"
                        />
                        {performance.conversionFunnel.conversions !== undefined && (
                            <FunnelStage
                                label="Conversions"
                                value={formatNumber(performance.conversionFunnel.conversions)}
                                percentage={
                                    performance.conversionFunnel.rates.conversionRate || 0
                                }
                                color="bg-amber-400"
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Time Series Chart */}
            <Card className="bg-baked-card border-baked-border shadow-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            Performance Over Time
                        </CardTitle>
                        <div className="flex gap-2">
                            <MetricToggle
                                active={selectedMetric === 'impressions'}
                                onClick={() => setSelectedMetric('impressions')}
                                label="Impressions"
                            />
                            <MetricToggle
                                active={selectedMetric === 'engagement'}
                                onClick={() => setSelectedMetric('engagement')}
                                label="Engagement"
                            />
                            <MetricToggle
                                active={selectedMetric === 'qrScans'}
                                onClick={() => setSelectedMetric('qrScans')}
                                label="QR Scans"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <TimeSeriesChart
                        data={timeSeries}
                        metric={selectedMetric}
                        formatValue={formatNumber}
                    />
                </CardContent>
            </Card>

            {/* Platform & Status Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Platform Breakdown */}
                <Card className="bg-baked-card border-baked-border shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Content by Platform
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(performance.contentByPlatform)
                                .filter(([_, count]) => count > 0)
                                .map(([platform, count]) => (
                                    <PlatformBar
                                        key={platform}
                                        platform={platform as SocialPlatform}
                                        count={count}
                                        total={performance.totalContent}
                                        icon={
                                            platformIcons[platform as SocialPlatform]
                                        }
                                    />
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Status Breakdown */}
                <Card className="bg-baked-card border-baked-border shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Content by Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(performance.contentByStatus)
                                .filter(([_, count]) => count > 0)
                                .map(([status, count]) => (
                                    <StatusBar
                                        key={status}
                                        status={status as ContentStatus}
                                        count={count}
                                        total={performance.totalContent}
                                        color={
                                            statusColors[status as ContentStatus]
                                        }
                                    />
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Performing Content */}
            {topPerformingContent.length > 0 && (
                <Card className="bg-baked-card border-baked-border shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            Top Performing Content
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topPerformingContent.map((item, idx) => (
                                <TopPerformingCard
                                    key={item.contentId}
                                    item={item}
                                    rank={idx + 1}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ==================== SUB-COMPONENTS ====================

function MetricCard({
    icon: Icon,
    label,
    value,
    color,
    bgColor,
}: {
    icon: any;
    label: string;
    value: string;
    color: string;
    bgColor: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="bg-baked-card border-baked-border shadow-none">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', bgColor)}>
                            <Icon className={cn('w-5 h-5', color)} />
                        </div>
                        <div>
                            <p className="text-xs text-baked-text-muted">{label}</p>
                            <p className={cn('text-2xl font-bold', color)}>{value}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function FunnelStage({
    label,
    value,
    percentage,
    color,
}: {
    label: string;
    value: string;
    percentage: number;
    color: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-baked-text-primary font-medium">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-baked-text-secondary">{value}</span>
                    <span className="text-baked-text-muted text-xs">
                        ({percentage.toFixed(1)}%)
                    </span>
                </div>
            </div>
            <div className="h-2 bg-baked-darkest rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={cn('h-full rounded-full', color)}
                />
            </div>
        </div>
    );
}

function MetricToggle({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                active
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-baked-darkest text-baked-text-muted hover:bg-baked-dark'
            )}
        >
            {label}
        </button>
    );
}

function TimeSeriesChart({
    data,
    metric,
    formatValue,
}: {
    data: CampaignMetricSnapshot[];
    metric: 'impressions' | 'engagement' | 'qrScans';
    formatValue: (n: number) => string;
}) {
    if (data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-baked-text-muted text-sm">
                No time-series data available yet
            </div>
        );
    }

    const maxValue = Math.max(...data.map((d) => d[metric]));

    return (
        <div className="space-y-2">
            {/* Simple bar chart */}
            <div className="flex items-end justify-between gap-1 h-48">
                {data.slice(-30).map((snapshot, idx) => {
                    const height = maxValue > 0 ? (snapshot[metric] / maxValue) * 100 : 0;
                    return (
                        <motion.div
                            key={snapshot.date}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.02 }}
                            className="flex-1 bg-purple-400/30 rounded-t hover:bg-purple-400/50 transition-colors cursor-pointer relative group"
                            title={`${snapshot.date}: ${formatValue(snapshot[metric])}`}
                        >
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-baked-dark px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {snapshot.date}
                                <br />
                                {formatValue(snapshot[metric])}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            {/* X-axis labels (first, middle, last) */}
            <div className="flex justify-between text-xs text-baked-text-muted">
                <span>{data[0]?.date}</span>
                {data.length > 2 && (
                    <span>{data[Math.floor(data.length / 2)]?.date}</span>
                )}
                <span>{data[data.length - 1]?.date}</span>
            </div>
        </div>
    );
}

function PlatformBar({
    platform,
    count,
    total,
    icon,
}: {
    platform: SocialPlatform;
    count: number;
    total: number;
    icon: string;
}) {
    const percentage = (count / total) * 100;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-baked-text-primary font-medium flex items-center gap-2">
                    <span>{icon}</span>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </span>
                <span className="text-baked-text-muted text-xs">
                    {count} ({percentage.toFixed(0)}%)
                </span>
            </div>
            <div className="h-1.5 bg-baked-darkest rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-purple-400 rounded-full"
                />
            </div>
        </div>
    );
}

function StatusBar({
    status,
    count,
    total,
    color,
}: {
    status: ContentStatus;
    count: number;
    total: number;
    color: string;
}) {
    const percentage = (count / total) * 100;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <Badge className={cn('text-xs', color)}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
                <span className="text-baked-text-muted text-xs">
                    {count} ({percentage.toFixed(0)}%)
                </span>
            </div>
            <div className="h-1.5 bg-baked-darkest rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-green-400 rounded-full"
                />
            </div>
        </div>
    );
}

function TopPerformingCard({ item, rank }: { item: TopPerformingContent; rank: number }) {
    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-amber-400 bg-amber-400/10';
        if (rank === 2) return 'text-gray-400 bg-gray-400/10';
        if (rank === 3) return 'text-orange-400 bg-orange-400/10';
        return 'text-purple-400 bg-purple-400/10';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.1 }}
        >
            <Card className="bg-baked-dark border-baked-border shadow-none hover:border-purple-400/30 transition-all">
                <CardContent className="p-3 space-y-2">
                    {/* Rank Badge */}
                    <div className="flex items-center justify-between">
                        <Badge className={cn('text-xs font-bold', getRankColor(rank))}>
                            #{rank}
                        </Badge>
                        <span className="text-xs text-baked-text-muted">
                            Score: {item.performanceScore}
                        </span>
                    </div>

                    {/* Thumbnail */}
                    {item.thumbnailUrl && (
                        <img
                            src={item.thumbnailUrl}
                            alt="Content thumbnail"
                            className="w-full aspect-square object-cover rounded"
                        />
                    )}

                    {/* Caption Preview */}
                    <p className="text-xs text-baked-text-secondary line-clamp-2">
                        {item.captionPreview}
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span className="text-baked-text-muted">
                                {(item.metrics.impressions / 1000).toFixed(1)}K
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-400" />
                            <span className="text-baked-text-muted">
                                {item.metrics.likes}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-green-400" />
                            <span className="text-baked-text-muted">
                                {item.metrics.comments}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-purple-400" />
                            <span className="text-baked-text-muted">
                                {item.metrics.engagementRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
