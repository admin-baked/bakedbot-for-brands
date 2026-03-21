import { createServerClient } from '@/firebase/server-client';
import {
  attachProactiveTaskEvidence,
  createOrReuseProactiveTask,
  linkTaskToInbox,
  PROACTIVE_TASK_EVIDENCE_COLLECTION,
  PROACTIVE_TASKS_COLLECTION,
  transitionProactiveTask,
} from '../proactive-task-service';
import { createFirestoreTestHarness } from './firestore-test-helpers';

jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('proactive-task-service', () => {
  let harness: ReturnType<typeof createFirestoreTestHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = createFirestoreTestHarness();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: harness.firestore,
    });
  });

  it('creates a new proactive task when no active dedupe match exists', async () => {
    const task = await createOrReuseProactiveTask({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      workflowKey: 'daily_dispensary_health',
      agentKey: 'pops',
      title: 'Margin issue',
      summary: 'Gross margin slipped below target.',
      severity: 'high',
      businessObjectType: 'organization',
      businessObjectId: 'org-1',
      dedupeKey: 'margin_drop:org-1:2026-03-20',
    });

    expect(task.status).toBe('detected');
    expect(task.priority).toBe(50);
    expect(harness.getDocs(PROACTIVE_TASKS_COLLECTION)).toHaveLength(1);
  });

  it('reuses an existing active proactive task for the same dedupe key', async () => {
    const first = await createOrReuseProactiveTask({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      workflowKey: 'daily_dispensary_health',
      agentKey: 'pops',
      title: 'Inventory anomaly',
      summary: 'Inventory moved unexpectedly.',
      severity: 'medium',
      businessObjectType: 'product',
      businessObjectId: 'sku-1',
      dedupeKey: 'inventory_anomaly:sku-1:2026-03-20',
    });

    const second = await createOrReuseProactiveTask({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      workflowKey: 'daily_dispensary_health',
      agentKey: 'pops',
      title: 'Inventory anomaly duplicate',
      summary: 'Should reuse instead of duplicating.',
      severity: 'medium',
      businessObjectType: 'product',
      businessObjectId: 'sku-1',
      dedupeKey: 'inventory_anomaly:sku-1:2026-03-20',
    });

    expect(second.id).toBe(first.id);
    expect(harness.getDocs(PROACTIVE_TASKS_COLLECTION)).toHaveLength(1);
  });

  it('allows valid state transitions and rejects invalid ones', async () => {
    const task = await createOrReuseProactiveTask({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      workflowKey: 'vip_retention_watch',
      agentKey: 'mrs_parker',
      title: 'VIP retention',
      summary: 'High-value customer is at risk.',
      severity: 'high',
      businessObjectType: 'customer',
      businessObjectId: 'cust-1',
      dedupeKey: 'vip_retention:cust-1:2026-W12',
    });

    const triaged = await transitionProactiveTask(task.id, 'triaged');
    const investigating = await transitionProactiveTask(task.id, 'investigating');
    const resolved = await transitionProactiveTask(task.id, 'resolved');

    expect(triaged.status).toBe('triaged');
    expect(investigating.status).toBe('investigating');
    expect(resolved.status).toBe('resolved');

    await expect(transitionProactiveTask(task.id, 'executing')).rejects.toThrow(
      'Invalid proactive task transition: resolved -> executing'
    );
  });

  it('attaches evidence and links inbox refs to an existing task', async () => {
    const task = await createOrReuseProactiveTask({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      workflowKey: 'competitor_pricing_watch',
      agentKey: 'ezal',
      title: 'Competitor move',
      summary: 'Competitor changed price.',
      severity: 'medium',
      businessObjectType: 'competitor_signal',
      businessObjectId: 'signal-1',
      dedupeKey: 'competitor_move:hash-1',
    });

    const evidence = await attachProactiveTaskEvidence(task.id, {
      taskId: task.id,
      tenantId: task.tenantId,
      evidenceType: 'competitor_snapshot',
      refId: 'signal-1',
      payload: { priceDeltaPct: -12 },
    });

    await linkTaskToInbox(task.id, {
      threadId: 'thread-1',
      artifactId: 'artifact-1',
      approvalId: 'approval-1',
      workflowExecutionId: 'exec-1',
    });

    const [storedTask] = harness.getDocs(PROACTIVE_TASKS_COLLECTION);
    expect(evidence.evidenceType).toBe('competitor_snapshot');
    expect(harness.getDocs(PROACTIVE_TASK_EVIDENCE_COLLECTION)).toHaveLength(1);
    expect(storedTask.data.threadId).toBe('thread-1');
    expect(storedTask.data.artifactId).toBe('artifact-1');
    expect(storedTask.data.approvalId).toBe('approval-1');
    expect(storedTask.data.workflowExecutionId).toBe('exec-1');
  });
});
