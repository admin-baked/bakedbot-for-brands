'use client';

/**
 * AnalyticsBriefingArtifact
 *
 * Renders a morning proactive briefing artifact.
 * Shows: urgency header, optional top alert, metrics grid, industry headlines,
 * and market context pill.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, AlertTriangle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InboxArtifact, AnalyticsBriefing, BriefingMetric } from '@/types/inbox';

interface Props {
    artifact: InboxArtifact;
    className?: string;
}

const URGENCY_CONFIG = {
    critical: { label: 'Critical', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    warning:  { label: 'Needs Attention', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    info:     { label: 'FYI', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    clean:    { label: 'All Clear', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const STATUS_DOT: Record<BriefingMetric['status'], string> = {
    good:     'bg-green-500',
    warning:  'bg-amber-500',
    critical: 'bg-red-500',
};

function TrendIcon({ trend }: { trend: BriefingMetric['trend'] }) {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function MetricCard({ metric }: { metric: BriefingMetric }) {
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/8 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{metric.title}</span>
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[metric.status])} />
            </div>
            <div className="text-lg font-bold leading-none">{metric.value}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendIcon trend={metric.trend} />
                <span>{metric.vsLabel}</span>
            </div>
            {metric.actionable && (
                <p className="text-xs text-amber-400 italic mt-1">{metric.actionable}</p>
            )}
        </div>
    );
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + 'T12:00:00Z');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function AnalyticsBriefingArtifact({ artifact, className }: Props) {
    const data = artifact.data as AnalyticsBriefing;
    const urgency = URGENCY_CONFIG[data.urgencyLevel];

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-sm">
                        {data.dayOfWeek}&apos;s Briefing · {formatDate(data.date)}
                    </h3>
                </div>
                <Badge variant="outline" className={cn('text-xs font-medium', urgency.className)}>
                    {urgency.label}
                </Badge>
            </div>

            {/* Top Alert */}
            {data.topAlert && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{data.topAlert}</span>
                </div>
            )}

            {/* Metrics Grid */}
            {data.metrics.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Metrics</p>
                    <div className="grid grid-cols-2 gap-2">
                        {data.metrics.map((metric, i) => (
                            <MetricCard key={i} metric={metric} />
                        ))}
                    </div>
                </div>
            )}

            {/* Industry Headlines */}
            {data.newsItems.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry Headlines</p>
                    <div className="space-y-2">
                        {data.newsItems.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/4 border border-white/6">
                                <span className={cn(
                                    'h-1.5 w-1.5 rounded-full shrink-0 mt-1.5',
                                    item.relevance === 'high' ? 'bg-amber-400' : 'bg-muted-foreground/50'
                                )} />
                                <div className="min-w-0 flex-1">
                                    {item.url ? (
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium hover:text-primary transition-colors flex items-center gap-1"
                                        >
                                            {item.headline}
                                            <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                                        </a>
                                    ) : (
                                        <p className="text-xs font-medium">{item.headline}</p>
                                    )}
                                    <span className="text-xs text-muted-foreground">{item.source}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Market Context Pill */}
            <div className="flex items-center gap-1.5 pt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{data.marketContext}</span>
            </div>
        </div>
    );
}
