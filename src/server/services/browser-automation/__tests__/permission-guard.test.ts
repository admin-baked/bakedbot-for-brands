import { PermissionGuard } from '../permission-guard';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { SitePermission, PermissionGrant, AllowedAction } from '@/types/browser-automation';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock crypto for consistent token generation
jest.mock('crypto', () => ({
  randomUUID: () => 'mock-token-uuid',
}));

describe('PermissionGuard', () => {
  let permissionGuard: PermissionGuard;
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockWhere: jest.Mock;
  let mockGet: jest.Mock;
  let mockAdd: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockSet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockGet = jest.fn();
    mockAdd = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockSet = jest.fn();
    mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
      set: mockSet,
      ref: { delete: mockDelete },
    });

    const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet, limit: mockLimit });
    const mockWhere2 = jest.fn().mockReturnValue({ limit: mockLimit, get: mockGet });
    mockWhere = jest.fn().mockReturnValue({
      where: mockWhere2,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet,
    });

    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      add: mockAdd,
      get: mockGet,
    });

    mockFirestore = {
      collection: mockCollection,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

    permissionGuard = new PermissionGuard();
  });

  describe('checkPermission', () => {
    it('should allow action when user has full access to domain', async () => {
      const mockPermission: Partial<SitePermission> = {
        id: 'perm-1',
        userId: 'user-1',
        domain: 'example.com',
        accessLevel: 'full',
        allowedActions: ['navigate', 'click', 'type'],
        requiresConfirmation: [],
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'perm-1', data: () => mockPermission }],
      });

      const result = await permissionGuard.checkPermission(
        'user-1',
        'https://example.com/page',
        'click'
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny action when domain is blocked', async () => {
      const mockPermission: Partial<SitePermission> = {
        id: 'perm-1',
        userId: 'user-1',
        domain: 'blocked.com',
        accessLevel: 'blocked',
        allowedActions: [],
        requiresConfirmation: [],
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'perm-1', data: () => mockPermission }],
      });

      const result = await permissionGuard.checkPermission(
        'user-1',
        'https://blocked.com/page',
        'navigate'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blocked');
    });

    it('should deny action when no permission exists for domain', async () => {
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const result = await permissionGuard.checkPermission(
        'user-1',
        'https://unknown.com/page',
        'click'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No permission');
    });

    it('should block financial domains automatically', async () => {
      const result = await permissionGuard.checkPermission(
        'user-1',
        'https://chase.com/account',
        'navigate'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blocked');
    });

    it('should restrict read-only access to navigation actions', async () => {
      const mockPermission: Partial<SitePermission> = {
        id: 'perm-1',
        userId: 'user-1',
        domain: 'readonly.com',
        accessLevel: 'read-only',
        allowedActions: ['navigate', 'screenshot', 'scroll'],
        requiresConfirmation: [],
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'perm-1', data: () => mockPermission }],
      });

      const result = await permissionGuard.checkPermission(
        'user-1',
        'https://readonly.com/page',
        'click'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('read-only');
    });
  });

  describe('grantAccess', () => {
    it('should create new permission when none exists', async () => {
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      mockAdd.mockResolvedValueOnce({ id: 'new-perm-id' });

      const grant: PermissionGrant = {
        accessLevel: 'full',
        allowedActions: ['navigate', 'click'],
        requiresConfirmation: ['purchase'],
      };

      const permission = await permissionGuard.grantAccess('user-1', 'newsite.com', grant);

      expect(permission.id).toBe('new-perm-id');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          domain: 'newsite.com',
          accessLevel: 'full',
          allowedActions: ['navigate', 'click'],
        })
      );
    });

    it('should update existing permission', async () => {
      const existingPermission = {
        id: 'existing-perm',
        grantedAt: Timestamp.now(),
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'existing-perm', data: () => existingPermission }],
      });

      const grant: PermissionGrant = {
        accessLevel: 'read-only',
        allowedActions: ['navigate', 'screenshot'],
      };

      await permissionGuard.grantAccess('user-1', 'existingsite.com', grant);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject granting access to blocked domain', async () => {
      const grant: PermissionGrant = {
        accessLevel: 'full',
        allowedActions: ['navigate'],
      };

      await expect(
        permissionGuard.grantAccess('user-1', 'paypal.com', grant)
      ).rejects.toThrow('blocked domain');
    });
  });

  describe('revokeAccess', () => {
    it('should delete permission when it exists', async () => {
      const existingPermission = { id: 'perm-to-delete' };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'perm-to-delete', data: () => existingPermission }],
      });

      await permissionGuard.revokeAccess('user-1', 'example.com');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('requireConfirmation', () => {
    it('should create pending confirmation for high-risk action', async () => {
      // Mock that user has permission but it requires confirmation
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'perm-1',
          data: () => ({
            requiresConfirmation: ['purchase']
          })
        }],
      });

      const token = await permissionGuard.requireConfirmation(
        'user-1',
        'purchase',
        'shop.com',
        'Buy product for $50'
      );

      expect(token).toBe('mock-token-uuid');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'purchase',
          domain: 'shop.com',
          description: 'Buy product for $50',
        })
      );
    });

    it('should return null when confirmation not required', async () => {
      // Mock that user has permission and action doesn't require confirmation
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'perm-1',
          data: () => ({
            requiresConfirmation: []
          })
        }],
      });

      const token = await permissionGuard.requireConfirmation(
        'user-1',
        'publish', // Not in ALWAYS_CONFIRM_ACTIONS
        'blog.com',
        'Publish post'
      );

      expect(token).toBeNull();
    });

    it('should always require confirmation for purchase actions', async () => {
      const token = await permissionGuard.requireConfirmation(
        'user-1',
        'purchase', // In ALWAYS_CONFIRM_ACTIONS
        'shop.com',
        'Buy product'
      );

      expect(token).toBe('mock-token-uuid');
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe('confirmAction', () => {
    it('should return allowed when confirmation is valid', async () => {
      const mockConfirmation = {
        userId: 'user-1',
        action: 'purchase',
        domain: 'shop.com',
        expiresAt: { toMillis: () => Date.now() + 60000 },
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockConfirmation,
        ref: { delete: mockDelete },
      });

      const result = await permissionGuard.confirmAction('confirm-token');

      expect(result.allowed).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should return not allowed when confirmation not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await permissionGuard.confirmAction('invalid-token');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should return not allowed when confirmation expired', async () => {
      const mockConfirmation = {
        userId: 'user-1',
        action: 'purchase',
        expiresAt: { toMillis: () => Date.now() - 60000 }, // expired
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockConfirmation,
        ref: { delete: mockDelete },
      });

      const result = await permissionGuard.confirmAction('expired-token');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });

  describe('denyAction', () => {
    it('should delete the confirmation', async () => {
      await permissionGuard.denyAction('confirm-token');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('listPermissions', () => {
    it('should return all permissions for user', async () => {
      const mockPermissions = [
        { id: 'perm-1', data: () => ({ domain: 'site1.com' }) },
        { id: 'perm-2', data: () => ({ domain: 'site2.com' }) },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockPermissions,
      });

      const permissions = await permissionGuard.listPermissions('user-1');

      expect(permissions).toHaveLength(2);
      expect(permissions[0].id).toBe('perm-1');
      expect(permissions[1].id).toBe('perm-2');
    });
  });

  describe('getPermissionForDomain', () => {
    it('should return permission for specific domain', async () => {
      const mockPermission = {
        id: 'perm-1',
        domain: 'example.com',
        accessLevel: 'full',
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'perm-1', data: () => mockPermission }],
      });

      const permission = await permissionGuard.getPermissionForDomain('user-1', 'example.com');

      expect(permission).toBeDefined();
      expect(permission?.domain).toBe('example.com');
    });

    it('should return null when no permission exists', async () => {
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const permission = await permissionGuard.getPermissionForDomain('user-1', 'unknown.com');

      expect(permission).toBeNull();
    });
  });
});
