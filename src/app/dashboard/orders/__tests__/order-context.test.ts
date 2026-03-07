import {
  getTenantOrgId,
  getLocationId,
  getDispensaryRetailerId,
  shouldRetryWithOrgFallback,
} from '../order-context';

describe('order-context', () => {
  describe('getTenantOrgId', () => {
    it('prefers orgId over other identifiers', () => {
      expect(
        getTenantOrgId({
          uid: 'user_1',
          orgId: 'org_abc',
          currentOrgId: 'org_old',
          brandId: 'brand_1',
          locationId: 'loc_1',
        })
      ).toBe('org_abc');
    });

    it('falls back to currentOrgId, then brandId, then uid', () => {
      expect(getTenantOrgId({ uid: 'user_1', currentOrgId: 'org_current' })).toBe('org_current');
      expect(getTenantOrgId({ uid: 'user_1', brandId: 'brand_1' })).toBe('brand_1');
      expect(getTenantOrgId({ uid: 'user_1' })).toBe('user_1');
    });
  });

  describe('location and retailer resolution', () => {
    it('returns locationId when present', () => {
      expect(getLocationId({ locationId: 'loc_22' })).toBe('loc_22');
      expect(getDispensaryRetailerId({ locationId: 'loc_22', orgId: 'org_22' })).toBe('loc_22');
    });

    it('falls back to orgId when location is missing', () => {
      expect(getLocationId({})).toBeUndefined();
      expect(getDispensaryRetailerId({ orgId: 'org_22' })).toBe('org_22');
    });
  });

  describe('shouldRetryWithOrgFallback', () => {
    it('retries when location query has no results and location differs from org', () => {
      expect(
        shouldRetryWithOrgFallback({
          bakedBotOrdersCount: 0,
          isDispensaryRole: true,
          locationId: 'loc_1',
          orgId: 'org_1',
        })
      ).toBe(true);
    });

    it('does not retry when location and org are identical', () => {
      expect(
        shouldRetryWithOrgFallback({
          bakedBotOrdersCount: 0,
          isDispensaryRole: true,
          locationId: 'same_id',
          orgId: 'same_id',
        })
      ).toBe(false);
    });

    it('does not retry when orders already exist or user is not dispensary', () => {
      expect(
        shouldRetryWithOrgFallback({
          bakedBotOrdersCount: 4,
          isDispensaryRole: true,
          locationId: 'loc_1',
          orgId: 'org_1',
        })
      ).toBe(false);

      expect(
        shouldRetryWithOrgFallback({
          bakedBotOrdersCount: 0,
          isDispensaryRole: false,
          locationId: 'loc_1',
          orgId: 'org_1',
        })
      ).toBe(false);
    });
  });
});
