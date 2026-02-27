jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
  isSuperUser: jest.fn(),
}));

jest.mock('@/server/auth/rbac', () => ({
  requireBrandAccess: jest.fn(),
  requireDispensaryAccess: jest.fn(),
  requirePermission: jest.fn(),
  isBrandRole: jest.fn(() => false),
  isDispensaryRole: jest.fn(() => false),
  isBrandAdmin: jest.fn(() => false),
  isDispensaryAdmin: jest.fn(() => false),
}));

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { getInvitationsAction } from '../invitations';

describe('invitations security', () => {
  function buildFirestoreWithResult() {
    const query = {
      where: jest.fn(),
      orderBy: jest.fn(),
      get: jest.fn(),
    } as any;

    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.get.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 'inv-1',
            createdAt: { toDate: () => new Date('2026-02-27T00:00:00.000Z') },
            expiresAt: { toDate: () => new Date('2026-03-06T00:00:00.000Z') },
          }),
        },
      ],
    });

    const firestore = {
      collection: jest.fn().mockReturnValue(query),
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);
    return firestore;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (isSuperUser as jest.Mock).mockResolvedValue(false);
  });

  it('blocks non-super cross-org invitation reads', async () => {
    const firestore = buildFirestoreWithResult();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'operator',
      currentOrgId: 'org-a',
    });

    const result = await getInvitationsAction('org-b');

    expect(result).toEqual([]);
    expect(firestore.collection).not.toHaveBeenCalled();
  });

  it('allows same-org invitation reads for non-super users', async () => {
    const firestore = buildFirestoreWithResult();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'operator',
      currentOrgId: 'org-a',
    });

    const result = await getInvitationsAction('org-a');

    expect(firestore.collection).toHaveBeenCalledWith('invitations');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('allows super_admin cross-org invitation reads', async () => {
    const firestore = buildFirestoreWithResult();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_admin',
      currentOrgId: 'org-a',
    });

    const result = await getInvitationsAction('org-b');

    expect(firestore.collection).toHaveBeenCalledWith('invitations');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});
