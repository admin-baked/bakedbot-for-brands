'use client';

/**
 * InsightCard Component
 *
 * Individual insight card with agent branding, metrics, and action CTA.
 * Clicking the card creates a new inbox thread for the relevant agent.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Bot,
    MessageCircle,
    LineChart,
    ShieldCheck,
    DollarSign,
    Radar,
    Heart,
    Briefcase,
    TrendingUp,
    TrendingDown,
    Minus,
    ArrowRight,
    Info,
    ThumbsUp,
    ThumbsDown,
} from 'lucide-react';
import {
    formatSlowMoverMetricValue,
    getSlowMoverMetric,
    parseSlowMoverMetricBundle,
} from '@/lib/slow-mover-metrics';
import { cn } from '@/lib/utils';
import type { InsightCard as InsightCardType } from '@/types/insight-cards';
import { getAgentColors, getSeverityColors } from '@/types/insight-cards';
import { submitInsightFeedback } from '@/server/actions/insights';

// ============ Agent Icon Mapping ============

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    smokey: Bot,
    craig: MessageCircle,
    pops: LineChart,
    deebo: ShieldCheck,
    money_mike: DollarSign,
    ezal: Radar,
    mrs_parker: Heart,
    leo: Briefcase,
    jack: Briefcase,
    linus: LineChart,
    glenda: MessageCircle,
    day_day: TrendingUp,
};

// ============ Trend Indicator ============

function TrendIndicator({
    trend,
    value,
    dense = false,
}: {
    trend?: string;
    value?: string;
    dense?: boolean;
}) {
    if (!trend) return null;

    const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const color =
        trend === 'up'
            ? 'text-emerald-600'
            : trend === 'down'
              ? 'text-red-600'
              : 'text-muted-foreground';

    return (
        <span
            className={cn(
                'flex items-center gap-0.5 font-medium',
                dense ? 'text-[11px]' : 'text-xs',
                color
            )}
        >
            <Icon className={cn(dense ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
            {value}
        </span>
    );
}

function getSlowMoverMetricView(insight: InsightCardType) {
    const bundle = parseSlowMoverMetricBundle(insight.metadata?.metricBundle);
    if (!bundle) {
        return null;
    }

    return bundle;
}

// ============ Component Props ============

interface InsightCardProps {
    insight: InsightCardType;
    onAction?: (insight: InsightCardType) => void;
    className?: string;
    compact?: boolean;
    dense?: boolean;
}

// ============ Component ============

export function InsightCard({
    insight,
    onAction,
    className,
    compact = false,
    dense = false,
}: InsightCardProps) {
    const AgentIcon = AGENT_ICONS[insight.agentId] || Bot;
    const agentColors = getAgentColors(insight.agentId);
    const severityColors = getSeverityColors(insight.severity);
    const [feedbackGiven, setFeedbackGiven] = React.useState<'up' | 'down' | null>(null);
    const slowMoverMetricBundle = React.useMemo(() => getSlowMoverMetricView(insight), [insight]);
    const [selectedMetricId, setSelectedMetricId] = React.useState<string | null>(
        slowMoverMetricBundle?.defaultMetricId ?? null
    );

    React.useEffect(() => {
        setSelectedMetricId(slowMoverMetricBundle?.defaultMetricId ?? null);
    }, [slowMoverMetricBundle?.defaultMetricId, insight.id]);

    const selectedMetric = React.useMemo(
        () => getSlowMoverMetric(slowMoverMetricBundle, selectedMetricId),
        [selectedMetricId, slowMoverMetricBundle]
    );
    const displayHeadline = selectedMetric
        ? formatSlowMoverMetricValue(selectedMetric)
        : insight.headline;
    const displaySubtext = selectedMetric && slowMoverMetricBundle
        ? [
            selectedMetric.coverage?.note,
            insight.subtext,
        ].filter(Boolean).join('\n')
        : insight.subtext;
    const tooltipText = selectedMetric
        ? [
            selectedMetric.description,
            selectedMetric.coverage?.note,
            'Gift cards are excluded from this audit.',
        ].filter(Boolean).join(' ')
        : insight.tooltipText;

    const handleClick = () => {
        if (onAction && insight.actionable) {
            onAction(insight);
        }
    };

    const handleFeedback = async (e: React.MouseEvent, rating: 'up' | 'down') => {
        e.stopPropagation();
        if (feedbackGiven) return;
        setFeedbackGiven(rating);
        await submitInsightFeedback(rating, {
            insightId: insight.id,
            agentId: insight.agentId,
            contentSnippet: `${insight.title}: ${insight.headline}`,
        });
    };

    return (
        <TooltipProvider>
            <Card
                className={cn(
                    'group relative overflow-hidden transition-all duration-200',
                    'hover:shadow-md hover:border-primary/30',
                    insight.actionable && 'cursor-pointer',
                    // Severity accent on left border
                    insight.severity === 'critical' && 'border-l-4 border-l-red-500',
                    insight.severity === 'warning' && 'border-l-4 border-l-amber-500',
                    className
                )}
                onClick={handleClick}
            >
                <CardContent className={cn('p-4', compact && 'p-3', dense && 'p-2.5')}>
                    {/* Header: Agent Badge + Trend */}
                    <div className={cn('flex items-center justify-between', dense ? 'mb-1.5' : 'mb-2')}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'flex items-center gap-1 font-semibold',
                                        dense
                                            ? 'h-5 rounded-full px-2 text-[9px]'
                                            : 'text-[10px]',
                                        agentColors.bg,
                                        agentColors.text,
                                        agentColors.border
                                    )}
                                >
                                    <AgentIcon className={cn(dense ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
                                    {insight.agentName}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">Insight from {insight.agentName}</p>
                            </TooltipContent>
                        </Tooltip>

                        <TrendIndicator
                            trend={insight.trend}
                            value={insight.trendValue}
                            dense={dense}
                        />
                    </div>

                    {/* Title */}
                    <div className={cn('flex items-center gap-1', dense ? 'mb-0.5' : 'mb-1')}>
                        <h4
                            className={cn(
                                'font-medium uppercase text-muted-foreground',
                                dense
                                    ? 'text-[11px] tracking-[0.16em]'
                                    : 'text-xs tracking-wider'
                            )}
                        >
                            {insight.title}
                        </h4>
                        {tooltipText && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" /></div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                    <p className="text-xs">{tooltipText}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {slowMoverMetricBundle && (
                        <div className={cn('flex flex-wrap gap-1', dense ? 'mb-1' : 'mb-1.5')}>
                            {slowMoverMetricBundle.metrics.map((metric) => {
                                const isSelected = selectedMetric?.id === metric.id;

                                return (
                                    <button
                                        key={metric.id}
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedMetricId(metric.id);
                                        }}
                                        className={cn(
                                            'rounded-full border transition-colors',
                                            dense ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
                                            isSelected
                                                ? 'border-primary/40 bg-primary/10 text-primary'
                                                : 'border-border/70 bg-background/80 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                                        )}
                                    >
                                        {metric.shortLabel}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Headline */}
                    <p
                        className={cn(
                            'font-bold text-foreground',
                            dense
                                ? 'text-base leading-tight line-clamp-2'
                                : compact
                                    ? 'text-lg'
                                    : 'text-xl'
                        )}
                    >
                        {displayHeadline}
                    </p>

                    {/* Subtext */}
                    {displaySubtext && (
                        <p
                            className={cn(
                                'mt-1 whitespace-pre-line text-muted-foreground',
                                dense
                                    ? 'line-clamp-2 text-[11px] leading-4'
                                    : 'text-xs'
                            )}
                        >
                            {displaySubtext}
                        </p>
                    )}

                    {/* CTA Button (shown on hover or if critical) */}
                    {insight.actionable && insight.ctaLabel && !dense && (
                        <div
                            className={cn(
                                'mt-3 transition-opacity duration-200',
                                insight.severity !== 'critical' &&
                                    'opacity-0 group-hover:opacity-100'
                            )}
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-7 text-xs font-medium', severityColors.text)}
                            >
                                {insight.ctaLabel}
                                <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                    )}
                    {insight.actionable && dense && (
                        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-background/95 p-1 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
                            <ArrowRight className={cn('h-3 w-3', severityColors.text)} />
                        </div>
                    )}

                    {/* Thumbs feedback — shown on hover in both standard and dense modes */}
                    <div className={cn(
                        'flex items-center gap-1 transition-opacity duration-200',
                        dense ? 'mt-1' : 'mt-2',
                        feedbackGiven ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}>
                        {feedbackGiven ? (
                            <span className={cn('text-muted-foreground', dense ? 'text-[9px]' : 'text-[10px]')}>
                                {feedbackGiven === 'up' ? 'Thanks!' : 'Noted.'}
                            </span>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => handleFeedback(e, 'up')}
                                    className="rounded p-0.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                    aria-label="Helpful"
                                >
                                    <ThumbsUp className={cn(dense ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
                                </button>
                                <button
                                    onClick={(e) => handleFeedback(e, 'down')}
                                    className="rounded p-0.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    aria-label="Not helpful"
                                >
                                    <ThumbsDown className={cn(dense ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
                                </button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}

export default InsightCard;
