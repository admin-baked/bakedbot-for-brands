'use client';

/**
 * Playbook Health Dashboard Component
 *
 * Displays operational health metrics:
 * - Agent performance (Craig, Mrs. Parker, etc.)
 * - Playbook failure/retry rates
 * - Customer journey conversion analytics
 * - Retry queue and Dead Letter Queue status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Loader } from 'lucide-react';
import { getPlaybookHealthAnalytics } from '@/server/actions/playbook-health-analytics';

const COLORS = ['#3b82f6', '#ef4444', '#10b981'];

interface PlaybookHealthDashboardProps {
  orgId: string;
  days?: number;
}

export function PlaybookHealthDashboard({ orgId, days = 30 }: PlaybookHealthDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await getPlaybookHealthAnalytics(orgId, days);

        if ('error' in result) {
          setError(result.error);
          setData(null);
        } else {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load health analytics');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orgId, days]);

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
        <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Health Metrics</h2>
        <p className="text-sm text-destructive/80">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">No health data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Retry Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Retries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.retryStats.totalPending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently Retrying</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.retryStats.totalRetrying}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Retries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.retryStats.totalFailed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">DLQ Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.retryStats.dlqCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle>🤖 Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.agentPerformance && data.agentPerformance.length > 0 ? (
            <div className="space-y-4">
              {data.agentPerformance.map((agent: any) => (
                <div key={agent.agent} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold capitalize">{agent.agent}</div>
                    <div className="text-sm text-muted-foreground">
                      {agent.totalActions} actions | {agent.successfulActions} successful
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{agent.successRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No agent data available</p>
          )}
        </CardContent>
      </Card>

      {/* Playbook Health */}
      <Card>
        <CardHeader>
          <CardTitle>🏥 Playbook Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          {data.playbookHealth && data.playbookHealth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">Playbook</th>
                    <th className="text-center py-2">Failure Rate</th>
                    <th className="text-center py-2">Avg Retries</th>
                    <th className="text-center py-2">DLQ Events</th>
                  </tr>
                </thead>
                <tbody>
                  {data.playbookHealth.map((pb: any) => (
                    <tr key={pb.playbookId} className="border-b hover:bg-muted/50">
                      <td className="py-3">{pb.playbookName}</td>
                      <td className="text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            pb.failureRate > 10
                              ? 'bg-red-100 text-red-800'
                              : pb.failureRate > 5
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {pb.failureRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">{pb.averageRetries.toFixed(2)}</td>
                      <td className="text-center">
                        {pb.dlqCount > 0 && <span className="text-destructive font-semibold">{pb.dlqCount}</span>}
                        {pb.dlqCount === 0 && <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No playbook health data available</p>
          )}
        </CardContent>
      </Card>

      {/* Customer Journey Conversion */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Customer Journey Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          {data.customerJourneys && data.customerJourneys.length > 0 ? (
            <div className="space-y-4">
              {data.customerJourneys.map((journey: any) => (
                <div key={journey.eventName} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{journey.eventName}</div>
                    <div className="text-lg font-bold text-blue-600">{journey.conversionRate.toFixed(1)}%</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(journey.conversionRate, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{journey.conversionsToOrder} / {journey.totalEvents} conversions</span>
                    {journey.averageDaysToOrder > 0 && (
                      <span>Avg {journey.averageDaysToOrder.toFixed(1)}d to order</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No journey data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
