import { getStylePresets, trackPresetUsage, updateMediaABTestResult } from '../style-presets';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/style-presets', () => ({
  getBuiltInPresets: jest.fn(() => []),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('style-presets security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from reading style presets for another tenant', async () => {
    await expect(getStylePresets('org-b')).rejects.toThrow('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from tracking usage for another tenant', async () => {
    await trackPresetUsage('org-b', 'preset-1');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('allows same-org users via currentOrgId claims', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const get = jest.fn().mockResolvedValue({ docs: [] });
    const chain = {
      orderBy: jest.fn().mockReturnThis(),
      get,
    };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue(chain),
        }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    const presets = await getStylePresets('org-a');

    expect(Array.isArray(presets)).toBe(true);
    expect(get).toHaveBeenCalled();
  });

  it('allows super users to track usage for any tenant', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-x',
    });

    const update = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ usageCount: 4 }),
    });
    const presetRef = { get, update };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(presetRef),
          }),
        }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    await trackPresetUsage('org-b', 'preset-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ usageCount: 5 }),
    );
  });

  it('rejects invalid tenant ids before reading presets', async () => {
    await expect(getStylePresets('bad/id')).rejects.toThrow('Invalid tenant ID');
    expect(requireUser).not.toHaveBeenCalled();
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('rejects invalid variant ids for AB test result updates', async () => {
    const result = await updateMediaABTestResult('org-a', 'test-1', 'bad/id', {
      clicks: 1,
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid variant ID');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });
});
