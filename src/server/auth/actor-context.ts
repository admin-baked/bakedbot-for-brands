export const PLATFORM_ORG_ID = 'bakedbot_super_admin';

export type ActorContextLike = {
    uid?: string | null;
    role?: string | null;
    currentOrgId?: string | null;
    orgId?: string | null;
    brandId?: string | null;
};

function normalizeIdCandidate(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('/')) {
        return null;
    }

    return trimmed;
}

export function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

export function isValidOrgId(orgId: string): boolean {
    return normalizeIdCandidate(orgId) !== null;
}

export function isValidDocumentId(id: string): boolean {
    const normalized = normalizeIdCandidate(id);
    return normalized !== null && normalized.length <= 128;
}

export function resolveActorOrgId(actor: ActorContextLike | null | undefined): string | null {
    if (!actor) {
        return null;
    }

    const candidates = [actor.currentOrgId, actor.orgId, actor.brandId];
    for (const candidate of candidates) {
        const normalized = normalizeIdCandidate(candidate);
        if (normalized) {
            return normalized;
        }
    }

    if (isSuperRole(actor.role)) {
        return PLATFORM_ORG_ID;
    }

    return null;
}

export function resolveActorOrgIdWithLegacyAliases(
    actor: ActorContextLike | null | undefined,
    legacyOrgIds: unknown[],
): string | null {
    if (!actor) {
        return null;
    }

    const candidates = [actor.currentOrgId, actor.orgId, actor.brandId, ...legacyOrgIds];
    for (const candidate of candidates) {
        const normalized = normalizeIdCandidate(candidate);
        if (normalized) {
            return normalized;
        }
    }

    if (isSuperRole(actor.role)) {
        return PLATFORM_ORG_ID;
    }

    return null;
}

export function requireActorOrgId(actor: ActorContextLike | null | undefined, actionName: string): string {
    const orgId = resolveActorOrgId(actor);
    if (!orgId || !isValidOrgId(orgId)) {
        throw new Error(`Missing organization context for ${actionName}`);
    }

    return orgId;
}

export function resolveScopedOrgId({
    actor,
    requestedOrgId,
    allowSuperOverride = false,
}: {
    actor: ActorContextLike | null | undefined;
    requestedOrgId?: string | null;
    allowSuperOverride?: boolean;
}): string {
    const actorOrgId = resolveActorOrgId(actor);
    if (!actorOrgId || !isValidOrgId(actorOrgId)) {
        throw new Error('Missing organization context');
    }

    if (requestedOrgId == null) {
        return actorOrgId;
    }

    const normalizedRequestedOrgId = normalizeIdCandidate(requestedOrgId);
    if (!normalizedRequestedOrgId) {
        throw new Error('Invalid organization context');
    }

    if (normalizedRequestedOrgId === actorOrgId) {
        return actorOrgId;
    }

    if (!isSuperRole(actor?.role) || !allowSuperOverride) {
        throw new Error('Unauthorized org context');
    }

    return normalizedRequestedOrgId;
}
