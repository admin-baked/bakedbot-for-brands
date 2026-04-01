'use client';

/**
 * CEO Content Command Center
 *
 * Strategy scorecard, cannabis news feed, quick-generate panel,
 * and recent platform posts table — all in one tab.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Sparkles,
    RefreshCw,
    Loader2,
    ExternalLink,
    FileText,
    TrendingUp,
    BarChart2,
    BookOpen,
    Newspaper,
    ArrowRight,
} from 'lucide-react';
import {
    getCannabisNewsIdeas,
    getContentAnalyticsSignals,
    getContentScorecard,
    generateMarketReports,
} from '@/server/actions/blog-research';
import type { NewsIdea, ContentScorecard } from '@/server/actions/action-types';
import type { ContentAnalyticsSnapshot } from '@/server/services/content-engine/analytics-signals';
import { getPublishedPlatformPosts } from '@/server/actions/blog';
import { ResearchGeneratorSheet } from '@/components/blog/research-generator-sheet';
import { formatSmartTime } from '@/lib/utils/format-time';
import type { BlogPost, BlogContentType } from '@/types/blog';

const PLATFORM_ORG_ID = 'org_bakedbot_platform';

/** Preset topic pills — keys match PulseTopic in industry-pulse.ts */
const PULSE_PILLS = [
    { key: 'default', label: 'All', emoji: '📰' },
    { key: 'regulations', label: 'Regulations', emoji: '⚖️' },
    { key: 'marketing', label: 'Marketing', emoji: '📣' },
    { key: 'products', label: 'Products', emoji: '🌿' },
    { key: 'trends', label: 'Trends', emoji: '📈' },
] as const;
type PulsePillKey = typeof PULSE_PILLS[number]['key'];

const US_STATES = [
    'New York', 'California', 'Colorado', 'Illinois', 'Michigan',
    'New Jersey', 'Massachusetts', 'Nevada', 'Oregon', 'Washington',
    'Arizona', 'Florida', 'Ohio', 'Pennsylvania', 'Connecticut',
];

const CONTENT_TYPE_COLORS: Record<BlogContentType, string> = {
    hub: 'bg-purple-100 text-purple-800',
    spoke: 'bg-blue-100 text-blue-800',
    programmatic: 'bg-green-100 text-green-800',
    comparison: 'bg-amber-100 text-amber-800',
    report: 'bg-rose-100 text-rose-800',
    standard: 'bg-gray-100 text-gray-800',
};

function ScorecardCard({
    label,
    value,
    target,
    suffix = '',
    icon: Icon,
}: {
    label: string;
    value: number;
    target: number;
    suffix?: string;
    icon: React.ElementType;
}) {
    const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
    const onTrack = value >= Math.round(target * 0.75);
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {value}
                    <span className="text-sm font-normal text-muted-foreground">/{target}{suffix}</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${onTrack ? 'bg-primary' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {onTrack ? 'On track' : 'Below target'}
                </p>
            </CardContent>
        </Card>
    );
}

function formatAnalyticsValue(value: number | null, suffix = ''): string {
    if (value === null) {
        return 'Not connected';
    }

    return `${Math.round(value).toLocaleString()}${suffix}`;
}

export default function ContentCeoTab() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<BlogContentType>('standard');
    const [sheetSeedTopic, setSheetSeedTopic] = useState('');

    const [scorecard, setScorecard] = useState<ContentScorecard | null>(null);
    const [news, setNews] = useState<NewsIdea[]>([]);
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [analyticsSignals, setAnalyticsSignals] = useState<ContentAnalyticsSnapshot | null>(null);
    const [newsCachedAt, setNewsCachedAt] = useState<string | null>(null);
    const [newsLoading, setNewsLoading] = useState(true);
    const [scorecardLoading, setScorecardLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [scorecardError, setScorecardError] = useState<string | null>(null);
    const [newsError, setNewsError] = useState<string | null>(null);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);

    const [activePill, setActivePill] = useState<PulsePillKey>('default');
    const [topicFilter, setTopicFilter] = useState('');
    const [postsTab, setPostsTab] = useState('all');

    const [marketState, setMarketState] = useState('');
    const [generatingReport, setGeneratingReport] = useState(false);
    const [reportResult, setReportResult] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setScorecardLoading(true);
        setAnalyticsLoading(true);
        setScorecardError(null);
        setAnalyticsError(null);

        const [scorecardResult, postsResult, analyticsResult] = await Promise.allSettled([
            getContentScorecard(),
            getPublishedPlatformPosts({ limit: 20 }),
            getContentAnalyticsSignals(),
        ]);

        if (scorecardResult.status === 'fulfilled') {
            setScorecard(scorecardResult.value);
        } else {
            setScorecard(null);
            setScorecardError('Scorecard data is unavailable right now.');
        }

        if (postsResult.status === 'fulfilled') {
            setPosts(postsResult.value);
        } else {
            setPosts([]);
            setScorecardError((current) => current ?? 'Published content is unavailable right now.');
        }

        if (analyticsResult.status === 'fulfilled') {
            setAnalyticsSignals(analyticsResult.value);
        } else {
            setAnalyticsSignals(null);
            setAnalyticsError('Analytics-backed content signals are unavailable right now.');
        }

        setScorecardLoading(false);
        setAnalyticsLoading(false);
    }, []);

    const loadNews = useCallback(async (topic?: string, forceRefresh = false) => {
        setNewsLoading(true);
        setNewsError(null);

        try {
            const result = await getCannabisNewsIdeas(topic, forceRefresh);
            setNews(result.ideas);
            setNewsCachedAt(result.cachedAt);
        } catch (error) {
            console.error('Failed to load industry pulse', error);
            setNews([]);
            setNewsCachedAt(null);
            setNewsError('Industry Pulse could not be loaded.');
        }

        setNewsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
        loadNews();
    }, [loadData, loadNews]);

    const handleRefreshNews = () => {
        const topic = topicFilter.trim() || (activePill !== 'default' ? activePill : undefined);
        loadNews(topic, true);
    };

    const handlePillClick = (pill: PulsePillKey) => {
        setActivePill(pill);
        setTopicFilter('');
        const topic = pill !== 'default' ? pill : undefined;
        loadNews(topic, false);
    };

    const handleOpenSheet = (mode: BlogContentType, seedTopic = '') => {
        setSheetMode(mode);
        setSheetSeedTopic(seedTopic);
        setSheetOpen(true);
    };

    const handleUseAsSource = (idea: NewsIdea) => {
        handleOpenSheet('standard', idea.title);
    };

    const handleGenerateReport = async () => {
        if (!marketState.trim()) return;
        setGeneratingReport(true);
        setReportResult(null);
        try {
            const results = await generateMarketReports([marketState.trim()]);
            const r = results[0];
            if (r?.status === 'generated') {
                setReportResult(`✓ Generated: "${r.title}"`);
            } else {
                setReportResult('Generation failed — try again.');
            }
        } catch {
            setReportResult('Generation failed — try again.');
        } finally {
            setGeneratingReport(false);
        }
    };

    const filteredPosts = posts.filter(p => {
        if (postsTab === 'all') return true;
        return p.contentType === postsTab;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Content Engine</h2>
                    <p className="text-muted-foreground">
                        Research, generate, and track authority content for BakedBot's cannabis technology platform
                    </p>
                </div>
                <Button onClick={() => handleOpenSheet('hub')}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Research & Generate
                </Button>
            </div>

            {/* Scorecard Row */}
            {scorecardLoading ? (
                <div className="grid gap-4 md:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}><CardContent className="pt-6"><div className="h-10 bg-muted animate-pulse rounded" /></CardContent></Card>
                    ))}
                </div>
            ) : scorecard ? (
                <div className="grid gap-4 md:grid-cols-5">
                    <ScorecardCard label="Hub Posts" value={scorecard.hubCount} target={scorecard.hubTarget} suffix="/mo" icon={BookOpen} />
                    <ScorecardCard label="Spoke Articles" value={scorecard.spokeCount} target={scorecard.spokeTarget} suffix="/mo" icon={FileText} />
                    <ScorecardCard label="Market Reports" value={scorecard.programmaticCount} target={scorecard.programmaticTarget} suffix=" total" icon={BarChart2} />
                    <ScorecardCard label="Comparisons" value={scorecard.comparisonCount} target={2} suffix="/mo" icon={TrendingUp} />
                    <ScorecardCard label="Reports" value={scorecard.reportCount} target={1} suffix="/qtr" icon={Newspaper} />
                </div>
            ) : null}
            {scorecardError && (
                <Card className="border-amber-200 bg-amber-50/60">
                    <CardContent className="pt-6">
                        <p className="text-sm text-amber-900">{scorecardError}</p>
                    </CardContent>
                </Card>
            )}

            {/* Two-column layout */}
            <div className="grid gap-6 lg:grid-cols-5">
                {/* Left — 60% */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Industry Pulse */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Industry Pulse</CardTitle>
                                    {newsCachedAt && !newsLoading && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Pre-loaded {formatSmartTime(newsCachedAt, { showSuffix: true })}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Custom topic..."
                                        value={topicFilter}
                                        onChange={(e) => {
                                            setTopicFilter(e.target.value);
                                            if (e.target.value) setActivePill('default');
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRefreshNews()}
                                        className="h-8 w-36 text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRefreshNews}
                                        disabled={newsLoading}
                                        title="Force refresh (bypasses cache)"
                                    >
                                        {newsLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {/* Topic pills — backed by pre-warmed Firestore cache */}
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {PULSE_PILLS.map((pill) => (
                                    <button
                                        key={pill.key}
                                        onClick={() => handlePillClick(pill.key)}
                                        disabled={newsLoading}
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activePill === pill.key && !topicFilter
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        <span>{pill.emoji}</span>
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {newsLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                                    ))}
                                </div>
                            ) : newsError ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {newsError}
                                </p>
                            ) : news.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No results — try refreshing or entering a topic
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {news.map((idea, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <a
                                                    href={idea.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium hover:underline line-clamp-1 flex items-center gap-1"
                                                >
                                                    {idea.title}
                                                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                </a>
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                    {idea.description}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 text-xs"
                                                onClick={() => handleUseAsSource(idea)}
                                            >
                                                Use →
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Posts */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Published Posts</CardTitle>
                                <Link href="/dashboard/blog">
                                    <Button variant="ghost" size="sm" className="text-xs">
                                        View All
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={postsTab} onValueChange={setPostsTab}>
                                <TabsList className="mb-4 h-8">
                                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                                    <TabsTrigger value="hub" className="text-xs">Hub</TabsTrigger>
                                    <TabsTrigger value="spoke" className="text-xs">Spoke</TabsTrigger>
                                    <TabsTrigger value="programmatic" className="text-xs">Market</TabsTrigger>
                                    <TabsTrigger value="comparison" className="text-xs">Compare</TabsTrigger>
                                </TabsList>
                                <TabsContent value={postsTab}>
                                    {filteredPosts.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6">
                                            No {postsTab !== 'all' ? postsTab : ''} posts yet
                                        </p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Views</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPosts.slice(0, 10).map((post) => (
                                                    <TableRow key={post.id}>
                                                        <TableCell>
                                                            <Link
                                                                href={`/dashboard/blog/${post.id}`}
                                                                className="text-sm font-medium hover:underline line-clamp-1"
                                                            >
                                                                {post.title}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[post.contentType ?? 'standard']}`}>
                                                                {post.contentType ?? 'standard'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm text-muted-foreground">
                                                            {post.viewCount?.toLocaleString() ?? 0}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Right — 40% */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">Analytics Signals</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        GA, Search Console, and AIQ content gaps
                                    </p>
                                </div>
                                {!analyticsLoading && analyticsSignals && (
                                    <div className="flex items-center gap-1">
                                        <Badge variant={analyticsSignals.gaConnected ? 'secondary' : 'outline'} className="text-[10px]">
                                            GA {analyticsSignals.gaConnected ? 'Live' : 'Off'}
                                        </Badge>
                                        <Badge variant={analyticsSignals.gscConnected ? 'secondary' : 'outline'} className="text-[10px]">
                                            GSC {analyticsSignals.gscConnected ? 'Live' : 'Off'}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {analyticsLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <div key={index} className="h-16 rounded-md bg-muted animate-pulse" />
                                    ))}
                                </div>
                            ) : analyticsError ? (
                                <p className="text-sm text-muted-foreground">{analyticsError}</p>
                            ) : analyticsSignals ? (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border p-3">
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sessions</p>
                                            <p className="mt-1 text-lg font-semibold">
                                                {formatAnalyticsValue(analyticsSignals.kpis.sessions28d)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                28-day site traffic
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-3">
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Blog Sessions</p>
                                            <p className="mt-1 text-lg font-semibold">
                                                {formatAnalyticsValue(analyticsSignals.kpis.blogSessions28d)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                28-day content traffic
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-3">
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Impressions</p>
                                            <p className="mt-1 text-lg font-semibold">
                                                {formatAnalyticsValue(analyticsSignals.kpis.impressions28d)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {analyticsSignals.kpis.ctr28d !== null
                                                    ? `${analyticsSignals.kpis.ctr28d.toFixed(2)}% CTR`
                                                    : 'Search Console needed'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-3">
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">AIQ Coverage</p>
                                            <p className="mt-1 text-lg font-semibold">
                                                {analyticsSignals.kpis.aiqMentionPosts}/{analyticsSignals.kpis.comparisonPosts}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                AIQ mentions / comparison posts
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Priority Topics
                                        </p>
                                        {analyticsSignals.recommendations.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                Connect GA and Search Console to unlock analytics-backed topic suggestions.
                                            </p>
                                        ) : (
                                            analyticsSignals.recommendations.map((recommendation, index) => (
                                                <button
                                                    key={`${recommendation.source}-${index}`}
                                                    type="button"
                                                    onClick={() => handleOpenSheet(recommendation.contentType, recommendation.topic)}
                                                    className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium leading-snug">{recommendation.title}</p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {recommendation.supportingMetric}
                                                            </p>
                                                            <p className="mt-1 text-xs text-primary">
                                                                {recommendation.reason}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="shrink-0 text-[10px]">
                                                            {recommendation.contentType}
                                                        </Badge>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    {(analyticsSignals.topQueries[0] || analyticsSignals.topContentPages[0]) && (
                                        <div className="space-y-1 border-t pt-3">
                                            {analyticsSignals.topQueries[0] && (
                                                <p className="text-xs text-muted-foreground">
                                                    Top query: <span className="font-medium text-foreground">{analyticsSignals.topQueries[0].query}</span>
                                                </p>
                                            )}
                                            {analyticsSignals.topContentPages[0] && (
                                                <p className="text-xs text-muted-foreground">
                                                    Top page: <span className="font-medium text-foreground">{analyticsSignals.topContentPages[0].path}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No analytics signals available.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Generate Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Quick Generate</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleOpenSheet('hub')}
                            >
                                <BookOpen className="mr-2 h-4 w-4 text-purple-600" />
                                Hub Pillar Article
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleOpenSheet('spoke')}
                            >
                                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                                Spoke Article
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleOpenSheet('comparison')}
                            >
                                <TrendingUp className="mr-2 h-4 w-4 text-amber-600" />
                                Competitor Comparison
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleOpenSheet('report')}
                            >
                                <Newspaper className="mr-2 h-4 w-4 text-rose-600" />
                                Regulatory Alert
                            </Button>

                            {/* Market Report with state picker */}
                            <div className="pt-2 border-t space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Programmatic Market Report</p>
                                <div className="flex gap-2">
                                    <select
                                        value={marketState}
                                        onChange={(e) => setMarketState(e.target.value)}
                                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Select state...</option>
                                        {US_STATES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <Button
                                        size="sm"
                                        disabled={!marketState || generatingReport}
                                        onClick={handleGenerateReport}
                                    >
                                        {generatingReport ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <BarChart2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {reportResult && (
                                    <p className="text-xs text-muted-foreground">{reportResult}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Content Calendar Link */}
                    <Card className="border-dashed">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Content Calendar</p>
                                    <p className="text-xs text-muted-foreground">
                                        Schedule and manage publication dates
                                    </p>
                                </div>
                                <Link href="/dashboard/blog/calendar">
                                    <Button variant="outline" size="sm" className="w-full">
                                        Open Calendar
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Blog Management Link */}
                    <Card className="border-dashed">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Blog Management</p>
                                    <p className="text-xs text-muted-foreground">
                                        Full post editor, drafts, publishing
                                    </p>
                                </div>
                                <Link href="/dashboard/blog">
                                    <Button variant="outline" size="sm" className="w-full">
                                        Open Blog Dashboard
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Research Generator Sheet */}
            <ResearchGeneratorSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                defaultMode={sheetMode}
                seedTopic={sheetSeedTopic}
                orgId={PLATFORM_ORG_ID}
                onGenerated={(postId) => {
                    loadData();
                }}
            />
        </div>
    );
}
