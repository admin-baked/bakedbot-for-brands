import {
  getOrgsForSuperUser,
  getOrgsForUser,
  getUsersByOrg,
  updateUserOrgRole,
} from '../team-management';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { canAccessOrg, requirePermission } from '@/server/auth/rbac';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/rbac', () => ({
  canAccessOrg: jest.fn(),
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('team-management security', () => {
  const docGet = jest.fn();
  const doc = jest.fn(() => ({ get: docGet }));
  const collection = jest.fn(() => ({ doc }));

  beforeEach(() => {
    jest.clearAllMocks();
    (canAccessOrg as jest.Mock).mockReturnValue(true);
    (requirePermission as jest.Mock).mockImplementation(() => undefined);

    docGet.mockResolvedValue({
      exists: true,
      data: () => ({
        currentOrgId: 'org-a',
        orgMemberships: {
          'org-a': {
            orgName: 'Org A',
            orgType: 'dispensary',
            role: 'dispensary_admin',
            joinedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      }),
    });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: { collection },
    });
  });

  describe('getOrgsForUser', () => {
    it('blocks non-super users from requesting another user id', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'user-1',
        role: 'dispensary_admin',
      });

      const result = await getOrgsForUser('user-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(createServerClient).not.toHaveBeenCalled();
    });

    it('allows non-super users to request their own orgs', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'user-1',
        role: 'dispensary_admin',
      });

      const result = await getOrgsForUser('user-1');

      expect(result.success).toBe(true);
      expect(collection).toHaveBeenCalledWith('users');
      expect(doc).toHaveBeenCalledWith('user-1');
    });

    it('allows super users to request another user id', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'super-1',
        role: 'super_user',
      });

      const result = await getOrgsForUser('user-2');

      expect(result.success).toBe(true);
      expect(doc).toHaveBeenCalledWith('user-2');
    });

    it('rejects invalid uid format', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'super-1',
        role: 'super_user',
      });

      const result = await getOrgsForUser('../bad');

      expect(result.success).toBe(false);
      expect(result.error).toBe('uid is required');
      expect(createServerClient).not.toHaveBeenCalled();
    });
  });

  describe('org access and privilege checks', () => {
    it('enforces org access in getUsersByOrg', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'user-1',
        role: 'dispensary_admin',
      });
      (canAccessOrg as jest.Mock).mockReturnValue(false);

      const result = await getUsersByOrg('org-a');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(createServerClient).not.toHaveBeenCalled();
    });

    it('rejects invalid org id in getUsersByOrg', async () => {
      const result = await getUsersByOrg('org/a');

      expect(result.success).toBe(false);
      expect(result.error).toBe('orgId is required');
      expect(requireUser).not.toHaveBeenCalled();
    });

    it('blocks non-super users from assigning super roles', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'user-1',
        role: 'dispensary_admin',
      });

      const result = await updateUserOrgRole('user-2', 'org-a', 'super_user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(createServerClient).not.toHaveBeenCalled();
    });
  });

  describe('pagination hardening', () => {
    it('clamps super-user org list query bounds', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        uid: 'super-1',
        role: 'super_user',
      });

      const get = jest.fn().mockResolvedValue({ docs: [] });
      const offset = jest.fn().mockReturnValue({ get });
      const limit = jest.fn().mockReturnValue({ offset });
      const orderBy = jest.fn().mockReturnValue({ limit });
      const organizationsCollection = { orderBy };
      const firestore = {
        collection: jest.fn().mockReturnValue(organizationsCollection),
      };
      (createServerClient as jest.Mock).mockResolvedValue({ firestore });

      const result = await getOrgsForSuperUser(999999, -100);

      expect(result.success).toBe(true);
      expect(limit).toHaveBeenCalledWith(100);
      expect(offset).toHaveBeenCalledWith(0);
    });
  });
});

