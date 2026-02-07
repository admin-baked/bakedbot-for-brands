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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InsightCard as InsightCardType } from '@/types/insight-cards';
import { getAgentColors, getSeverityColors } from '@/types/insight-cards';

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

function TrendIndicator({ trend, value }: { trend?: string; value?: string }) {
    if (!trend) return null;

    const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const color =
        trend === 'up'
            ? 'text-emerald-600'
            : trend === 'down'
              ? 'text-red-600'
              : 'text-muted-foreground';

    return (
        <span className={cn('flex items-center gap-0.5 text-xs font-medium', color)}>
            <Icon className="h-3 w-3" />
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
}

// ============ Component ============

export function InsightCard({
    insight,
    onAction,
    className,
    compact = false,
}: InsightCardProps) {
    const AgentIcon = AGENT_ICONS[insight.agentId] || Bot;
    const agentColors = getAgentColors(insight.agentId);
    const severityColors = getSeverityColors(insight.severity);

    const handleClick = () => {
        if (onAction && insight.actionable) {
            onAction(insight);
        }
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
                <CardContent className={cn('p-4', compact && 'p-3')}>
                    {/* Header: Agent Badge + Trend */}
                    <div className="flex items-center justify-between mb-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-[10px] font-semibold flex items-center gap-1',
                                        agentColors.bg,
                                        agentColors.text,
                                        agentColors.border
                                    )}
                                >
                                    <AgentIcon className="h-3 w-3" />
                                    {insight.agentName}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">Insight from {insight.agentName}</p>
                            </TooltipContent>
                        </Tooltip>

                        <TrendIndicator trend={insight.trend} value={insight.trendValue} />
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {insight.title}
                    </h4>

                    {/* Headline */}
                    <p
                        className={cn(
                            'font-bold text-foreground',
                            compact ? 'text-lg' : 'text-xl'
                        )}
                    >
                        {insight.headline}
                    </p>

                    {/* Subtext */}
                    {insight.subtext && (
                        <p className="text-xs text-muted-foreground mt-1">{insight.subtext}</p>
                    )}

                    {/* CTA Button (shown on hover or if critical) */}
                    {insight.actionable && insight.ctaLabel && (
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
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}

export default InsightCard;
