'use server';

import type { CRMFilters } from '@/server/services/crm-service';

export async function getBrands(filters: CRMFilters = {}) {
    const crm = await import('@/server/services/crm-service');
    return crm.getBrands(filters);
}

export async function getDispensaries(filters: CRMFilters = {}) {
    const crm = await import('@/server/services/crm-service');
    return crm.getDispensaries(filters);
}

export async function getPlatformLeads(filters: CRMFilters = {}) {
    const crm = await import('@/server/services/crm-service');
    return crm.getPlatformLeads(filters);
}

export async function getPlatformUsers(filters: CRMFilters = {}) {
    const crm = await import('@/server/services/crm-service');
    return crm.getPlatformUsers(filters);
}

export async function getCRMUserStats() {
    const crm = await import('@/server/services/crm-service');
    return crm.getCRMUserStats();
}

/** Fetch users once and compute user stats from the same data — avoids a duplicate users scan. */
export async function getCRMUsersAndStats(filters: CRMFilters = {}) {
    const crm = await import('@/server/services/crm-service');
    const users = await crm.getPlatformUsers(filters);
    const userStats = await crm.getCRMUserStats(users);
    return { users, userStats };
}

export async function getCRMStats() {
    const crm = await import('@/server/services/crm-service');
    return crm.getCRMStats();
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
    const crm = await import('@/server/services/crm-service');
    return crm.getTestAccountCount();
}
