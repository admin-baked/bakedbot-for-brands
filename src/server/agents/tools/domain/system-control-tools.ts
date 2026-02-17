/**
 * System Control Tools
 *
 * Super User agents can control system-wide settings and diagnostics.
 * Available to: Leo (COO), Linus (CTO), Jack (CRO), Glenda (CMO), Mike (CFO)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { toolCache, TOOL_CACHE_CONFIG } from '@/server/services/tool-cache';

/**
 * Get system configuration overview
 * Uses caching with 1-hour TTL (config changes infrequently)
 */
export const systemGetConfig = async () => {
    try {
        const config = await toolCache.withCache(
            'system_getConfig',
            async () => {
                const db = getAdminFirestore();
                const configDoc = await db.collection('system_config').doc('settings').get();
                return configDoc.exists ? configDoc.data() : {};
            },
            TOOL_CACHE_CONFIG.system_getConfig
        );

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
 * Invalidates config cache after mutation
 */
export const systemSetConfig = async (updates: Record<string, any>) => {
    try {
        const db = getAdminFirestore();
        await db.collection('system_config').doc('settings').set(updates, { merge: true });

        logger.info('[System Control] Configuration updated:', Object.keys(updates));

        // Invalidate config cache after mutation
        toolCache.invalidate('system_getConfig');

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
 * Uses caching with 30-minute TTL (integrations added/removed infrequently)
 */
export const systemListIntegrations = async () => {
    try {
        const integrations = await toolCache.withCache(
            'system_listIntegrations',
            async () => {
                const db = getAdminFirestore();
                const snapshot = await db.collection('system_config').doc('integrations').get();
                return snapshot.exists ? snapshot.data() : {};
            },
            TOOL_CACHE_CONFIG.system_listIntegrations
        );

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
 * Uses caching with 5-minute TTL (stats are semi-live)
 */
export const systemGetStats = async () => {
    try {
        const stats = await toolCache.withCache(
            'system_getStats',
            async () => {
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
                    tenants: tenantCount,
                    users: userCount,
                    ordersToday,
                };
            },
            TOOL_CACHE_CONFIG.system_getStats
        );

        return {
            success: true,
            stats: {
                ...stats,
                timestamp: new Date().toISOString(),
            },
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to get stats:', e);
        return { success: false, error: e.message, stats: {} };
    }
};

/**
 * Clear cached data from tool cache service
 * Can clear all caches or specific type (analytics, tenants, playbooks, etc.)
 */
export const systemClearCache = async (cacheType?: string) => {
    try {
        const clearedCount = toolCache.clear(cacheType ? `${cacheType}_` : undefined);
        const stats = toolCache.getStats();

        return {
            success: true,
            message: `Cache cleared (${clearedCount} entries), ${stats.entries} entries remaining`,
            stats: {
                entriesCleared: clearedCount,
                entriesRemaining: stats.entries,
                hitRate: stats.hitRate.toFixed(1) + '%',
            },
            timestamp: new Date().toISOString(),
        };
    } catch (e: any) {
        logger.error('[System Control] Failed to clear cache:', e);
        return { success: false, error: e.message };
    }
};
