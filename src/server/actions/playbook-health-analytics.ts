'use server';

/**
 * Playbook Health Analytics Server Action
 *
 * Advanced metrics for operational monitoring:
 * - Failure rates and retry statistics
 * - Agent performance (Craig, Mrs. Parker, etc.)
 * - Customer journey analytics
 * - Dead Letter Queue monitoring
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface AgentPerformance {
  agent: string;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecutedAt: Date | null;
}

export interface PlaybookHealth {
  playbookId: string;
  playbookName: string;
  failureRate: number;
  retryRate: number;
  dlqCount: number;
  averageRetries: number;
  lastFailureAt: Date | null;
}

export interface CustomerJourney {
  eventName: string;
  totalEvents: number;
  conversionsToOrder: number;
  conversionRate: number;
  averageDaysToOrder: number;
  averageOrderValue: number;
}

export interface PlaybookHealthData {
  period: { startDate: Date; endDate: Date };
  agentPerformance: AgentPerformance[];
  playbookHealth: PlaybookHealth[];
  customerJourneys: CustomerJourney[];
  retryStats: {
    totalPending: number;
    totalRetrying: number;
    totalFailed: number;
    dlqCount: number;
  };
}

/**
 * Get agent performance metrics
 */
async function getAgentPerformance(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<AgentPerformance[]> {
  const { firestore } = await createServerClient();

  const agentMap = new Map<string, AgentPerformance>();

  // Query execution logs for agent metrics
  const execSnap = await firestore
    .collection('playbook_executions')
    .where('orgId', '==', orgId)
    .where('startedAt', '>=', startDate)
    .where('startedAt', '<=', endDate)
    .get();

  for (const doc of execSnap.docs) {
    const exec = doc.data();
    const steps = exec.steps || [];

    for (const step of steps) {
      const agent = step.agent || 'unknown';

      if (!agentMap.has(agent)) {
        agentMap.set(agent, {
          agent,
          totalActions: 0,
          successfulActions: 0,
          failedActions: 0,
          successRate: 0,
          averageExecutionTime: 0,
          lastExecutedAt: null,
        });
      }

      const perf = agentMap.get(agent)!;
      perf.totalActions++;

      if (step.status === 'success' || step.status === 'completed') {
        perf.successfulActions++;
      } else if (step.status === 'failed' || step.status === 'error') {
        perf.failedActions++;
      }

      if (step.duration) {
        perf.averageExecutionTime =
          (perf.averageExecutionTime * (perf.totalActions - 1) + step.duration) /
          perf.totalActions;
      }

      if (step.completedAt) {
        perf.lastExecutedAt = new Date(step.completedAt);
      }

      perf.successRate =
        perf.totalActions > 0 ? (perf.successfulActions / perf.totalActions) * 100 : 0;
    }
  }

  return Array.from(agentMap.values());
}

/**
 * Get playbook health metrics
 */
async function getPlaybookHealth(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<PlaybookHealth[]> {
  const { firestore } = await createServerClient();

  const healthMap = new Map<string, PlaybookHealth>();

  // Get execution data
  const execSnap = await firestore
    .collection('playbook_executions')
    .where('orgId', '==', orgId)
    .where('startedAt', '>=', startDate)
    .where('startedAt', '<=', endDate)
    .get();

  for (const doc of execSnap.docs) {
    const exec = doc.data();
    const pbId = exec.playbookId;
    const pbName = exec.playbookName || 'Unknown';

    if (!healthMap.has(pbId)) {
      healthMap.set(pbId, {
        playbookId: pbId,
        playbookName: pbName,
        failureRate: 0,
        retryRate: 0,
        dlqCount: 0,
        averageRetries: 0,
        lastFailureAt: null,
      });
    }

    const health = healthMap.get(pbId)!;

    // Count failures and retries
    if (exec.status === 'failed' || exec.status === 'error') {
      health.failureRate++;
      health.lastFailureAt = new Date(exec.startedAt);
    }

    if (exec.retryCount) {
      health.retryRate++;
      health.averageRetries += exec.retryCount;
    }
  }

  // Get DLQ count per playbook
  const dlqSnap = await firestore
    .collection('playbook_dead_letter_queue')
    .where('orgId', '==', orgId)
    .get();

  for (const doc of dlqSnap.docs) {
    const dlqEvent = doc.data();
    const pbId = dlqEvent.playbookId;

    if (healthMap.has(pbId)) {
      const health = healthMap.get(pbId)!;
      health.dlqCount++;
    }
  }

  // Normalize rates
  for (const health of healthMap.values()) {
    health.failureRate = execSnap.size > 0 ? (health.failureRate / execSnap.size) * 100 : 0;
    health.retryRate =
      health.failureRate > 0 ? (health.retryRate / (health.failureRate + 1)) * 100 : 0;
    health.averageRetries =
      health.retryRate > 0
        ? health.averageRetries / (execSnap.size * 0.01 * health.retryRate + 1)
        : 0;
  }

  return Array.from(healthMap.values());
}

/**
 * Get customer journey analytics
 */
async function getCustomerJourneys(
  orgId: string,
  startDate: Date
): Promise<CustomerJourney[]> {
  const { firestore } = await createServerClient();

  const journeyMap = new Map<string, CustomerJourney>();

  // Get all playbook executions
  const execSnap = await firestore
    .collection('playbook_executions')
    .where('orgId', '==', orgId)
    .where('startedAt', '>=', startDate)
    .get();

  const customerOrderMap = new Map<string, { date: Date; total: number }>();

  // Query orders to correlate with executions
  const orderSnap = await firestore
    .collection('orders')
    .where('orgId', '==', orgId)
    .where('createdAt', '>=', startDate)
    .get();

  // Build customer → order mapping
  for (const doc of orderSnap.docs) {
    const order = doc.data();
    const customerId = order.customerId;
    const orderDate = new Date(order.createdAt);
    const total = order.total || 0;

    if (!customerOrderMap.has(customerId)) {
      customerOrderMap.set(customerId, { date: orderDate, total });
    }
  }

  // Correlate executions with orders
  for (const doc of execSnap.docs) {
    const exec = doc.data();
    const eventName = exec.eventData?.event || 'unknown';
    const customerId = exec.customerId;
    const execDate = new Date(exec.startedAt);

    if (!journeyMap.has(eventName)) {
      journeyMap.set(eventName, {
        eventName,
        totalEvents: 0,
        conversionsToOrder: 0,
        conversionRate: 0,
        averageDaysToOrder: 0,
        averageOrderValue: 0,
      });
    }

    const journey = journeyMap.get(eventName)!;
    journey.totalEvents++;

    // Check if customer ordered within 7 days
    if (customerId && customerOrderMap.has(customerId)) {
      const order = customerOrderMap.get(customerId)!;
      const daysToOrder = Math.ceil(
        (order.date.getTime() - execDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysToOrder >= 0 && daysToOrder <= 7) {
        journey.conversionsToOrder++;
        journey.averageDaysToOrder +=
          (journey.averageDaysToOrder * (journey.conversionsToOrder - 1) + daysToOrder) /
          journey.conversionsToOrder;
        journey.averageOrderValue +=
          (journey.averageOrderValue *
            (journey.conversionsToOrder - 1) +
            order.total) /
          journey.conversionsToOrder;
      }
    }

    journey.conversionRate =
      journey.totalEvents > 0 ? (journey.conversionsToOrder / journey.totalEvents) * 100 : 0;
  }

  return Array.from(journeyMap.values()).sort(
    (a, b) => b.conversionsToOrder - a.conversionsToOrder
  );
}

/**
 * Get retry statistics
 */
async function getRetryStats(orgId: string): Promise<{
  totalPending: number;
  totalRetrying: number;
  totalFailed: number;
  dlqCount: number;
}> {
  const { firestore } = await createServerClient();

  const [pendingSnap, retryingSnap, failedSnap, dlqSnap] = await Promise.all([
    firestore
      .collection('playbook_execution_retries')
      .where('orgId', '==', orgId)
      .where('status', '==', 'pending')
      .get(),
    firestore
      .collection('playbook_execution_retries')
      .where('orgId', '==', orgId)
      .where('status', '==', 'retrying')
      .get(),
    firestore
      .collection('playbook_execution_retries')
      .where('orgId', '==', orgId)
      .where('status', '==', 'failed')
      .get(),
    firestore
      .collection('playbook_dead_letter_queue')
      .where('orgId', '==', orgId)
      .get(),
  ]);

  return {
    totalPending: pendingSnap.size,
    totalRetrying: retryingSnap.size,
    totalFailed: failedSnap.size,
    dlqCount: dlqSnap.size,
  };
}

/**
 * Get complete playbook health analytics
 */
export async function getPlaybookHealthAnalytics(
  orgId: string,
  days: number = 30
): Promise<PlaybookHealthData | { error: string }> {
  try {
    const user = await requireUser();

    if (!user || !user.uid) {
      throw new Error('Not authenticated');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.info('[PlaybookHealthAnalytics] Fetching health analytics', {
      orgId,
      period: { startDate, endDate },
    });

    // Fetch all metrics in parallel
    const [agentPerformance, playbookHealth, customerJourneys, retryStats] = await Promise.all([
      getAgentPerformance(orgId, startDate, endDate),
      getPlaybookHealth(orgId, startDate, endDate),
      getCustomerJourneys(orgId, startDate),
      getRetryStats(orgId),
    ]);

    return {
      period: { startDate, endDate },
      agentPerformance,
      playbookHealth,
      customerJourneys,
      retryStats,
    };
  } catch (err) {
    logger.error('[PlaybookHealthAnalytics] Error fetching health analytics', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
