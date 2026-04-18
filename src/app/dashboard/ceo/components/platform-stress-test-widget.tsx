'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, XCircle, Clock, Terminal } from 'lucide-react';
import { logger } from '@/lib/logger';

interface LastRun {
    id:        string;
    title:     string;
    passed:    number | null;
    failed:    number | null;
    total:     number | null;
    status:    string;
    stoplight: string;
    createdAt: string | null;
}

function timeAgo(iso: string | null): string {
    if (!iso) return 'unknown';
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function PlatformStressTestWidget() {
    const [lastRun, setLastRun]   = useState<LastRun | null>(null);
    const [loading, setLoading]   = useState(true);
    const [running, setRunning]   = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/platform-health');
            if (!res.ok) return;
            const json = await res.json() as { lastRun: LastRun | null };
            setLastRun(json.lastRun);
        } catch (err) {
            logger.warn('[PlatformStressTestWidget] fetch failed', { err });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    async function handleRun() {
        setRunning(true);
        try {
            await fetch('/api/admin/run-stress-test', { method: 'POST' });
            // Poll for new result after ~30s (script takes ~15-20s for a single run)
            setTimeout(() => {
                fetchStatus();
                setRunning(false);
            }, 30_000);
        } catch (err) {
            logger.warn('[PlatformStressTestWidget] run failed', { err });
            setRunning(false);
        }
    }

    const isClean   = lastRun?.failed === 0;
    const hasFailed = lastRun?.failed !== null && (lastRun?.failed ?? 0) > 0;

    const statusBadge = !lastRun
        ? <Badge variant="outline" className="text-muted-foreground">No runs yet</Badge>
        : isClean
            ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1 inline" />{lastRun.passed}/{lastRun.total} PASS</Badge>
            : <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1 inline" />{lastRun.failed} FAIL · {lastRun.passed}/{lastRun.total}</Badge>;

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                        Platform Stress Test
                    </CardTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRun}
                        disabled={running || loading}
                        className="h-7 text-xs"
                    >
                        {running
                            ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running…</>
                            : <><Play className="h-3 w-3 mr-1" />Run Now</>
                        }
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading last result…
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            {statusBadge}
                            {lastRun?.createdAt && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {timeAgo(lastRun.createdAt)}
                                </span>
                            )}
                        </div>
                        {hasFailed && (
                            <p className="text-xs text-red-400">
                                {lastRun?.failed} test(s) failed. Check Agent Board for filed bugs.
                            </p>
                        )}
                        {running && (
                            <p className="text-xs text-muted-foreground">
                                Test running in background — results post to Agent Board in ~20s. Refreshing…
                            </p>
                        )}
                    </div>
                )}
                <div className="border-t pt-2 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Run via Slack:</p>
                    <code className="bg-muted/50 px-2 py-0.5 rounded text-[11px]">@linus run stress test</code>
                    <p className="text-[11px]">12 suites · 46+ checks · files bugs automatically</p>
                </div>
            </CardContent>
        </Card>
    );
}
