import { getRecentActivity, getUsageStats, logActivity } from '../activity';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

describe('activity security', () => {
  const add = jest.fn();
  const getUsageDoc = jest.fn();
  const getActivity = jest.fn();

  const activityFeedCollection = {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: getActivity,
    add,
  };

  const usageCollection = {
    doc: jest.fn().mockReturnValue({ get: getUsageDoc }),
  };

  const organizationDoc = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'activity_feed') return activityFeedCollection;
      if (name === 'usage') return usageCollection;
      return {};
    }),
  };

  const firestore = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'organizations') {
        return { doc: jest.fn().mockReturnValue(organizationDoc) };
      }
      return {};
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getActivity.mockResolvedValue({ docs: [] });
    getUsageDoc.mockResolvedValue({ data: () => ({}) });
    add.mockResolvedValue({ id: 'evt-1' });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });
  });

  it('blocks cross-org reads for non-super users', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    await expect(getRecentActivity('org-b')).rejects.toThrow('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users with missing org claim (no bypass)', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    await expect(getUsageStats('org-a')).rejects.toThrow('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('rejects invalid org path segments', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    await expect(getRecentActivity('org/a')).rejects.toThrow('Invalid orgId');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('forces non-super logActivity userId to authenticated uid', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    await logActivity('org-a', 'spoofed-user', 'Pinky', 'note', 'test message');

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-a',
        userId: 'user-1',
        userName: 'Pinky',
        type: 'note',
      }),
    );
  });

  it('allows super users to read/write across orgs', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-x',
    });

    await expect(getRecentActivity('org-y')).resolves.toEqual([]);
    await expect(
      logActivity('org-y', 'delegated-user', 'Pinky', 'note', 'cross-org write')
    ).resolves.toBeUndefined();

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-y',
        userId: 'delegated-user',
      }),
    );
  });
});

