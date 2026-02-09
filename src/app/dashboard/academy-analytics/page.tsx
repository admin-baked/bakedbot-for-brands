'use client';

/**
 * Academy Analytics Dashboard
 *
 * Super admin only page showing Academy performance metrics:
 * - Lead capture and conversion funnel
 * - Popular content (episodes and resources)
 * - Lead scoring and high-intent leads
 * - Email performance
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Users,
  Video,
  Download,
  Mail,
  Target,
  Clock,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAcademyAnalytics } from '@/server/actions/academy-analytics';
import type { AcademyAnalytics } from '@/types/academy';

export default function AcademyAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AcademyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [isSuperUser, setIsSuperUser] = useState(false);

  // Check super_user role from token
  useEffect(() => {
    async function checkRole() {
      if (user) {
        const token = await user.getIdTokenResult();
        const role = token.claims.role || token.claims.customRole;
        setIsSuperUser(role === 'super_user');
      }
    }
    checkRole();
  }, [user]);

  useEffect(() => {
    if (!isSuperUser) return;

    async function fetchAnalytics() {
      setLoading(true);
      try {
        const result = await getAcademyAnalytics({ timeRange });
        if (result.success && result.data) {
          setAnalytics(result.data);
        } else {
          setError(result.error || 'Failed to load analytics');
        }
      } catch (err) {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [isSuperUser, timeRange]);

  if (!isSuperUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This page is only accessible to super administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error Loading Analytics</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Academy Analytics</h1>
        <p className="text-muted-foreground">
          Performance metrics and lead insights for the Cannabis Marketing AI Academy
        </p>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="mb-8">
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Leads"
          value={analytics.totalLeads}
          icon={Users}
          trend={analytics.leadGrowth}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Videos Watched"
          value={analytics.totalVideoViews}
          icon={Video}
          trend={analytics.videoGrowth}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Resources Downloaded"
          value={analytics.totalDownloads}
          icon={Download}
          trend={analytics.downloadGrowth}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Demo Requests"
          value={analytics.totalDemoRequests}
          icon={Target}
          trend={analytics.demoGrowth}
          trendLabel="vs last period"
          highlight
        />
      </div>

      {/* Conversion Funnel */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FunnelStage
              label="Visitors"
              value={analytics.funnel.visitors}
              percentage={100}
              color="bg-blue-500"
            />
            <FunnelStage
              label="Video Views"
              value={analytics.funnel.videoViews}
              percentage={(analytics.funnel.videoViews / analytics.funnel.visitors) * 100}
              color="bg-green-500"
            />
            <FunnelStage
              label="Email Captures"
              value={analytics.funnel.emailCaptures}
              percentage={(analytics.funnel.emailCaptures / analytics.funnel.visitors) * 100}
              color="bg-purple-500"
            />
            <FunnelStage
              label="Demo Requests"
              value={analytics.funnel.demoRequests}
              percentage={(analytics.funnel.demoRequests / analytics.funnel.visitors) * 100}
              color="bg-orange-500"
            />
            <FunnelStage
              label="Conversions"
              value={analytics.funnel.conversions}
              percentage={(analytics.funnel.conversions / analytics.funnel.visitors) * 100}
              color="bg-emerald-600"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Most Popular Episodes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Most Popular Episodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.popularEpisodes.map((episode, index) => (
                <div
                  key={episode.episodeId}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <div>
                      <p className="font-medium line-clamp-1">{episode.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {episode.views} views • {Math.round(episode.avgWatchTime / 60)}min avg
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{episode.completionRate}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Downloaded Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Most Downloaded Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.popularResources.map((resource, index) => (
                <div
                  key={resource.resourceId}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <div>
                      <p className="font-medium line-clamp-1">{resource.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {resource.downloads} downloads
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{resource.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* High-Intent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              High-Intent Leads (Score {'>'}75)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.highIntentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{lead.firstName || lead.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.videosWatched} videos • {lead.resourcesDownloaded} downloads
                    </p>
                    <div className="flex gap-1 mt-1">
                      {lead.intentSignals.slice(0, 3).map((signal) => (
                        <Badge key={signal} variant="secondary" className="text-xs">
                          {signal.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge className="bg-emerald-600">{lead.leadScore}</Badge>
                </div>
              ))}
              {analytics.highIntentLeads.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No high-intent leads yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Lead Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { range: '75-100', label: 'Hot (75-100)', color: 'bg-emerald-600' },
                { range: '50-74', label: 'Warm (50-74)', color: 'bg-orange-500' },
                { range: '25-49', label: 'Cool (25-49)', color: 'bg-blue-500' },
                { range: '0-24', label: 'Cold (0-24)', color: 'bg-gray-400' },
              ].map((bucket) => {
                const count =
                  analytics.leadScoreDistribution[
                    bucket.range as keyof typeof analytics.leadScoreDistribution
                  ];
                const percentage =
                  analytics.totalLeads > 0 ? (count / analytics.totalLeads) * 100 : 0;

                return (
                  <div key={bucket.range}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{bucket.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`${bucket.color} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  highlight?: boolean;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  highlight,
}: MetricCardProps) {
  const trendColor = trend && trend > 0 ? 'text-emerald-600' : 'text-destructive';

  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-3xl font-bold">{value.toLocaleString()}</h2>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendingUp className="h-3 w-3" />
              <span>{trend > 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>
        {trendLabel && (
          <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface FunnelStageProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

function FunnelStage({ label, value, percentage, color }: FunnelStageProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
