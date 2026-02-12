'use server';

/**
 * Server actions for the CRM Context Panel.
 *
 * Wraps crm-tools functions so they can be called safely from
 * client components without pulling server-only imports into
 * the client bundle.
 */

import { lookupCustomer, getCustomerHistory, getCustomerComms } from '@/server/tools/crm-tools';

export async function lookupCustomerAction(
    identifier: string,
    orgId: string,
) {
    return lookupCustomer(identifier, orgId);
}

export async function getCustomerHistoryAction(
    customerId: string,
    orgId: string,
    limit: number = 5,
) {
    return getCustomerHistory(customerId, orgId, limit);
}

export async function getCustomerCommsAction(
    customerEmail: string,
    orgId: string,
    limit: number = 5,
) {
    return getCustomerComms(customerEmail, orgId, limit);
}
