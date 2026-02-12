/**
 * Tests for Vibe Publishing server actions
 *
 * Covers: subdomain validation, publish flow, unpublish,
 * getPublishedSite (3-tier lookup), custom domain CRUD
 */

import {
  checkSubdomainAvailability,
  publishWebsite,
  unpublishWebsite,
  getPublishedSite,
  getPublishedSiteByProject,
  addCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
} from '@/server/actions/vibe-publish';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('vibe-publish', () => {
  const mockGet = jest.fn();
  const mockAdd = jest.fn();
  const mockUpdate = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockWhere = jest.fn();
  const mockLimit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const docMethods = {
      get: mockGet,
      update: mockUpdate,
    };

    mockDoc.mockReturnValue(docMethods);
    mockLimit.mockReturnValue({ get: mockGet });

    const queryChain = {
      where: mockWhere,
      limit: mockLimit,
      get: mockGet,
    };
    mockWhere.mockReturnValue(queryChain);

    mockCollection.mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
      where: mockWhere,
    });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
  });

  // ─── checkSubdomainAvailability ──────────────────────────────────────────

  describe('checkSubdomainAvailability', () => {
    it('should accept a valid subdomain', async () => {
      mockGet.mockResolvedValue({ empty: true });

      const result = await checkSubdomainAvailability('mycannabissite');

      expect(result.available).toBe(true);
    });

    it('should reject subdomains with uppercase', async () => {
      const result = await checkSubdomainAvailability('MyBrand');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Invalid subdomain format');
    });

    it('should reject subdomains with spaces', async () => {
      const result = await checkSubdomainAvailability('my brand');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Invalid subdomain format');
    });

    it('should reject subdomains shorter than 3 chars', async () => {
      const result = await checkSubdomainAvailability('ab');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Invalid subdomain format');
    });

    it('should reject subdomains longer than 30 chars', async () => {
      const result = await checkSubdomainAvailability('a'.repeat(31));

      expect(result.available).toBe(false);
      expect(result.error).toBe('Invalid subdomain format');
    });

    it('should reject subdomains with special chars', async () => {
      const result = await checkSubdomainAvailability('my_brand.com');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Invalid subdomain format');
    });

    it('should accept hyphens in subdomain', async () => {
      mockGet.mockResolvedValue({ empty: true });

      const result = await checkSubdomainAvailability('thrive-syracuse');

      expect(result.available).toBe(true);
    });

    it('should reject reserved subdomains: www', async () => {
      const result = await checkSubdomainAvailability('www');

      expect(result.available).toBe(false);
    });

    it('should reject reserved subdomains: admin', async () => {
      const result = await checkSubdomainAvailability('admin');

      expect(result.available).toBe(false);
    });

    it('should reject reserved subdomains: api', async () => {
      const result = await checkSubdomainAvailability('api');

      expect(result.available).toBe(false);
    });

    it('should reject reserved subdomains: bakedbot', async () => {
      const result = await checkSubdomainAvailability('bakedbot');

      expect(result.available).toBe(false);
    });

    it('should reject reserved subdomains: staging', async () => {
      const result = await checkSubdomainAvailability('staging');

      expect(result.available).toBe(false);
    });

    it('should reject already-taken subdomains', async () => {
      mockGet.mockResolvedValue({ empty: false });

      const result = await checkSubdomainAvailability('thrivesyracuse');

      expect(result.available).toBe(false);
    });

    it('should accept 3-char subdomains (min length)', async () => {
      mockGet.mockResolvedValue({ empty: true });

      const result = await checkSubdomainAvailability('abc');

      expect(result.available).toBe(true);
    });

    it('should accept 30-char subdomains (max length)', async () => {
      mockGet.mockResolvedValue({ empty: true });

      const result = await checkSubdomainAvailability('a'.repeat(30));

      expect(result.available).toBe(true);
    });

    it('should return error on Firestore failure', async () => {
      mockGet.mockRejectedValue(new Error('Firestore down'));

      const result = await checkSubdomainAvailability('validname');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Failed to check availability');
    });
  });

  // ─── publishWebsite ──────────────────────────────────────────────────────

  describe('publishWebsite', () => {
    const setupPublish = () => {
      // First call: getVibeProject
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: 'user123',
          name: 'My Site',
          html: '<h1>Test</h1>',
          css: 'h1 { color: green; }',
          components: '[]',
          styles: '[]',
          description: 'A test site',
        }),
      });

      // Second call: checkSubdomainAvailability
      mockGet.mockResolvedValueOnce({ empty: true });

      // Third call: add published site
      mockAdd.mockResolvedValueOnce({ id: 'pub_site_123' });

      // Fourth call: update project status
      mockUpdate.mockResolvedValueOnce(undefined);
    };

    it('should publish a website with valid inputs', async () => {
      setupPublish();

      const result = await publishWebsite('proj_123', 'mysite', 'user123');

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://mysite.bakedbot.site');
    });

    it('should reject if project not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await publishWebsite('nonexistent', 'mysite', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found');
    });

    it('should reject if user does not own project', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'other_user' }),
      });

      const result = await publishWebsite('proj_123', 'mysite', 'attacker');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should reject if subdomain is taken', async () => {
      // Project exists and user owns it
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'user123' }),
      });

      // Subdomain check returns not available
      mockGet.mockResolvedValueOnce({ empty: false });

      const result = await publishWebsite('proj_123', 'taken-name', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subdomain not available');
    });

    it('should store published site with correct structure', async () => {
      setupPublish();

      await publishWebsite('proj_123', 'mysite', 'user123');

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj_123',
          userId: 'user123',
          subdomain: 'mysite',
          url: 'https://mysite.bakedbot.site',
          html: '<h1>Test</h1>',
          css: 'h1 { color: green; }',
          status: 'published',
          views: 0,
          uniqueVisitors: 0,
          customDomain: null,
        })
      );
    });

    it('should update project status after publishing', async () => {
      setupPublish();

      await publishWebsite('proj_123', 'mysite', 'user123');

      // Last update call should be to the project
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          publishedUrl: 'https://mysite.bakedbot.site',
          lastPublishedAt: expect.any(String),
        })
      );
    });

    it('should return error on Firestore failure', async () => {
      mockGet.mockRejectedValue(new Error('DB error'));

      const result = await publishWebsite('proj_123', 'mysite', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to publish website');
    });
  });

  // ─── unpublishWebsite ────────────────────────────────────────────────────

  describe('unpublishWebsite', () => {
    it('should unpublish a website', async () => {
      const mockRef = { update: mockUpdate };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });
      mockUpdate.mockResolvedValue(undefined);

      const result = await unpublishWebsite('proj_123', 'user123');

      expect(result.success).toBe(true);
      expect(mockRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unpublished',
          unpublishedAt: expect.any(String),
        })
      );
    });

    it('should return error if published site not found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });

      const result = await unpublishWebsite('proj_123', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Published site not found');
    });

    it('should set project back to draft', async () => {
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });
      mockUpdate.mockResolvedValue(undefined);

      await unpublishWebsite('proj_123', 'user123');

      // The project update (second call) should set status to draft
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'draft' });
    });

    it('should return error on Firestore failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await unpublishWebsite('proj_123', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to unpublish website');
    });
  });

  // ─── getPublishedSite ────────────────────────────────────────────────────

  describe('getPublishedSite', () => {
    it('should find site by subdomain (first lookup)', async () => {
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'site_1',
          ref: mockRef,
          data: () => ({
            subdomain: 'mysite',
            html: '<h1>Live</h1>',
            views: 42,
          }),
        }],
      });

      const result = await getPublishedSite('mysite');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('site_1');
      expect(result!.subdomain).toBe('mysite');
    });

    it('should increment view count on access', async () => {
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'site_1',
          ref: mockRef,
          data: () => ({ views: 10 }),
        }],
      });

      await getPublishedSite('mysite');

      expect(mockRef.update).toHaveBeenCalledWith({ views: 11 });
    });

    it('should increment from 0 if views is undefined', async () => {
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'site_1',
          ref: mockRef,
          data: () => ({ /* no views field */ }),
        }],
      });

      await getPublishedSite('mysite');

      expect(mockRef.update).toHaveBeenCalledWith({ views: 1 });
    });

    it('should fallback to custom domain lookup (second lookup)', async () => {
      // First lookup: subdomain - not found
      mockGet.mockResolvedValueOnce({ empty: true });

      // Second lookup: customDomain
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'site_custom',
          ref: mockRef,
          data: () => ({
            customDomain: 'www.thrivesyracuse.com',
            views: 5,
          }),
        }],
      });

      const result = await getPublishedSite('www.thrivesyracuse.com');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('site_custom');
    });

    it('should fallback to domain_mappings (third lookup)', async () => {
      // First lookup: subdomain - not found
      mockGet.mockResolvedValueOnce({ empty: true });

      // Second lookup: customDomain - not found
      mockGet.mockResolvedValueOnce({ empty: true });

      // Third lookup: domain_mappings
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          targetType: 'vibe_site',
          targetId: 'proj_from_mapping',
        }),
      });

      // Fourth lookup: getPublishedSiteByProject
      const mockRef = { update: jest.fn() };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'site_mapped',
          ref: mockRef,
          data: () => ({ projectId: 'proj_from_mapping' }),
        }],
      });

      const result = await getPublishedSite('custom.example.com');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('site_mapped');
    });

    it('should skip domain_mappings for non-vibe_site targets', async () => {
      // Not found in first two lookups
      mockGet.mockResolvedValueOnce({ empty: true });
      mockGet.mockResolvedValueOnce({ empty: true });

      // Domain mapping exists but targets menu
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          targetType: 'menu',
          tenantId: 'org_123',
        }),
      });

      const result = await getPublishedSite('menu.example.com');

      expect(result).toBeNull();
    });

    it('should return null when not found anywhere', async () => {
      mockGet.mockResolvedValueOnce({ empty: true }); // subdomain
      mockGet.mockResolvedValueOnce({ empty: true }); // customDomain
      mockGet.mockResolvedValueOnce({ exists: false }); // domain_mappings

      const result = await getPublishedSite('nonexistent.com');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('DB error'));

      const result = await getPublishedSite('error-site');

      expect(result).toBeNull();
    });
  });

  // ─── getPublishedSiteByProject ───────────────────────────────────────────

  describe('getPublishedSiteByProject', () => {
    it('should return site by project ID', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'site_for_proj',
          data: () => ({
            projectId: 'proj_abc',
            subdomain: 'mysite',
            html: '<h1>Test</h1>',
          }),
        }],
      });

      const result = await getPublishedSiteByProject('proj_abc');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('site_for_proj');
      expect(result!.projectId).toBe('proj_abc');
    });

    it('should return null if no published site for project', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });

      const result = await getPublishedSiteByProject('proj_unpublished');

      expect(result).toBeNull();
    });

    it('should only match published status', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });

      await getPublishedSiteByProject('proj_abc');

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
    });
  });

  // ─── addCustomDomain (vibe) ──────────────────────────────────────────────

  describe('addCustomDomain (vibe)', () => {
    it('should add a valid domain', async () => {
      // Domain not already in use
      mockGet.mockResolvedValueOnce({ empty: true });

      // Published site found
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });

      const result = await addCustomDomain('proj_abc', 'www.example.com', 'user123');

      expect(result.success).toBe(true);
      expect(result.verificationRequired).toBe(true);
      expect(result.dnsRecords).toHaveLength(1);
      expect(result.dnsRecords![0].type).toBe('CNAME');
      expect(result.dnsRecords![0].value).toBe('hosting.bakedbot.site');
    });

    it('should reject invalid domain format', async () => {
      const result = await addCustomDomain('proj_abc', 'not a domain', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid domain format');
    });

    it('should reject domain with protocol', async () => {
      const result = await addCustomDomain('proj_abc', 'https://example.com', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid domain format');
    });

    it('should reject domain already in use', async () => {
      mockGet.mockResolvedValueOnce({ empty: false }); // domain exists

      const result = await addCustomDomain('proj_abc', 'taken.com', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Domain already in use');
    });

    it('should reject if published site not found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true }); // domain not taken
      mockGet.mockResolvedValueOnce({ empty: true }); // no published site

      const result = await addCustomDomain('proj_abc', 'new.example.com', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Published site not found');
    });

    it('should accept subdomain format', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });

      const result = await addCustomDomain('proj_abc', 'shop.mybrand.com', 'user123');

      expect(result.success).toBe(true);
    });

    it('should accept international TLDs', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });

      const result = await addCustomDomain('proj_abc', 'dispensary.store', 'user123');

      expect(result.success).toBe(true);
    });
  });

  // ─── verifyCustomDomain ──────────────────────────────────────────────────

  describe('verifyCustomDomain', () => {
    it('should verify a domain', async () => {
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          ref: mockRef,
          data: () => ({ customDomain: 'www.example.com' }),
        }],
      });

      const result = await verifyCustomDomain('proj_abc', 'user123');

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(mockRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          customDomainVerified: true,
          customDomainVerifiedAt: expect.any(String),
        })
      );
    });

    it('should reject if no custom domain configured', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => ({ customDomain: null }),
        }],
      });

      const result = await verifyCustomDomain('proj_abc', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No custom domain configured');
    });

    it('should reject if published site not found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });

      const result = await verifyCustomDomain('proj_abc', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Published site not found');
    });
  });

  // ─── removeCustomDomain ──────────────────────────────────────────────────

  describe('removeCustomDomain', () => {
    it('should remove a custom domain', async () => {
      const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });

      const result = await removeCustomDomain('proj_abc', 'user123');

      expect(result.success).toBe(true);
      expect(mockRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          customDomain: null,
          customDomainVerified: false,
          customDomainRemovedAt: expect.any(String),
        })
      );
    });

    it('should reject if published site not found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });

      const result = await removeCustomDomain('proj_abc', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Published site not found');
    });
  });
});
