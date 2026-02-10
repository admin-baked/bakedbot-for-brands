'use client';

/**
 * Pricing Analytics Tab Component
 *
 * Displays dynamic pricing performance with charts:
 * - Revenue impact over time
 * - Rule applications by day
 * - Top performing rules
 * - Competitor price comparison
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  DollarSign,
  Zap,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { getRulePerformanceData, getPricingAnalytics } from '../actions';
import { getCompetitorPriceAlerts } from './analytics-actions';
import type { PricingAnalytics } from '@/types/dynamic-pricing';

// Chart colors
const COLORS = {
  primary: 'hsl(var(--primary))',
  revenue: '#10b981', // emerald-500
  applications: '#3b82f6', // blue-500
  discount: '#f59e0b', // amber-500
  competitor: '#ef4444', // red-500
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

type TimeRange = '7d' | '14d' | '30d';

export function PricingAnalyticsTab() {
  const { dispensaryId } = useDispensaryId();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<PricingAnalytics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<
    Array<{ date: string; revenue: number; applications: number }>
  >([]);
  const [competitorAlerts, setCompetitorAlerts] = useState<
    Array<{ productName: string; ourPrice: number; competitorAvg: number; gap: number }>
  >([]);

  const fetchData = async (showRefresh = false) => {
    if (!dispensaryId) return;

    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;

      // Fetch all data in parallel
      const [analyticsData, performanceResult, alertsResult] = await Promise.all([
        getPricingAnalytics(dispensaryId),
        getRulePerformanceData(dispensaryId, days),
        getCompetitorPriceAlerts(dispensaryId),
      ]);

      setAnalytics(analyticsData);
      setTimeSeriesData(performanceResult.data || []);
      setCompetitorAlerts(alertsResult.data || []);
    } catch (error) {
      console.error('[PricingAnalyticsTab] Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dispensaryId, timeRange]);

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (!analytics) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Available</h3>
            <p className="text-sm text-muted-foreground">
              Create some pricing rules to start seeing analytics data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="14d">14 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Impact Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Revenue Impact
            </CardTitle>
            <CardDescription>
              Daily revenue from dynamic pricing vs baseline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    className="text-xs"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium mb-2">{label}</p>
                          {payload.map((entry, i) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: ${Number(entry.value).toFixed(2)}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={COLORS.revenue}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rule Applications Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Rule Applications
            </CardTitle>
            <CardDescription>
              Number of times pricing rules were applied per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium mb-2">{label}</p>
                          {payload.map((entry, i) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="applications"
                    name="Applications"
                    fill={COLORS.applications}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Rule Performance & Competitor Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Top Performing Rules
            </CardTitle>
            <CardDescription>
              Rules ranked by revenue impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.rulePerformance.length > 0 ? (
              <div className="space-y-4">
                {analytics.rulePerformance.slice(0, 5).map((rule, index) => (
                  <div
                    key={rule.ruleId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{rule.ruleName}</p>
                        <p className="text-xs text-muted-foreground">
                          Applied {rule.timesApplied} times
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-semibold',
                        rule.revenue >= 0 ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {rule.revenue >= 0 ? '+' : ''}${rule.revenue.toFixed(0)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {rule.avgDiscount.toFixed(0)}% avg
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No rule performance data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitor Price Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-500" />
              Competitor Price Gaps
            </CardTitle>
            <CardDescription>
              Products where your price differs significantly from competitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {competitorAlerts.length > 0 ? (
              <div className="space-y-3">
                {competitorAlerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{alert.productName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Yours: ${alert.ourPrice.toFixed(2)}</span>
                        <span></span>
                        <span>Avg: ${alert.competitorAvg.toFixed(2)}</span>
                      </div>
                    </div>
                    <Badge
                      variant={alert.gap > 0 ? 'destructive' : 'default'}
                      className={cn(
                        alert.gap > 0 ? '' : 'bg-emerald-500'
                      )}
                    >
                      {alert.gap > 0 ? '+' : ''}{alert.gap.toFixed(0)}%
                      {alert.gap > 0 ? (
                        <TrendingUp className="h-3 w-3 ml-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No competitor data available.</p>
                <p className="text-xs mt-1">Set up Ezal discovery to track competitor prices.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Distribution Pie Chart */}
      {analytics.rulePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Rule Application Distribution
            </CardTitle>
            <CardDescription>
              Share of pricing rule applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.rulePerformance.slice(0, 5).map((r) => ({
                      name: r.ruleName,
                      value: r.timesApplied,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {analytics.rulePerformance.slice(0, 5).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0];
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.value} applications
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
