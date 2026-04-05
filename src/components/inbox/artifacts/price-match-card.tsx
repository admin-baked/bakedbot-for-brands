'use client';

/**
 * PriceMatchCard
 *
 * Renders a `competitor_price_match` inbox artifact.
 * Shows a table of products where competitors are priced at or below ours,
 * with a recommended price to match or beat by $1.
 *
 * Agent: Ezal (competitive intel)
 */

import React from 'react';
import { TrendingDown, ArrowRight, AlertTriangle, Target, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InboxArtifact, CompetitorPriceMatchData, PriceMatchOpportunity } from '@/types/inbox';

interface Props {
    artifact: InboxArtifact;
    className?: string;
}

const IMPACT_CONFIG: Record<PriceMatchOpportunity['estimatedImpact'], { label: string; className: string }> = {
    high:   { label: 'High Traffic', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
    medium: { label: 'Medium',       className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    low:    { label: 'Low',          className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
};

const ACTION_CONFIG: Record<PriceMatchOpportunity['action'], { label: string; className: string }> = {
    beat:  { label: 'Beat by $1', className: 'text-emerald-400' },
    match: { label: 'Price Match', className: 'text-blue-400' },
};

function fmt(price: number): string {
    return `$${price.toFixed(2)}`;
}

function OpportunityRow({ opp }: { opp: PriceMatchOpportunity }) {
    const impact = IMPACT_CONFIG[opp.estimatedImpact];
    const action = ACTION_CONFIG[opp.action];
    const saving = opp.ourPrice - opp.recommendedPrice;

    return (
        <div className="grid grid-cols-[1fr_auto] gap-2 p-2.5 rounded-lg bg-white/4 border border-white/6 hover:bg-white/6 transition-colors">
            {/* Left: product info */}
            <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold truncate">{opp.productName}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0 shrink-0', impact.className)}>
                        {impact.label}
                    </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{opp.competitorName}</span>
                    <span>·</span>
                    <span>{opp.category}</span>
                </div>
                {/* Price comparison */}
                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className="text-muted-foreground line-through">{fmt(opp.ourPrice)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className={cn('font-bold', action.className)}>{fmt(opp.recommendedPrice)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">They: {fmt(opp.competitorPrice)}</span>
                </div>
            </div>

            {/* Right: action pill + saving */}
            <div className="flex flex-col items-end justify-between shrink-0 gap-1">
                <span className={cn('text-[10px] font-medium', action.className)}>
                    {action.label}
                </span>
                {saving > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                        -{fmt(saving)}/unit
                    </span>
                )}
            </div>
        </div>
    );
}

export function PriceMatchCard({ artifact, className }: Props) {
    const data = artifact.data as CompetitorPriceMatchData;
    const highCount = data.opportunities.filter((o) => o.estimatedImpact === 'high').length;
    const beatCount = data.opportunities.filter((o) => o.action === 'beat').length;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <h3 className="text-sm font-semibold">Competitor Price Match</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{data.marketContext}</p>
                </div>
                {highCount > 0 && (
                    <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/20 text-xs shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {highCount} High-Traffic
                    </Badge>
                )}
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/8 space-y-0.5 text-center">
                    <p className="text-lg font-bold text-amber-400">{data.opportunities.length}</p>
                    <p className="text-[10px] text-muted-foreground">Opportunities</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/8 space-y-0.5 text-center">
                    <p className="text-lg font-bold text-emerald-400">{beatCount}</p>
                    <p className="text-[10px] text-muted-foreground">Beat by $1</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/8 space-y-0.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                        <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                        <p className="text-lg font-bold text-blue-400">
                            {data.totalSavingsGap.toFixed(0)}
                        </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Gap / visit</p>
                </div>
            </div>

            {/* Top competitor banner */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/8 border border-amber-500/15">
                <TrendingDown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                    <span className="font-semibold">{data.topCompetitor}</span> has the most price advantages — they may be winning foot traffic on these products.
                </p>
            </div>

            {/* Opportunities list */}
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price Adjustments ({data.opportunities.length})
                </p>
                <div className="space-y-1.5">
                    {data.opportunities.map((opp, i) => (
                        <OpportunityRow key={i} opp={opp} />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-muted-foreground pt-1">
                Ezal · Competitive Intel · {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
        </div>
    );
}
