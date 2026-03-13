'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuperUserIntelligenceData } from '../actions/data-actions';
import type { SuperUserIntelligenceData } from '../actions/types';
import {
    ArrowRight,
    Loader2,
    RefreshCw,
    Radar,
    Search,
    Shield,
    TrendingUp,
} from 'lucide-react';

export default function CompetitorIntelTab() {
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
            setError(loadError instanceof Error ? loadError.message : 'Failed to load competitor intelligence.');
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
                <p className="text-sm text-muted-foreground">Competitor intelligence is unavailable.</p>
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

    const aiqPage = data.acquisition.topContentPages.find((page) =>
        page.path.toLowerCase().includes('alpine') || page.path.toLowerCase().includes('aiq')
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Competitor Intel</h2>
                    <p className="text-muted-foreground">
                        BakedBot&apos;s software competition, AIQ positioning, and search/content pressure points.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-emerald-200 bg-emerald-50/40">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Radar className="h-5 w-5 text-emerald-700" />
                                    Primary Competitor: {data.competitor.primaryCompetitor}
                                </CardTitle>
                                <CardDescription>
                                    This is the operating default for Super User competitor monitoring.
                                </CardDescription>
                            </div>
                            <Badge variant="secondary">Priority Watch</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.competitor.differentiators.length > 0 ? (
                            data.competitor.differentiators.map((item) => (
                                <div key={item} className="rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-sm">
                                    {item}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No differentiators are available yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            AIQ Content Pressure
                        </CardTitle>
                        <CardDescription>
                            Whether BakedBot is publishing and ranking against AIQ right now.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">AIQ mention posts</p>
                            <p className="text-3xl font-bold">{data.content.aiqMentionPosts}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Comparison posts</p>
                            <p className="text-3xl font-bold">{data.content.comparisonPosts}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Top AIQ page</p>
                            <p className="text-sm font-medium">
                                {aiqPage ? aiqPage.path : 'No Alpine IQ page is showing in GA yet.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Watchlist
                        </CardTitle>
                        <CardDescription>
                            Software competitors from the canonical Super User competitive context.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.competitor.watchlist.map((competitor) => (
                            <div key={competitor.name} className="rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{competitor.name}</p>
                                        <p className="text-xs text-muted-foreground">{competitor.category}</p>
                                    </div>
                                    <Badge variant="outline">{competitor.pricing}</Badge>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {competitor.strengths.map((strength) => (
                                                <Badge key={strength} variant="secondary">{strength}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {competitor.weaknesses.map((weakness) => (
                                                <Badge key={weakness} variant="outline">{weakness}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary" />
                                Search Opportunities
                            </CardTitle>
                            <CardDescription>
                                Queries where BakedBot can win more organic visibility against software competitors.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {data.acquisition.opportunities.length > 0 ? (
                                data.acquisition.opportunities.slice(0, 4).map((opportunity) => (
                                    <div key={`${opportunity.query}-${opportunity.page}`} className="rounded-lg border px-3 py-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium">{opportunity.query}</p>
                                            <Badge variant={opportunity.opportunity === 'high' ? 'destructive' : 'secondary'}>
                                                {opportunity.opportunity}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {opportunity.reason}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No competitive search opportunities are available yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Suggested Super User Actions</CardTitle>
                            <CardDescription>
                                Reuse the existing competitive playbook prompts and route them into Content Engine or Playbooks.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {data.competitor.quickActions.map((action) => (
                                <div key={action} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                    <span>{action}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            ))}

                            <div className="flex items-center gap-2 pt-2">
                                <Button asChild size="sm">
                                    <Link href="/dashboard/ceo?tab=playbooks">Open Playbooks</Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/dashboard/ceo?tab=content">Open Content Engine</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
