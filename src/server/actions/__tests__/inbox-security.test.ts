import { createInboxThread } from '../inbox';
import { getServerSessionUser } from '@/server/auth/session';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/session', () => ({
  getServerSessionUser: jest.fn(),
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

describe('inbox security', () => {
  const set = jest.fn().mockResolvedValue(undefined);
  const doc = jest.fn().mockImplementation(() => ({ set }));
  const collection = jest.fn().mockImplementation(() => ({ doc }));

  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({ collection });
  });

  it('rejects thread creation when org context is missing', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await createInboxThread({
      type: 'campaign',
      title: 'Test',
    });

    expect(result).toEqual({
      success: false,
      error: 'Missing organization context',
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it('rejects invalid requested org ids', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await createInboxThread({
      type: 'campaign',
      brandId: 'bad/org',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid organization context',
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it('uses currentOrgId for non-super users and blocks cross-org overrides', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
    });

    const blocked = await createInboxThread({
      type: 'campaign',
      brandId: 'org-other',
    });
    expect(blocked).toEqual({
      success: false,
      error: 'Unauthorized org context',
    });

    const allowed = await createInboxThread({
      type: 'campaign',
      title: 'Allowed',
    });
    expect(allowed.success).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-current',
      })
    );
  });
});
