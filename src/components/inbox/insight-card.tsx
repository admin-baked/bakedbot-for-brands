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
                        {insight.tooltipText && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" /></div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                    <p className="text-xs">{insight.tooltipText}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

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
                        {insight.headline}
                    </p>

                    {/* Subtext */}
                    {insight.subtext && (
                        <p
                            className={cn(
                                'mt-1 text-muted-foreground',
                                dense
                                    ? 'line-clamp-2 text-[11px] leading-4'
                                    : 'text-xs'
                            )}
                        >
                            {insight.subtext}
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

                    {/* Thumbs feedback — shown on hover, hidden once given */}
                    {!dense && (
                        <div className={cn(
                            'mt-2 flex items-center gap-1 transition-opacity duration-200',
                            feedbackGiven ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}>
                            {feedbackGiven ? (
                                <span className="text-[10px] text-muted-foreground">
                                    {feedbackGiven === 'up' ? 'Thanks!' : 'Got it — we\'ll improve.'}
                                </span>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => handleFeedback(e, 'up')}
                                        className="rounded p-0.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                        aria-label="Helpful"
                                    >
                                        <ThumbsUp className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={(e) => handleFeedback(e, 'down')}
                                        className="rounded p-0.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                        aria-label="Not helpful"
                                    >
                                        <ThumbsDown className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}

export default InsightCard;
