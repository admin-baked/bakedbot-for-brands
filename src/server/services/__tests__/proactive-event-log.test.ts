import { createServerClient } from '@/firebase/server-client';
import {
  appendProactiveEvent,
  listRecentProactiveEvents,
  PROACTIVE_EVENTS_COLLECTION,
} from '../proactive-event-log';
import { createFirestoreTestHarness } from './firestore-test-helpers';

jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('proactive-event-log', () => {
  let harness: ReturnType<typeof createFirestoreTestHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = createFirestoreTestHarness();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: harness.firestore,
    });
  });

  it('appends proactive events and lists them newest-first', async () => {
    const first = await appendProactiveEvent({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      actorType: 'system',
      eventType: 'task.created',
      payload: { step: 1 },
    });

    const second = await appendProactiveEvent({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      actorType: 'agent',
      actorId: 'pops',
      eventType: 'task.triaged',
      payload: { step: 2 },
    });

    const events = await listRecentProactiveEvents({
      tenantId: 'tenant-1',
      taskId: 'task-1',
    });

    expect(events).toHaveLength(2);
    expect(events[0].id).toBe(second.id);
    expect(events[1].id).toBe(first.id);
    expect(harness.getDocs(PROACTIVE_EVENTS_COLLECTION)).toHaveLength(2);
  });

  it('scopes recent event listing by tenant and optional task id', async () => {
    await appendProactiveEvent({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      taskId: 'task-1',
      actorType: 'system',
      eventType: 'task.created',
      payload: {},
    });
    await appendProactiveEvent({
      tenantId: 'tenant-2',
      organizationId: 'org-2',
      taskId: 'task-2',
      actorType: 'system',
      eventType: 'task.created',
      payload: {},
    });

    const tenantOneEvents = await listRecentProactiveEvents({
      tenantId: 'tenant-1',
    });

    expect(tenantOneEvents).toHaveLength(1);
    expect(tenantOneEvents[0].tenantId).toBe('tenant-1');
  });
});
