import { approveRequest, getPendingApprovals } from '../approvals';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

describe('approvals actions security', () => {
  const query = {
    where: jest.fn(),
    get: jest.fn(),
  };

  const docRef = {
    get: jest.fn(),
    update: jest.fn(),
  };

  const firestore = {
    collection: jest.fn(() => query),
    doc: jest.fn(() => docRef),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    query.where.mockReturnValue(query);
    query.get.mockResolvedValue({ docs: [] });

    docRef.get.mockResolvedValue({ exists: true, data: () => ({ status: 'pending' }) });
    docRef.update.mockResolvedValue(undefined);

    (createServerClient as jest.Mock).mockResolvedValue({ firestore });
  });

  it('blocks non-super users from reading cross-tenant approvals', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'tenant-a',
      orgId: 'tenant-a',
    });

    await expect(getPendingApprovals('tenant-b')).rejects.toThrow('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('allows super users to read pending approvals for any tenant', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'tenant-super',
    });

    await getPendingApprovals('tenant-b');

    expect(firestore.collection).toHaveBeenCalledWith('tenants/tenant-b/approvals');
    expect(query.where).toHaveBeenCalledWith('status', '==', 'pending');
  });

  it('writes approverId as uid only (not token object)', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'tenant-a',
      orgId: 'tenant-a',
    });

    await approveRequest('tenant-a', 'req-1', true);

    expect(docRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        approverId: 'user-1',
        approvedAt: expect.any(Number),
      }),
    );
  });

  it('blocks non-super users from approving cross-tenant requests', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'tenant-a',
      orgId: 'tenant-a',
    });

    await expect(approveRequest('tenant-b', 'req-1', true)).rejects.toThrow('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('rejects invalid path segment input for tenantId/requestId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    await expect(getPendingApprovals('tenant/a')).rejects.toThrow('Invalid tenantId');
    await expect(approveRequest('tenant-a', 'req/1', true)).rejects.toThrow('Invalid requestId');
  });
});

