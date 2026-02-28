import { getMediaBudget, updateMediaBudget, updateMediaCostAlert } from '../media-budget';
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

describe('media-budget security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from cross-tenant budget reads', async () => {
    await expect(getMediaBudget('org-b')).rejects.toThrow('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from cross-tenant budget writes', async () => {
    const result = await updateMediaBudget('org-b', { dailyLimitUsd: 100 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('allows same-org access via currentOrgId claim', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const get = jest.fn().mockResolvedValue({ exists: false });
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({ get }),
          }),
        }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    const result = await getMediaBudget('org-a');
    expect(result).toBeNull();
  });

  it('allows super users cross-tenant writes', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });

    const set = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockResolvedValue({ exists: false });
    const docRef = { set, get };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(docRef),
          }),
        }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    const result = await updateMediaBudget('org-b', { dailyLimitUsd: 200 });

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'org-b' }),
      { merge: true },
    );
  });

  it('rejects invalid tenant ids before reading firestore', async () => {
    await expect(getMediaBudget('bad/id')).rejects.toThrow('Invalid tenant ID');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('rejects invalid alert ids before updating cost alerts', async () => {
    const result = await updateMediaCostAlert('org-a', 'bad/id', { enabled: false } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid alert ID');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });
});
