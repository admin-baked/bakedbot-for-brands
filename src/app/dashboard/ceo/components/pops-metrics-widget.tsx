'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, DollarSign, Users, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlatformAnalytics, type PlatformAnalyticsData } from '../actions';

function formatMoney(amount: number): string {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function PopsMetricsWidget() {
    const [data, setData] = useState<PlatformAnalyticsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getPlatformAnalytics()
            .then((res) => {
                if (cancelled) return;
                setData(res);
            })
            .catch((e) => {
                console.error('[PopsMetricsWidget] Failed to load platform analytics', e);
                if (cancelled) return;
                setError('Analytics unavailable');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const showTrend = typeof data?.activeUsers?.trend === 'number' && Number.isFinite(data.activeUsers.trend);
    const isUp = (data?.activeUsers?.trendUp ?? true) === true;

    return (
        <Card className="h-full border-l-4 border-l-blue-500 shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 transition-all">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Pops&apos; Platform Pulse
                    </CardTitle>
                    <Badge
                        variant={error ? 'destructive' : data ? 'outline' : 'secondary'}
                        className="px-3 py-1"
                    >
                        {error ? 'Unavailable' : data ? 'Live' : 'Loading'}
                    </Badge>
                </div>
                <CardDescription>Real platform metrics (no placeholders)</CardDescription>
            </CardHeader>

            <CardContent>
                {!data && !error && (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading metrics...
                    </div>
                )}

                {error && (
                    <div className="py-6 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Metrics unavailable</p>
                        <p className="mt-1">{error}</p>
                    </div>
                )}

                {data && (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4" /> MRR
                            </p>
                            <div className="flex flex-col gap-1">
                                <h3 className="text-3xl font-black tracking-tight text-foreground">
                                    ${formatMoney(data.revenue.mrr)}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    ARR: ${formatMoney(data.revenue.arr)} | ARPU: ${formatMoney(data.revenue.arpu)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Users className="h-4 w-4" /> WAU
                            </p>
                            <div className="flex flex-col gap-1">
                                <h3 className="text-3xl font-black tracking-tight text-foreground">
                                    {data.activeUsers.weekly.toLocaleString()}
                                </h3>
                                <span
                                    className={cn(
                                        'text-sm font-bold flex items-center px-2 py-0.5 rounded-full w-fit',
                                        showTrend
                                            ? isUp
                                                ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                                                : 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                                            : 'text-muted-foreground bg-muted'
                                    )}
                                >
                                    {showTrend ? (
                                        isUp ? (
                                            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                                        ) : (
                                            <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                                        )
                                    ) : null}
                                    {showTrend ? `${Math.abs(data.activeUsers.trend)}% vs last week` : 'Trend unavailable'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

