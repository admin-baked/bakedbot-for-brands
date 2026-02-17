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

/**
 * Get platform-wide analytics (MRR, ARR, signups, users)
 */
export const platformGetAnalytics = async () => {
    try {
        const result = await getPlatformAnalytics();
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
 */
export const platformListBrands = async () => {
    try {
        const brands = await getBrands();
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
 */
export const platformListDispensaries = async () => {
    try {
        const dispensaries = await getDispensaries();
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
 */
export const platformListPlaybooks = async () => {
    try {
        const playbooks = await getSystemPlaybooks();
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
 */
export const platformTogglePlaybook = async (playbookId: string, active: boolean) => {
    try {
        const result = await toggleSystemPlaybook(playbookId, active);
        if (!(result as any).success) {
            return { success: false, error: (result as any).message };
        }
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
 */
export const platformListFeatureFlags = async () => {
    try {
        const { getAdminFirestore } = await import('@/firebase/admin');
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('system_config').doc('beta_features').get();
        const flags = (doc.exists ? doc.data() : {}) || {};

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
 */
export const platformToggleFeature = async (featureId: string, enabled: boolean) => {
    try {
        const result = await toggleBetaFeature(featureId, enabled);
        if ((result as any).error) {
            return { success: false, error: (result as any).message };
        }
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
 */
export const platformListCoupons = async () => {
    try {
        const coupons = await getCoupons();
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
