'use client';

/**
 * Email Domain Warm-up Settings
 *
 * Configure and monitor the 28-day email ramp-up schedule.
 * Prevents spam flags when sending from a new domain.
 *
 * Access: /dashboard/settings/email-warmup (dispensary/brand role)
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getMyWarmupStatus, startEmailWarmup, pauseEmailWarmup, getEmailWarmupLogs } from '@/server/actions/email-warmup';
import type { WarmupStatus, WarmupLog, WarmupScheduleType } from '@/server/actions/email-warmup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Mail, Play, Pause, Loader2, TrendingUp, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const WARMUP_DURATION_DAYS = 28;

// --------------------------------------------------------------------------
// Schedule descriptions
// --------------------------------------------------------------------------

const SCHEDULE_INFO: Record<WarmupScheduleType, { label: string; description: string; curve: string }> = {
    conservative: {
        label: 'Conservative (Recommended)',
        description: '28-day ramp — best for brand-new domains',
        curve: 'Week 1: 50/day → Week 2: 200/day → Week 3: 1,000/day → Week 4: 5,000/day',
    },
    standard: {
        label: 'Standard',
        description: '21-day ramp — suitable for domains with some history',
        curve: 'Days 1-3: 50/day → Days 4-7: 200/day → Days 8-14: 1,000/day → Days 15+: 5,000/day',
    },
    aggressive: {
        label: 'Aggressive',
        description: '10-day ramp — established domains or re-warming',
        curve: 'Days 1-2: 100/day → Days 3-5: 500/day → Days 6-10: 2,000/day → Day 11+: Unlimited',
    },
};

// --------------------------------------------------------------------------
// Status Card
// --------------------------------------------------------------------------

function StatusCard({ status }: { status: WarmupStatus }) {
    if (!status.active) {
        return (
            <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span className="text-sm font-medium text-muted-foreground">Warm-up not active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Start a warm-up schedule below to ramp up your daily send volume safely.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const percent = status.percentComplete ?? 0;
    const isComplete = percent >= 100;
    const limitDisplay = status.dailyLimit === Infinity ? 'Unlimited' : status.dailyLimit?.toLocaleString() ?? '—';
    const remaining = status.remainingToday === Infinity
        ? 'Unlimited'
        : `${status.remainingToday?.toLocaleString() ?? 0} remaining today`;

    return (
        <Card className={cn(
            'border-2',
            isComplete ? 'border-green-300 bg-green-50' : 'border-purple-300 bg-purple-50'
        )}>
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isComplete
                            ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                            : <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        }
                        <span className="font-semibold">
                            {isComplete ? 'Warm-up Complete' : 'Warm-up Active'}
                        </span>
                        {status.scheduleType && (
                            <Badge variant="secondary">{SCHEDULE_INFO[status.scheduleType].label.split(' ')[0]}</Badge>
                        )}
                    </div>
                    <span className="text-sm font-bold text-purple-700">Day {status.currentDay} / {WARMUP_DURATION_DAYS}</span>
                </div>

                <Progress value={percent} className="h-3" />

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold">{limitDisplay}</div>
                        <div className="text-xs text-muted-foreground">Daily limit</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{status.sentToday?.toLocaleString() ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Sent today</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium">{remaining}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            Completes {status.completesOn
                                ? status.completesOn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '—'}
                        </div>
                    </div>
                </div>

                {status.remainingToday !== undefined && status.remainingToday !== Infinity && status.remainingToday <= 0 && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Daily limit reached. Campaigns will resume tomorrow.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --------------------------------------------------------------------------
// Send Log Chart
// --------------------------------------------------------------------------

function SendLog({ logs }: { logs: WarmupLog[] }) {
    if (logs.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-6">
                No send history yet. Logs appear after the first warm-up sends.
            </p>
        );
    }

    const maxSent = Math.max(...logs.map(l => l.sent), 1);

    return (
        <div className="space-y-2">
            {logs.slice().reverse().map(log => {
                const pct = (log.sent / Math.max(log.limit > 0 ? log.limit : maxSent, 1)) * 100;
                const limitDisplay = log.limit < 0 ? 'Unlimited' : log.limit.toLocaleString();
                const dateLabel = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                });
                return (
                    <div key={log.date} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{dateLabel}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, pct)}%` }}
                            />
                        </div>
                        <span className="text-xs text-right w-24 shrink-0">
                            {log.sent.toLocaleString()} / {limitDisplay}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// --------------------------------------------------------------------------
// Main Page
// --------------------------------------------------------------------------

export default function EmailWarmupPage() {
    const { orgId } = useUserRole();
    const { toast } = useToast();

    const [status, setStatus] = useState<WarmupStatus>({ active: false });
    const [logs, setLogs] = useState<WarmupLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [scheduleType, setScheduleType] = useState<WarmupScheduleType>('conservative');

    const refresh = useCallback(async () => {
        if (!orgId) return;
        const [s, l] = await Promise.all([
            getMyWarmupStatus(orgId),
            getEmailWarmupLogs(orgId, 14),
        ]);
        setStatus(s);
        setLogs(l);
        if (s.scheduleType) setScheduleType(s.scheduleType);
        setLoading(false);
    }, [orgId]);

    useEffect(() => { refresh(); }, [refresh]);

    const handleStart = async () => {
        setActionLoading(true);
        const result = await startEmailWarmup(orgId!, scheduleType);
        setActionLoading(false);
        if (result.success) {
            toast({ title: 'Warm-up started', description: SCHEDULE_INFO[scheduleType].curve });
            refresh();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    const handlePause = async () => {
        setActionLoading(true);
        const result = await pauseEmailWarmup(orgId!);
        setActionLoading(false);
        if (result.success) {
            toast({ title: 'Warm-up paused' });
            refresh();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const selected = SCHEDULE_INFO[scheduleType];

    return (
        <div className="container max-w-2xl py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Mail className="h-8 w-8 text-purple-600" />
                    Email Domain Warm-up
                </h1>
                <p className="text-muted-foreground mt-1">
                    Gradually increase your daily send volume to build sender reputation and avoid spam filters.
                </p>
            </div>

            {/* Current status */}
            <StatusCard status={status} />

            {/* Info banner */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                    <div className="flex gap-2 items-start">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800">
                            When warm-up is active, campaign sends are automatically throttled to the daily limit.
                            Campaigns that hit the limit are deferred to the next day — no emails are lost.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> Schedule Configuration
                    </CardTitle>
                    <CardDescription>Choose a ramp-up curve based on your domain age</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Ramp-up schedule</Label>
                        <Select
                            value={scheduleType}
                            onValueChange={v => setScheduleType(v as WarmupScheduleType)}
                            disabled={status.active}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(SCHEDULE_INFO).map(([key, info]) => (
                                    <SelectItem key={key} value={key}>
                                        {info.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
                    </div>

                    <div className="bg-muted rounded-lg px-4 py-3 text-sm font-mono text-muted-foreground">
                        {selected.curve}
                    </div>

                    <div className="flex gap-3">
                        {!status.active ? (
                            <Button onClick={handleStart} disabled={actionLoading} className="gap-2">
                                {actionLoading
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Play className="h-4 w-4" />
                                }
                                Start Warm-up
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handlePause}
                                disabled={actionLoading}
                                className="gap-2"
                            >
                                {actionLoading
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Pause className="h-4 w-4" />
                                }
                                Pause Warm-up
                            </Button>
                        )}
                    </div>
                    {status.active && (
                        <p className="text-xs text-muted-foreground">
                            Schedule type cannot be changed while warm-up is active. Pause first to reconfigure.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Send history */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" /> Send History (Last 14 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SendLog logs={logs} />
                </CardContent>
            </Card>
        </div>
    );
}
