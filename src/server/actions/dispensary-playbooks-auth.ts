export function isUserAuthorizedForOrg(session: Record<string, unknown>, orgId: string): boolean {
    const role = typeof session.role === 'string' ? session.role : null;
    if (role === 'super_user' || role === 'super_admin') {
        return true;
    }

    const directOrgId = typeof session.orgId === 'string' ? session.orgId : null;
    const currentOrgId = typeof session.currentOrgId === 'string' ? session.currentOrgId : null;
    const brandId = typeof session.brandId === 'string' ? session.brandId : null;
    const orgIds = Array.isArray(session.orgIds) ? session.orgIds.filter((v): v is string => typeof v === 'string') : [];

    return directOrgId === orgId || currentOrgId === orgId || brandId === orgId || orgIds.includes(orgId);
}
