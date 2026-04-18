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
    MessageSquare,
    Mail,
    Star,
    ClipboardList,
    ArrowRight,
    QrCode,
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

function clampPercent(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
}

function toCount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.round(value));
}

function RateBar({ rate, color }: { rate: number; color: string }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className={cn('h-full rounded-full', color)} style={{ width: `${rate}%` }} />
        </div>
    );
}

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <div className="rounded-lg border border-white/8 bg-white/5 p-3 text-center">
            <div className="text-xl font-bold">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

export function CheckinBriefingArtifact({ artifact, className }: Props) {
    const data = (artifact.data ?? null) as Partial<CheckinBriefingData> | null;
    const router = useRouter();

    if (!data) {
        return <div className="p-4 text-sm text-muted-foreground">No check-in data available.</div>;
    }

    const todayCount = toCount(data.todayCount);
    const weekCount = toCount(data.weekCount);
    const monthCount = toCount(data.monthCount);
    const todayNew = toCount(data.todayNew);
    const todayReturning = toCount(data.todayReturning);
    const smsConsentRate = clampPercent(data.smsConsentRate);
    const emailConsentRate = clampPercent(data.emailConsentRate);
    const reviewPendingCount = toCount(data.reviewPendingCount);
    const moodBreakdown = Array.isArray(data.moodBreakdown) ? data.moodBreakdown : [];
    const periodLabel = typeof data.periodLabel === 'string' && data.periodLabel.trim()
        ? data.periodLabel
        : 'Latest';
    const reviewQueuePrompt = `There are ${reviewPendingCount} customers in the Day-3 review sequence. What's the current status, what blockers should we watch for, and what action should we take next?`;

    const handleReviewQueue = () => {
        const params = new URLSearchParams({
            newThread: 'outreach',
            agent: 'mrs_parker',
            prompt: reviewQueuePrompt,
        });
        router.push(`/dashboard/inbox?${params.toString()}`);
    };

    const handleManage = () => {
        router.push('/dashboard/dispensary/checkin');
    };

    const generatedAtLabel = data.generatedAt
        ? new Date(data.generatedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
        : null;

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold">Check-In Briefing</h3>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-600">
                    {periodLabel}
                </Badge>
            </div>

            {data.insight && (
                <p className="text-sm leading-relaxed text-muted-foreground">{data.insight}</p>
            )}

            <div className="grid grid-cols-3 gap-2">
                <StatTile value={todayCount} label="Today" />
                <StatTile value={weekCount} label="This week" />
                <StatTile value={monthCount} label="This month" />
            </div>

            {todayCount > 0 && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {todayNew} new
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {todayReturning} returning
                    </span>
                </div>
            )}

            <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Opt-in rates (today)</p>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                        <MessageSquare className="h-3 w-3 shrink-0 text-emerald-400" />
                        <span className="w-16 text-muted-foreground">SMS</span>
                        <div className="flex-1">
                            <RateBar rate={smsConsentRate} color="bg-emerald-500" />
                        </div>
                        <span className="w-8 text-right font-semibold">{smsConsentRate}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 shrink-0 text-blue-400" />
                        <span className="w-16 text-muted-foreground">Email</span>
                        <div className="flex-1">
                            <RateBar rate={emailConsentRate} color="bg-blue-500" />
                        </div>
                        <span className="w-8 text-right font-semibold">{emailConsentRate}%</span>
                    </div>
                </div>
            </div>

            {reviewPendingCount > 0 && (
                <button
                    onClick={handleReviewQueue}
                    className="flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left transition-colors hover:bg-amber-500/15"
                >
                    <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 shrink-0 text-amber-500" />
                        <span>
                            <span className="font-semibold text-amber-500">{reviewPendingCount}</span>
                            {' '}in Day-3 review sequence
                        </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                </button>
            )}

            {moodBreakdown.length > 0 && (
                <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-400" />
                        Mood this week
                    </p>
                    <div className="space-y-1.5">
                        {moodBreakdown.slice(0, 4).map(({ mood, count }) => {
                            const pct = weekCount > 0 ? Math.round((count / weekCount) * 100) : 0;
                            return (
                                <div key={mood} className="flex items-center gap-2 text-xs">
                                    <span className="flex w-20 items-center gap-1 capitalize text-muted-foreground">
                                        {MOOD_EMOJI[mood] ?? 'Neutral'} {mood}
                                    </span>
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={handleManage}>
                    <QrCode className="h-3.5 w-3.5" />
                    Manage Check-In
                </Button>
            </div>

            {generatedAtLabel && (
                <p className="text-center text-xs text-muted-foreground/60">{generatedAtLabel}</p>
            )}
        </div>
    );
}
