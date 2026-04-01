'use client';

/**
 * CheckinBriefingArtifact
 *
 * Renders the daily check-in briefing card inside the inbox artifact panel.
 * Shows: today/week/month counts, new vs returning split, consent rates,
 * review sequence queue size, mood breakdown, and insight summary.
 */

import React from 'react';
import {
    Users, MessageSquare, Mail, Star, ClipboardList,
    CheckCircle2, Circle, ArrowRight, QrCode,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { InboxArtifact } from '@/types/inbox';
import type { CheckinBriefingData } from '@/server/actions/checkin-management';
import { MOOD_EMOJI } from '@/lib/checkin/loyalty-tablet-shared';

interface Props {
    artifact: InboxArtifact;
    className?: string;
}


function RateBar({ rate, color }: { rate: number; color: string }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className={cn('h-full rounded-full', color)} style={{ width: `${rate}%` }} />
        </div>
    );
}

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/8 text-center">
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    );
}

export function CheckinBriefingArtifact({ artifact, className }: Props) {
    const data = artifact.data as unknown as CheckinBriefingData;
    const router = useRouter();

    if (!data) {
        return <div className="p-4 text-sm text-muted-foreground">No check-in data available.</div>;
    }

    const handleReviewQueue = () => {
        const params = new URLSearchParams({
            newThread: 'outreach',
            agent: 'mrs_parker',
            prompt: `There are ${data.reviewPendingCount} Thrive customers in the Day-3 review sequence. What's the status and what should we do?`,
        });
        router.push(`/dashboard/inbox?${params.toString()}`);
    };

    const handleManage = () => {
        router.push('/dashboard/dispensary/checkin');
    };

    const generatedAtLabel = data.generatedAt
        ? new Date(data.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : null;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-emerald-500" />
                    <h3 className="font-semibold text-sm">Check-In Briefing</h3>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                    {data.periodLabel}
                </Badge>
            </div>

            {/* Insight */}
            {data.insight && (
                <p className="text-sm text-muted-foreground leading-relaxed">{data.insight}</p>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2">
                <StatTile value={data.todayCount} label="Today" />
                <StatTile value={data.weekCount} label="This week" />
                <StatTile value={data.monthCount} label="This month" />
            </div>

            {/* New vs returning */}
            {data.todayCount > 0 && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        {data.todayNew} new
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                        {data.todayReturning} returning
                    </span>
                </div>
            )}

            {/* Consent rates */}
            <div className="space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Opt-in rates (today)</p>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                        <MessageSquare className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span className="text-muted-foreground w-16">SMS</span>
                        <div className="flex-1">
                            <RateBar rate={data.smsConsentRate} color="bg-emerald-500" />
                        </div>
                        <span className="font-semibold w-8 text-right">{data.smsConsentRate}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                        <span className="text-muted-foreground w-16">Email</span>
                        <div className="flex-1">
                            <RateBar rate={data.emailConsentRate} color="bg-blue-500" />
                        </div>
                        <span className="font-semibold w-8 text-right">{data.emailConsentRate}%</span>
                    </div>
                </div>
            </div>

            {/* Review queue */}
            {data.reviewPendingCount > 0 && (
                <button
                    onClick={handleReviewQueue}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-left hover:bg-amber-500/15 transition-colors"
                >
                    <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>
                            <span className="font-semibold text-amber-500">{data.reviewPendingCount}</span>
                            {' '}in Day-3 review sequence
                        </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                </button>
            )}

            {/* Mood breakdown */}
            {data.moodBreakdown.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-yellow-400" />
                        Mood this week
                    </p>
                    <div className="space-y-1.5">
                        {data.moodBreakdown.slice(0, 4).map(({ mood, count }) => {
                            const pct = data.weekCount > 0 ? Math.round((count / data.weekCount) * 100) : 0;
                            return (
                                <div key={mood} className="flex items-center gap-2 text-xs">
                                    <span className="w-20 text-muted-foreground capitalize flex items-center gap-1">
                                        {MOOD_EMOJI[mood] ?? '🌿'} {mood}
                                    </span>
                                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-muted-foreground w-6 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={handleManage}>
                    <QrCode className="h-3.5 w-3.5" />
                    Manage Check-In
                </Button>
            </div>

            {generatedAtLabel && (
                <p className="text-xs text-muted-foreground/60 text-center">{generatedAtLabel}</p>
            )}
        </div>
    );
}
