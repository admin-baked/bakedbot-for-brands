import {
  createCustomPlaybook,
  listCustomPlaybooks,
  toggleCustomPlaybookStatus,
  updateCustomPlaybook,
} from '../custom-playbooks';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/server/playbooks/scheduler', () => ({
  computeNextRunAt: jest.fn(() => new Date('2026-01-01T14:00:00.000Z')),
}));

describe('custom-playbooks action security', () => {
  const mockCollection = jest.fn();
  const mockBatchSet = jest.fn();
  const mockBatchUpdate = jest.fn();
  const mockBatchCommit = jest.fn();

  function emptyAssignmentQuery() {
    return {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
  }

  function activeSubscriptionQuery(subscriptionId = 'sub-org-a') {
    return {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ id: subscriptionId }],
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
      batch: () => ({
        set: mockBatchSet,
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }),
    });
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('denies listing custom playbooks for a different org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await listCustomPlaybooks('org-b');

    expect(result).toEqual({ success: false, error: 'Not authorized' });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('denies creating custom playbooks for a different org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await createCustomPlaybook('org-b', {
      name: 'Cross-org create',
      description: 'Should fail',
      agent: 'craig',
      category: 'marketing',
      triggers: [{ type: 'manual' }],
    });

    expect(result).toEqual({ success: false, error: 'Not authorized' });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('allows super users to list custom playbooks for another org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const query = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'pb-1',
            data: () => ({
              name: 'Global Support Playbook',
              status: 'active',
              isCustom: true,
            }),
          },
        ],
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') return query;
      return {};
    });

    const result = await listCustomPlaybooks('org-b');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.playbooks).toHaveLength(1);
      expect(result.playbooks[0].id).toBe('pb-1');
    }
    expect(mockCollection).toHaveBeenCalledWith('playbooks');
  });

  it('allows super_admin users to list custom playbooks for another org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const query = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'pb-2',
            data: () => ({
              name: 'Super Admin Playbook',
              status: 'active',
              isCustom: true,
            }),
          },
        ],
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') return query;
      return {};
    });

    const result = await listCustomPlaybooks('org-b');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.playbooks).toHaveLength(1);
      expect(result.playbooks[0].id).toBe('pb-2');
    }
    expect(mockCollection).toHaveBeenCalledWith('playbooks');
  });

  it('refuses toggling system playbooks through custom playbook action', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const docRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          orgId: 'org-a',
          isCustom: false,
        }),
      }),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      if (name === 'playbook_assignments') return emptyAssignmentQuery();
      return {};
    });

    const result = await toggleCustomPlaybookStatus('org-a', 'system-pb', true);

    expect(result).toEqual({ success: false, error: 'Cannot modify system playbooks' });
    expect(docRef.update).not.toHaveBeenCalled();
  });

  it('rejects creating custom playbooks with blank names', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await createCustomPlaybook('org-a', {
      name: '   ',
      description: 'Should fail',
      agent: 'craig',
      category: 'marketing',
      triggers: [{ type: 'manual' }],
    });

    expect(result).toEqual({ success: false, error: 'Playbook name is required.' });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('rejects creating custom playbooks with invalid schedule cron', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await createCustomPlaybook('org-a', {
      name: 'Morning report',
      description: 'Should fail',
      agent: 'craig',
      category: 'marketing',
      triggers: [{ type: 'schedule', cron: '0 9 * *' } as any],
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid schedule trigger. Use 5-field cron syntax.',
    });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('rejects creating custom playbooks with empty event names', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await createCustomPlaybook('org-a', {
      name: 'Event watcher',
      description: 'Should fail',
      agent: 'craig',
      category: 'marketing',
      triggers: [{ type: 'event', eventName: '   ' } as any],
    });

    expect(result).toEqual({
      success: false,
      error: 'Event triggers require an eventName.',
    });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('normalizes create input and defaults schedule timezone', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const set = jest.fn().mockResolvedValue(undefined);
    const docRef = { id: 'pb-1', set };
    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      if (name === 'playbook_assignments') return emptyAssignmentQuery();
      return {};
    });

    const result = await createCustomPlaybook('org-a', {
      name: '  Morning report  ',
      description: '  Daily summary  ',
      agent: 'craig',
      category: 'marketing',
      triggers: [{ type: 'schedule', cron: '0 9 * * *' } as any],
    });

    expect(result).toEqual({ success: true, playbookId: 'pb-1' });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Morning report',
        description: 'Daily summary',
        triggers: [{ type: 'schedule', cron: '0 9 * * *', timezone: 'America/New_York' }],
      }),
    );
  });

  it('blocks non-owners from toggling custom playbook status', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-2',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const docRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          orgId: 'org-a',
          isCustom: true,
          ownerId: 'user-1',
        }),
      }),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      if (name === 'playbook_assignments') return emptyAssignmentQuery();
      return {};
    });

    const result = await toggleCustomPlaybookStatus('org-a', 'custom-pb', true);

    expect(result).toEqual({ success: false, error: 'Only the owner can modify this playbook' });
    expect(docRef.update).not.toHaveBeenCalled();
  });

  it('allows super users to toggle custom playbook status they do not own', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-z',
      orgId: 'org-z',
    });

    const docRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          orgId: 'org-a',
          isCustom: true,
          ownerId: 'user-1',
        }),
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      if (name === 'playbook_assignments') return emptyAssignmentQuery();
      return {};
    });

    const result = await toggleCustomPlaybookStatus('org-a', 'custom-pb', true);

    expect(result).toEqual({ success: true });
    expect(docRef.update).toHaveBeenCalledWith({
      status: 'active',
      updatedAt: expect.any(Date),
    });
  });

  it('creates a dispatcher assignment when a scheduled custom playbook is activated', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const docRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'custom-pb',
          name: 'Weekly campaign report',
          description: 'Summarize campaign activity',
          orgId: 'org-a',
          isCustom: true,
          ownerId: 'user-1',
          agent: 'craig',
          category: 'marketing',
          triggers: [{ type: 'schedule', cron: '0 10 * * 2', timezone: 'America/New_York' }],
          steps: [],
          createdBy: 'user-1',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          version: 1,
        }),
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const assignmentDoc = jest.fn(() => ({ id: 'assignment-1' }));

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      if (name === 'playbook_assignments') {
        const query = emptyAssignmentQuery();
        return {
          ...query,
          doc: assignmentDoc,
        };
      }
      if (name === 'subscriptions') return activeSubscriptionQuery('sub-org-a');
      return {};
    });

    const result = await toggleCustomPlaybookStatus('org-a', 'custom-pb', true);

    expect(result).toEqual({ success: true });
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'assignment-1' }),
      expect.objectContaining({
        orgId: 'org-a',
        subscriptionId: 'sub-org-a',
        playbookId: 'custom-pb',
        status: 'active',
        handler: 'custom-report',
        schedule: '0 10 * * 2',
        config: expect.objectContaining({
          customPlaybookId: 'custom-pb',
          prompt: 'Weekly campaign report: Summarize campaign activity',
        }),
      }),
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('rejects updates with blank names', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const docRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          orgId: 'org-a',
          isCustom: true,
          ownerId: 'user-1',
        }),
      }),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      return {};
    });

    const result = await updateCustomPlaybook('org-a', 'custom-pb', { name: '   ' });

    expect(result).toEqual({ success: false, error: 'Playbook name is required.' });
    expect(docRef.update).not.toHaveBeenCalled();
  });

  it('rejects updates with invalid schedule trigger cron syntax', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const docRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          orgId: 'org-a',
          isCustom: true,
          ownerId: 'user-1',
        }),
      }),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => docRef),
        };
      }
      return {};
    });

    const result = await updateCustomPlaybook('org-a', 'custom-pb', {
      triggers: [{ type: 'schedule', cron: '0 9 * *' } as any],
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid schedule trigger. Use 5-field cron syntax.',
    });
    expect(docRef.update).not.toHaveBeenCalled();
  });

  it('rejects invalid organization ids before querying firestore', async () => {
    const result = await listCustomPlaybooks('bad/id');

    expect(result).toEqual({ success: false, error: 'Invalid organization ID' });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('rejects invalid playbook ids before status toggle', async () => {
    const result = await toggleCustomPlaybookStatus('org-a', 'bad/id', true);

    expect(result).toEqual({ success: false, error: 'Invalid playbook ID' });
    expect(mockCollection).not.toHaveBeenCalled();
  });
});
