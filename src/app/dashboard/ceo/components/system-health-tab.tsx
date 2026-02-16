'use client';
/**
 * System Health Monitoring Tab — Full Featured
 *
 * - Real-time metrics (GCP or simulated with source indicator)
 * - 24-hour trend charts (Recharts)
 * - Week-over-week comparison mode
 * - CSV export
 * - Custom alert threshold configuration
 * - Email notification settings
 * - Auto-refresh every 30 seconds
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Activity, Cpu, MemoryStick, Server, Clock, AlertTriangle, AlertCircle, Info,
  CheckCircle, RefreshCcw, Zap, XCircle, Download, Settings, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  getSystemHealth, getSystemConfiguration, exportMetricsCSV,
  getAlertThresholdConfig, updateAlertThresholds,
} from '@/server/actions/system-health';
import type { SystemHealthSummary, AlertThresholdConfig } from '@/types/system-health';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HeartbeatDiagnosticPanel } from '@/components/system/heartbeat-diagnostic-panel';

export default function SystemHealthTab() {
  const [data, setData] = useState<SystemHealthSummary | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholdConfig | null>(null);
  const [savingThresholds, setSavingThresholds] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [healthData, configData] = await Promise.all([
        getSystemHealth(showComparison),
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
  }, [showComparison]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleExportCSV = async () => {
    const csv = await exportMetricsCSV(24);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-health-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenThresholds = async () => {
    const cfg = await getAlertThresholdConfig();
    setThresholds(cfg);
    setThresholdDialogOpen(true);
  };

  const handleSaveThresholds = async () => {
    if (!thresholds) return;
    setSavingThresholds(true);
    try {
      await updateAlertThresholds({
        memory: thresholds.memory,
        cpu: thresholds.cpu,
        latency: thresholds.latency,
        errorRate: thresholds.errorRate,
        notifications: thresholds.notifications,
      });
      setThresholdDialogOpen(false);
      await fetchData(); // Refresh with new thresholds
    } catch (error) {
      console.error('Failed to save thresholds:', error);
    } finally {
      setSavingThresholds(false);
    }
  };

  const formatPercent = (value: number | null) => value != null ? `${value.toFixed(1)}%` : 'N/A';
  const formatBytes = (mb: number | null) => mb != null ? `${mb.toLocaleString()} MB` : 'N/A';
  const formatLatency = (ms: number | null) => ms != null ? `${ms.toLocaleString()} ms` : 'N/A';

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Healthy</Badge>;
      case 'degraded': return <Badge className="bg-yellow-500"><AlertTriangle className="mr-1 h-3 w-3" />Degraded</Badge>;
      case 'unhealthy': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Unhealthy</Badge>;
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getUsageColor = (percent: number | null, type: 'memory' | 'cpu') => {
    if (percent == null) return 'text-muted-foreground';
    const t = type === 'memory' ? { warning: 70, critical: 85 } : { warning: 60, critical: 80 };
    if (percent >= t.critical) return 'text-red-500';
    if (percent >= t.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBarColor = (percent: number | null, type: 'memory' | 'cpu') => {
    if (percent == null) return 'bg-muted';
    const t = type === 'memory' ? { warning: 70, critical: 85 } : { warning: 60, critical: 80 };
    if (percent >= t.critical) return 'bg-red-500';
    if (percent >= t.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const ChangeIndicator = ({ value, invertColor = false }: { value: number; invertColor?: boolean }) => {
    if (value === 0) return <span className="text-xs text-muted-foreground">--</span>;
    const isPositive = value > 0;
    const isGood = invertColor ? !isPositive : isPositive;
    return (
      <span className={`flex items-center text-xs font-medium ${isGood ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
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

  const { current, timeseries, alerts, comparison } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-sm text-muted-foreground">
            Firebase App Hosting runtime metrics
            {current.source === 'gcp' && (
              <Badge variant="outline" className="ml-2 text-xs">Live GCP</Badge>
            )}
            {current.source === 'simulated' && (
              <Badge variant="secondary" className="ml-2 text-xs">Simulated</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(current.deploymentStatus as 'healthy' | 'degraded' | 'unhealthy')}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenThresholds}>
            <Settings className="mr-2 h-4 w-4" />Alerts
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              {getSeverityIcon(alert.severity)}
              <AlertTitle className="ml-2 capitalize">{alert.type} Alert</AlertTitle>
              <AlertDescription className="ml-6">{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Heartbeat Diagnostic */}
      <HeartbeatDiagnosticPanel />

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <div className={`h-full ${getBarColor(current.memoryUsagePercent, 'memory')}`} style={{ width: `${current.memoryUsagePercent ?? 0}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(current.cpuUsagePercent, 'cpu')}`}>
              {formatPercent(current.cpuUsagePercent)}
            </div>
            <p className="text-xs text-muted-foreground">{current.cpuCores} {current.cpuCores === 1 ? 'core' : 'cores'}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${getBarColor(current.cpuUsagePercent, 'cpu')}`} style={{ width: `${current.cpuUsagePercent ?? 0}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Instances</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.instanceCount}</div>
            <p className="text-xs text-muted-foreground">Min: {current.minInstances} / Max: {current.maxInstances}</p>
            <Badge variant="outline" className="mt-2 text-xs">Autoscaling</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.requestsPerSecond}</div>
            <p className="text-xs text-muted-foreground">requests / second</p>
            <Badge variant={(current.errorRate ?? 0) > 1 ? 'destructive' : 'secondary'} className="mt-2 text-xs">
              {formatPercent(current.errorRate)} errors
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Latency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Request Latency</CardTitle>
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
              <p className={`text-2xl font-bold ${(current.p95LatencyMs ?? 0) > 1000 ? 'text-yellow-500' : ''}`}>{formatLatency(current.p95LatencyMs)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">P99</p>
              <p className={`text-2xl font-bold ${(current.p99LatencyMs ?? 0) > 3000 ? 'text-red-500' : ''}`}>{formatLatency(current.p99LatencyMs)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Charts / Comparison / Config */}
      <Tabs defaultValue="charts">
        <TabsList>
          <TabsTrigger value="charts">24h Trends</TabsTrigger>
          <TabsTrigger value="comparison" onClick={() => { if (!showComparison) { setShowComparison(true); } }}>
            Week vs Week
          </TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Charts Tab */}
        <TabsContent value="charts">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage (24h)</CardTitle>
                <CardDescription>Memory and CPU utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeseries.map(p => ({ time: new Date(p.timestamp).getHours() + ':00', memory: p.memoryUsagePercent, cpu: p.cpuUsagePercent }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Usage (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="memory" stroke="hsl(var(--primary))" strokeWidth={2} name="Memory %" dot={false} />
                    <Line type="monotone" dataKey="cpu" stroke="hsl(var(--chart-2))" strokeWidth={2} name="CPU %" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic & Errors (24h)</CardTitle>
                <CardDescription>Throughput and error rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeseries.map(p => ({ time: new Date(p.timestamp).getHours() + ':00', requests: p.requestsPerSecond, errors: p.errorRate }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Req/s', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Error %', angle: 90, position: 'insideRight', style: { fontSize: 12 } }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="requests" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Requests/sec" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} name="Error Rate %" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          {comparison ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Week-over-Week Comparison</CardTitle>
                <CardDescription>
                  {new Date(comparison.currentPeriod.start).toLocaleDateString()} - {new Date(comparison.currentPeriod.end).toLocaleDateString()} vs{' '}
                  {new Date(comparison.previousPeriod.start).toLocaleDateString()} - {new Date(comparison.previousPeriod.end).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Memory</p>
                    <p className="text-xl font-bold">{comparison.currentPeriod.avgMemory}%</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">was {comparison.previousPeriod.avgMemory}%</span>
                      <ChangeIndicator value={comparison.changes.memory} invertColor />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg CPU</p>
                    <p className="text-xl font-bold">{comparison.currentPeriod.avgCpu}%</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">was {comparison.previousPeriod.avgCpu}%</span>
                      <ChangeIndicator value={comparison.changes.cpu} invertColor />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Requests/s</p>
                    <p className="text-xl font-bold">{comparison.currentPeriod.avgRequests}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">was {comparison.previousPeriod.avgRequests}</span>
                      <ChangeIndicator value={comparison.changes.requests} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Error Rate</p>
                    <p className="text-xl font-bold">{comparison.currentPeriod.avgErrorRate}%</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">was {comparison.previousPeriod.avgErrorRate}%</span>
                      <ChangeIndicator value={comparison.changes.errorRate} invertColor />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Comparison data requires at least 2 weeks of historical metrics.
                  Data is collected every 15 minutes via the metrics cron job.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          {config && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Runtime Configuration</CardTitle>
                <CardDescription>Current deployment settings from apphosting.yaml</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Runtime</h4>
                    <div className="space-y-1 text-sm">
                      {[
                        ['Memory', `${(config as any).runtime.memoryMiB} MB`],
                        ['CPU', `${(config as any).runtime.cpu} core`],
                        ['Concurrency', `${(config as any).runtime.concurrency} requests`],
                        ['Min Instances', `${(config as any).runtime.minInstances}`],
                        ['Max Instances', `${(config as any).runtime.maxInstances}`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-muted-foreground">{label}:</span>
                          <span className="font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Deployment</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform:</span>
                        <span>{(config as any).deployment.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Region:</span>
                        <span className="font-mono">{(config as any).deployment.region}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Project:</span>
                        <span className="font-mono text-xs">{(config as any).deployment.project}</span>
                      </div>
                      {current.lastDeployment && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Deploy:</span>
                          <span>{new Date(current.lastDeployment).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Alert Threshold Configuration Dialog */}
      <Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Alert Threshold Configuration</DialogTitle>
            <DialogDescription>
              Customize when alerts trigger and how notifications are sent.
            </DialogDescription>
          </DialogHeader>
          {thresholds && (
            <div className="space-y-4">
              {/* Memory Thresholds */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Memory Usage (%)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Warning</Label>
                    <Input type="number" value={thresholds.memory.warning} onChange={(e) => setThresholds({ ...thresholds, memory: { ...thresholds.memory, warning: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Critical</Label>
                    <Input type="number" value={thresholds.memory.critical} onChange={(e) => setThresholds({ ...thresholds, memory: { ...thresholds.memory, critical: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>

              {/* CPU Thresholds */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">CPU Usage (%)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Warning</Label>
                    <Input type="number" value={thresholds.cpu.warning} onChange={(e) => setThresholds({ ...thresholds, cpu: { ...thresholds.cpu, warning: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Critical</Label>
                    <Input type="number" value={thresholds.cpu.critical} onChange={(e) => setThresholds({ ...thresholds, cpu: { ...thresholds.cpu, critical: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>

              {/* Latency Thresholds */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">P95 Latency (ms)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Warning</Label>
                    <Input type="number" value={thresholds.latency.warning} onChange={(e) => setThresholds({ ...thresholds, latency: { ...thresholds.latency, warning: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Critical</Label>
                    <Input type="number" value={thresholds.latency.critical} onChange={(e) => setThresholds({ ...thresholds, latency: { ...thresholds.latency, critical: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>

              {/* Error Rate Thresholds */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Error Rate (%)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Warning</Label>
                    <Input type="number" step="0.1" value={thresholds.errorRate.warning} onChange={(e) => setThresholds({ ...thresholds, errorRate: { ...thresholds.errorRate, warning: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Critical</Label>
                    <Input type="number" step="0.1" value={thresholds.errorRate.critical} onChange={(e) => setThresholds({ ...thresholds, errorRate: { ...thresholds.errorRate, critical: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Notifications</Label>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Email Alerts</Label>
                  <Switch
                    checked={thresholds.notifications.email}
                    onCheckedChange={(checked) => setThresholds({ ...thresholds, notifications: { ...thresholds.notifications, email: checked } })}
                  />
                </div>
                {thresholds.notifications.email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Email Recipients (comma-separated)</Label>
                    <Input
                      placeholder="admin@bakedbot.ai, ops@bakedbot.ai"
                      value={thresholds.notifications.emailRecipients.join(', ')}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        notifications: {
                          ...thresholds.notifications,
                          emailRecipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        },
                      })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveThresholds} disabled={savingThresholds}>
              {savingThresholds ? 'Saving...' : 'Save Thresholds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
