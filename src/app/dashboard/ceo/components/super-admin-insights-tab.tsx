'use client';

import { useEffect, useState, type ElementType } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    Bot,
    BrainCircuit,
    Loader2,
    RefreshCw,
    Search,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import { PopsMetricsWidget } from './pops-metrics-widget';
import { DeeboComplianceWidget } from './deebo-compliance-widget';
import { getSuperUserIntelligenceData } from '../actions/data-actions';
import type { SuperUserIntelligenceData } from '../actions/types';

function MetricCard({
    title,
    value,
    detail,
    icon: Icon,
}: {
    title: string;
    value: string;
    detail: string;
    icon: ElementType;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function SuperAdminInsightsTab() {
    const [data, setData] = useState<SuperUserIntelligenceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError(null);

        try {
            const result = await getSuperUserIntelligenceData();
            setData(result);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load intelligence data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading && !data) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="rounded-xl border bg-card p-10 text-center">
                <p className="text-sm text-muted-foreground">Failed to load intelligence.</p>
                <p className="mt-2 text-xs text-muted-foreground">{error}</p>
                <Button className="mt-4" variant="outline" size="sm" onClick={() => loadData(true)}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Retry
                </Button>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Intelligence Dashboard</h2>
                    <p className="text-muted-foreground">
                        BakedBot-specific acquisition, content, CRM coverage, and competitive context.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={data.acquisition.gaConfigured || data.acquisition.gscConfigured ? 'secondary' : 'outline'}>
                        {data.acquisition.gaConfigured || data.acquisition.gscConfigured ? 'Connected Signals' : 'Needs GA / GSC'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Site Sessions"
                    value={typeof data.acquisition.sessions === 'number' ? data.acquisition.sessions.toLocaleString() : 'N/A'}
                    detail={typeof data.acquisition.blogSessions === 'number'
                        ? `${data.acquisition.blogSessions.toLocaleString()} from blog/content`
                        : 'Google Analytics not configured'}
                    icon={TrendingUp}
                />
                <MetricCard
                    title="Search Impressions"
                    value={typeof data.acquisition.impressions === 'number' ? data.acquisition.impressions.toLocaleString() : 'N/A'}
                    detail={typeof data.acquisition.clicks === 'number'
                        ? `${data.acquisition.clicks.toLocaleString()} clicks from Search Console`
                        : 'Search Console not configured'}
                    icon={Search}
                />
                <MetricCard
                    title="CRM Coverage"
                    value={`${data.coverage.coverageRate}%`}
                    detail={`${data.coverage.uniqueBrandPages + data.coverage.uniqueDispensaryPages} CRM entities represented in Discovery Hub`}
                    icon={Users}
                />
                <MetricCard
                    title="AIQ Coverage"
                    value={`${data.content.aiqMentionPosts}`}
                    detail={`${data.content.comparisonPosts} published comparison posts in the platform blog`}
                    icon={Target}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <div className="grid gap-6 md:grid-cols-2">
                        <PopsMetricsWidget />
                        <DeeboComplianceWidget />
                    </div>
                </div>
                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            AIQ Positioning
                        </CardTitle>
                        <CardDescription>
                            Canonical Super User competitive framing for AlpineIQ.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">{data.competitor.primaryCompetitor}</p>
                            <p className="text-xs text-muted-foreground">
                                Primary software competitor for BakedBot&apos;s CRM and marketing motion.
                            </p>
                        </div>
                        <div className="space-y-2">
                            {data.competitor.differentiators.length > 0 ? (
                                data.competitor.differentiators.map((item) => (
                                    <div key={item} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                                        {item}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Competitive differentiators are not available yet.
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild size="sm">
                                <Link href="/dashboard/ceo?tab=analytics&sub=intelligence&intel=competitor">Open Competitor Intel</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/dashboard/ceo?tab=content">Open Content Engine</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Acquisition Signals
                        </CardTitle>
                        <CardDescription>
                            Top channels, queries, and search opportunities driving BakedBot discovery.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Sources</p>
                            {data.acquisition.topSources.length > 0 ? (
                                data.acquisition.topSources.map((source) => (
                                    <div key={source.source} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                        <span>{source.source}</span>
                                        <span className="font-medium">{source.sessions.toLocaleString()} sessions</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No Google Analytics source data is available yet.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Queries</p>
                            {data.acquisition.topQueries.length > 0 ? (
                                data.acquisition.topQueries.map((query) => (
                                    <div key={`${query.query}-${query.position}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{query.query}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {query.clicks.toLocaleString()} clicks - {query.impressions.toLocaleString()} impressions
                                            </p>
                                        </div>
                                        <Badge variant="outline">Pos {query.position}</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No Search Console query data is available yet.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search Opportunities</p>
                            {data.acquisition.opportunities.length > 0 ? (
                                data.acquisition.opportunities.map((opportunity) => (
                                    <div key={`${opportunity.query}-${opportunity.page}`} className="rounded-lg border px-3 py-2 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium">{opportunity.query}</p>
                                            <Badge variant={opportunity.opportunity === 'high' ? 'destructive' : 'secondary'}>
                                                {opportunity.opportunity}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {opportunity.reason} - {opportunity.impressions.toLocaleString()} impressions - position {opportunity.position}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No search opportunities are available yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            Content and Coverage
                        </CardTitle>
                        <CardDescription>
                            How the blog, Discovery Hub, and CRM are connected right now.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">CRM brands missing pages</p>
                                <p className="mt-1 text-2xl font-bold">{data.coverage.missingBrandCoverage}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">CRM dispensaries missing pages</p>
                                <p className="mt-1 text-2xl font-bold">{data.coverage.missingDispensaryCoverage}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Content Pages</p>
                            {data.acquisition.topContentPages.length > 0 ? (
                                data.acquisition.topContentPages.map((page) => (
                                    <div key={page.path} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                        <span className="truncate">{page.path}</span>
                                        <span className="font-medium">{page.sessions.toLocaleString()}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No top content page data is available yet.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Platform Posts</p>
                            {data.content.recentPosts.length > 0 ? (
                                data.content.recentPosts.map((post) => (
                                    <div key={post.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{post.title}</p>
                                            <p className="text-xs text-muted-foreground">{post.contentType || 'standard'}</p>
                                        </div>
                                        <Badge variant="outline">{post.slug}</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No published platform posts were found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
