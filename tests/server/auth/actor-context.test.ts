import {
    PLATFORM_ORG_ID,
    isSuperRole,
    isValidDocumentId,
    isValidOrgId,
    requireActorOrgId,
    resolveActorOrgId,
    resolveActorOrgIdWithLegacyAliases,
    resolveScopedOrgId,
} from '@/server/auth/actor-context';

describe('actor-context', () => {
    it('prefers currentOrgId over orgId and brandId', () => {
        expect(resolveActorOrgId({
            currentOrgId: 'org-current',
            orgId: 'org-fallback',
            brandId: 'brand-fallback',
        })).toBe('org-current');
    });

    it('uses orgId when currentOrgId is missing', () => {
        expect(resolveActorOrgId({
            orgId: 'org-primary',
            brandId: 'brand-fallback',
        })).toBe('org-primary');
    });

    it('uses brandId when no other org fields are present', () => {
        expect(resolveActorOrgId({
            brandId: 'brand-org',
        })).toBe('brand-org');
    });

    it('supports legacy org aliases through the shared compatibility helper', () => {
        expect(resolveActorOrgIdWithLegacyAliases(
            {
                role: 'brand_admin',
            },
            ['tenant-org', 'organization-org'],
        )).toBe('tenant-org');
    });

    it('falls back to the platform org for super users without org context', () => {
        expect(resolveActorOrgId({
            role: 'super_user',
        })).toBe(PLATFORM_ORG_ID);
        expect(resolveActorOrgId({
            role: 'super_admin',
        })).toBe(PLATFORM_ORG_ID);
    });

    it('returns null for non-super users without org context', () => {
        expect(resolveActorOrgId({
            role: 'brand_admin',
        })).toBeNull();
    });

    it('requires actor org context with an action-specific error', () => {
        expect(() => requireActorOrgId({
            role: 'brand_admin',
        }, 'testAction')).toThrow('Missing organization context for testAction');
    });

    it('rejects invalid org ids', () => {
        expect(isValidOrgId('org-valid')).toBe(true);
        expect(isValidOrgId('bad/org')).toBe(false);
        expect(isValidOrgId('')).toBe(false);
    });

    it('rejects invalid document ids', () => {
        expect(isValidDocumentId('doc-123')).toBe(true);
        expect(isValidDocumentId('bad/doc')).toBe(false);
        expect(isValidDocumentId('a'.repeat(129))).toBe(false);
    });

    it('allows requested org override for super users only when enabled', () => {
        expect(resolveScopedOrgId({
            actor: { role: 'super_user' },
            requestedOrgId: 'org-target',
            allowSuperOverride: true,
        })).toBe('org-target');
    });

    it('blocks requested org override for super users when not enabled', () => {
        expect(() => resolveScopedOrgId({
            actor: { role: 'super_user' },
            requestedOrgId: 'org-target',
            allowSuperOverride: false,
        })).toThrow('Unauthorized org context');
    });

    it('blocks requested org override for non-super users', () => {
        expect(() => resolveScopedOrgId({
            actor: { role: 'brand_admin', currentOrgId: 'org-a' },
            requestedOrgId: 'org-b',
            allowSuperOverride: true,
        })).toThrow('Unauthorized org context');
    });

    it('returns the actor org for normal users when no override is requested', () => {
        expect(resolveScopedOrgId({
            actor: { role: 'brand_admin', currentOrgId: 'org-a' },
        })).toBe('org-a');
    });

    it('identifies super roles', () => {
        expect(isSuperRole('super_user')).toBe(true);
        expect(isSuperRole('super_admin')).toBe(true);
        expect(isSuperRole(['dispensary_admin', 'super_user'])).toBe(true);
        expect(isSuperRole('brand_admin')).toBe(false);
    });
});
