'use server';

/**
 * Server actions for the CRM Context Panel.
 *
 * Wraps crm-tools functions so they can be called safely from
 * client components without pulling server-only imports into
 * the client bundle.
 */

import { requireUser } from '@/server/auth/auth';
import {
    type ActorContextLike,
    isSuperRole,
    isValidDocumentId,
    resolveActorOrgIdWithLegacyAliases,
} from '@/server/auth/actor-context';
import { lookupCustomer, getCustomerHistory, getCustomerComms } from '@/server/tools/crm-tools';

type CrmPanelActor = ActorContextLike & {
    tenantId?: string | null;
    organizationId?: string | null;
};

function sanitizeLookupInput(value: string): string {
    return value.trim().slice(0, 320);
}

function clampLimit(limit: number, fallback: number): number {
    if (!Number.isFinite(limit)) return fallback;
    return Math.min(100, Math.max(1, Math.floor(limit)));
}

function getActorOrgId(user: CrmPanelActor): string | null {
    return resolveActorOrgIdWithLegacyAliases(user, [
        user.tenantId,
        user.organizationId,
    ]);
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }

    const actorOrgId = getActorOrgId(user as CrmPanelActor);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

export async function lookupCustomerAction(
    identifier: string,
    orgId: string,
) {
    if (!isValidDocumentId(orgId)) {
        throw new Error('Invalid organization ID');
    }
    const sanitizedIdentifier = sanitizeLookupInput(identifier);
    if (!sanitizedIdentifier) {
        throw new Error('Identifier is required');
    }
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    return lookupCustomer(sanitizedIdentifier, orgId);
}

export async function getCustomerHistoryAction(
    customerId: string,
    orgId: string,
    limit: number = 5,
) {
    if (!isValidDocumentId(orgId)) {
        throw new Error('Invalid organization ID');
    }
    const sanitizedCustomerId = sanitizeLookupInput(customerId);
    if (!sanitizedCustomerId) {
        throw new Error('Customer ID is required');
    }
    const safeLimit = clampLimit(limit, 5);
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    return getCustomerHistory(sanitizedCustomerId, orgId, safeLimit);
}

export async function getCustomerCommsAction(
    customerEmail: string,
    orgId: string,
    limit: number = 5,
) {
    if (!isValidDocumentId(orgId)) {
        throw new Error('Invalid organization ID');
    }
    const sanitizedCustomerEmail = sanitizeLookupInput(customerEmail);
    if (!sanitizedCustomerEmail) {
        throw new Error('Customer email is required');
    }
    const safeLimit = clampLimit(limit, 5);
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    return getCustomerComms(sanitizedCustomerEmail, orgId, safeLimit);
}
