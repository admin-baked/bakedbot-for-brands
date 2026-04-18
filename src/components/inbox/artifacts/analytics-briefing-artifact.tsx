'use client';

/**
 * AnalyticsBriefingArtifact
 *
 * Renders a morning proactive briefing artifact.
 * Shows: urgency header, optional top alert, metrics grid, industry headlines,
 * and market context pill.
 */

import React from 'react';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ExternalLink,
    AlertTriangle,
    MapPin,
    Calendar,
    Mail,
    Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
    InboxArtifact,
    AnalyticsBriefing,
    BriefingMetric,
    BriefingMeeting,
    BriefingNewsItem,
} from '@/types/inbox';

interface Props {
    artifact: InboxArtifact;
    className?: string;
}

const URGENCY_CONFIG = {
    critical: { label: 'Critical', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    warning: { label: 'Needs Attention', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    info: { label: 'FYI', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    clean: { label: 'All Clear', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
} as const;

const STATUS_DOT: Record<BriefingMetric['status'], string> = {
    good: 'bg-green-500',
    warning: 'bg-amber-500',
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
            <div className="space-y-1 rounded-lg border border-white/8 bg-white/5 p-3">
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
                    <p className="mt-1 text-xs italic text-amber-400">{metric.actionable}</p>
                )}
            </div>
        </TooltipProvider>
    );
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(`${dateStr}T12:00:00Z`);
        if (Number.isNaN(d.getTime())) {
            return dateStr;
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

function toMetrics(data: Partial<AnalyticsBriefing>): BriefingMetric[] {
    return Array.isArray(data.metrics) ? data.metrics : [];
}

function toNewsItems(data: Partial<AnalyticsBriefing>): BriefingNewsItem[] {
    return Array.isArray(data.newsItems) ? data.newsItems : [];
}

function toMeetings(data: Partial<AnalyticsBriefing>): BriefingMeeting[] {
    return Array.isArray(data.meetings) ? data.meetings : [];
}

export function AnalyticsBriefingArtifact({ artifact, className }: Props) {
    const data = (artifact.data ?? {}) as Partial<AnalyticsBriefing>;
    const metrics = toMetrics(data);
    const newsItems = toNewsItems(data);
    const meetings = toMeetings(data);
    const topEmails = Array.isArray(data.emailDigest?.topEmails) ? data.emailDigest.topEmails : [];
    const urgencyLevel = data.urgencyLevel && data.urgencyLevel in URGENCY_CONFIG
        ? data.urgencyLevel
        : 'info';
    const urgency = URGENCY_CONFIG[urgencyLevel];
    const pulseType = data.pulseType ?? 'morning';
    const pulseLabel = pulseType === 'midday'
        ? 'Midday Check-In'
        : pulseType === 'evening'
            ? "Tomorrow's Preview"
            : `${data.dayOfWeek || 'Today'}'s Briefing`;
    const dateLabel = typeof data.date === 'string' && data.date.trim()
        ? formatDate(data.date)
        : 'Today';
    const unreadCount = typeof data.emailDigest?.unreadCount === 'number' ? data.emailDigest.unreadCount : 0;

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-sm">
                        {pulseLabel} - {dateLabel}
                    </h3>
                </div>
                <Badge variant="outline" className={cn('text-xs font-medium', urgency.className)}>
                    {urgency.label}
                </Badge>
            </div>

            {data.topAlert && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{data.topAlert}</span>
                </div>
            )}

            {metrics.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Key Metrics</p>
                    <div className="grid grid-cols-2 gap-2">
                        {metrics.map((metric, index) => (
                            <MetricCard key={index} metric={metric} />
                        ))}
                    </div>
                </div>
            )}

            {newsItems.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Industry Headlines</p>
                    <div className="space-y-2">
                        {newsItems.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 rounded-lg border border-white/6 bg-white/4 p-2.5">
                                <span
                                    className={cn(
                                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                        item.relevance === 'high' ? 'bg-amber-400' : 'bg-muted-foreground/50'
                                    )}
                                />
                                <div className="min-w-0 flex-1">
                                    {item.url ? (
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-primary"
                                        >
                                            {item.headline}
                                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
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

            {meetings.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {pulseType === 'evening' ? "Tomorrow's Meetings" : "Today's Meetings"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        {meetings.map((meeting, index) => (
                            <div key={index} className="flex items-center gap-2 rounded-md border border-white/6 bg-white/4 p-2">
                                <span className="w-16 shrink-0 text-xs font-mono text-muted-foreground">
                                    {meeting.startTime || 'TBD'}
                                </span>
                                <span className="flex-1 truncate text-xs font-medium">{meeting.title || 'Untitled meeting'}</span>
                                {meeting.attendee && (
                                    <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                                        {meeting.attendee}
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        'shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium',
                                        meeting.source === 'bakedbot'
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-blue-500/20 text-blue-400'
                                    )}
                                >
                                    {meeting.source === 'bakedbot' ? 'BB' : 'GCal'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.emailDigest && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Inbox - {unreadCount} unread
                        </p>
                    </div>
                    {topEmails.length > 0 ? (
                        <div className="space-y-1.5">
                            {topEmails.map((email, index) => (
                                <div key={index} className="rounded-md border border-white/6 bg-white/4 p-2">
                                    <p className="truncate text-xs font-medium">{email.subject}</p>
                                    <p className="truncate text-xs text-muted-foreground">{email.from}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No new messages in this window.</p>
                    )}
                </div>
            )}

            {data.marketContext && (
                <div className="flex items-center gap-1.5 pt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{data.marketContext}</span>
                </div>
            )}
        </div>
    );
}
