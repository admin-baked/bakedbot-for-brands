'use server';

/**
 * Server actions for the CRM Context Panel.
 *
 * Wraps crm-tools functions so they can be called safely from
 * client components without pulling server-only imports into
 * the client bundle.
 */

import { requireUser } from '@/server/auth/auth';
import { lookupCustomer, getCustomerHistory, getCustomerComms } from '@/server/tools/crm-tools';

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }

    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

export async function lookupCustomerAction(
    identifier: string,
    orgId: string,
) {
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    return lookupCustomer(identifier, orgId);
}

export async function getCustomerHistoryAction(
    customerId: string,
    orgId: string,
    limit: number = 5,
) {
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    return getCustomerHistory(customerId, orgId, limit);
}

export async function getCustomerCommsAction(
    customerEmail: string,
    orgId: string,
    limit: number = 5,
) {
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    return getCustomerComms(customerEmail, orgId, limit);
}
