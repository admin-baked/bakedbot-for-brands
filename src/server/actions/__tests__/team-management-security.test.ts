import { getOrgsForUser } from '../team-management';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('team-management security: getOrgsForUser', () => {
  const docGet = jest.fn();
  const doc = jest.fn(() => ({ get: docGet }));
  const collection = jest.fn(() => ({ doc }));

  beforeEach(() => {
    jest.clearAllMocks();

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
});

