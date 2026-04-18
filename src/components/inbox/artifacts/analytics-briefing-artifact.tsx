'use client';

/**
 * AnalyticsBriefingArtifact
 *
 * Renders a morning proactive briefing artifact.
 * Shows: urgency header, optional top alert, metrics grid, industry headlines,
 * and market context pill.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, AlertTriangle, MapPin, Calendar, Mail, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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
    const defaultOption = React.useMemo(
        () => metric.metricOptions?.find((option) => option.isDefault) ?? metric.metricOptions?.[0] ?? null,
        [metric.metricOptions]
    );
    const [selectedMetricId, setSelectedMetricId] = React.useState(defaultOption?.id ?? null);

    React.useEffect(() => {
        setSelectedMetricId(defaultOption?.id ?? null);
    }, [defaultOption?.id]);

    const selectedOption = React.useMemo(
        () => metric.metricOptions?.find((option) => option.id === selectedMetricId) ?? defaultOption,
        [defaultOption, metric.metricOptions, selectedMetricId]
    );
    const metricValue = selectedOption?.value ?? metric.value;
    const tooltipText = selectedOption?.tooltipText ?? metric.tooltipText;

    return (
        <TooltipProvider>
            <div className="p-3 rounded-lg bg-white/5 border border-white/8 space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{metric.title}</span>
                        {tooltipText && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button type="button" className="cursor-help text-muted-foreground/60 hover:text-foreground">
                                        <Info className="h-3.5 w-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[260px] text-xs">
                                    <p>{tooltipText}</p>
                                    {selectedOption?.coverageNote && (
                                        <p className="mt-1 text-muted-foreground">{selectedOption.coverageNote}</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[metric.status])} />
                </div>

                {metric.metricOptions && metric.metricOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {metric.metricOptions.map((option) => {
                            const isSelected = selectedOption?.id === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setSelectedMetricId(option.id)}
                                    className={cn(
                                        'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                                        isSelected
                                            ? 'border-primary/40 bg-primary/10 text-primary'
                                            : 'border-white/10 bg-white/5 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                                    )}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="text-lg font-bold leading-none">{metricValue}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendIcon trend={metric.trend} />
                    <span>{metric.vsLabel}</span>
                </div>
                {selectedOption?.coverageNote && (
                    <p className="text-[11px] text-muted-foreground">{selectedOption.coverageNote}</p>
                )}
                {metric.actionable && (
                    <p className="text-xs text-amber-400 italic mt-1">{metric.actionable}</p>
                )}
            </div>
        </TooltipProvider>
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

    const pulseLabel = data.pulseType === 'midday'
        ? 'Midday Check-In'
        : data.pulseType === 'evening'
        ? "Tomorrow's Preview"
        : `${data.dayOfWeek}'s Briefing`;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-sm">
                        {pulseLabel} · {formatDate(data.date)}
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

            {/* Today's / Tomorrow's Meetings */}
            {data.meetings && data.meetings.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {data.pulseType === 'evening' ? "Tomorrow's Meetings" : "Today's Meetings"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        {data.meetings.map((meeting, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-white/4 border border-white/6">
                                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">
                                    {meeting.startTime}
                                </span>
                                <span className="text-xs font-medium flex-1 truncate">{meeting.title}</span>
                                {meeting.attendee && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                        {meeting.attendee}
                                    </span>
                                )}
                                <span className={cn(
                                    'text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0',
                                    meeting.source === 'bakedbot'
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-blue-500/20 text-blue-400'
                                )}>
                                    {meeting.source === 'bakedbot' ? 'BB' : 'GCal'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Email Digest */}
            {data.emailDigest && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Inbox · {data.emailDigest.unreadCount} unread
                        </p>
                    </div>
                    {data.emailDigest.topEmails.length > 0 ? (
                        <div className="space-y-1.5">
                            {data.emailDigest.topEmails.map((email, i) => (
                                <div key={i} className="p-2 rounded-md bg-white/4 border border-white/6">
                                    <p className="text-xs font-medium truncate">{email.subject}</p>
                                    <p className="text-xs text-muted-foreground truncate">{email.from}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No new messages in this window.</p>
                    )}
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
