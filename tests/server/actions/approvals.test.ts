import { approveRequest, getPendingApprovals } from '@/server/actions/approvals';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth');
jest.mock('@/firebase/server-client');

describe('server/actions/approvals', () => {
  const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
  const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

  let mockWhere: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDocGet: jest.Mock;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWhere = jest.fn().mockReturnThis();
    mockGet = jest.fn();
    mockUpdate = jest.fn().mockResolvedValue({});
    mockDocGet = jest.fn();

    mockCollection = jest.fn().mockReturnValue({
      where: mockWhere,
      get: mockGet,
    });

    mockDoc = jest.fn().mockReturnValue({
      get: mockDocGet,
      update: mockUpdate,
    });

    mockCreateServerClient.mockResolvedValue({
      firestore: {
        collection: mockCollection,
        doc: mockDoc,
      },
    } as never);

    mockRequireUser.mockResolvedValue({
      uid: 'user_123',
      currentOrgId: 'tenant_123',
      role: 'brand',
    } as never);
  });

  describe('getPendingApprovals', () => {
    it('returns pending approvals for the tenant when the actor is in the same org', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ id: 'req1', status: 'pending' }) },
          { data: () => ({ id: 'req2', status: 'pending' }) },
        ],
      });

      const result = await getPendingApprovals('tenant_123');

      expect(result).toEqual([
        { id: 'req1', status: 'pending' },
        { id: 'req2', status: 'pending' },
      ]);
      expect(mockCollection).toHaveBeenCalledWith('tenants/tenant_123/approvals');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');
    });

    it('allows super roles to read pending approvals across tenants', async () => {
      mockRequireUser.mockResolvedValue({
        uid: 'super_123',
        currentOrgId: 'tenant_other',
        role: 'super_admin',
      } as never);
      mockGet.mockResolvedValueOnce({ docs: [] });

      await expect(getPendingApprovals('tenant_123')).resolves.toEqual([]);
    });

    it('rejects access for non-super users outside the tenant', async () => {
      mockRequireUser.mockResolvedValue({
        uid: 'user_123',
        currentOrgId: 'tenant_other',
        role: 'brand',
      } as never);

      await expect(getPendingApprovals('tenant_123')).rejects.toThrow('Unauthorized');
    });

    it('rejects invalid tenant path segments', async () => {
      await expect(getPendingApprovals('tenant/123')).rejects.toThrow('Invalid tenantId');
    });
  });

  describe('approveRequest', () => {
    it('marks a request approved with approver metadata', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await approveRequest('tenant_123', 'req1', true);

      expect(mockDoc).toHaveBeenCalledWith('tenants/tenant_123/approvals/req1');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          approverId: 'user_123',
          approvedAt: expect.any(Number),
        })
      );
    });

    it('marks a request rejected when approved is false', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await approveRequest('tenant_123', 'req1', false);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          approverId: 'user_123',
        })
      );
    });

    it('allows super roles to approve across tenants', async () => {
      mockRequireUser.mockResolvedValue({
        uid: 'super_123',
        currentOrgId: 'tenant_other',
        role: 'super_user',
      } as never);
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await approveRequest('tenant_123', 'req1', true);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('rejects approval attempts for non-super users outside the tenant', async () => {
      mockRequireUser.mockResolvedValue({
        uid: 'user_123',
        currentOrgId: 'tenant_other',
        role: 'brand',
      } as never);

      await expect(approveRequest('tenant_123', 'req1', true)).rejects.toThrow('Unauthorized');
    });

    it('throws when the request is missing', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false });

      await expect(approveRequest('tenant_123', 'missing', true)).rejects.toThrow('Request not found');
    });

    it('rejects invalid request path segments', async () => {
      await expect(approveRequest('tenant_123', 'req/1', true)).rejects.toThrow('Invalid requestId');
    });
  });
});
