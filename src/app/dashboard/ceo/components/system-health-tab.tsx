'use client';
/**
 * System Health Monitoring Tab
 *
 * Real-time dashboard for tracking Firebase App Hosting runtime metrics:
 * - Memory and CPU usage
 * - Instance count and autoscaling
 * - Request latency and throughput
 * - Error rates and alerts
 *
 * Super User only.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  Cpu,
  MemoryStick,
  Server,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Zap,
  XCircle,
} from 'lucide-react';
import { getSystemHealth, getSystemConfiguration, triggerHealthCheck } from '@/server/actions/system-health';
import type { SystemHealthSummary } from '@/types/system-health';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SystemHealthTab() {
  const [data, setData] = useState<SystemHealthSummary | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [healthData, configData] = await Promise.all([
        getSystemHealth(),
        getSystemConfiguration(),
      ]);
      setData(healthData);
      setConfig(configData);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatBytes = (mb: number) => `${mb.toLocaleString()} MB`;
  const formatLatency = (ms: number) => `${ms.toLocaleString()} ms`;

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500"><AlertTriangle className="mr-1 h-3 w-3" />Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Unhealthy</Badge>;
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getUsageColor = (percent: number, type: 'memory' | 'cpu') => {
    const thresholds = type === 'memory'
      ? { warning: 70, critical: 85 }
      : { warning: 60, critical: 80 };

    if (percent >= thresholds.critical) return 'text-red-500';
    if (percent >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load system health metrics.</AlertDescription>
      </Alert>
    );
  }

  const { current, timeseries, alerts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of Firebase App Hosting runtime metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(current.deploymentStatus)}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Active Alerts</h3>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.severity === 'critical' ? 'destructive' : 'default'}
            >
              {getSeverityIcon(alert.severity)}
              <AlertTitle className="ml-2 capitalize">{alert.type} Alert</AlertTitle>
              <AlertDescription className="ml-6">{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Memory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(current.memoryUsagePercent, 'memory')}`}>
              {formatPercent(current.memoryUsagePercent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(current.memoryUsedMB)} / {formatBytes(current.memoryAllocatedMB)}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${
                  current.memoryUsagePercent >= 85
                    ? 'bg-red-500'
                    : current.memoryUsagePercent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${current.memoryUsagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(current.cpuUsagePercent, 'cpu')}`}>
              {formatPercent(current.cpuUsagePercent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {current.cpuCores} {current.cpuCores === 1 ? 'core' : 'cores'}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${
                  current.cpuUsagePercent >= 80
                    ? 'bg-red-500'
                    : current.cpuUsagePercent >= 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${current.cpuUsagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Instances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Instances</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.instanceCount}</div>
            <p className="text-xs text-muted-foreground">
              Min: {current.minInstances} / Max: {current.maxInstances}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Autoscaling
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Throughput */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.requestsPerSecond}</div>
            <p className="text-xs text-muted-foreground">requests / second</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={current.errorRate > 1 ? 'destructive' : 'secondary'} className="text-xs">
                {formatPercent(current.errorRate)} errors
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latency Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Request Latency
          </CardTitle>
          <CardDescription>Response time distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average</p>
              <p className="text-2xl font-bold">{formatLatency(current.avgLatencyMs)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">P95</p>
              <p className={`text-2xl font-bold ${current.p95LatencyMs > 1000 ? 'text-yellow-500' : ''}`}>
                {formatLatency(current.p95LatencyMs)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">P99</p>
              <p className={`text-2xl font-bold ${current.p99LatencyMs > 3000 ? 'text-red-500' : ''}`}>
                {formatLatency(current.p99LatencyMs)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Runtime Configuration
            </CardTitle>
            <CardDescription>Current deployment settings from apphosting.yaml</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Runtime</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memory:</span>
                    <span className="font-mono">{config.runtime.memoryMiB} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPU:</span>
                    <span className="font-mono">{config.runtime.cpu} core{config.runtime.cpu > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concurrency:</span>
                    <span className="font-mono">{config.runtime.concurrency} requests</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Instances:</span>
                    <span className="font-mono">{config.runtime.minInstances}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Instances:</span>
                    <span className="font-mono">{config.runtime.maxInstances}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Deployment</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform:</span>
                    <span>{config.deployment.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Region:</span>
                    <span className="font-mono">{config.deployment.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-mono text-xs">{config.deployment.project}</span>
                  </div>
                  {current.lastDeployment && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Deploy:</span>
                      <span>{new Date(current.lastDeployment).toLocaleString()}</span>
                    </div>
                  )}
                  {current.currentVersion && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-mono text-xs">{current.currentVersion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 24-Hour Trend Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Memory & CPU Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage (24h)</CardTitle>
            <CardDescription>Memory and CPU utilization trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={timeseries.map(point => ({
                  time: new Date(point.timestamp).getHours() + ':00',
                  memory: point.memoryUsagePercent,
                  cpu: point.cpuUsagePercent,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Usage (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Memory %"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="CPU %"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Throughput & Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic & Errors (24h)</CardTitle>
            <CardDescription>Request throughput and error rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={timeseries.map(point => ({
                  time: new Date(point.timestamp).getHours() + ':00',
                  requests: point.requestsPerSecond,
                  errors: point.errorRate,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Req/s', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Error %', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Requests/sec"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="errors"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  name="Error Rate %"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Footer Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About These Metrics</AlertTitle>
        <AlertDescription>
          Currently showing simulated metrics. To enable real-time monitoring, integrate with{' '}
          <a
            href="https://cloud.google.com/monitoring/api/v3"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Google Cloud Monitoring API
          </a>
          . See <code className="text-xs">src/server/actions/system-health.ts</code> for implementation details.
        </AlertDescription>
      </Alert>
    </div>
  );
}
