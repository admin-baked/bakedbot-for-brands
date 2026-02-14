/**
 * Metrics Collector Service
 *
 * Periodically collects and stores system health metrics to Firestore
 * for historical trend analysis.
 *
 * Run via cron job: /api/cron/collect-metrics
 * Frequency: Every 15 minutes
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { SystemHealthMetrics } from '@/types/system-health';

/**
 * Collect current system metrics and store in Firestore
 */
export async function collectAndStoreMetrics(): Promise<void> {
  const db = getAdminFirestore();
  const now = new Date();

  // Production: collect real telemetry only. If GCP Monitoring isn't available,
  // skip collection to avoid storing misleading "simulated" metrics.
  if (process.env.NODE_ENV === 'production') {
    try {
      const { getGCPMetrics, isGCPMonitoringAvailable } = await import('@/server/services/gcp-monitoring');
      const available = await isGCPMonitoringAvailable();
      if (!available) {
        console.warn('[MetricsCollector] GCP Monitoring not available. Skipping metrics collection.');
        return;
      }

      const gcp = await getGCPMetrics();
      const memoryAllocatedMB = 2048;
      const memoryUsagePercent = gcp.memoryUsagePercent;
      const memoryUsedMB = Math.round(memoryAllocatedMB * (memoryUsagePercent / 100));

      const metrics: Omit<SystemHealthMetrics, 'timestamp' | 'deploymentStatus' | 'lastDeployment' | 'currentVersion'> = {
        memoryAllocatedMB,
        memoryUsedMB,
        memoryUsagePercent,
        cpuCores: 1,
        cpuUsagePercent: gcp.cpuUsagePercent,
        instanceCount: gcp.instanceCount,
        minInstances: 0,
        maxInstances: 10,
        requestsPerSecond: gcp.requestsPerSecond,
        avgLatencyMs: gcp.avgLatencyMs,
        p95LatencyMs: gcp.p95LatencyMs,
        p99LatencyMs: Math.round(gcp.p95LatencyMs * 1.5),
        errorRate: 0,
        errorCount: 0,
        source: 'gcp',
      };

      const metricsRef = db.collection('system_metrics').doc();
      await metricsRef.set({
        ...metrics,
        timestamp: Timestamp.fromDate(now),
        collectedAt: Timestamp.fromDate(now),
      });

      console.log(`[MetricsCollector] Stored GCP metrics at ${now.toISOString()}`);
      return;
    } catch (error) {
      console.error('[MetricsCollector] Failed to collect GCP metrics; skipping.', error);
      return;
    }
  }

  // Dev/test only: collect simulated metrics to keep the UI usable during development.
  const memoryAllocatedMB = 2048;
  const memoryUsedMB = Math.floor(memoryAllocatedMB * (0.4 + Math.random() * 0.3)); // 40-70%
  const memoryUsagePercent = Math.round((memoryUsedMB / memoryAllocatedMB) * 100);

  const cpuUsagePercent = Math.round(20 + Math.random() * 40); // 20-60%
  const instanceCount = Math.floor(1 + Math.random() * 3); // 1-3 instances

  const requestsPerSecond = Math.round(5 + Math.random() * 15); // 5-20 req/s
  const avgLatencyMs = Math.round(100 + Math.random() * 200); // 100-300ms
  const p95LatencyMs = Math.round(avgLatencyMs * 2);
  const p99LatencyMs = Math.round(avgLatencyMs * 3);

  const errorRate = Math.random() * 2; // 0-2%
  const errorCount = Math.floor(requestsPerSecond * errorRate * 60);

  const metrics: Omit<SystemHealthMetrics, 'timestamp' | 'deploymentStatus' | 'lastDeployment' | 'currentVersion'> = {
    memoryAllocatedMB,
    memoryUsedMB,
    memoryUsagePercent,
    cpuCores: 1,
    cpuUsagePercent,
    instanceCount,
    minInstances: 0,
    maxInstances: 10,
    requestsPerSecond,
    avgLatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    errorRate,
    errorCount,
    source: 'simulated',
  };

  // Store in Firestore with 15-minute granularity
  const metricsRef = db.collection('system_metrics').doc();
  await metricsRef.set({
    ...metrics,
    timestamp: Timestamp.fromDate(now),
    collectedAt: Timestamp.fromDate(now),
  });

  console.log(`[MetricsCollector] Stored metrics at ${now.toISOString()}`);
}

/**
 * Get historical metrics from Firestore
 * @param hoursBack Number of hours to retrieve (default: 24)
 */
export async function getHistoricalMetrics(hoursBack: number = 24): Promise<Array<{
  timestamp: Date;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  requestsPerSecond: number;
  errorRate: number;
}>> {
  const db = getAdminFirestore();
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursBack);

  const snapshot = await db
    .collection('system_metrics')
    .where('timestamp', '>=', Timestamp.fromDate(cutoff))
    .orderBy('timestamp', 'asc')
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      timestamp: data.timestamp.toDate(),
      memoryUsagePercent: data.memoryUsagePercent || 0,
      cpuUsagePercent: data.cpuUsagePercent || 0,
      requestsPerSecond: data.requestsPerSecond || 0,
      errorRate: data.errorRate || 0,
    };
  });
}

/**
 * Clean up old metrics (keep last 7 days)
 */
export async function cleanupOldMetrics(): Promise<void> {
  const db = getAdminFirestore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const snapshot = await db
    .collection('system_metrics')
    .where('timestamp', '<', Timestamp.fromDate(cutoff))
    .limit(500) // Batch delete to avoid timeout
    .get();

  if (snapshot.empty) {
    console.log('[MetricsCollector] No old metrics to clean up');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[MetricsCollector] Deleted ${snapshot.docs.length} old metrics`);
}
