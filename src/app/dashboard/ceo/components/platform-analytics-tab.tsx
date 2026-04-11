'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Users, TrendingUp, Activity, Zap, Bot,
    BarChart3,
    ArrowUpRight, ArrowDownRight, RefreshCw, ArrowRight, Target
} from 'lucide-react';
import type { CustomerVisitCohortResult } from '@/server/actions/cohort-analytics';
import { useMockData } from '@/hooks/use-mock-data';
import { useEffect } from 'react';
import Link from 'next/link';

// Mock data - strictly for when isMock is true
const MOCK_DATA: any = {
    metrics: {
        signups: { today: 12, week: 78, month: 312, total: 1847, trend: 15.2, trendUp: true },
        activeUsers: { daily: 234, weekly: 892, monthly: 1456, trend: 8.7, trendUp: true },
        retention: { day1: 68, day7: 45, day30: 32, trend: -2.1, trendUp: false },
        revenue: { mrr: 24500, arr: 294000, arpu: 89, trend: 12.5, trendUp: true },
        martyScoreboard: {
            targetMrr: 83333,
            updatedAt: new Date().toISOString(),
            groups: [
                {
                    id: 'revenue',
                    title: 'Revenue',
                    metrics: [
                        { id: 'current_mrr', label: 'Current MRR', value: 24500, format: 'currency' },
                        { id: 'net_new_mrr_month', label: 'Net New MRR This Month', value: null, format: 'currency', note: 'Not instrumented yet' },
                        { id: 'arr_run_rate', label: 'ARR Run Rate', value: 294000, format: 'currency' },
                        { id: 'average_revenue_per_account', label: 'Average Revenue Per Account', value: 89, format: 'currency' },
                        { id: 'churned_mrr', label: 'Churned MRR', value: null, format: 'currency', note: 'Not instrumented yet' },
                        { id: 'expansion_mrr', label: 'Expansion MRR', value: null, format: 'currency', note: 'Not instrumented yet' },
                    ],
                },
                {
                    id: 'pipeline',
                    title: 'Pipeline',
                    metrics: [
                        { id: 'qualified_opportunities_added', label: 'Qualified Opportunities Added', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'discovery_calls_booked', label: 'Discovery Calls Booked', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'pilots_launched', label: 'Pilots Launched', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'proposals_sent', label: 'Proposals Sent', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'close_rate', label: 'Close Rate', value: null, format: 'percent', note: 'Not instrumented yet' },
                        { id: 'average_days_to_close', label: 'Average Days to Close', value: null, format: 'days', note: 'Not instrumented yet' },
                    ],
                },
                {
                    id: 'activation',
                    title: 'Activation',
                    metrics: [
                        { id: 'time_to_first_value', label: 'Time to First Value', value: null, format: 'days', note: 'Not instrumented yet' },
                        { id: 'welcome_checkin_flow_activation_rate', label: 'Welcome Check-In Flow Activation Rate', value: null, format: 'percent', note: 'Not instrumented yet' },
                        { id: 'welcome_email_playbook_activation_rate', label: 'Welcome Email Playbook Activation Rate', value: null, format: 'percent', note: 'Not instrumented yet' },
                        { id: 'accounts_live_within_30_days', label: 'Accounts Live Within 30 Days', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'customer_roi_signals_captured', label: 'Customer ROI Signals Captured', value: null, format: 'integer', note: 'Not instrumented yet' },
                    ],
                },
                {
                    id: 'customer_health',
                    title: 'Customer Health',
                    metrics: [
                        { id: 'at_risk_accounts', label: 'At-Risk Accounts', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'usage_decline', label: 'Usage Decline', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'blocked_onboarding_items', label: 'Blocked Onboarding Items', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'expansion_ready_accounts', label: 'Expansion-Ready Accounts', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'unresolved_support_or_implementation_issues', label: 'Unresolved Support or Implementation Issues', value: null, format: 'integer', note: 'Not instrumented yet' },
                    ],
                },
                {
                    id: 'execution',
                    title: 'Execution',
                    metrics: [
                        { id: 'top_priorities_completed', label: 'Top Priorities Completed', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'critical_blockers_still_open', label: 'Critical Blockers Still Open', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'tasks_overdue', label: 'Tasks Overdue', value: null, format: 'integer', note: 'Not instrumented yet' },
                        { id: 'founder_decisions_waiting', label: 'Founder Decisions Waiting', value: null, format: 'integer', note: 'Not instrumented yet' },
                    ],
                },
            ],
        },
        siteTraffic: {
            configured: true,
            sessions: 6842,
            blogSessions: 2911,
            topSources: [
                { source: 'google', sessions: 2840 },
                { source: '(direct)', sessions: 2014 },
                { source: 'linkedin.com', sessions: 944 },
            ],
            topContentPages: [
                { path: '/blog/cannabis-ai-platforms', sessions: 642 },
                { path: '/blog/alpine-iq-vs-bakedbot', sessions: 511 },
                { path: '/blog/dispensary-crm-automation', sessions: 403 },
            ],
        },
    },
    featureAdoption: [
        { name: 'AI Chat (Smokey)', usage: 89, trend: 12, status: 'healthy' },
        { name: 'Playbooks', usage: 45, trend: 23, status: 'growing' },
        { name: 'Email Campaigns (Craig)', usage: 67, trend: -5, status: 'warning' },
        { name: 'Competitive Intel (Ezal)', usage: 34, trend: 8, status: 'growing' },
        { name: 'Loyalty (Mrs. Parker)', usage: 28, trend: 15, status: 'growing' },
        { name: 'Analytics (Pops)', usage: 72, trend: 3, status: 'healthy' },
        { name: 'Pricing (Money Mike)', usage: 23, trend: -2, status: 'warning' },
        { name: 'Compliance (Deebo)', usage: 56, trend: 18, status: 'healthy' },
    ],
    recentSignups: [
        { id: '1', name: 'Green Valley Dispensary', email: 'admin@greenvalley.com', plan: 'Pro', date: '2 hours ago', role: 'dispensary' },
        { id: '2', name: 'Kush Brands Co', email: 'team@kushbrands.com', plan: 'Enterprise', date: '5 hours ago', role: 'brand' },
        { id: '3', name: 'Pacific Cannabis', email: 'owner@pacificcanna.com', plan: 'Free', date: '1 day ago', role: 'dispensary' },
        { id: '4', name: 'Elevated Extracts', email: 'sales@elevated.io', plan: 'Pro', date: '1 day ago', role: 'brand' },
        { id: '5', name: 'High Times Retail', email: 'info@hightimes.la', plan: 'Free', date: '2 days ago', role: 'dispensary' },
    ],
    agentUsage: [
        { agent: 'Smokey', calls: 12456, avgDuration: '2.3s', successRate: 98.2, costToday: 45.67 },
        { agent: 'Craig', calls: 3421, avgDuration: '4.1s', successRate: 95.8, costToday: 23.45 },
        { agent: 'Pops', calls: 8934, avgDuration: '1.8s', successRate: 99.1, costToday: 12.34 },
        { agent: 'Ezal', calls: 2134, avgDuration: '5.2s', successRate: 94.3, costToday: 34.56 },
        { agent: 'Money Mike', calls: 1567, avgDuration: '3.4s', successRate: 96.7, costToday: 18.90 },
        { agent: 'Deebo', calls: 4523, avgDuration: '0.8s', successRate: 99.8, costToday: 8.12 },
    ]
};

function MetricCard({ title, value, subtitle, trend, trendUp, icon: Icon }: {
    title: string;
    value: string | number;
    subtitle: string;
    trend: number | null;
    trendUp: boolean | null;
    icon: any;
}) {
    const showTrend = typeof trend === 'number' && Number.isFinite(trend);
    const resolvedTrendUp = (trendUp ?? (showTrend ? trend >= 0 : true)) === true;

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div
                            className={`p-2 rounded-lg ${showTrend ? (resolvedTrendUp ? 'bg-green-100' : 'bg-red-100') : 'bg-muted'}`}
                        >
                            <Icon className={`h-5 w-5 ${showTrend ? (resolvedTrendUp ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`} />
                        </div>
                        {showTrend && (
                            <div className={`flex items-center gap-1 text-sm ${resolvedTrendUp ? 'text-green-600' : 'text-red-600'}`}>
                                {resolvedTrendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {Math.abs(trend)}%
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function formatScoreboardMetric(metric: MartyScoreboardMetric): string {
    if (metric.value === null) {
        return metric.note ?? 'Not instrumented yet';
    }

    switch (metric.format) {
        case 'currency':
            return `$${metric.value.toLocaleString()}`;
        case 'percent':
            return `${metric.value}%`;
        case 'days':
            return `${metric.value} days`;
        case 'integer':
        default:
            return metric.value.toLocaleString();
    }
}

function MartyScoreboardSection({ scoreboard }: { scoreboard: MartyScoreboard }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Marty Scoreboard
                </CardTitle>
                <CardDescription>
                    Target pace: ${scoreboard.targetMrr.toLocaleString()} MRR to reach $1M ARR by April 11, 2027.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {scoreboard.groups.map((group) => (
                    <div key={group.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{group.title}</h3>
                            <Badge variant="outline" className="text-[10px]">
                                Numbers first
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {group.metrics.map((metric) => (
                                <div key={metric.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                                    <p className={`mt-1 text-sm font-semibold ${metric.value === null ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        {formatScoreboardMetric(metric)}
                                    </p>
                                    {metric.value === null && (
                                        <p className="mt-1 text-[11px] text-muted-foreground">Not instrumented yet</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

import { getPlatformAnalytics } from '../actions/data-actions';
import { getSeoKpis } from '../actions/seo-actions';
import { type PlatformAnalyticsData } from '../actions/types';
import type { SeoKpis } from '@/lib/seo-kpis';
import { getCustomerVisitCohort } from '@/server/actions/cohort-analytics';

import { calculateMrrLadder } from '@/lib/mrr-ladder';
import SeoKpisWidget from './seo-kpis-widget';
import type { MartyScoreboard, MartyScoreboardMetric } from '@/types/marty';

const COHORT_ORG_ID = 'org_thrive_syracuse'; // Primary pilot org

export default function PlatformAnalyticsTab() {
    const [refreshing, setRefreshing] = useState(false);
    const { isMock, isLoading: isMockLoading } = useMockData();
    const [data, setData] = useState<PlatformAnalyticsData | null>(null);
    const [seoKpis, setSeoKpis] = useState<SeoKpis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cohortData, setCohortData] = useState<CustomerVisitCohortResult | null>(null);
    const [cohortDays, setCohortDays] = useState<90 | 180 | 365>(90);
    const [cohortLoading, setCohortLoading] = useState(false);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        if (isMock) {
            // Use local mock data structure
            setData({
                signups: MOCK_DATA.metrics.signups,
                activeUsers: MOCK_DATA.metrics.activeUsers,
                retention: MOCK_DATA.metrics.retention,
                revenue: MOCK_DATA.metrics.revenue,
                martyScoreboard: MOCK_DATA.metrics.martyScoreboard,
                siteTraffic: MOCK_DATA.metrics.siteTraffic,
                featureAdoption: MOCK_DATA.featureAdoption,
                recentSignups: MOCK_DATA.recentSignups,
                agentUsage: MOCK_DATA.agentUsage
            });
            setSeoKpis({
                indexedPages: { zip: 150, dispensary: 45, brand: 22, city: 12, state: 8, total: 237 },
                claimMetrics: { totalUnclaimed: 55, totalClaimed: 12, claimRate: 18, pendingClaims: 3 },
                pageHealth: { freshPages: 180, stalePages: 15, healthScore: 87 },
                searchConsole: { impressions: null, clicks: null, ctr: null, avgPosition: null, top3Keywords: null, top10Keywords: null, dataAvailable: false },
                lastUpdated: new Date()
            });
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const [remoteData, remoteSeoKpis] = await Promise.all([
                getPlatformAnalytics(),
                getSeoKpis()
            ]);
            setData(remoteData);
            setSeoKpis(remoteSeoKpis);
        } catch (error) {
            console.error('Failed to fetch metrics', error);
            setError(error instanceof Error ? error.message : 'Failed to load analytics.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isMockLoading) {
            fetchMetrics();
            if (!isMock) fetchCohort(cohortDays);
        }
    }, [isMock, isMockLoading]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMetrics();
    };

    const fetchCohort = async (days: 90 | 180 | 365) => {
        setCohortLoading(true);
        try {
            const result = await getCustomerVisitCohort(COHORT_ORG_ID, days);
            setCohortData(result);
        } catch {
            // silently fail — cohort is non-critical
        } finally {
            setCohortLoading(false);
        }
    };

    if (loading || isMockLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
                <p className="mt-2 text-xs text-muted-foreground">{error}</p>
                <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (!data) {
        return <div className="p-8 text-center text-muted-foreground">No analytics data available.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Platform Analytics</h2>
                    <p className="text-muted-foreground">
                        {isMock ? 'Viewing MOCK Data' : 'Live operating metrics for CRM, discovery, content, and automation'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isMock && <Badge variant="secondary">Mock Mode</Badge>}
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Signups"
                    value={data.signups.total.toLocaleString()}
                    subtitle={`+${data.signups.today} today`}
                    trend={data.signups.trend}
                    trendUp={data.signups.trendUp}
                    icon={Users}
                />
                <MetricCard
                    title="Active Users (DAU)"
                    value={data.activeUsers.daily.toLocaleString()}
                    subtitle={`${data.activeUsers.weekly} weekly`}
                    trend={data.activeUsers.trend}
                    trendUp={data.activeUsers.trendUp}
                    icon={Activity}
                />
                <MetricCard
                    title="Site Sessions"
                    value={typeof data.siteTraffic.sessions === 'number' ? data.siteTraffic.sessions.toLocaleString() : 'N/A'}
                    subtitle={typeof data.siteTraffic.blogSessions === 'number' ? `${data.siteTraffic.blogSessions.toLocaleString()} blog sessions` : 'Google Analytics not configured'}
                    trend={null}
                    trendUp={null}
                    icon={TrendingUp}
                />
                <MetricCard
                    title="MRR"
                    value={`$${data.revenue.mrr.toLocaleString()}`}
                    subtitle={`ARPU: $${data.revenue.arpu}`}
                    trend={data.revenue.trend}
                    trendUp={data.revenue.trendUp}
                    icon={BarChart3}
                />
            </div>

            <MartyScoreboardSection scoreboard={data.martyScoreboard} />

            {/* SEO KPIs Section */}
            {seoKpis && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Organic Growth KPIs
                                </CardTitle>
                                <CardDescription>SEO and claim conversion metrics from Pops</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SeoKpisWidget
                                    data={seoKpis}
                                    mrrLadder={calculateMrrLadder(data?.revenue?.mrr || 0)}
                                    currentMrr={data?.revenue?.mrr || 0}
                                    onRefresh={handleRefresh}
                                    isLoading={refreshing}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Quick Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Pages</span>
                                    <span className="font-bold text-xl">{seoKpis.indexedPages.total}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Claim Rate</span>
                                    <Badge variant={seoKpis.claimMetrics.claimRate > 20 ? 'default' : 'secondary'}>
                                        {seoKpis.claimMetrics.claimRate}%
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Page Health</span>
                                    <Badge variant={seoKpis.pageHealth.healthScore >= 80 ? 'default' : seoKpis.pageHealth.healthScore >= 50 ? 'secondary' : 'destructive'}>
                                        {seoKpis.pageHealth.healthScore}%
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Unclaimed Opps</span>
                                    <span className="font-bold">{seoKpis.claimMetrics.totalUnclaimed}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Top Source</span>
                                    <span className="font-bold text-right">
                                        {data.siteTraffic.topSources[0]?.source || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Blog Sessions</span>
                                    <span className="font-bold">
                                        {typeof data.siteTraffic.blogSessions === 'number'
                                            ? data.siteTraffic.blogSessions.toLocaleString()
                                            : 'N/A'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Feature Adoption & Agent Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Operating Coverage */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Operating Coverage
                        </CardTitle>
                        <CardDescription>Progress across CRM, discovery pages, content, automation, and media telemetry</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.featureAdoption.length === 0 && <p className="text-sm text-muted-foreground">No data available.</p>}
                        {data.featureAdoption.map((feature) => (
                            <div key={feature.name} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{feature.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${feature.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {feature.trend >= 0 ? '+' : ''}{feature.trend}%
                                        </span>
                                        <Badge variant={feature.status === 'warning' ? 'destructive' : feature.status === 'growing' ? 'default' : 'secondary'} className="text-xs">
                                            {feature.status}
                                        </Badge>
                                    </div>
                                </div>
                                <Progress value={feature.usage} className="h-2" />
                                <p className="text-xs text-muted-foreground">{feature.usage}% of users</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Agent Usage */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            AI Agent Performance
                        </CardTitle>
                        <CardDescription>Agent calls, success rates, and costs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.agentUsage.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No agent usage data available.</p>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {data.agentUsage.map((agent) => (
                                        <div key={agent.agent} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Bot className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{agent.agent}</p>
                                                    <p className="text-xs text-muted-foreground">{agent.calls.toLocaleString()} calls</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Success</p>
                                                    <p className={agent.successRate >= 98 ? 'text-green-600' : agent.successRate >= 95 ? 'text-yellow-600' : 'text-red-600'}>
                                                        {agent.successRate}%
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Avg Time</p>
                                                    <p>{agent.avgDuration}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Cost</p>
                                                    <p className="font-mono">${agent.costToday}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total API Cost Today</span>
                                    <span className="font-bold">${data.agentUsage.reduce((sum, a) => sum + a.costToday, 0).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Signups */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Recent Signups
                    </CardTitle>
                    <CardDescription>Latest users joining the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.recentSignups.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No recent signups.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-left text-sm text-muted-foreground">
                                        <th className="pb-3 font-medium">Organization</th>
                                        <th className="pb-3 font-medium">Email</th>
                                        <th className="pb-3 font-medium">Type</th>
                                        <th className="pb-3 font-medium">Plan</th>
                                        <th className="pb-3 font-medium">Signed Up</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {data.recentSignups.map((signup) => (
                                        <tr key={signup.id} className="border-b last:border-0">
                                            <td className="py-3 font-medium">{signup.name}</td>
                                            <td className="py-3 text-muted-foreground">{signup.email}</td>
                                            <td className="py-3">
                                                <Badge variant="outline" className="text-xs capitalize">{signup.role}</Badge>
                                            </td>
                                            <td className="py-3">
                                                <Badge variant={signup.plan === 'Enterprise' ? 'default' : signup.plan === 'Pro' ? 'secondary' : 'outline'} className="text-xs">
                                                    {signup.plan}
                                                </Badge>
                                            </td>
                                            <td className="py-3 text-muted-foreground">{signup.date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Customer Visit Cohort */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Customer Visit Funnel
                            </CardTitle>
                            <CardDescription>Where customers drop off — 1st through 5th+ visit</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                            {([90, 180, 365] as const).map(d => (
                                <Button
                                    key={d}
                                    variant={cohortDays === d ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs h-7 px-2"
                                    disabled={cohortLoading}
                                    onClick={() => {
                                        setCohortDays(d);
                                        fetchCohort(d);
                                    }}
                                >
                                    {d}d
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {cohortLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Loading cohort data...
                        </div>
                    ) : !cohortData ? (
                        <div className="py-6 text-center">
                            <p className="text-sm text-muted-foreground mb-3">Load cohort data for Thrive Syracuse</p>
                            <Button size="sm" variant="outline" onClick={() => fetchCohort(cohortDays)}>
                                Load Cohort
                            </Button>
                        </div>
                    ) : cohortData.totalCustomers === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No customer data available for this period.</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 rounded-lg bg-muted/30">
                                    <p className="text-2xl font-bold">{cohortData.totalCustomers.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Active customers</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-muted/30">
                                    <p className="text-2xl font-bold text-primary">{cohortData.repeatCustomerRate}%</p>
                                    <p className="text-xs text-muted-foreground">Repeat rate</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                                    <p className="text-2xl font-bold text-red-500">{cohortData.topDropoffPct}%</p>
                                    <p className="text-xs text-muted-foreground">Drop at visit {cohortData.topDropoffVisit}→{cohortData.topDropoffVisit + 1}</p>
                                </div>
                            </div>

                            {/* Funnel bars */}
                            <div className="space-y-2 pt-1">
                                {cohortData.buckets.map((bucket) => {
                                    const isWorst = bucket.visits - 1 === cohortData.topDropoffVisit && bucket.visits > 1;
                                    const barWidth = cohortData.totalCustomers > 0
                                        ? Math.round((bucket.count / cohortData.totalCustomers) * 100)
                                        : 0;
                                    return (
                                        <div key={bucket.visits} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium w-20">{bucket.label}</span>
                                                    <span className="text-muted-foreground">{bucket.count.toLocaleString()} customers</span>
                                                    {bucket.dropoffPct !== null && (
                                                        <span className={`flex items-center gap-0.5 ${isWorst ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                                            <ArrowRight className="h-2.5 w-2.5" />
                                                            {bucket.retentionPct}% retained{isWorst ? ' ⚠️' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-mono text-muted-foreground">{bucket.pct}%</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${isWorst ? 'bg-red-400' : bucket.visits === 1 ? 'bg-primary' : 'bg-primary/65'}`}
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pops insight */}
                            <div className="rounded-lg bg-muted/40 p-3 mt-2">
                                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{cohortData.summary}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Avoid placeholder/fictional status cards in live mode */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        System Health
                    </CardTitle>
                    <CardDescription>
                        Runtime health, alerts, and metrics are tracked in the System Health tab.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/ceo?tab=health">Open System Health</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

