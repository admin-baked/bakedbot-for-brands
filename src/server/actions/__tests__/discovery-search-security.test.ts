import { linkEntity, triggerDiscoverySync } from '../discovery-search';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/services/firecrawl', () => ({
  discovery: {
    search: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('discovery-search security', () => {
  const set = jest.fn().mockResolvedValue(undefined);
  const update = jest.fn().mockResolvedValue(undefined);
  const doc = jest.fn().mockImplementation(() => ({ set, update }));
  const collection = jest.fn().mockImplementation(() => ({ doc }));

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: { collection },
    });
  });

  it('rejects linking when org context is missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await linkEntity({
      id: 'https://example.com',
      name: 'Example',
      url: 'https://example.com',
      type: 'dispensary',
    });

    expect(result).toEqual({
      success: false,
      error: 'Missing organization context',
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it('uses currentOrgId over other identifiers when linking', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
      currentOrgId: 'org-current',
      role: 'dispensary_admin',
    });

    const result = await linkEntity({
      id: 'https://example.com',
      name: 'Example',
      url: 'https://example.com',
      type: 'brand',
    });

    expect(result.success).toBe(true);
    expect(doc).toHaveBeenCalledWith('org-current');
    expect(set).toHaveBeenCalled();
  });

  it('blocks sync trigger when a non-super user targets another org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
    });

    await expect(
      triggerDiscoverySync('org-other', 'https://example.com', 'brand')
    ).rejects.toThrow('Unauthorized organization context');
    expect(collection).not.toHaveBeenCalled();
  });

  it('rejects invalid sync URLs before any writes', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
    });

    await expect(
      triggerDiscoverySync('org-current', 'javascript:alert(1)', 'brand')
    ).rejects.toThrow('Invalid entity URL');
    expect(collection).not.toHaveBeenCalled();
  });

  it('allows sync trigger for the actor org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
    });

    await triggerDiscoverySync('org-current', 'https://example.com', 'dispensary');

    expect(doc).toHaveBeenCalledWith('org-current');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        'syncStatus.status': 'syncing',
      })
    );
  });
});
