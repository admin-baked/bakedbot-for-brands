'use server';

import type { CRMFilters } from '@/server/services/crm-service';
import { logger } from '@/lib/logger';

type CRMReadResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return 'Unexpected CRM error';
}

async function runCRMReadAction<T>(
    actionName: string,
    action: () => Promise<T>
): Promise<CRMReadResult<T>> {
    try {
        return {
            success: true,
            data: await action(),
        };
    } catch (error) {
        const message = getErrorMessage(error);
        void logger.error(`[CRM Dashboard Action] ${actionName} failed`, {
            error: message,
        });
        return {
            success: false,
            error: message,
        };
    }
}

export async function getBrands(filters: CRMFilters = {}) {
    return runCRMReadAction('getBrands', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getBrands(filters);
    });
}

export async function getDispensaries(filters: CRMFilters = {}) {
    return runCRMReadAction('getDispensaries', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getDispensaries(filters);
    });
}

export async function getPlatformLeads(filters: CRMFilters = {}) {
    return runCRMReadAction('getPlatformLeads', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getPlatformLeads(filters);
    });
}

export async function getPlatformUsers(filters: CRMFilters = {}) {
    return runCRMReadAction('getPlatformUsers', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getPlatformUsers(filters);
    });
}

export async function getCRMUserStats() {
    return runCRMReadAction('getCRMUserStats', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getCRMUserStats();
    });
}

/** Fetch users + stats sharing subscription data — avoids duplicate collection scans. */
export async function getCRMUsersAndStats(filters: CRMFilters = {}) {
    return runCRMReadAction('getCRMUsersAndStats', async () => {
        const crm = await import('@/server/services/crm-service');
        // Pre-fetch top-level subscriptions once; passed to both functions to skip duplicate reads.
        const topLevelSubsDocs = await crm.getTopLevelSubsDocs();
        const users = await crm.getPlatformUsers(filters, topLevelSubsDocs);
        const userStats = await crm.getCRMUserStats(users, topLevelSubsDocs);
        return { users, userStats };
    });
}

export async function getCRMStats() {
    return runCRMReadAction('getCRMStats', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getCRMStats();
    });
}

export async function deleteCrmEntity(
    id: string,
    type: 'brand' | 'dispensary' | 'user',
) {
    const crm = await import('@/server/services/crm-service');
    return crm.deleteCrmEntity(id, type);
}

export async function deleteUserByEmail(email: string) {
    const crm = await import('@/server/services/crm-service');
    return crm.deleteUserByEmail(email);
}

export async function markAccountAsTest(userId: string, isTest: boolean) {
    const crm = await import('@/server/services/crm-service');
    return crm.markAccountAsTest(userId, isTest);
}

export async function getTestAccountCount() {
    return runCRMReadAction('getTestAccountCount', async () => {
        const crm = await import('@/server/services/crm-service');
        return crm.getTestAccountCount();
    });
}
