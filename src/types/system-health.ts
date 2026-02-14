/**
 * System Health Monitoring Types
 *
 * Types for tracking Firebase App Hosting runtime metrics:
 * - Memory usage, CPU utilization
 * - Instance count, Request latency, Error rates
 * - Custom alert thresholds, comparison mode, export
 */

export interface SystemHealthMetrics {
  timestamp: Date;

  // Memory
  memoryAllocatedMB: number;
  memoryUsedMB: number | null;
  memoryUsagePercent: number | null;

  // CPU
  cpuCores: number;
  cpuUsagePercent: number | null;

  // Instances
  instanceCount: number | null;
  minInstances: number;
  maxInstances: number;

  // Requests
  requestsPerSecond: number | null;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;

  // Errors
  errorRate: number | null; // Percentage
  errorCount: number | null;

  // Deployment
  deploymentStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastDeployment: Date | null;
  currentVersion: string | null;

  // Data source
  source: 'gcp' | 'simulated' | 'not_instrumented';
}

export interface SystemHealthTimeseries {
  timestamp: Date;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface SystemHealthSummary {
  current: SystemHealthMetrics;
  timeseries: SystemHealthTimeseries[];
  alerts: SystemHealthAlert[];
  comparison?: SystemHealthComparison;
}

export interface SystemHealthAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'memory' | 'cpu' | 'latency' | 'errors' | 'deployment';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

// Comparison mode: current period vs previous period
export interface SystemHealthComparison {
  currentPeriod: {
    start: Date;
    end: Date;
    avgMemory: number;
    avgCpu: number;
    avgRequests: number;
    avgErrorRate: number;
    avgLatency: number;
  };
  previousPeriod: {
    start: Date;
    end: Date;
    avgMemory: number;
    avgCpu: number;
    avgRequests: number;
    avgErrorRate: number;
    avgLatency: number;
  };
  changes: {
    memory: number;   // +/- percentage change
    cpu: number;
    requests: number;
    errorRate: number;
    latency: number;
  };
}

// Custom alert threshold configuration (stored in Firestore)
export interface AlertThresholdConfig {
  memory: { warning: number; critical: number };
  cpu: { warning: number; critical: number };
  latency: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  notifications: {
    email: boolean;
    emailRecipients: string[];
    dashboard: boolean;
  };
  updatedAt: Date;
  updatedBy: string;
}

// Default thresholds
export const HEALTH_THRESHOLDS = {
  memory: {
    warning: 70, // %
    critical: 85, // %
  },
  cpu: {
    warning: 60, // %
    critical: 80, // %
  },
  latency: {
    warning: 1000, // ms (p95)
    critical: 3000, // ms (p95)
  },
  errorRate: {
    warning: 1, // %
    critical: 5, // %
  },
} as const;

// CSV export row
export interface MetricsExportRow {
  timestamp: string;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  requestsPerSecond: number;
  errorRate: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  instanceCount?: number;
}
