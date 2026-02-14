// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { getClaimAnalytics, getPageAnalytics } from '@/server/actions/logPageView';
import { createServerClient } from '@/firebase/server-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MousePointer, TrendingUp, MapPin, Globe, BarChart3 } from 'lucide-react';
import { DailyViewsChart, TopItemsList } from '@/components/analytics/AnalyticsCharts';

interface AnalyticsPageProps {
    searchParams: Promise<{ claimId?: string }>;
}

export default async function ClaimAnalyticsPage({ searchParams }: AnalyticsPageProps) {
    const params = await searchParams;
    const claimId = params.claimId;

    if (!claimId) {
        return (
            <div className="container py-12">
                <h1 className="text-2xl font-bold mb-4">Claim Analytics</h1>
                <p className="text-muted-foreground">No claim ID provided. Please select a claim from your dashboard.</p>
            </div>
        );
    }

    // Fetch claim details
    const { firestore } = await createServerClient();
    const claimDoc = await firestore
        .collection('foot_traffic')
        .doc('data')
        .collection('claims')
        .doc(claimId)
        .get();

    if (!claimDoc.exists) {
        return (
            <div className="container py-12">
                <h1 className="text-2xl font-bold mb-4">Claim Not Found</h1>
                <p className="text-muted-foreground">The requested claim could not be found.</p>
            </div>
        );
    }

    const claimData = claimDoc.data()!;
    const analytics = await getClaimAnalytics(claimId);

    // Fetch detailed analytics for the first page if available
    let pageDetails: {
        dailyViews: Record<string, number>;
        topZips: Record<string, number>;
        topSources: Record<string, number>;
    } | null = null;

    if (analytics.topPages.length > 0) {
        const pageId = analytics.topPages[0].pageId;
        const [pageType, ...rest] = pageId.split('_');
        const actualPageId = rest.join('_');

        const details = await getPageAnalytics(
            pageType as 'brand' | 'dispensary' | 'zip' | 'product',
            actualPageId
        );

        if (details) {
            pageDetails = {
                dailyViews: details.dailyViews,
                topZips: details.topZips,
                topSources: details.topSources
            };
        }
    }

    return (
        <div className="container py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{claimData.businessName}</h1>
                <p className="text-muted-foreground mt-1">
                    Page Analytics • {claimData.planId === 'founders-claim' ? 'Founders Claim' : 'Claim Pro'}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">CTA interactions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.avgCtr.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Clicks / Views</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Pages</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.topPages.length}</div>
                        <p className="text-xs text-muted-foreground">Tracked pages</p>
                    </CardContent>
                </Card>
            </div>

            {/* Views Chart */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Views Over Time
                    </CardTitle>
                    <CardDescription>Daily page views for the last 14 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <DailyViewsChart dailyViews={pageDetails?.dailyViews || {}} days={14} />
                </CardContent>
            </Card>

            {/* Top Pages Table */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Top Performing Pages</CardTitle>
                    <CardDescription>Pages with the most traffic</CardDescription>
                </CardHeader>
                <CardContent>
                    {analytics.topPages.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No page views recorded yet. Views will appear here as users discover your pages.</p>
                    ) : (
                        <div className="space-y-4">
                            {analytics.topPages.map((page, idx) => (
                                <div key={page.pageId} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground text-sm font-mono w-6">{idx + 1}</span>
                                        <div>
                                            <p className="font-medium">{page.pageId.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-right">
                                            <p className="font-medium">{page.views.toLocaleString()}</p>
                                            <p className="text-muted-foreground text-xs">views</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{page.clicks.toLocaleString()}</p>
                                            <p className="text-muted-foreground text-xs">clicks</p>
                                        </div>
                                        <div className="text-right w-16">
                                            <p className="font-medium">
                                                {page.views > 0 ? ((page.clicks / page.views) * 100).toFixed(1) : '0'}%
                                            </p>
                                            <p className="text-muted-foreground text-xs">CTR</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ZIP Codes and Sources */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Top ZIP Codes
                        </CardTitle>
                        <CardDescription>Where your visitors are coming from</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopItemsList
                            items={pageDetails?.topZips || {}}
                            label="ZIP codes"
                            maxItems={5}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Traffic Sources
                        </CardTitle>
                        <CardDescription>How visitors find your pages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopItemsList
                            items={pageDetails?.topSources || {}}
                            label="sources"
                            maxItems={5}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
