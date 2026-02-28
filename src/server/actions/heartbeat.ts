'use server';

/**
 * Heartbeat Server Actions
 *
 * CRUD operations for heartbeat configuration and manual triggers.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type {
    HeartbeatConfig,
    HeartbeatRole,
    HeartbeatCheckId,
    HeartbeatCheckResult,
    TenantHeartbeatConfig,
} from '@/types/heartbeat';
import {
    buildDefaultConfig,
    getChecksForRole,
    HEARTBEAT_CHECKS,
} from '@/types/heartbeat';
import {
    executeHeartbeat,
    getTenantHeartbeatConfig,
    saveTenantHeartbeatConfig,
} from '@/server/services/heartbeat';

type HeartbeatActor = {
    uid: string;
    role?: string;
    orgId?: string;
    brandId?: string;
    currentOrgId?: string;
};

function getActorTenantId(user: HeartbeatActor): string | null {
    return user.currentOrgId || user.orgId || user.brandId || null;
}

function isValidTenantId(tenantId: string): boolean {
    return !!tenantId && !tenantId.includes('/');
}

function resolveTenantContext(
    user: HeartbeatActor,
    action: string
): { tenantId: string; role: HeartbeatRole } | null {
    const tenantId = getActorTenantId(user);
    if (!tenantId || !isValidTenantId(tenantId)) {
        logger.warn('[Heartbeat] Missing or invalid tenant context', {
            action,
            actor: user.uid,
            actorRole: user.role,
            tenantId,
        });
        return null;
    }
    return {
        tenantId,
        role: determineRole(user.role),
    };
}

// =============================================================================
// GET CONFIGURATION
// =============================================================================

/**
 * Get heartbeat configuration for the current user's tenant
 */
export async function getHeartbeatConfig(): Promise<{
    success: boolean;
    config?: TenantHeartbeatConfig;
    availableChecks?: typeof HEARTBEAT_CHECKS;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'getHeartbeatConfig');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId, role } = context;

        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const defaultConfig = buildDefaultConfig(role);

        const config: TenantHeartbeatConfig = savedConfig || {
            ...defaultConfig,
            tenantId,
            role,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Get available checks for this role
        const availableChecks = HEARTBEAT_CHECKS.filter(c => c.roles.includes(role));

        return {
            success: true,
            config,
            availableChecks,
        };
    } catch (error) {
        logger.error('[Heartbeat] Failed to get config', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get configuration',
        };
    }
}

// =============================================================================
// UPDATE CONFIGURATION
// =============================================================================

/**
 * Update heartbeat configuration
 */
export async function updateHeartbeatConfig(updates: {
    enabled?: boolean;
    interval?: number;
    activeHours?: { start: number; end: number };
    quietHours?: { start: number; end: number } | null;
    timezone?: string;
    enabledChecks?: HeartbeatCheckId[];
    channels?: ('dashboard' | 'email' | 'sms' | 'whatsapp' | 'push')[];
    suppressAllClear?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'updateHeartbeatConfig');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId, role } = context;

        // Validate updates
        if (updates.interval !== undefined && (updates.interval < 5 || updates.interval > 1440)) {
            return { success: false, error: 'Interval must be between 5 and 1440 minutes' };
        }

        if (updates.enabledChecks) {
            const validChecks = getChecksForRole(role).map(c => c.id);
            const invalidChecks = updates.enabledChecks.filter(id => !validChecks.includes(id));
            if (invalidChecks.length > 0) {
                return { success: false, error: `Invalid checks for role: ${invalidChecks.join(', ')}` };
            }
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .set(
                {
                    ...updates,
                    role,
                    tenantId,
                    updatedAt: new Date(),
                },
                { merge: true }
            );

        return { success: true };
    } catch (error) {
        logger.error('[Heartbeat] Failed to update config', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update configuration',
        };
    }
}

// =============================================================================
// TOGGLE CHECK
// =============================================================================

/**
 * Toggle a specific check on/off
 */
export async function toggleHeartbeatCheck(
    checkId: HeartbeatCheckId,
    enabled: boolean
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'toggleHeartbeatCheck');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId, role } = context;
        const validChecks = getChecksForRole(role).map(c => c.id);
        if (!validChecks.includes(checkId)) {
            return { success: false, error: `Invalid check for role: ${checkId}` };
        }

        // Get current config
        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const defaultConfig = buildDefaultConfig(role);
        const currentChecks = savedConfig?.enabledChecks || defaultConfig.enabledChecks;

        // Update checks
        let newChecks: HeartbeatCheckId[];
        if (enabled) {
            newChecks = [...new Set([...currentChecks, checkId])];
        } else {
            newChecks = currentChecks.filter(id => id !== checkId);
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .set(
                {
                    enabledChecks: newChecks,
                    updatedAt: new Date(),
                },
                { merge: true }
            );

        return { success: true };
    } catch (error) {
        logger.error('[Heartbeat] Failed to toggle check', { error, checkId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle check',
        };
    }
}

// =============================================================================
// MANUAL TRIGGER
// =============================================================================

/**
 * Manually trigger a heartbeat check (for testing)
 */
export async function triggerHeartbeat(): Promise<{
    success: boolean;
    results?: HeartbeatCheckResult[];
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'triggerHeartbeat');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId, role } = context;

        // Get config
        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const config = savedConfig || buildDefaultConfig(role);

        // Execute with force flag
        const result = await executeHeartbeat({
            tenantId,
            userId: user.uid,
            role,
            config,
            force: true,
        });

        return {
            success: true,
            results: result.results,
        };
    } catch (error) {
        logger.error('[Heartbeat] Failed to trigger', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to trigger heartbeat',
        };
    }
}

// =============================================================================
// GET HISTORY
// =============================================================================

/**
 * Get recent heartbeat execution history
 */
export async function getHeartbeatHistory(limit: number = 20): Promise<{
    success: boolean;
    executions?: Array<{
        executionId: string;
        startedAt: Date;
        completedAt: Date;
        checksRun: number;
        resultsCount: number;
        overallStatus: string;
        notificationsSent: number;
    }>;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'getHeartbeatHistory');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId } = context;

        const db = getAdminFirestore();
        const snap = await db
            .collection('heartbeat_executions')
            .where('tenantId', '==', tenantId)
            .orderBy('startedAt', 'desc')
            .limit(limit)
            .get();

        const executions = snap.docs.map(doc => {
            const data = doc.data();
            return {
                executionId: data.executionId,
                startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
                completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
                checksRun: data.checksRun || 0,
                resultsCount: data.resultsCount || 0,
                overallStatus: data.overallStatus || 'unknown',
                notificationsSent: data.notificationsSent || 0,
            };
        });

        return { success: true, executions };
    } catch (error) {
        logger.error('[Heartbeat] Failed to get history', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get history',
        };
    }
}

// =============================================================================
// GET RECENT ALERTS
// =============================================================================

/**
 * Get recent heartbeat alerts (non-OK results)
 */
export async function getRecentAlerts(limit: number = 50): Promise<{
    success: boolean;
    alerts?: HeartbeatCheckResult[];
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'getRecentAlerts');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId } = context;

        const db = getAdminFirestore();

        // Get recent notifications
        const snap = await db
            .collection('heartbeat_notifications')
            .where('tenantId', '==', tenantId)
            .where('status', '==', 'sent')
            .orderBy('sentAt', 'desc')
            .limit(limit)
            .get();

        const allResults: HeartbeatCheckResult[] = [];

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.results && Array.isArray(data.results)) {
                allResults.push(...data.results.filter((r: any) => r.status !== 'ok'));
            }
        }

        // Deduplicate by checkId and take most recent
        const seen = new Set<string>();
        const uniqueAlerts = allResults.filter(r => {
            if (seen.has(r.checkId)) return false;
            seen.add(r.checkId);
            return true;
        });

        return { success: true, alerts: uniqueAlerts };
    } catch (error) {
        logger.error('[Heartbeat] Failed to get alerts', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get alerts',
        };
    }
}

// =============================================================================
// DIAGNOSTIC & FIX
// =============================================================================

/**
 * Diagnose heartbeat issues for current tenant
 */
export async function diagnoseHeartbeat(): Promise<{
    success: boolean;
    healthy?: boolean;
    issues?: Array<{
        severity: 'critical' | 'warning' | 'info';
        category: string;
        message: string;
        autoFixable: boolean;
    }>;
    info?: string[];
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'diagnoseHeartbeat');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId, role } = context;
        const db = getAdminFirestore();

        const issues: Array<{
            severity: 'critical' | 'warning' | 'info';
            category: string;
            message: string;
            autoFixable: boolean;
        }> = [];
        const info: string[] = [];

        // Check tenant status
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();

        if (tenantData?.status !== 'active') {
            issues.push({
                severity: 'critical',
                category: 'Tenant Status',
                message: `Tenant status is "${tenantData?.status}" (must be "active")`,
                autoFixable: true,
            });
        }

        // Check heartbeat config
        const configDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .get();

        if (!configDoc.exists) {
            issues.push({
                severity: 'warning',
                category: 'Configuration',
                message: 'Heartbeat configuration not initialized',
                autoFixable: true,
            });
        } else {
            const config = configDoc.data();

            if (config?.enabled === false) {
                issues.push({
                    severity: 'critical',
                    category: 'Configuration',
                    message: 'Heartbeat is disabled',
                    autoFixable: true,
                });
            }

            info.push(`Interval: ${config?.interval || 30} minutes`);
            info.push(`Enabled Checks: ${config?.enabledChecks?.length || 0}`);

            // Check if due for execution
            if (config?.lastRun) {
                const lastRun = config.lastRun.toDate();
                const now = new Date();
                const intervalMs = (config.interval || 30) * 60 * 1000;
                const timeSinceLastRun = now.getTime() - lastRun.getTime();
                const minutesSinceLastRun = Math.floor(timeSinceLastRun / 60000);

                info.push(`Last Run: ${minutesSinceLastRun} min ago`);

                if (timeSinceLastRun < intervalMs) {
                    const minutesUntilDue = Math.ceil((intervalMs - timeSinceLastRun) / 60000);
                    issues.push({
                        severity: 'info',
                        category: 'Timing',
                        message: `Next heartbeat due in ${minutesUntilDue} minutes`,
                        autoFixable: true,
                    });
                }
            }
        }

        // Check recent executions
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const executionsSnapshot = await db
            .collection('heartbeat_executions')
            .where('tenantId', '==', tenantId)
            .where('completedAt', '>=', fifteenMinsAgo)
            .orderBy('completedAt', 'desc')
            .limit(1)
            .get();

        if (executionsSnapshot.empty) {
            issues.push({
                severity: 'warning',
                category: 'Executions',
                message: 'No executions in last 15 minutes',
                autoFixable: true,
            });
        } else {
            const latest = executionsSnapshot.docs[0].data();
            info.push(`Latest Status: ${latest.overallStatus}`);
        }

        const healthy = !issues.some(i => i.severity === 'critical');

        return {
            success: true,
            healthy,
            issues,
            info,
        };
    } catch (error) {
        logger.error('[Heartbeat] Diagnostic failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Diagnostic failed',
        };
    }
}

/**
 * Magic fix - automatically resolve common heartbeat issues
 */
export async function fixHeartbeat(): Promise<{
    success: boolean;
    fixes?: string[];
    error?: string;
}> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'fixHeartbeat');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId, role } = context;
        const db = getAdminFirestore();

        const fixes: string[] = [];

        // 1. Fix tenant status
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();

        if (tenantData?.status !== 'active') {
            await db.collection('tenants').doc(tenantId).update({
                status: 'active',
                updatedAt: new Date(),
            });
            fixes.push(`Set tenant status to "active"`);
        }

        // 2. Fix heartbeat configuration
        const configRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat');

        const configDoc = await configRef.get();

        // Build default checks for role
        const defaultChecks = getDefaultChecksForRole(role);

        if (!configDoc.exists) {
            const defaultConfig = {
                enabled: true,
                interval: role === 'super_user' ? 30 : role === 'dispensary' ? 15 : 60,
                activeHours: { start: 9, end: 21 },
                timezone: 'America/New_York',
                enabledChecks: defaultChecks,
                channels: ['dashboard', 'email'],
                suppressAllClear: false,
                tenantId,
                role,
                lastRun: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await configRef.set(defaultConfig);
            fixes.push('Created default heartbeat configuration');
        } else {
            const config = configDoc.data();
            const updates: any = {};

            if (config?.enabled === false) {
                updates.enabled = true;
                fixes.push('Enabled heartbeat');
            }

            if (config?.lastRun) {
                const lastRun = config.lastRun.toDate();
                const now = new Date();
                const intervalMs = (config.interval || 30) * 60 * 1000;
                const timeSinceLastRun = now.getTime() - lastRun.getTime();

                if (timeSinceLastRun < intervalMs) {
                    updates.lastRun = null;
                    fixes.push('Reset lastRun to allow immediate execution');
                }
            }

            if (!config?.enabledChecks || config.enabledChecks.length === 0) {
                updates.enabledChecks = defaultChecks;
                fixes.push(`Enabled ${defaultChecks.length} default checks`);
            }

            if (Object.keys(updates).length > 0) {
                updates.updatedAt = new Date();
                await configRef.update(updates);
            }
        }

        // 3. Trigger immediate heartbeat
        const triggerResult = await triggerHeartbeat();
        if (triggerResult.success) {
            fixes.push('Triggered immediate heartbeat execution');
        }

        return {
            success: true,
            fixes,
        };
    } catch (error) {
        logger.error('[Heartbeat] Fix failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fix failed',
        };
    }
}

// =============================================================================
// SLACK WEBHOOK CONFIGURATION
// =============================================================================

/**
 * Configure (or remove) the Slack webhook URL for a tenant's heartbeat notifications.
 * Stores the URL in Firestore; does NOT put secrets in source code.
 */
export async function configureSlackWebhook(
    webhookUrl: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();
        const context = resolveTenantContext(user as HeartbeatActor, 'configureSlackWebhook');
        if (!context) {
            return { success: false, error: 'Missing tenant context' };
        }
        const { tenantId } = context;
        const db = getAdminFirestore();

        const configRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat');

        await configRef.set(
            {
                slackWebhookUrl: webhookUrl ?? null,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        logger.info('[Heartbeat] Slack webhook configured', {
            tenantId,
            configured: webhookUrl !== null,
        });

        return { success: true };
    } catch (error) {
        logger.error('[Heartbeat] Failed to configure Slack webhook', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to configure Slack webhook',
        };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function determineRole(userRole: string | undefined): HeartbeatRole {
    if (!userRole) return 'dispensary';

    if (userRole === 'super_user' || userRole === 'super_admin' || userRole === 'admin') {
        return 'super_user';
    }
    if (userRole === 'brand' || userRole === 'brand_admin' || userRole === 'brand_manager') {
        return 'brand';
    }
    return 'dispensary';
}

function getDefaultChecksForRole(role: HeartbeatRole): HeartbeatCheckId[] {
    if (role === 'super_user') {
        return ['system_errors', 'deployment_status', 'new_signups', 'academy_leads', 'gmail_unread', 'calendar_upcoming'];
    }
    if (role === 'dispensary') {
        return ['low_stock_alerts', 'expiring_batches', 'margin_alerts', 'competitor_price_changes', 'at_risk_customers', 'birthday_today'];
    }
    // brand
    return ['content_pending_approval', 'campaign_performance', 'competitor_launches', 'partner_performance'];
}
