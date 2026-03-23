'use client';

/**
 * CohortReportArtifact
 *
 * Renders a customer visit-frequency funnel card in the inbox artifact panel.
 * Shows 1st->2nd->3rd->4th->5th+ visit progression, dropout %, and a win-back CTA.
 */

import React from 'react';
import { Users, TrendingDown, TrendingUp, ArrowRight, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { InboxArtifact } from '@/types/inbox';
import type { CustomerVisitCohortResult, CohortBucket } from '@/server/actions/cohort-analytics';

interface CohortReportArtifactProps {
    artifact: InboxArtifact;
}

export function CohortReportArtifact({ artifact }: CohortReportArtifactProps) {
    const router = useRouter();
    const data = artifact.data as unknown as CustomerVisitCohortResult;

    if (!data || !data.buckets) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                No cohort data available.
            </div>
        );
    }

    const handleWinBackCTA = () => {
        const params = new URLSearchParams({
            newThread: 'outreach',
            agent: 'mrs_parker',
            prompt: 'Draft a win-back campaign for first-time customers who never returned after their first visit. Use the visit retention snapshot as context and recommend the audience, offer, and success metric.',
        });
        router.push(`/dashboard/inbox?${params.toString()}`);
    };

    const maxCount = data.buckets[0]?.count || 1;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Customer Visit Funnel</span>
                        <Badge variant="secondary" className="text-xs">{data.periodLabel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {data.totalCustomers.toLocaleString()} customers active in period
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{data.repeatCustomerRate}%</p>
                    <p className="text-xs text-muted-foreground">repeat rate</p>
                </div>
            </div>

            {/* Funnel bars */}
            <div className="space-y-2">
                {data.buckets.map((bucket, i) => (
                    <FunnelRow
                        key={bucket.visits}
                        bucket={bucket}
                        maxCount={maxCount}
                        isWorstDropoff={bucket.visits - 1 === data.topDropoffVisit && i > 0}
                    />
                ))}
            </div>

            {/* Key insight */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium flex items-center gap-1">
                    {data.topDropoffPct >= 50
                        ? <TrendingDown className="h-3 w-3 text-red-500" />
                        : <TrendingUp className="h-3 w-3 text-green-500" />
                    }
                    Biggest dropout: Visit {data.topDropoffVisit} {'->'} {data.topDropoffVisit + 1}
                </p>
                <p className="text-xs text-muted-foreground">
                    {data.topDropoffPct}% of customers who made visit {data.topDropoffVisit} did not return
                </p>
            </div>

            {/* Pops summary */}
            <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                    {data.summary}
                </p>
            </div>

            {/* Win-back CTA */}
            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="default"
                    className="flex-1 text-xs"
                    onClick={handleWinBackCTA}
                >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Ask Mrs. Parker to Run Win-Back
                </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-right">
                Generated {new Date(data.generatedAt).toLocaleDateString()}
            </p>
        </div>
    );
}

// ---- Funnel Row ----

function FunnelRow({
    bucket,
    maxCount,
    isWorstDropoff,
}: {
    bucket: CohortBucket;
    maxCount: number;
    isWorstDropoff: boolean;
}) {
    const barWidth = maxCount > 0 ? Math.round((bucket.count / maxCount) * 100) : 0;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <span className="font-medium w-20">{bucket.label}</span>
                    <span className="text-muted-foreground">{bucket.count.toLocaleString()}</span>
                    {bucket.dropoffPct !== null && (
                        <span className={`flex items-center gap-0.5 ${
                            isWorstDropoff ? 'text-red-500 font-medium' : 'text-muted-foreground'
                        }`}>
                            <ArrowRight className="h-2.5 w-2.5" />
                            {bucket.retentionPct}% retained
                            {isWorstDropoff && ' warning'}
                        </span>
                    )}
                </div>
                <span className="text-muted-foreground font-mono">{bucket.pct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        isWorstDropoff
                            ? 'bg-red-400'
                            : bucket.visits === 1
                            ? 'bg-primary'
                            : 'bg-primary/70'
                    }`}
                    style={{ width: `${barWidth}%` }}
                />
            </div>
        </div>
    );
}
