'use client';

/**
 * Engagement Analytics Component
 *
 * Displays social media engagement metrics for published content.
 * Shows platform-agnostic metrics and platform-specific insights.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Eye,
    Users,
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    MousePointer,
    Clock,
    Activity,
    Instagram,
    Linkedin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EngagementMetrics, SocialPlatform } from '@/types/creative-content';
import { cn } from '@/lib/utils';

interface EngagementAnalyticsProps {
    metrics: EngagementMetrics;
    platform: SocialPlatform;
    className?: string;
}

export function EngagementAnalytics({ metrics, platform, className }: EngagementAnalyticsProps) {
    // Calculate total engagement
    const totalEngagement = metrics.likes + metrics.comments + metrics.shares + metrics.saves;

    // Format large numbers
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    // Format percentage
    const formatPercent = (num: number): string => `${num.toFixed(1)}%`;

    // Get platform icon
    const getPlatformIcon = () => {
        switch (platform) {
            case 'instagram':
                return <Instagram className="w-4 h-4" />;
            case 'linkedin':
                return <Linkedin className="w-4 h-4" />;
            case 'tiktok':
                return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>;
            default:
                return <Activity className="w-4 h-4" />;
        }
    };

    // Metric cards data
    const metricCards = [
        {
            icon: Eye,
            label: 'Impressions',
            value: formatNumber(metrics.impressions),
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
        },
        {
            icon: Users,
            label: 'Reach',
            value: formatNumber(metrics.reach),
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
        },
        {
            icon: Heart,
            label: 'Likes',
            value: formatNumber(metrics.likes),
            color: 'text-red-400',
            bgColor: 'bg-red-400/10',
        },
        {
            icon: MessageCircle,
            label: 'Comments',
            value: formatNumber(metrics.comments),
            color: 'text-green-400',
            bgColor: 'bg-green-400/10',
        },
        {
            icon: Share2,
            label: 'Shares',
            value: formatNumber(metrics.shares),
            color: 'text-amber-400',
            bgColor: 'bg-amber-400/10',
        },
        {
            icon: Bookmark,
            label: 'Saves',
            value: formatNumber(metrics.saves),
            color: 'text-pink-400',
            bgColor: 'bg-pink-400/10',
        },
    ];

    return (
        <Card className={cn('bg-baked-card border-baked-border shadow-none', className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-baked-green" />
                        Engagement Analytics
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className="bg-baked-darkest border-baked-border text-baked-text-muted flex items-center gap-1"
                    >
                        {getPlatformIcon()}
                        <span className="capitalize text-xs">{platform}</span>
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Performance Overview */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-baked-green/10 border border-baked-green/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3.5 h-3.5 text-baked-green" />
                            <span className="text-xs text-baked-text-secondary">Engagement Rate</span>
                        </div>
                        <p className="text-xl font-bold text-baked-green">
                            {formatPercent(metrics.engagementRate)}
                        </p>
                    </div>

                    {metrics.clickThroughRate !== undefined && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <MousePointer className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-xs text-baked-text-secondary">CTR</span>
                            </div>
                            <p className="text-xl font-bold text-purple-400">
                                {formatPercent(metrics.clickThroughRate)}
                            </p>
                        </div>
                    )}

                    {metrics.clickThroughRate === undefined && (
                        <div className="bg-baked-darkest border border-baked-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-3.5 h-3.5 text-baked-text-muted" />
                                <span className="text-xs text-baked-text-secondary">Total Engagement</span>
                            </div>
                            <p className="text-xl font-bold text-baked-text-primary">
                                {formatNumber(totalEngagement)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {metricCards.map((metric, idx) => (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-baked-darkest rounded-lg p-2.5 border border-baked-border hover:border-baked-green/30 transition-colors"
                        >
                            <div className={cn('w-7 h-7 rounded-md flex items-center justify-center mb-1.5', metric.bgColor)}>
                                <metric.icon className={cn('w-3.5 h-3.5', metric.color)} />
                            </div>
                            <p className="text-xs text-baked-text-secondary mb-0.5">{metric.label}</p>
                            <p className="text-sm font-semibold text-baked-text-primary">{metric.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Platform-Specific Metrics */}
                {platform === 'instagram' && metrics.platformSpecific?.instagram && (
                    <div className="space-y-2 pt-2 border-t border-baked-border">
                        <h4 className="text-xs font-medium text-baked-text-secondary flex items-center gap-1.5">
                            <Instagram className="w-3 h-3" />
                            Instagram Insights
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {metrics.platformSpecific.instagram.profileVisits !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">Profile Visits</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        {formatNumber(metrics.platformSpecific.instagram.profileVisits)}
                                    </span>
                                </div>
                            )}
                            {metrics.platformSpecific.instagram.websiteClicks !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">Website Clicks</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        {formatNumber(metrics.platformSpecific.instagram.websiteClicks)}
                                    </span>
                                </div>
                            )}
                            {metrics.platformSpecific.instagram.reelPlays !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">Reel Plays</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        {formatNumber(metrics.platformSpecific.instagram.reelPlays)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {platform === 'tiktok' && metrics.platformSpecific?.tiktok && (
                    <div className="space-y-2 pt-2 border-t border-baked-border">
                        <h4 className="text-xs font-medium text-baked-text-secondary flex items-center gap-1.5">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                            TikTok Analytics
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {metrics.platformSpecific.tiktok.videoViews !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">Video Views</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        {formatNumber(metrics.platformSpecific.tiktok.videoViews)}
                                    </span>
                                </div>
                            )}
                            {metrics.platformSpecific.tiktok.completionRate !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">Completion Rate</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        {formatPercent(metrics.platformSpecific.tiktok.completionRate)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {platform === 'linkedin' && metrics.platformSpecific?.linkedin && (
                    <div className="space-y-2 pt-2 border-t border-baked-border">
                        <h4 className="text-xs font-medium text-baked-text-secondary flex items-center gap-1.5">
                            <Linkedin className="w-3 h-3" />
                            LinkedIn Insights
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {metrics.platformSpecific.linkedin.postClicks !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">Post Clicks</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        {formatNumber(metrics.platformSpecific.linkedin.postClicks)}
                                    </span>
                                </div>
                            )}
                            {metrics.platformSpecific.linkedin.followerGains !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-baked-darkest/50 rounded">
                                    <span className="text-xs text-baked-text-muted">New Followers</span>
                                    <span className="text-sm font-medium text-baked-text-primary">
                                        +{formatNumber(metrics.platformSpecific.linkedin.followerGains)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Last Synced */}
                {metrics.lastSyncedAt && (
                    <div className="flex items-center gap-1.5 pt-2 text-xs text-baked-text-muted">
                        <Clock className="w-3 h-3" />
                        Last synced {new Date(metrics.lastSyncedAt).toLocaleString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
