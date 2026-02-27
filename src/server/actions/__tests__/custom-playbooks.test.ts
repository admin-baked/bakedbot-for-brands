import {
  createCustomPlaybook,
  listCustomPlaybooks,
  toggleCustomPlaybookStatus,
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

describe('custom-playbooks action security', () => {
  const mockCollection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
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
      return {};
    });

    const result = await toggleCustomPlaybookStatus('org-a', 'system-pb', true);

    expect(result).toEqual({ success: false, error: 'Cannot modify system playbooks' });
    expect(docRef.update).not.toHaveBeenCalled();
  });
});
