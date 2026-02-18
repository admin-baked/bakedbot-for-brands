'use client';

/**
 * Playbooks ROI Analytics Dashboard
 *
 * Multi-tab dashboard showing:
 * - Overview: Summary metrics + revenue trends
 * - Playbooks: Per-playbook KPIs table
 * - Events: Trigger event distribution
 * - Top 5: Best-performing playbooks by revenue
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getPlaybookAnalytics } from '@/server/actions/playbook-analytics';
import { useSearchParams } from 'next/navigation';
import { Loader } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PlaybooksAnalyticsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const orgId = searchParams.get('orgId') || '';
        const result = await getPlaybookAnalytics(orgId, days);

        if ('error' in result) {
          setError(result.error);
          setData(null);
        } else {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [days, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
        <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Analytics</h2>
        <p className="text-sm text-destructive/80">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Playbooks Analytics</h1>
        <p className="text-muted-foreground">ROI dashboard for your playbook campaigns</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              days === d
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Last {d} Days
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Playbooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPlaybooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalExecutions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Attributed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageRoi.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="top5">Top 5</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Trend (Last {days} Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.executionTrendDaily.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.executionTrendDaily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" style={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" style={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" style={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No execution data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playbooks Tab */}
        <TabsContent value="playbooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Playbooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2">Playbook Name</th>
                      <th className="text-center py-2">Executions</th>
                      <th className="text-center py-2">Success Rate</th>
                      <th className="text-center py-2">Customers Reached</th>
                      <th className="text-right py-2">Revenue Attributed</th>
                      <th className="text-right py-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.playbookMetrics.map((metric: any) => (
                      <tr key={metric.playbookId} className="border-b hover:bg-muted/50">
                        <td className="py-3">{metric.playbookName}</td>
                        <td className="text-center">{metric.totalExecutions}</td>
                        <td className="text-center">{metric.successRate.toFixed(1)}%</td>
                        <td className="text-center">{metric.customersReached}</td>
                        <td className="text-right">${metric.revenueAttributed.toFixed(2)}</td>
                        <td className="text-right">{metric.roi.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {data.eventDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.eventDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" style={{ fontSize: 12 }} />
                    <YAxis dataKey="event" type="category" width={120} style={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No event data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top 5 Tab */}
        <TabsContent value="top5" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Playbooks by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topPlaybooks.length > 0 ? (
                <div className="space-y-4">
                  {data.topPlaybooks.map((metric: any, idx: number) => (
                    <div
                      key={metric.playbookId}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{idx + 1}. {metric.playbookName}</div>
                        <div className="text-sm text-muted-foreground">
                          {metric.successfulExecutions} successes, {metric.customersReached} customers reached
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${metric.revenueAttributed.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">ROI: {metric.roi.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No playbook data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
