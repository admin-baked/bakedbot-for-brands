/**
 * Platform Analytics & Control Tools
 *
 * Super User agents can monitor platform metrics and control system-wide settings via these tools.
 * Available to: Leo (COO), Linus (CTO), Jack (CRO), Glenda (CMO), Mike (CFO)
 */

import {
    getPlatformAnalytics,
    getBrands,
    getDispensaries,
} from '@/app/dashboard/ceo/actions/data-actions';
import {
    toggleBetaFeature,
    getSystemPlaybooks,
    toggleSystemPlaybook,
    getCoupons,
} from '@/app/dashboard/ceo/actions/system-actions';
import { logger } from '@/lib/logger';
import { toolCache, TOOL_CACHE_CONFIG } from '@/server/services/tool-cache';

/**
 * Get platform-wide analytics (MRR, ARR, signups, users)
 * Uses caching with 10-minute TTL to reduce Firestore queries
 */
export const platformGetAnalytics = async () => {
    try {
        const result = await toolCache.withCache(
            'platform_getAnalytics',
            async () => await getPlatformAnalytics(),
            TOOL_CACHE_CONFIG.platform_getAnalytics
        );
        return {
            success: true,
            analytics: {
                revenue: result.revenue,
                signups: result.signups,
                activeUsers: result.activeUsers,
                retention: result.retention,
                recentSignups: result.recentSignups,
            },
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to get analytics:', e);
        return { success: false, error: e.message };
    }
};

/**
 * List all brands on the platform
 * Uses caching with 30-minute TTL (customers added infrequently)
 */
export const platformListBrands = async () => {
    try {
        const brands = await toolCache.withCache(
            'platform_listBrands',
            async () => await getBrands(),
            TOOL_CACHE_CONFIG.platform_listTenants  // Uses same TTL as listTenants
        );
        return {
            success: true,
            brands,
            count: brands.length,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to list brands:', e);
        return { success: false, error: e.message, brands: [], count: 0 };
    }
};

/**
 * List all dispensaries on the platform
 * Uses caching with 30-minute TTL (dispensaries added infrequently)
 */
export const platformListDispensaries = async () => {
    try {
        const dispensaries = await toolCache.withCache(
            'platform_listDispensaries',
            async () => await getDispensaries(),
            TOOL_CACHE_CONFIG.platform_listTenants  // Uses same TTL as listTenants
        );
        return {
            success: true,
            dispensaries,
            count: dispensaries.length,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to list dispensaries:', e);
        return { success: false, error: e.message, dispensaries: [], count: 0 };
    }
};

/**
 * List all system playbooks (platform-wide automation rules)
 * Uses caching with 30-minute TTL (playbooks rarely changed)
 */
export const platformListPlaybooks = async () => {
    try {
        const playbooks = await toolCache.withCache(
            'platform_listPlaybooks',
            async () => await getSystemPlaybooks(),
            TOOL_CACHE_CONFIG.platform_listPlaybooks
        );
        return {
            success: true,
            playbooks,
            count: playbooks.length,
            active: playbooks.filter(p => (p as any).active).length,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to list playbooks:', e);
        return { success: false, error: e.message, playbooks: [], count: 0 };
    }
};

/**
 * Toggle a system playbook on/off
 * Invalidates playbook cache after mutation
 */
export const platformTogglePlaybook = async (playbookId: string, active: boolean) => {
    try {
        const result = await toggleSystemPlaybook(playbookId, active);
        if (!(result as any).success) {
            return { success: false, error: (result as any).message };
        }
        // Invalidate playbook listings cache after mutation
        toolCache.invalidate('platform_listPlaybooks');
        return {
            success: true,
            message: `Playbook '${playbookId}' ${active ? 'activated' : 'deactivated'}`,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to toggle playbook:', e);
        return { success: false, error: e.message };
    }
};

/**
 * List all active beta feature flags
 * Uses caching with 1-hour TTL (feature flags change slowly)
 */
export const platformListFeatureFlags = async () => {
    try {
        const flags = await toolCache.withCache(
            'platform_listFeatureFlags',
            async () => {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const firestore = getAdminFirestore();
                const doc = await firestore.collection('system_config').doc('beta_features').get();
                return (doc.exists ? doc.data() : {}) || {};
            },
            TOOL_CACHE_CONFIG.platform_listFeatureFlags
        );

        return {
            success: true,
            flags,
            activeCount: Object.values(flags as Record<string, any>).filter(v => v === true).length,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to list feature flags:', e);
        return { success: false, error: e.message, flags: {}, activeCount: 0 };
    }
};

/**
 * Toggle a beta feature flag
 * Invalidates feature flags cache after mutation
 */
export const platformToggleFeature = async (featureId: string, enabled: boolean) => {
    try {
        const result = await toggleBetaFeature(featureId, enabled);
        if ((result as any).error) {
            return { success: false, error: (result as any).message };
        }
        // Invalidate feature flags cache after mutation
        toolCache.invalidate('platform_listFeatureFlags');
        return {
            success: true,
            message: (result as any).message,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to toggle feature:', e);
        return { success: false, error: e.message };
    }
};

/**
 * List all active coupons
 * Uses caching with 5-minute TTL (coupon inventory can change)
 */
export const platformListCoupons = async () => {
    try {
        const coupons = await toolCache.withCache(
            'platform_listCoupons',
            async () => await getCoupons(),
            TOOL_CACHE_CONFIG.platform_listCoupons
        );
        const activeCoupons = coupons.filter((c: any) => c.active);
        return {
            success: true,
            coupons,
            total: coupons.length,
            active: activeCoupons.length,
        };
    } catch (e: any) {
        logger.error('[Platform Tool] Failed to list coupons:', e);
        return { success: false, error: e.message, coupons: [], total: 0, active: 0 };
    }
};
