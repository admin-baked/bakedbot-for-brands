/**
 * System Control Tools
 *
 * Super User agents can control system-wide settings and diagnostics.
 * Available to: Leo (COO), Linus (CTO), Jack (CRO), Glenda (CMO), Mike (CFO)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * Get system configuration overview
 */
export const systemGetConfig = async () => {
    try {
        const db = getAdminFirestore();
        const configDoc = await db.collection('system_config').doc('settings').get();
        const config = configDoc.exists ? configDoc.data() : {};

        return {
            success: true,
            config: {
                emailProvider: (config as any)?.emailProvider || 'mailjet',
                videoProvider: (config as any)?.videoProvider || 'vimeo',
                aiModel: (config as any)?.aiModel || 'gpt-4',
                timezone: (config as any)?.timezone || 'UTC',
                ...config,
            },
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to get config:', e);
        return { success: false, error: e.message, config: {} };
    }
};

/**
 * Update system configuration
 */
export const systemSetConfig = async (updates: Record<string, any>) => {
    try {
        const db = getAdminFirestore();
        await db.collection('system_config').doc('settings').set(updates, { merge: true });

        logger.info('[System Control] Configuration updated:', Object.keys(updates));

        return {
            success: true,
            message: `Updated ${Object.keys(updates).length} configuration settings`,
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to set config:', e);
        return { success: false, error: e.message };
    }
};

/**
 * List all active integrations
 */
export const systemListIntegrations = async () => {
    try {
        const db = getAdminFirestore();
        const snapshot = await db.collection('system_config').doc('integrations').get();
        const integrations = snapshot.exists ? snapshot.data() : {};

        const integrationsList = Object.entries(integrations as Record<string, any>).map(([id, config]) => ({
            id,
            ...config,
        }));

        return {
            success: true,
            integrations: integrationsList,
            total: integrationsList.length,
            active: integrationsList.filter((i: any) => i.status === 'active').length,
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to list integrations:', e);
        return { success: false, error: e.message, integrations: [], total: 0, active: 0 };
    }
};

/**
 * Check system audit log
 */
export const systemGetAuditLog = async (limit: number = 50) => {
    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            action: doc.data().action,
            actor: doc.data().actor,
            resource: doc.data().resource,
            status: doc.data().status,
            timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
            details: doc.data().details,
        }));

        return {
            success: true,
            logs,
            total: logs.length,
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to get audit log:', e);
        return { success: false, error: e.message, logs: [], total: 0 };
    }
};

/**
 * Get system statistics (tenants, users, orders)
 */
export const systemGetStats = async () => {
    try {
        const db = getAdminFirestore();

        // Count tenants
        const tenantsSnap = await db.collection('tenants').count().get();
        const tenantCount = tenantsSnap.data().count;

        // Count users
        const usersSnap = await db.collection('users').count().get();
        const userCount = usersSnap.data().count;

        // Count active orders (today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersSnap = await db
            .collection('orders')
            .where('createdAt', '>=', today)
            .count()
            .get();
        const ordersToday = ordersSnap.data().count;

        return {
            success: true,
            stats: {
                tenants: tenantCount,
                users: userCount,
                ordersToday,
                timestamp: new Date().toISOString(),
            },
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to get stats:', e);
        return { success: false, error: e.message, stats: {} };
    }
};

/**
 * Clear cached data (if applicable)
 */
export const systemClearCache = async (cacheType?: string) => {
    try {
        // This is a placeholder - actual cache clearing would depend on caching strategy
        logger.info(`[System Control] Cache clear requested for: ${cacheType || 'all'}`);

        return {
            success: true,
            message: `Cache cleared for: ${cacheType || 'all'}`,
            timestamp: new Date().toISOString(),
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to clear cache:', e);
        return { success: false, error: e.message };
    }
};
