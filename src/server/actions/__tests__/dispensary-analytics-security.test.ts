import { getProductsAnalytics } from '../dispensary-analytics';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getMarketBenchmarks } from '@/server/services/market-benchmarks';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/market-benchmarks', () => ({
  getMarketBenchmarks: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('dispensary-analytics security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed when non-super user has no org context', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await getProductsAnalytics('org-a');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Forbidden');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('uses currentOrgId for org access checks', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
    });
    (getMarketBenchmarks as jest.Mock).mockRejectedValue(new Error('no benchmarks'));

    const itemsGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const itemsCollection = {
      limit: jest.fn().mockReturnThis(),
      get: itemsGet,
    };
    const productsDoc = {
      collection: jest.fn().mockImplementation(() => itemsCollection),
    };
    const publicViewsCollection = {
      doc: jest.fn().mockImplementation(() => productsDoc),
    };
    const tenantDoc = {
      collection: jest.fn().mockImplementation(() => publicViewsCollection),
    };
    const tenantsCollection = {
      doc: jest.fn().mockImplementation(() => tenantDoc),
    };

    const fallbackGet = jest.fn().mockResolvedValue({ docs: [] });
    const productsCollection = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: fallbackGet,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'tenants') return tenantsCollection;
        if (name === 'products') return productsCollection;
        return {};
      }),
    });

    const result = await getProductsAnalytics('org-current');

    expect(result.success).toBe(true);
    expect(tenantsCollection.doc).toHaveBeenCalledWith('org-current');
    expect(productsCollection.where).toHaveBeenCalledWith('dispensaryId', '==', 'org-current');
  });
});
