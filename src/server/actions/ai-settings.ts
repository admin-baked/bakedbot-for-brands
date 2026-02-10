'use server';

/**
 * AI Settings Server Actions
 *
 * CRUD operations for tenant and user AI settings.
 * These settings are injected into agent prompts to customize behavior.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
    TenantAISettings,
    UserAISettings,
    TenantAISettingsSchema,
    UserAISettingsSchema,
    DEFAULT_TENANT_AI_SETTINGS,
    DEFAULT_USER_AI_SETTINGS,
} from '@/types/ai-settings';

// ============================================================================
// TENANT AI SETTINGS
// ============================================================================

/**
 * Get AI settings for a tenant
 */
export async function getTenantAISettings(tenantId: string): Promise<TenantAISettings> {
    try {
        const db = getAdminFirestore();
        const doc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('ai')
            .get();

        if (!doc.exists) {
            return DEFAULT_TENANT_AI_SETTINGS;
        }

        const data = doc.data();
        const parsed = TenantAISettingsSchema.safeParse(data);

        if (!parsed.success) {
            logger.warn('[AISettings] Invalid tenant settings data, using defaults', {
                tenantId,
                errors: parsed.error.errors,
            });
            return DEFAULT_TENANT_AI_SETTINGS;
        }

        return parsed.data;
    } catch (error) {
        logger.error('[AISettings] Error loading tenant settings', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_TENANT_AI_SETTINGS;
    }
}

/**
 * Save AI settings for a tenant (requires org admin or super user)
 */
export async function saveTenantAISettings(
    tenantId: string,
    settings: Partial<TenantAISettings>
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await requireUser();

        // Validate settings
        const currentSettings = await getTenantAISettings(tenantId);
        const mergedSettings = { ...currentSettings, ...settings };
        const parsed = TenantAISettingsSchema.safeParse(mergedSettings);

        if (!parsed.success) {
            return {
                success: false,
                error: `Invalid settings: ${parsed.error.errors.map(e => e.message).join(', ')}`,
            };
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('ai')
            .set({
                ...parsed.data,
                updatedAt: new Date().toISOString(),
                updatedBy: session.uid,
            }, { merge: true });

        logger.info('[AISettings] Tenant settings saved', {
            tenantId,
            updatedBy: session.uid,
        });

        return { success: true };
    } catch (error) {
        logger.error('[AISettings] Error saving tenant settings', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save settings',
        };
    }
}

// ============================================================================
// USER AI SETTINGS
// ============================================================================

/**
 * Get AI settings for a user
 */
export async function getUserAISettings(userId: string): Promise<UserAISettings> {
    try {
        const db = getAdminFirestore();
        const doc = await db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('ai')
            .get();

        if (!doc.exists) {
            return DEFAULT_USER_AI_SETTINGS;
        }

        const data = doc.data();
        const parsed = UserAISettingsSchema.safeParse(data);

        if (!parsed.success) {
            logger.warn('[AISettings] Invalid user settings data, using defaults', {
                userId,
                errors: parsed.error.errors,
            });
            return DEFAULT_USER_AI_SETTINGS;
        }

        return parsed.data;
    } catch (error) {
        logger.error('[AISettings] Error loading user settings', {
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_USER_AI_SETTINGS;
    }
}

/**
 * Save AI settings for current user
 */
export async function saveUserAISettings(
    settings: Partial<UserAISettings>
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await requireUser();

        // Validate settings
        const currentSettings = await getUserAISettings(session.uid);
        const mergedSettings = { ...currentSettings, ...settings };
        const parsed = UserAISettingsSchema.safeParse(mergedSettings);

        if (!parsed.success) {
            return {
                success: false,
                error: `Invalid settings: ${parsed.error.errors.map(e => e.message).join(', ')}`,
            };
        }

        const db = getAdminFirestore();
        await db
            .collection('users')
            .doc(session.uid)
            .collection('settings')
            .doc('ai')
            .set({
                ...parsed.data,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

        logger.info('[AISettings] User settings saved', {
            userId: session.uid,
        });

        return { success: true };
    } catch (error) {
        logger.error('[AISettings] Error saving user settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save settings',
        };
    }
}

// ============================================================================
// COMBINED LOADER (for agent-runner)
// ============================================================================

/**
 * Load both tenant and user AI settings for injection into agent prompts.
 * Called by agent-runner before executing agent.
 */
export async function loadAISettingsForAgent(
    tenantId?: string,
    userId?: string
): Promise<{
    tenant: TenantAISettings | null;
    user: UserAISettings | null;
}> {
    try {
        const [tenant, user] = await Promise.all([
            tenantId ? getTenantAISettings(tenantId) : Promise.resolve(null),
            userId ? getUserAISettings(userId) : Promise.resolve(null),
        ]);

        return { tenant, user };
    } catch (error) {
        logger.error('[AISettings] Error loading settings for agent', {
            tenantId,
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
        return { tenant: null, user: null };
    }
}

/**
 * Get the current user's AI settings (convenience method)
 */
export async function getMyAISettings(): Promise<UserAISettings> {
    const session = await requireUser();
    return getUserAISettings(session.uid);
}

/**
 * Get the current user's tenant AI settings (convenience method)
 */
export async function getMyTenantAISettings(): Promise<TenantAISettings | null> {
    const session = await requireUser();

    // Get user's current org
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(session.uid).get();
    const userData = userDoc.data();

    const tenantId = userData?.currentOrgId || userData?.orgId || userData?.brandId;

    if (!tenantId) {
        return null;
    }

    return getTenantAISettings(tenantId);
}
