'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, MessageSquare, Bot, ShieldCheck, Eye, RefreshCcw, MousePointerClick, Mail } from 'lucide-react';
import { getUsageStatsAction } from '@/app/actions/usage';
import { UsageMetric } from '@/server/services/usage';

// Helper to format numbers
const fmt = (n: number) => new Intl.NumberFormat().format(n);

export default function UsageTab() {
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'month' | 'today'>('month');
    const [data, setData] = useState<{
        total: Record<UsageMetric, number>;
        byOrg: Record<string, Record<UsageMetric, number>>;
    } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getUsageStatsAction(timeframe);
            setData(result);
        } catch (error) {
            console.error('Failed to load usage stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [timeframe]);

    const metrics: { key: UsageMetric; label: string; icon: any; color: string }[] = [
        { key: 'chat_sessions', label: 'Chat Sessions', icon: MessageSquare, color: 'text-blue-500' },
        { key: 'agent_calls', label: 'Agent Calls', icon: Bot, color: 'text-purple-500' },
        { key: 'deebo_checks', label: 'Deebo Checks', icon: ShieldCheck, color: 'text-green-500' },
        { key: 'menu_pageviews', label: 'Menu Views', icon: Eye, color: 'text-amber-500' },
        { key: 'menu_sync_jobs', label: 'Menu Syncs', icon: RefreshCcw, color: 'text-cyan-500' },
        { key: 'tracked_events', label: 'Analytics Events', icon: MousePointerClick, color: 'text-indigo-500' },
        { key: 'messages_sent', label: 'Emails/SMS', icon: Mail, color: 'text-pink-500' },
    ];

    if (loading && !data) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
                    <p className="text-muted-foreground">
                        Track system usage across all organizations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
                        <TabsList>
                            <TabsTrigger value="today">Today</TabsTrigger>
                            <TabsTrigger value="month">This Month</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button variant="outline" size="icon" onClick={loadData}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <Card key={metric.key}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {metric.label}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${metric.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {fmt(data?.total[metric.key] || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {timeframe === 'month' ? 'Current Month' : 'Today'}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Breakdown Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Breakdown</CardTitle>
                    <CardDescription>
                        Detailed usage metrics by organization ID.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization ID</TableHead>
                                {metrics.map(m => (
                                    <TableHead key={m.key} className="text-right">{m.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.byOrg && Object.entries(data.byOrg).length > 0 ? (
                                Object.entries(data.byOrg).map(([orgId, orgMetrics]) => (
                                    <TableRow key={orgId}>
                                        <TableCell className="font-medium">{orgId}</TableCell>
                                        {metrics.map(m => (
                                            <TableCell key={m.key} className="text-right">
                                                {fmt(orgMetrics[m.key] || 0)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={metrics.length + 1} className="h-24 text-center">
                                        No usage data found for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
