import { getVendorBrands, updateVendorBrand } from '../vendor-brands';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/brand-guide-extractor', () => ({
  getBrandGuideExtractor: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('vendor-brands security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty list when org context is missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await getVendorBrands();

    expect(result).toEqual([]);
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('uses currentOrgId for vendor brand reads', async () => {
    const doc = jest.fn().mockImplementation(() => ({
      collection: jest.fn().mockImplementation(() => ({
        orderBy: jest.fn().mockImplementation(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    }));
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn().mockImplementation(() => ({ doc })),
    });
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
      currentOrgId: 'org-current',
      role: 'dispensary_admin',
    });

    await getVendorBrands();

    expect(doc).toHaveBeenCalledWith('org-current');
  });

  it('fails updates when org context is missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await updateVendorBrand('brand-1', { name: 'Updated' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing organization context');
  });
});
