import {
  getVisitorCheckinPilotOrgId,
  isVisitorCheckinPilot,
} from '../visitor-checkin-pilot';

describe('visitorCheckinPilot', () => {
  it('enables the Thrive pilot by brand slug fallback', () => {
    expect(
      getVisitorCheckinPilotOrgId({
        brandSlug: 'thrivesyracuse',
      }),
    ).toBe('org_thrive_syracuse');
  });

  it('enables the pilot when the org id matches Thrive', () => {
    expect(
      isVisitorCheckinPilot({
        brandSlug: 'other-brand',
        brandOrgId: 'org_thrive_syracuse',
        brandId: 'brand_other_brand',
      }),
    ).toBe(true);
  });

  it('keeps the promo off for non-pilot brands', () => {
    expect(
      getVisitorCheckinPilotOrgId({
        brandSlug: 'other-brand',
        brandOrgId: 'org_other_brand',
        brandId: 'brand_other_brand',
      }),
    ).toBeNull();
  });
});
