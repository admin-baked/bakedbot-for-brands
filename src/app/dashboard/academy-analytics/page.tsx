'use client';

import { useEffect, useState } from 'react';
import { magnetsAPI, type AcademyAnalytics } from '@/lib/magnets-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, TrendingUp, Users, Video, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function AcademyAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AcademyAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const data = await magnetsAPI.getAcademyAnalytics(timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academy Analytics</h1>
          <p className="text-muted-foreground">
            Engagement metrics and conversion analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={fetchAnalytics}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalViews.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All video views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalLeads.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Email captures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Viewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.uniqueViewers.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Distinct users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.completedEpisodes.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Episodes watched to 100%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Metrics</CardTitle>
          <CardDescription>
            Lead generation and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="text-2xl font-bold">
                  {analytics?.conversionMetrics.conversionRate}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {analytics?.conversionMetrics.totalLeads} leads from{' '}
                {analytics?.conversionMetrics.totalViewers} viewers
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High Quality Leads</span>
                <span className="text-2xl font-bold">
                  {analytics?.conversionMetrics.highQualityLeads}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {analytics?.conversionMetrics.highQualityRate}% of total leads
                (3+ videos or intent signals)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Episode Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Episode Performance</CardTitle>
          <CardDescription>
            View and completion rates by episode
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.episodeAnalytics && Object.keys(analytics.episodeAnalytics).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(analytics.episodeAnalytics)
                .sort((a, b) => a[0].localeCompare(b[0])) // Sort by episode ID
                .map(([episodeId, stats]) => {
                  const completionRate = stats.views > 0
                    ? Math.round((stats.completions / stats.views) * 100)
                    : 0;

                  return (
                    <div key={episodeId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {getEpisodeTitle(episodeId)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {stats.views} views • {stats.completions} completions
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Completion Rate: {completionRate}%</span>
                        {completionRate >= 70 && (
                          <span className="text-green-600 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            High engagement
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No episode data available for this time range
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getEpisodeTitle(episodeId: string): string {
  // Map episode IDs to titles
  const titles: Record<string, string> = {
    'episode-1': 'Episode 1: Smokey - The Art of the Recommendation',
    'episode-2': 'Episode 2: Craig - Marketing Magic',
    'episode-3': 'Episode 3: Ezal - Competitive Intelligence',
    'episode-4': 'Episode 4: Deebo - Compliance & Gauntlet',
    'episode-5': 'Episode 5: Pops - Community & Loyalty',
    'episode-6': 'Episode 6: Money Mike - Profitability',
    'episode-7': 'Episode 7: Mrs. Parker - Agent Orchestration',
  };

  return titles[episodeId] || episodeId;
}
