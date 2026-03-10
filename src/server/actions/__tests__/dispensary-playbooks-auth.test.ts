import { isUserAuthorizedForOrg } from '@/server/actions/dispensary-playbooks-auth';

describe('isUserAuthorizedForOrg', () => {
  it('allows super_user across orgs', () => {
    const session: Record<string, unknown> = { role: 'super_user', orgId: 'org_a' };
    expect(isUserAuthorizedForOrg(session, 'org_b')).toBe(true);
  });

  it('allows org member via orgIds list', () => {
    const session: Record<string, unknown> = { role: 'dispensary_admin', orgIds: ['org_x', 'org_y'] };
    expect(isUserAuthorizedForOrg(session, 'org_y')).toBe(true);
  });

  it('rejects unrelated non-super user', () => {
    const session: Record<string, unknown> = { role: 'dispensary_staff', orgId: 'org_a', orgIds: ['org_a'] };
    expect(isUserAuthorizedForOrg(session, 'org_b')).toBe(false);
  });
});
