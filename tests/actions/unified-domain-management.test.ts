/**
 * Tests for unified domain management actions
 *
 * Covers: listDomains (subcollection + legacy fallback),
 * updateDomainTarget (validation + Firestore updates),
 * getDomainMapping, removeDomain
 */

import {
  listDomains,
  updateDomainTarget,
  getDomainStatus,
  getTenantByDomain,
} from '@/server/actions/domain-management';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/dns-verify', () => ({
  generateVerificationToken: jest.fn(() => 'bb_verify_test123456789012345678901234'),
  verifyDomainTXT: jest.fn(),
  verifyCNAME: jest.fn(),
  verifyNameservers: jest.fn(),
  isValidDomain: jest.fn((domain) => {
    if (!domain || domain.includes('bakedbot.ai')) return false;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
      domain.toLowerCase()
    );
  }),
  isSubdomain: jest.fn((domain) => domain.split('.').length > 2),
  getVerificationTxtHost: jest.fn((domain) => `_bakedbot.${domain}`),
  BAKEDBOT_CNAME_TARGET: 'cname.bakedbot.ai',
  BAKEDBOT_NAMESERVERS: ['ns1.bakedbot.ai', 'ns2.bakedbot.ai'],
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('unified-domain-management', () => {
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockOrderBy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      delete: mockDelete,
      collection: mockCollection,
    });

    mockOrderBy.mockReturnValue({ get: mockGet });

    mockCollection.mockReturnValue({
      doc: mockDoc,
      orderBy: mockOrderBy,
    });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: mockCollection,
      },
    });
  });

  // ─── listDomains ─────────────────────────────────────────────────────────

  describe('listDomains', () => {
    it('should list domains from subcollection', async () => {
      const mockDomainDocs = [
        {
          id: 'shop.mybrand.com',
          data: () => ({
            domain: 'shop.mybrand.com',
            connectionType: 'cname',
            targetType: 'menu',
            verificationStatus: 'verified',
            sslStatus: 'active',
            createdAt: '2026-02-10T00:00:00Z',
          }),
        },
        {
          id: 'www.mysite.com',
          data: () => ({
            domain: 'www.mysite.com',
            connectionType: 'cname',
            targetType: 'vibe_site',
            targetId: 'proj_abc',
            targetName: 'My Marketing Site',
            verificationStatus: 'pending',
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        forEach: (fn: (doc: typeof mockDomainDocs[0]) => void) => mockDomainDocs.forEach(fn),
      });

      const result = await listDomains('org_thrive');

      expect(result.success).toBe(true);
      expect(result.domains).toHaveLength(2);
      expect(result.domains![0].domain).toBe('shop.mybrand.com');
      expect(result.domains![0].targetType).toBe('menu');
      expect(result.domains![1].targetType).toBe('vibe_site');
      expect(result.domains![1].targetId).toBe('proj_abc');
    });

    it('should fallback to legacy customDomain when subcollection empty', async () => {
      // Subcollection empty
      mockGet.mockResolvedValueOnce({
        forEach: () => {},
      });

      // Legacy tenant doc
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          customDomain: {
            domain: 'old.mybrand.com',
            connectionType: 'cname',
            verificationStatus: 'verified',
          },
        }),
      });

      const result = await listDomains('org_legacy');

      expect(result.success).toBe(true);
      expect(result.domains).toHaveLength(1);
      expect(result.domains![0].domain).toBe('old.mybrand.com');
      expect(result.domains![0].targetType).toBe('menu'); // defaults to menu
    });

    it('should return empty array when no domains exist', async () => {
      mockGet.mockResolvedValueOnce({ forEach: () => {} });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}), // no customDomain field
      });

      const result = await listDomains('org_new');

      expect(result.success).toBe(true);
      expect(result.domains).toEqual([]);
    });

    it('should handle Firestore Timestamp objects in dates', async () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-02-11T12:00:00Z'),
      };

      mockGet.mockResolvedValueOnce({
        forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
          fn({
            id: 'test.com',
            data: () => ({
              domain: 'test.com',
              connectionType: 'cname',
              targetType: 'menu',
              verificationStatus: 'verified',
              createdAt: mockTimestamp,
              verifiedAt: mockTimestamp,
            }),
          });
        },
      });

      const result = await listDomains('org_timestamp');

      expect(result.success).toBe(true);
      expect(result.domains![0].createdAt).toBe('2026-02-11T12:00:00.000Z');
    });

    it('should use doc.id when domain field is missing', async () => {
      mockGet.mockResolvedValueOnce({
        forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
          fn({
            id: 'orphan.example.com',
            data: () => ({
              // no domain field
              connectionType: 'cname',
              targetType: 'menu',
            }),
          });
        },
      });

      const result = await listDomains('org_orphan');

      expect(result.domains![0].domain).toBe('orphan.example.com');
    });

    it('should default missing fields', async () => {
      mockGet.mockResolvedValueOnce({
        forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
          fn({
            id: 'minimal.com',
            data: () => ({}), // no fields at all
          });
        },
      });

      const result = await listDomains('org_minimal');

      const domain = result.domains![0];
      expect(domain.domain).toBe('minimal.com');
      expect(domain.connectionType).toBe('cname');
      expect(domain.targetType).toBe('menu');
      expect(domain.verificationStatus).toBe('pending');
    });

    it('should return error on Firestore failure', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'));

      const result = await listDomains('org_error');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ─── updateDomainTarget ──────────────────────────────────────────────────

  describe('updateDomainTarget', () => {
    it('should update target type from menu to vibe_site', async () => {
      // domains subcollection update
      mockUpdate.mockResolvedValueOnce(undefined);

      // domain_mappings check
      mockGet.mockResolvedValueOnce({ exists: true });

      // domain_mappings update
      mockUpdate.mockResolvedValueOnce(undefined);

      const result = await updateDomainTarget('org_thrive', 'shop.example.com', {
        targetType: 'vibe_site',
        targetId: 'proj_new',
        targetName: 'New Landing Page',
      });

      expect(result.success).toBe(true);
    });

    it('should reject vibe_site without targetId', async () => {
      const result = await updateDomainTarget('org_thrive', 'shop.example.com', {
        targetType: 'vibe_site',
        // no targetId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Vibe Builder project');
    });

    it('should normalize domain to lowercase', async () => {
      mockUpdate.mockResolvedValue(undefined);
      mockGet.mockResolvedValue({ exists: false });

      await updateDomainTarget('org_thrive', 'SHOP.Example.COM', {
        targetType: 'menu',
      });

      // Should call doc with lowercase domain
      expect(mockDoc).toHaveBeenCalledWith('shop.example.com');
    });

    it('should also update domain_mappings if it exists (verified domain)', async () => {
      mockUpdate.mockResolvedValue(undefined);
      mockGet.mockResolvedValueOnce({ exists: true }); // mapping exists

      await updateDomainTarget('org_thrive', 'verified.example.com', {
        targetType: 'hybrid',
        targetId: 'proj_abc',
        routingConfig: { rootPath: 'vibe', menuPath: '/shop' },
      });

      // Should update both subcollection and domain_mappings
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('should skip domain_mappings update if not verified yet', async () => {
      mockUpdate.mockResolvedValue(undefined);
      mockGet.mockResolvedValueOnce({ exists: false }); // no mapping yet

      await updateDomainTarget('org_thrive', 'pending.example.com', {
        targetType: 'menu',
      });

      // Only subcollection update
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('should allow menu target without targetId', async () => {
      mockUpdate.mockResolvedValue(undefined);
      mockGet.mockResolvedValue({ exists: false });

      const result = await updateDomainTarget('org_thrive', 'menu.example.com', {
        targetType: 'menu',
      });

      expect(result.success).toBe(true);
    });

    it('should include routingConfig when provided', async () => {
      mockUpdate.mockResolvedValue(undefined);
      mockGet.mockResolvedValue({ exists: false });

      await updateDomainTarget('org_thrive', 'hybrid.example.com', {
        targetType: 'hybrid',
        targetId: 'proj_abc',
        routingConfig: { rootPath: 'vibe', menuPath: '/menu' },
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: 'hybrid',
          targetId: 'proj_abc',
          routingConfig: { rootPath: 'vibe', menuPath: '/menu' },
        })
      );
    });
  });

  // ─── getDomainStatus ─────────────────────────────────────────────────────

  describe('getDomainStatus', () => {
    it('should return domain config for existing tenant', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customDomain: {
            domain: 'test.com',
            connectionType: 'cname',
            verificationStatus: 'verified',
          },
        }),
      });

      const result = await getDomainStatus('org_test');

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config!.domain).toBe('test.com');
    });

    it('should return null config when no domain configured', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      const result = await getDomainStatus('org_nodomain');

      expect(result.success).toBe(true);
      expect(result.config).toBeNull();
    });

    it('should return error for non-existent tenant', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getDomainStatus('org_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tenant not found');
    });

    it('should return error on Firestore failure', async () => {
      mockGet.mockRejectedValue(new Error('Permission denied'));

      const result = await getDomainStatus('org_error');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ─── getTenantByDomain ───────────────────────────────────────────────────

  describe('getTenantByDomain', () => {
    it('should return tenantId for known domain', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ tenantId: 'org_thrive' }),
      });

      const result = await getTenantByDomain('shop.thrivesyracuse.com');

      expect(result).toBe('org_thrive');
    });

    it('should return null for unknown domain', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getTenantByDomain('unknown.com');

      expect(result).toBeNull();
    });

    it('should normalize domain to lowercase', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await getTenantByDomain('SHOP.Example.COM');

      expect(mockDoc).toHaveBeenCalledWith('shop.example.com');
    });

    it('should return null on Firestore error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await getTenantByDomain('error.com');

      expect(result).toBeNull();
    });
  });
});
