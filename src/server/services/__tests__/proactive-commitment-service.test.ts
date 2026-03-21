import { createServerClient } from '@/firebase/server-client';
import {
  listOpenCommitments,
  PROACTIVE_COMMITMENTS_COLLECTION,
  resolveCommitment,
  upsertCommitment,
} from '../proactive-commitment-service';
import { createFirestoreTestHarness } from './firestore-test-helpers';

jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('proactive-commitment-service', () => {
  let harness: ReturnType<typeof createFirestoreTestHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = createFirestoreTestHarness();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: harness.firestore,
    });
  });

  it('creates a new open commitment and updates the same one on matching upsert', async () => {
    const first = await upsertCommitment({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      commitmentType: 'approval_wait',
      title: 'Wait for approval',
      payload: { approvalId: 'approval-1' },
    });

    const second = await upsertCommitment({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      commitmentType: 'approval_wait',
      title: 'Wait for approval',
      dueAt: new Date('2026-03-21T10:00:00.000Z'),
      payload: { approvalId: 'approval-1', updated: true },
    });

    expect(second.id).toBe(first.id);
    expect(harness.getDocs(PROACTIVE_COMMITMENTS_COLLECTION)).toHaveLength(1);
    expect(harness.getDocs(PROACTIVE_COMMITMENTS_COLLECTION)[0].data.payload).toEqual({
      approvalId: 'approval-1',
      updated: true,
    });
  });

  it('resolves commitments and excludes them from open listings', async () => {
    const openCommitment = await upsertCommitment({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      commitmentType: 'follow_up',
      title: 'Follow up tomorrow',
      payload: { contactId: 'cust-1' },
    });

    await resolveCommitment(openCommitment.id, 'resolved');

    const openCommitments = await listOpenCommitments({
      tenantId: 'tenant-1',
    });

    expect(openCommitments).toHaveLength(0);
  });

  it('filters open commitments by organization and task', async () => {
    await upsertCommitment({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      commitmentType: 'deadline',
      title: 'Compliance deadline',
      dueAt: new Date('2026-03-21T00:00:00.000Z'),
      payload: {},
    });
    await upsertCommitment({
      tenantId: 'tenant-1',
      organizationId: 'org-2',
      taskId: 'task-2',
      commitmentType: 'blocked_issue',
      title: 'Blocked issue',
      payload: {},
    });

    const openCommitments = await listOpenCommitments({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
    });

    expect(openCommitments).toHaveLength(1);
    expect(openCommitments[0].organizationId).toBe('org-1');
    expect(openCommitments[0].taskId).toBe('task-1');
  });
});
