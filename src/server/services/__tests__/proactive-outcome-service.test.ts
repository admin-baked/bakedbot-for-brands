import { createServerClient } from '@/firebase/server-client';
import {
  PROACTIVE_OUTCOMES_COLLECTION,
  recordProactiveOutcome,
} from '../proactive-outcome-service';
import { createFirestoreTestHarness } from './firestore-test-helpers';

jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('proactive-outcome-service', () => {
  let harness: ReturnType<typeof createFirestoreTestHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = createFirestoreTestHarness();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: harness.firestore,
    });
  });

  it('records proactive outcomes with tenant and workflow linkage', async () => {
    const outcome = await recordProactiveOutcome({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      workflowKey: 'daily_dispensary_health',
      outcomeType: 'opened',
      score: 0.9,
      payload: { source: 'inbox_open' },
    });

    expect(outcome.workflowKey).toBe('daily_dispensary_health');
    expect(outcome.outcomeType).toBe('opened');
    expect(harness.getDocs(PROACTIVE_OUTCOMES_COLLECTION)).toHaveLength(1);
    expect(harness.getDocs(PROACTIVE_OUTCOMES_COLLECTION)[0].data.tenantId).toBe('tenant-1');
  });
});
