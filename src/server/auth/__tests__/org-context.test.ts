import { getActorOrgId, isSuperRole } from '../org-context';

describe('org-context', () => {
  it('prefers currentOrgId over orgId and brandId', () => {
    expect(getActorOrgId({
      currentOrgId: 'org-current',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
    })).toBe('org-current');
  });

  it('uses orgId for brand users when brandId is absent', () => {
    expect(getActorOrgId({
      role: 'brand_admin',
      orgId: 'org_ecstatic_edibles',
    })).toBe('org_ecstatic_edibles');
  });

  it('can include locationId when explicitly requested', () => {
    expect(getActorOrgId({
      locationId: 'loc-1',
    }, { includeLocationId: true })).toBe('loc-1');
  });

  it('rejects invalid org candidates', () => {
    expect(getActorOrgId({
      currentOrgId: 'bad/org',
      orgId: ' ',
      brandId: null,
    })).toBeNull();
  });

  it('identifies super roles', () => {
    expect(isSuperRole('super_user')).toBe(true);
    expect(isSuperRole('super_admin')).toBe(true);
    expect(isSuperRole('brand_admin')).toBe(false);
  });
});
