'use client';

/**
 * PriceMatchCard
 *
 * Renders a `competitor_price_match` inbox artifact.
 * Shows a table of products where competitors are priced at or below ours,
 * with a recommended price to match or beat by $1.
 *
 * "Apply" pushes a time-boxed discount to the POS (Alleaves) via
 * applyPriceMatch(). Supports manual (one-tap) and autonomous modes.
 *
 * Agent: Ezal (competitive intel)
 */

import React, { useState, useTransition } from 'react';
import { TrendingDown, ArrowRight, AlertTriangle, Target, DollarSign, Check, Loader2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InboxArtifact, CompetitorPriceMatchData, PriceMatchOpportunity } from '@/types/inbox';

interface Props {
    artifact: InboxArtifact;
    orgId: string;
    hasPOS?: boolean;
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

function OpportunityRow({ opp, index, orgId, artifactId, hasPOS, onApplied }: {
    opp: PriceMatchOpportunity;
    index: number;
    orgId: string;
    artifactId: string;
    hasPOS?: boolean;
    onApplied: (index: number, discountId?: number) => void;
}) {
    const impact = IMPACT_CONFIG[opp.estimatedImpact];
    const action = ACTION_CONFIG[opp.action];
    const saving = opp.ourPrice - opp.recommendedPrice;
    const [isPending, startTransition] = useTransition();
    const isApplied = opp.posStatus === 'applied';
    const isFailed = opp.posStatus === 'failed';

    const handleApply = () => {
        startTransition(async () => {
            const { applyPriceMatch } = await import('@/app/actions/dynamic-pricing');
            const result = await applyPriceMatch(orgId, artifactId, index, { mode: 'manual' });
            if (result.success) {
                onApplied(index, result.discountId);
            }
        });
    };

    return (
        <div className="grid grid-cols-[1fr_auto] gap-2 p-2.5 rounded-lg bg-white/4 border border-white/6 hover:bg-white/6 transition-colors">
            {/* Left: product info */}
            <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold truncate">{opp.productName}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0 shrink-0', impact.className)}>
                        {impact.label}
                    </Badge>
                    {isApplied && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                            <Check className="h-2.5 w-2.5 mr-0.5" />Live
                        </Badge>
                    )}
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

            {/* Right: action pill + apply button */}
            <div className="flex flex-col items-end justify-between shrink-0 gap-1">
                <span className={cn('text-[10px] font-medium', action.className)}>
                    {action.label}
                </span>
                {saving > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                        -{fmt(saving)}/unit
                    </span>
                )}
                {!isApplied && hasPOS && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] font-medium"
                        disabled={isPending}
                        onClick={handleApply}
                    >
                        {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isFailed ? (
                            'Retry'
                        ) : (
                            <>
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                Apply to Menu
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}

export function PriceMatchCard({ artifact, orgId, hasPOS = false, className }: Props) {
    const data = artifact.data as CompetitorPriceMatchData;
    const [opportunities, setOpportunities] = useState(data.opportunities);
    const [isPending, startTransition] = useTransition();

    const highCount = opportunities.filter((o) => o.estimatedImpact === 'high').length;
    const beatCount = opportunities.filter((o) => o.action === 'beat').length;
    const appliedCount = opportunities.filter((o) => o.posStatus === 'applied').length;
    const unappliedHigh = opportunities.filter((o) => o.estimatedImpact === 'high' && o.posStatus !== 'applied').length;

    const handleApplied = (index: number) => {
        setOpportunities(prev => {
            const next = [...prev];
            next[index] = { ...next[index], posStatus: 'applied', appliedAt: new Date().toISOString() };
            return next;
        });
    };

    const handleApplyAll = () => {
        startTransition(async () => {
            const { applyAutoPriceMatches } = await import('@/app/actions/dynamic-pricing');
            const result = await applyAutoPriceMatches(orgId, artifact.id);
            if (result.applied > 0) {
                // Refresh local state
                setOpportunities(prev => prev.map(o =>
                    o.estimatedImpact === 'high' && o.posStatus !== 'applied'
                        ? { ...o, posStatus: 'applied' as const, appliedAt: new Date().toISOString(), appliedBy: 'manual-batch' }
                        : o
                ));
            }
        });
    };

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
                    <p className="text-lg font-bold text-amber-400">{opportunities.length}</p>
                    <p className="text-[10px] text-muted-foreground">Opportunities</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/8 space-y-0.5 text-center">
                    <p className="text-lg font-bold text-emerald-400">{appliedCount > 0 ? `${appliedCount}/${opportunities.length}` : beatCount}</p>
                    <p className="text-[10px] text-muted-foreground">{appliedCount > 0 ? 'Applied' : 'Beat by $1'}</p>
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

            {/* Apply All button for high-impact items (POS only) */}
            {hasPOS && unappliedHigh > 0 && (
                <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isPending}
                    onClick={handleApplyAll}
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Zap className="h-4 w-4 mr-2" />
                    )}
                    Apply All High-Traffic Matches ({unappliedHigh})
                </Button>
            )}

            {/* Connect POS prompt when no POS configured */}
            {!hasPOS && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/8 border border-blue-500/15">
                    <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-300">
                        <span className="font-semibold">Connect your POS</span> to apply price matches directly to your menu with one tap.
                        Go to Settings &rarr; Integrations to get started.
                    </p>
                </div>
            )}

            {/* Opportunities list */}
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price Adjustments ({opportunities.length})
                </p>
                <div className="space-y-1.5">
                    {opportunities.map((opp, i) => (
                        <OpportunityRow
                            key={i}
                            opp={opp}
                            index={i}
                            orgId={orgId}
                            artifactId={artifact.id}
                            hasPOS={hasPOS}
                            onApplied={handleApplied}
                        />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-muted-foreground pt-1">
                Ezal · Competitive Intel · {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {appliedCount > 0 && ` · ${appliedCount} live on menu`}
            </p>
        </div>
    );
}
