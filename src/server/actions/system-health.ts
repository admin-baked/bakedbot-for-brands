'use server';
/**
 * System Health Monitoring Server Actions
 *
 * Features:
 * - Real metrics via GCP Cloud Monitoring (fallback to simulated)
 * - Historical timeseries from Firestore
 * - Week-over-week comparison mode
 * - CSV export of metrics
 * - Custom alert threshold configuration
 * - Email notifications for critical alerts
 */

import { requireUser } from '@/server/auth/auth';
import type {
  SystemHealthMetrics,
  SystemHealthTimeseries,
  SystemHealthSummary,
  SystemHealthAlert,
  SystemHealthComparison,
  AlertThresholdConfig,
} from '@/types/system-health';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getHistoricalMetrics } from '@/server/services/metrics-collector';
import { getAlertThresholds, saveAlertThresholds, processAlertNotifications } from '@/server/services/health-alerts';

/**
 * Try to get real GCP metrics, fallback to simulated
 */
async function getCurrentMetrics(memoryAllocatedMB: number): Promise<{
  memoryUsedMB: number | null;
  memoryUsagePercent: number | null;
  cpuUsagePercent: number | null;
  instanceCount: number | null;
  requestsPerSecond: number | null;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  errorRate: number | null;
  errorCount: number | null;
  source: 'gcp' | 'simulated' | 'not_instrumented';
}> {
  // Try GCP Monitoring first
  try {
    const { getGCPMetrics, isGCPMonitoringAvailable } = await import('@/server/services/gcp-monitoring');
    const available = await isGCPMonitoringAvailable();

    if (available) {
      const gcp = await getGCPMetrics();
      const memoryUsedMB = Math.round(memoryAllocatedMB * (gcp.memoryUsagePercent / 100));
      return {
        memoryUsedMB,
        memoryUsagePercent: gcp.memoryUsagePercent,
        cpuUsagePercent: gcp.cpuUsagePercent,
        instanceCount: gcp.instanceCount || 1,
        requestsPerSecond: gcp.requestsPerSecond,
        avgLatencyMs: gcp.avgLatencyMs,
        p95LatencyMs: gcp.p95LatencyMs,
        p99LatencyMs: Math.round(gcp.p95LatencyMs * 1.5),
        errorRate: 0,
        errorCount: 0,
        source: 'gcp',
      };
    }
  } catch {
    // GCP Monitoring not available
  }

  // In production, never invent telemetry.
  if (process.env.NODE_ENV === 'production') {
    return {
      memoryUsedMB: null,
      memoryUsagePercent: null,
      cpuUsagePercent: null,
      instanceCount: null,
      requestsPerSecond: null,
      avgLatencyMs: null,
      p95LatencyMs: null,
      p99LatencyMs: null,
      errorRate: null,
      errorCount: null,
      source: 'not_instrumented',
    };
  }

  // Simulated metrics (dev/test only)
  const memoryUsedMB = Math.floor(memoryAllocatedMB * (0.4 + Math.random() * 0.3));
  const memoryUsagePercent = Math.round((memoryUsedMB / memoryAllocatedMB) * 100);
  const cpuUsagePercent = Math.round(20 + Math.random() * 40);
  const requestsPerSecond = Math.round(5 + Math.random() * 15);
  const avgLatencyMs = Math.round(100 + Math.random() * 200);
  const errorRate = Math.random() * 2;

  return {
    memoryUsedMB,
    memoryUsagePercent,
    cpuUsagePercent,
    instanceCount: Math.floor(1 + Math.random() * 3),
    requestsPerSecond,
    avgLatencyMs,
    p95LatencyMs: Math.round(avgLatencyMs * 2),
    p99LatencyMs: Math.round(avgLatencyMs * 3),
    errorRate,
    errorCount: Math.floor(requestsPerSecond * errorRate * 60),
    source: 'simulated',
  };
}

/**
 * Get current system health metrics
 */
export async function getSystemHealth(includeComparison: boolean = false): Promise<SystemHealthSummary> {
  await requireUser(['super_user']);

  const memoryAllocatedMB = 2048;
  const cpuCores = 1;
  const minInstances = 0;
  const maxInstances = 10;
  const now = new Date();

  const metrics = await getCurrentMetrics(memoryAllocatedMB);

  // Get deployment info
  let lastDeployment: Date | null = null;
  let currentVersion: string | null = null;
  try {
    const db = getAdminFirestore();
    const snap = await db.collection('deployments').orderBy('timestamp', 'desc').limit(1).get();
    if (!snap.empty) {
      const d = snap.docs[0].data();
      lastDeployment = d.timestamp instanceof Timestamp ? d.timestamp.toDate() : new Date(d.timestamp);
      currentVersion = d.version || d.commitSha || null;
    }
  } catch {
    // Not set up
  }

  // Load custom thresholds
  const thresholds = await getAlertThresholds();

  let deploymentStatus: SystemHealthMetrics['deploymentStatus'] = 'healthy';
  if (metrics.source === 'not_instrumented') {
    deploymentStatus = 'unknown';
  } else if (
    (metrics.errorRate != null && metrics.errorRate > thresholds.errorRate.critical) ||
    (metrics.memoryUsagePercent != null && metrics.memoryUsagePercent > thresholds.memory.critical)
  ) {
    deploymentStatus = 'unhealthy';
  } else if (
    (metrics.errorRate != null && metrics.errorRate > thresholds.errorRate.warning) ||
    (metrics.memoryUsagePercent != null && metrics.memoryUsagePercent > thresholds.memory.warning)
  ) {
    deploymentStatus = 'degraded';
  }

  const current: SystemHealthMetrics = {
    timestamp: now,
    memoryAllocatedMB,
    memoryUsedMB: metrics.memoryUsedMB,
    memoryUsagePercent: metrics.memoryUsagePercent,
    cpuCores,
    cpuUsagePercent: metrics.cpuUsagePercent,
    instanceCount: metrics.instanceCount,
    minInstances,
    maxInstances,
    requestsPerSecond: metrics.requestsPerSecond,
    avgLatencyMs: metrics.avgLatencyMs,
    p95LatencyMs: metrics.p95LatencyMs,
    p99LatencyMs: metrics.p99LatencyMs,
    errorRate: metrics.errorRate,
    errorCount: metrics.errorCount,
    deploymentStatus,
    lastDeployment,
    currentVersion,
    source: metrics.source,
  };

  // Get historical timeseries
  let timeseries: SystemHealthTimeseries[] = [];
  try {
    if (metrics.source === 'gcp') {
      const { getGCPTimeseries } = await import('@/server/services/gcp-monitoring');
      timeseries = await getGCPTimeseries(24);
    }
    if (timeseries.length === 0) {
      timeseries = await getHistoricalMetrics(24);
    }
  } catch {
    // No data
  }
  if (timeseries.length === 0 && process.env.NODE_ENV !== 'production') {
    for (let i = 23; i >= 0; i--) {
      timeseries.push({
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        memoryUsagePercent: Math.round(40 + Math.random() * 30),
        cpuUsagePercent: Math.round(20 + Math.random() * 40),
        requestsPerSecond: Math.round(5 + Math.random() * 15),
        errorRate: Math.random() * 2,
      });
    }
  }

  // Generate alerts
  const alerts = generateAlerts(current, thresholds);

  // Fire-and-forget notifications
  if (alerts.length > 0) {
    processAlertNotifications(alerts).catch(() => {});
  }

  // Comparison mode
  let comparison: SystemHealthComparison | undefined;
  if (includeComparison) {
    comparison = await getComparison();
  }

  return { current, timeseries, alerts, comparison };
}

function generateAlerts(
  current: SystemHealthMetrics,
  thresholds: AlertThresholdConfig,
): SystemHealthAlert[] {
  const alerts: SystemHealthAlert[] = [];
  const now = current.timestamp;
  if (current.source === 'not_instrumented') return alerts;

  const checks: Array<{
    type: SystemHealthAlert['type'];
    value: number | null;
    warning: number;
    critical: number;
    label: string;
    detail: string;
  }> = [
    {
      type: 'memory',
      value: current.memoryUsagePercent,
      warning: thresholds.memory.warning,
      critical: thresholds.memory.critical,
      label: 'Memory usage',
      detail:
        current.memoryUsagePercent == null || current.memoryUsedMB == null
          ? 'No data'
          : `${current.memoryUsagePercent}% (${current.memoryUsedMB}MB / ${current.memoryAllocatedMB}MB)`,
    },
    {
      type: 'cpu',
      value: current.cpuUsagePercent,
      warning: thresholds.cpu.warning,
      critical: thresholds.cpu.critical,
      label: 'CPU usage',
      detail: current.cpuUsagePercent == null ? 'No data' : `${current.cpuUsagePercent}%`,
    },
    {
      type: 'latency',
      value: current.p95LatencyMs,
      warning: thresholds.latency.warning,
      critical: thresholds.latency.critical,
      label: 'P95 latency',
      detail: current.p95LatencyMs == null ? 'No data' : `${current.p95LatencyMs}ms`,
    },
    {
      type: 'errors',
      value: current.errorRate,
      warning: thresholds.errorRate.warning,
      critical: thresholds.errorRate.critical,
      label: 'Error rate',
      detail:
        current.errorRate == null || current.errorCount == null
          ? 'No data'
          : `${current.errorRate.toFixed(2)}% (${current.errorCount} errors/min)`,
    },
  ];

  for (const c of checks) {
    if (c.value == null || !Number.isFinite(c.value)) continue;
    if (c.value >= c.critical) {
      alerts.push({ id: `${c.type}-critical-${now.getTime()}`, severity: 'critical', type: c.type, message: `${c.label} critical: ${c.detail}`, timestamp: now, resolved: false });
    } else if (c.value >= c.warning) {
      alerts.push({ id: `${c.type}-warning-${now.getTime()}`, severity: 'warning', type: c.type, message: `${c.label} elevated: ${c.detail}`, timestamp: now, resolved: false });
    }
  }

  return alerts;
}

async function getComparison(): Promise<SystemHealthComparison | undefined> {
  try {
    const currentWeek = await getHistoricalMetrics(168);
    const previousWeek = await getHistoricalMetrics(336);
    if (currentWeek.length === 0) return undefined;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const prevData = previousWeek.filter(p => p.timestamp < oneWeekAgo);
    const currData = currentWeek.filter(p => p.timestamp >= oneWeekAgo);
    if (prevData.length === 0 || currData.length === 0) return undefined;

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const pctChange = (curr: number, prev: number) => prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10;

    const ca = { mem: avg(currData.map(d => d.memoryUsagePercent)), cpu: avg(currData.map(d => d.cpuUsagePercent)), req: avg(currData.map(d => d.requestsPerSecond)), err: avg(currData.map(d => d.errorRate)) };
    const pa = { mem: avg(prevData.map(d => d.memoryUsagePercent)), cpu: avg(prevData.map(d => d.cpuUsagePercent)), req: avg(prevData.map(d => d.requestsPerSecond)), err: avg(prevData.map(d => d.errorRate)) };

    return {
      currentPeriod: { start: oneWeekAgo, end: now, avgMemory: Math.round(ca.mem * 10) / 10, avgCpu: Math.round(ca.cpu * 10) / 10, avgRequests: Math.round(ca.req * 10) / 10, avgErrorRate: Math.round(ca.err * 100) / 100, avgLatency: 0 },
      previousPeriod: { start: twoWeeksAgo, end: oneWeekAgo, avgMemory: Math.round(pa.mem * 10) / 10, avgCpu: Math.round(pa.cpu * 10) / 10, avgRequests: Math.round(pa.req * 10) / 10, avgErrorRate: Math.round(pa.err * 100) / 100, avgLatency: 0 },
      changes: { memory: pctChange(ca.mem, pa.mem), cpu: pctChange(ca.cpu, pa.cpu), requests: pctChange(ca.req, pa.req), errorRate: pctChange(ca.err, pa.err), latency: 0 },
    };
  } catch {
    return undefined;
  }
}

export async function getSystemConfiguration() {
  await requireUser(['super_user']);
  return {
    runtime: { memoryMiB: 2048, cpu: 1, minInstances: 0, maxInstances: 10, concurrency: 80 },
    build: { nodeMemoryMiB: 2048 },
    deployment: { platform: 'Firebase App Hosting', region: 'us-central1', project: 'studio-567050101-bc6e8' },
  };
}

export async function exportMetricsCSV(hoursBack: number = 24): Promise<string> {
  await requireUser(['super_user']);
  let data: Array<{ timestamp: Date; memoryUsagePercent: number; cpuUsagePercent: number; requestsPerSecond: number; errorRate: number }> = [];
  try { data = await getHistoricalMetrics(hoursBack); } catch { /* no data */ }
  if (data.length === 0) return 'timestamp,memoryUsagePercent,cpuUsagePercent,requestsPerSecond,errorRate\nNo data available';
  const header = 'timestamp,memoryUsagePercent,cpuUsagePercent,requestsPerSecond,errorRate';
  const rows = data.map(d => `${new Date(d.timestamp).toISOString()},${d.memoryUsagePercent},${d.cpuUsagePercent},${d.requestsPerSecond},${d.errorRate.toFixed(2)}`);
  return [header, ...rows].join('\n');
}

export async function getAlertThresholdConfig(): Promise<AlertThresholdConfig> {
  await requireUser(['super_user']);
  return getAlertThresholds();
}

export async function updateAlertThresholds(config: {
  memory: { warning: number; critical: number };
  cpu: { warning: number; critical: number };
  latency: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  notifications: { email: boolean; emailRecipients: string[]; dashboard: boolean };
}): Promise<{ success: boolean }> {
  const user = await requireUser(['super_user']);
  await saveAlertThresholds(config, user.uid);
  return { success: true };
}

export async function triggerHealthCheck() {
  await requireUser(['super_user']);
  return getSystemHealth(true);
}
