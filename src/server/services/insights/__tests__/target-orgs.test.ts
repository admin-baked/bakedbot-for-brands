import {
  collectUserFallbackInsightTargets,
  extractUserScopedOrgIds,
  inferInsightTargetOrgType,
  type InsightFallbackUserRecord,
} from '../target-orgs';

describe('insight target org discovery', () => {
  it('extracts user-scoped org ids without duplicates', () => {
    const user: InsightFallbackUserRecord = {
      id: 'user-1',
      orgId: 'org-primary',
      currentOrgId: 'org-current',
      organizationIds: ['org-primary', 'org-shared'],
      orgMemberships: {
        'org-current': { orgType: 'dispensary' },
        'org-extra': { orgType: 'brand' },
      },
    };

    expect(extractUserScopedOrgIds(user)).toEqual([
      'org-current',
      'org-primary',
      'org-shared',
      'org-extra',
    ]);
  });

  it('prefers orgMembership orgType over role fallback', () => {
    const user: InsightFallbackUserRecord = {
      id: 'user-1',
      role: 'brand_admin',
      orgMemberships: {
        'org-dispensary': { orgType: 'dispensary' },
      },
    };

    expect(inferInsightTargetOrgType(user, 'org-dispensary')).toBe('dispensary');
  });

  it('collects user fallback orgs for requested types and skips existing tenant orgs', () => {
    const users: InsightFallbackUserRecord[] = [
      {
        id: 'disp-admin',
        role: 'dispensary_admin',
        currentOrgId: 'org-thrive',
        orgMemberships: {
          'org-thrive': { orgType: 'dispensary' },
        },
      },
      {
        id: 'super-user',
        role: 'super_user',
        orgMemberships: {
          'org-brand': { orgType: 'brand' },
          'org-grower': { orgType: 'grower' },
        },
      },
      {
        id: 'brand-member',
        role: 'brand_member',
        currentOrgId: 'org-existing-tenant',
      },
    ];

    const targets = collectUserFallbackInsightTargets(
      users,
      ['org-existing-tenant'],
      ['dispensary', 'brand']
    );

    expect(targets).toEqual([
      {
        orgId: 'org-brand',
        orgType: 'brand',
        source: 'user_fallback',
        userId: 'super-user',
      },
      {
        orgId: 'org-thrive',
        orgType: 'dispensary',
        source: 'user_fallback',
        userId: 'disp-admin',
      },
    ]);
  });

  it('ignores orgs whose inferred type is not requested', () => {
    const users: InsightFallbackUserRecord[] = [
      {
        id: 'grower-1',
        role: 'grower',
        currentOrgId: 'org-grower',
      },
    ];

    const targets = collectUserFallbackInsightTargets(users, [], ['dispensary', 'brand']);

    expect(targets).toEqual([]);
  });
});
