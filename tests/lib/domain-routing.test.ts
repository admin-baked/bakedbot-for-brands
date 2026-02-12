/**
 * Tests for domain routing utilities
 *
 * Covers: getDomainMapping (cache + Firestore), resolveRoute
 * (menu, vibe_site, hybrid), buildMenuPath, edge cases
 */

import { getDomainMapping, resolveRoute } from '@/lib/domain-routing';
import { createServerClient } from '@/firebase/server-client';
import { getCachedTenant, setCachedTenant } from '@/lib/domain-cache';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/domain-cache', () => ({
  getCachedTenant: jest.fn(),
  setCachedTenant: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('domain-routing', () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc.mockReturnValue({ get: mockGet });
    mockCollection.mockReturnValue({ doc: mockDoc });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: mockCollection,
      },
    });
  });

  // ─── getDomainMapping ────────────────────────────────────────────────────

  describe('getDomainMapping', () => {
    it('should resolve a domain from Firestore when not cached', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          tenantId: 'org_thrive',
          targetType: 'menu',
          targetId: undefined,
          targetName: undefined,
          routingConfig: undefined,
        }),
      });

      const result = await getDomainMapping('shop.thrivesyracuse.com');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('org_thrive');
      expect(result!.targetType).toBe('menu');
      expect(setCachedTenant).toHaveBeenCalledWith('shop.thrivesyracuse.com', 'org_thrive');
    });

    it('should normalize hostname to lowercase', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);
      mockGet.mockResolvedValue({ exists: false });

      await getDomainMapping('Shop.ThriveSyracuse.COM');

      expect(mockDoc).toHaveBeenCalledWith('shop.thrivesyracuse.com');
    });

    it('should cache null for unknown domains', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);
      mockGet.mockResolvedValue({ exists: false });

      const result = await getDomainMapping('unknown.example.com');

      expect(result).toBeNull();
      expect(setCachedTenant).toHaveBeenCalledWith('unknown.example.com', null);
    });

    it('should return null when tenant is cached as null', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(null);

      const result = await getDomainMapping('nonexistent.com');

      expect(result).toBeNull();
      // Should not call Firestore
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should use cached tenantId and still fetch full mapping', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue('org_cached');

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          tenantId: 'org_cached',
          targetType: 'vibe_site',
          targetId: 'proj_abc',
          targetName: 'My Site',
          routingConfig: undefined,
        }),
      });

      const result = await getDomainMapping('cached.example.com');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('org_cached');
      expect(result!.targetType).toBe('vibe_site');
      expect(result!.targetId).toBe('proj_abc');
    });

    it('should return null if cached but mapping no longer exists', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue('org_stale');
      mockGet.mockResolvedValue({ exists: false });

      const result = await getDomainMapping('stale.example.com');

      expect(result).toBeNull();
    });

    it('should default targetType to menu when not specified', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          tenantId: 'org_legacy',
          // No targetType set (legacy mapping)
        }),
      });

      const result = await getDomainMapping('legacy.example.com');

      expect(result!.targetType).toBe('menu');
    });

    it('should return null on Firestore error', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);
      mockGet.mockRejectedValue(new Error('Firestore down'));

      const result = await getDomainMapping('error.example.com');

      expect(result).toBeNull();
    });

    it('should handle vibe_site with full config', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          tenantId: 'org_vibe',
          targetType: 'vibe_site',
          targetId: 'proj_landing',
          targetName: 'Spring Sale Landing Page',
          routingConfig: undefined,
        }),
      });

      const result = await getDomainMapping('sale.mybrand.com');

      expect(result!.targetType).toBe('vibe_site');
      expect(result!.targetId).toBe('proj_landing');
      expect(result!.targetName).toBe('Spring Sale Landing Page');
    });

    it('should handle hybrid with routing config', async () => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          targetId: 'proj_main',
          routingConfig: { rootPath: 'vibe', menuPath: '/menu' },
        }),
      });

      const result = await getDomainMapping('www.hybridsite.com');

      expect(result!.targetType).toBe('hybrid');
      expect(result!.routingConfig).toEqual({
        rootPath: 'vibe',
        menuPath: '/menu',
      });
    });
  });

  // ─── resolveRoute ────────────────────────────────────────────────────────

  describe('resolveRoute', () => {
    // Helper to set up a domain mapping (uses mockResolvedValueOnce so
    // subsequent mockGet calls can be chained for buildMenuPath / tenant lookup)
    const setupMapping = (mapping: Record<string, unknown>) => {
      (getCachedTenant as jest.Mock).mockReturnValue(undefined);
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mapping,
      });
    };

    describe('menu target', () => {
      it('should route to brand path for menu domains', async () => {
        // First call: domain_mappings lookup
        setupMapping({
          tenantId: 'org_brand',
          targetType: 'menu',
        });

        // Second call: tenant type lookup
        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ type: 'brand' }),
        });

        const result = await resolveRoute('shop.mybrand.com', '/');

        expect(result).not.toBeNull();
        expect(result!.path).toBe('/org_brand');
        expect(result!.targetType).toBe('menu');
      });

      it('should route to dispensary path for dispensary tenants', async () => {
        setupMapping({
          tenantId: 'org_disp',
          targetType: 'menu',
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ type: 'dispensary' }),
        });

        const result = await resolveRoute('shop.mydispensary.com', '/');

        expect(result!.path).toBe('/dispensaries/org_disp');
      });

      it('should pass through path suffix for menu', async () => {
        setupMapping({
          tenantId: 'org_brand',
          targetType: 'menu',
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ type: 'brand' }),
        });

        const result = await resolveRoute('shop.mybrand.com', '/products/flower');

        expect(result!.path).toBe('/org_brand/products/flower');
      });
    });

    describe('vibe_site target', () => {
      it('should route to vibe site API', async () => {
        setupMapping({
          tenantId: 'org_vibe',
          targetType: 'vibe_site',
          targetId: 'proj_abc',
        });

        const result = await resolveRoute('www.myvibesite.com', '/');

        expect(result).not.toBeNull();
        expect(result!.path).toBe('/api/vibe/site/proj_abc');
        expect(result!.targetType).toBe('vibe_site');
      });

      it('should pass through sub-paths for vibe site', async () => {
        setupMapping({
          tenantId: 'org_vibe',
          targetType: 'vibe_site',
          targetId: 'proj_abc',
        });

        const result = await resolveRoute('www.myvibesite.com', '/about');

        expect(result!.path).toBe('/api/vibe/site/proj_abc/about');
      });

      it('should return null if vibe_site has no targetId', async () => {
        setupMapping({
          tenantId: 'org_vibe',
          targetType: 'vibe_site',
          // no targetId
        });

        const result = await resolveRoute('broken.site.com', '/');

        expect(result).toBeNull();
      });
    });

    describe('hybrid target', () => {
      it('should route /shop to menu', async () => {
        setupMapping({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          targetId: 'proj_main',
          routingConfig: { rootPath: 'vibe', menuPath: '/shop' },
        });

        // Tenant type lookup for menu path
        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ type: 'dispensary' }),
        });

        const result = await resolveRoute('www.hybrid.com', '/shop');

        expect(result).not.toBeNull();
        expect(result!.path).toBe('/dispensaries/org_hybrid');
        expect(result!.targetType).toBe('hybrid');
      });

      it('should route /shop/flower to menu with stripped path', async () => {
        setupMapping({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          targetId: 'proj_main',
          routingConfig: { rootPath: 'vibe', menuPath: '/shop' },
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ type: 'brand' }),
        });

        const result = await resolveRoute('www.hybrid.com', '/shop/flower');

        expect(result!.path).toBe('/org_hybrid/flower');
      });

      it('should route root to vibe site', async () => {
        setupMapping({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          targetId: 'proj_main',
          routingConfig: { rootPath: 'vibe', menuPath: '/shop' },
        });

        const result = await resolveRoute('www.hybrid.com', '/');

        expect(result!.path).toBe('/api/vibe/site/proj_main');
      });

      it('should route /about to vibe site (non-menu path)', async () => {
        setupMapping({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          targetId: 'proj_main',
          routingConfig: { rootPath: 'vibe', menuPath: '/shop' },
        });

        const result = await resolveRoute('www.hybrid.com', '/about');

        expect(result!.path).toBe('/api/vibe/site/proj_main');
      });

      it('should default menuPath to /shop when not specified', async () => {
        setupMapping({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          targetId: 'proj_main',
          // No routingConfig
        });

        // For /shop path -> menu path
        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ type: 'brand' }),
        });

        const result = await resolveRoute('www.hybrid.com', '/shop');

        expect(result!.path).toBe('/org_hybrid');
      });

      it('should return null if hybrid has no targetId', async () => {
        setupMapping({
          tenantId: 'org_hybrid',
          targetType: 'hybrid',
          // no targetId
        });

        const result = await resolveRoute('broken.hybrid.com', '/');

        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should return null for unknown domain', async () => {
        (getCachedTenant as jest.Mock).mockReturnValue(undefined);
        mockGet.mockResolvedValue({ exists: false });

        const result = await resolveRoute('unknown.com', '/');

        expect(result).toBeNull();
      });

      it('should default to brand path on tenant lookup error', async () => {
        setupMapping({
          tenantId: 'org_error',
          targetType: 'menu',
        });

        // Tenant lookup fails
        mockGet.mockRejectedValueOnce(new Error('Tenant not found'));

        const result = await resolveRoute('error.com', '/');

        // Falls back to brand-style path
        expect(result!.path).toBe('/org_error');
      });
    });
  });
});
