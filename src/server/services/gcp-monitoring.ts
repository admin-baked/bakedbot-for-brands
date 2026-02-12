/**
 * Google Cloud Monitoring API Integration
 *
 * Fetches real-time metrics from Firebase App Hosting (Cloud Run):
 * - Memory usage (run.googleapis.com/container/memory/utilizations)
 * - CPU utilization (run.googleapis.com/container/cpu/utilizations)
 * - Request count (run.googleapis.com/request_count)
 * - Request latency (run.googleapis.com/request_latencies)
 * - Instance count (run.googleapis.com/container/instance_count)
 *
 * References:
 * - https://cloud.google.com/monitoring/api/metrics_gcp#gcp-run
 * - https://cloud.google.com/monitoring/api/v3
 */

import { MetricServiceClient } from '@google-cloud/monitoring';

const PROJECT_ID = 'studio-567050101-bc6e8';

// Cloud Run metric types for Firebase App Hosting
const METRICS = {
  memoryUtilization: 'run.googleapis.com/container/memory/utilizations',
  cpuUtilization: 'run.googleapis.com/container/cpu/utilizations',
  requestCount: 'run.googleapis.com/request_count',
  requestLatencies: 'run.googleapis.com/request_latencies',
  instanceCount: 'run.googleapis.com/container/instance_count',
} as const;

let client: MetricServiceClient | null = null;

function getClient(): MetricServiceClient {
  if (!client) {
    client = new MetricServiceClient();
  }
  return client;
}

interface GCPMetricResult {
  value: number;
  timestamp: Date;
}

/**
 * Query a single metric from GCP Monitoring
 */
async function queryMetric(
  metricType: string,
  minutesBack: number = 5,
  aggregationSeconds: number = 300,
): Promise<GCPMetricResult[]> {
  const monitoringClient = getClient();
  const projectName = `projects/${PROJECT_ID}`;

  const now = new Date();
  const startTime = new Date(now.getTime() - minutesBack * 60 * 1000);

  const [timeSeries] = await monitoringClient.listTimeSeries({
    name: projectName,
    filter: `metric.type = "${metricType}"`,
    interval: {
      startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
      endTime: { seconds: Math.floor(now.getTime() / 1000) },
    },
    aggregation: {
      alignmentPeriod: { seconds: aggregationSeconds },
      perSeriesAligner: 'ALIGN_MEAN',
      crossSeriesReducer: 'REDUCE_MEAN',
    },
  });

  const results: GCPMetricResult[] = [];

  for (const series of timeSeries) {
    for (const point of series.points || []) {
      const value = point.value?.doubleValue ?? point.value?.int64Value ?? 0;
      const timestamp = new Date(
        Number(point.interval?.endTime?.seconds || 0) * 1000
      );
      results.push({ value: Number(value), timestamp });
    }
  }

  return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Get current system metrics from GCP Cloud Monitoring
 */
export async function getGCPMetrics(): Promise<{
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  instanceCount: number;
}> {
  try {
    const [memory, cpu, requests, latency, instances] = await Promise.all([
      queryMetric(METRICS.memoryUtilization, 5).catch(() => []),
      queryMetric(METRICS.cpuUtilization, 5).catch(() => []),
      queryMetric(METRICS.requestCount, 5).catch(() => []),
      queryMetric(METRICS.requestLatencies, 5).catch(() => []),
      queryMetric(METRICS.instanceCount, 5).catch(() => []),
    ]);

    const latestMemory = memory.length > 0 ? memory[memory.length - 1].value * 100 : 0;
    const latestCpu = cpu.length > 0 ? cpu[cpu.length - 1].value * 100 : 0;
    const latestRequests = requests.length > 0 ? requests[requests.length - 1].value / 300 : 0; // Per 5min interval -> per second
    const latestLatency = latency.length > 0 ? latency[latency.length - 1].value : 0;
    const latestInstances = instances.length > 0 ? instances[instances.length - 1].value : 0;

    return {
      memoryUsagePercent: Math.round(latestMemory * 10) / 10,
      cpuUsagePercent: Math.round(latestCpu * 10) / 10,
      requestsPerSecond: Math.round(latestRequests * 10) / 10,
      avgLatencyMs: Math.round(latestLatency),
      p95LatencyMs: Math.round(latestLatency * 2), // Estimate: real p95 requires distribution metric
      instanceCount: Math.round(latestInstances),
    };
  } catch (error) {
    console.error('[GCPMonitoring] Failed to fetch metrics:', error);
    throw error;
  }
}

/**
 * Get historical timeseries from GCP for charts
 */
export async function getGCPTimeseries(hoursBack: number = 24): Promise<Array<{
  timestamp: Date;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  requestsPerSecond: number;
  errorRate: number;
}>> {
  try {
    const minutesBack = hoursBack * 60;
    const alignmentSeconds = hoursBack <= 24 ? 900 : 3600; // 15min or 1hr alignment

    const [memory, cpu, requests] = await Promise.all([
      queryMetric(METRICS.memoryUtilization, minutesBack, alignmentSeconds).catch(() => []),
      queryMetric(METRICS.cpuUtilization, minutesBack, alignmentSeconds).catch(() => []),
      queryMetric(METRICS.requestCount, minutesBack, alignmentSeconds).catch(() => []),
    ]);

    // Merge timeseries by timestamp (closest match)
    const timestamps = new Set<number>();
    [...memory, ...cpu, ...requests].forEach(m => {
      timestamps.add(Math.floor(m.timestamp.getTime() / (alignmentSeconds * 1000)) * (alignmentSeconds * 1000));
    });

    const sortedTimestamps = Array.from(timestamps).sort();

    return sortedTimestamps.map(ts => {
      const findClosest = (arr: GCPMetricResult[]) => {
        const closest = arr.reduce((prev, curr) =>
          Math.abs(curr.timestamp.getTime() - ts) < Math.abs(prev.timestamp.getTime() - ts)
            ? curr : prev
        , arr[0]);
        return closest?.value ?? 0;
      };

      return {
        timestamp: new Date(ts),
        memoryUsagePercent: memory.length > 0 ? Math.round(findClosest(memory) * 1000) / 10 : 0,
        cpuUsagePercent: cpu.length > 0 ? Math.round(findClosest(cpu) * 1000) / 10 : 0,
        requestsPerSecond: requests.length > 0 ? Math.round(findClosest(requests) / alignmentSeconds * 10) / 10 : 0,
        errorRate: 0, // Would need error-specific metric filter
      };
    });
  } catch (error) {
    console.error('[GCPMonitoring] Failed to fetch timeseries:', error);
    throw error;
  }
}

/**
 * Check if GCP Monitoring is available (credentials + API enabled)
 */
export async function isGCPMonitoringAvailable(): Promise<boolean> {
  try {
    const monitoringClient = getClient();
    // Quick check: list a single metric descriptor
    const [descriptors] = await monitoringClient.listMetricDescriptors({
      name: `projects/${PROJECT_ID}`,
      filter: `metric.type = "${METRICS.instanceCount}"`,
      pageSize: 1,
    });
    return descriptors.length > 0;
  } catch {
    return false;
  }
}
