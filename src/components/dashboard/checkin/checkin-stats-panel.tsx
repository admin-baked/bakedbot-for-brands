'use client';

/**
 * CheckInStatsPanel
 *
 * Live check-in metrics: today / 7-day / 30-day counts, new vs returning,
 * SMS + email opt-in rates, review sequence queue, and mood breakdown.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users, Star, RefreshCw, BarChart2,
    ArrowRight, TrendingUp, ClipboardList, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CheckinStats } from '@/lib/checkin/checkin-management-shared';
import { MOOD_EMOJI } from '@/lib/checkin/loyalty-tablet-shared';

interface Props {
    stats: CheckinStats;
    orgId: string;
    onRefresh?: () => void;
    refreshing?: boolean;
}


function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    accent?: string;
}) {
    return (
        <div className="p-4 rounded-lg border bg-card space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Icon className={`h-3.5 w-3.5 ${accent ?? ''}`} />
                {label}
            </div>
            <p className={`text-2xl font-bold ${accent ?? ''}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    );
}

function RateBar({ label, rate, color }: { label: string; rate: number; color: string }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{rate}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${rate}%` }}
                />
            </div>
        </div>
    );
}

export function CheckInStatsPanel({ stats, orgId, onRefresh, refreshing }: Props) {
    const router = useRouter();

    const handleReviewQueue = () => {
        const params = new URLSearchParams({
            newThread: 'outreach',
            agent: 'mrs_parker',
            prompt: `There are ${stats.reviewPendingCount} Thrive customers in the Day-3 review sequence waiting for their Google review nudge. Confirm the review-sequence cron is healthy and suggest any follow-up actions.`,
        });
        router.push(`/dashboard/inbox?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-semibold text-sm">Check-In Activity</h3>
                    <Badge variant="outline" className="text-xs">{stats.periodLabel}</Badge>
                </div>
                {onRefresh && (
                    <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing} className="h-7 gap-1.5">
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                )}
            </div>

            {/* Primary KPI row */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard
                    label="Today"
                    value={stats.todayCount}
                    sub={stats.todayCount > 0 ? `${stats.todayNew} new · ${stats.todayReturning} returning` : 'No check-ins yet'}
                    icon={Users}
                    accent={stats.todayCount > 0 ? 'text-emerald-600' : undefined}
                />
                <StatCard
                    label="This week"
                    value={stats.weekCount}
                    sub="Last 7 days"
                    icon={TrendingUp}
                />
                <StatCard
                    label="This month"
                    value={stats.monthCount}
                    sub="Last 30 days"
                    icon={BarChart2}
                />
            </div>

            {/* Consent rates */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's opt-in rates</p>
                    <RateBar label="SMS consent" rate={stats.smsConsentRate} color="bg-emerald-500" />
                    <RateBar label="Email consent" rate={stats.emailConsentRate} color="bg-blue-500" />
                </CardContent>
            </Card>

            {/* Review queue alert */}
            {stats.reviewPendingCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                    <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>
                            <span className="font-semibold text-amber-600">{stats.reviewPendingCount}</span>
                            {' '}customer{stats.reviewPendingCount !== 1 ? 's' : ''} in Day-3 review sequence
                        </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-amber-600 hover:text-amber-700" onClick={handleReviewQueue}>
                        Ask Mrs. Parker <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-blue-500" />
                        Tablet Onboarding Runs
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard
                            label="Pending"
                            value={stats.onboardingSummary.pending}
                            sub="Waiting on next step"
                            icon={ClipboardList}
                        />
                        <StatCard
                            label="Blocked"
                            value={stats.onboardingSummary.blocked}
                            sub="Needs operator review"
                            icon={AlertTriangle}
                            accent={stats.onboardingSummary.blocked > 0 ? 'text-amber-600' : undefined}
                        />
                        <StatCard
                            label="Failed"
                            value={stats.onboardingSummary.failed}
                            sub="Delivery or workflow error"
                            icon={AlertTriangle}
                            accent={stats.onboardingSummary.failed > 0 ? 'text-red-600' : undefined}
                        />
                        <StatCard
                            label="Done today"
                            value={stats.onboardingSummary.completedToday}
                            sub="Completed onboarding runs"
                            icon={CheckCircle2}
                            accent={stats.onboardingSummary.completedToday > 0 ? 'text-emerald-600' : undefined}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Mood breakdown */}
            {stats.moodBreakdown.length > 0 && (
                <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            This week's moods
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        {stats.moodBreakdown.slice(0, 5).map(({ mood, count }) => {
                            const pct = stats.weekCount > 0 ? Math.round((count / stats.weekCount) * 100) : 0;
                            return (
                                <div key={mood} className="flex items-center gap-2 text-sm">
                                    <span className="w-20 text-muted-foreground capitalize flex items-center gap-1">
                                        {MOOD_EMOJI[mood] ?? '🌿'} {mood}
                                    </span>
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-purple-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                                </div>
                            );
                        })}
                        {stats.topMood && (
                            <p className="text-xs text-muted-foreground pt-1">
                                Top mood: <span className="font-medium capitalize">{stats.topMood}</span>
                                {' '}— share with budtenders for pre-shift briefing.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Quick links */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => window.open(`https://bakedbot.ai/${orgId.replace('org_', '')}/rewards`, '_blank', 'noopener,noreferrer')}
                >
                    <ArrowRight className="h-3.5 w-3.5" />
                    View live page
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => router.push('/dashboard/loyalty-tablet-qr')}
                >
                    QR code &amp; training
                </Button>
            </div>
        </div>
    );
}
