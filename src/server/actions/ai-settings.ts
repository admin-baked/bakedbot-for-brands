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

function isSuperRole(role: unknown): boolean {
    if (Array.isArray(role)) {
        return role.includes('super_user') || role.includes('super_admin');
    }
    return role === 'super_user' || role === 'super_admin';
}

function canManageTenantSettings(role: unknown): boolean {
    if (Array.isArray(role)) {
        return role.some((value) => canManageTenantSettings(value));
    }
    if (typeof role !== 'string') return false;
    return [
        'super_user',
        'super_admin',
        'brand_admin',
        'brand',
        'dispensary_admin',
        'dispensary',
        'owner',
        'admin',
    ].includes(role);
}

function isValidDocId(id: string): boolean {
    return !!id && !id.includes('/');
}

function getActorOrgId(session: unknown): string | null {
    if (!session || typeof session !== 'object') return null;
    const token = session as {
        uid?: string;
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
    };
    const candidate = token.currentOrgId || token.orgId || token.brandId || null;
    if (!candidate || !isValidDocId(candidate)) return null;
    return candidate;
}

// ============================================================================
// TENANT AI SETTINGS
// ============================================================================

/**
 * Get AI settings for a tenant
 */
export async function getTenantAISettings(tenantId: string): Promise<TenantAISettings> {
    try {
        const normalizedTenantId = tenantId.trim();
        if (!isValidDocId(normalizedTenantId)) {
            return DEFAULT_TENANT_AI_SETTINGS;
        }

        const session = await requireUser();
        const role = typeof session === 'object' && session ? (session as { role?: string }).role : null;
        const isSuperUser = isSuperRole(role);
        const actorOrgId = getActorOrgId(session);
        if (!isSuperUser && (!actorOrgId || normalizedTenantId !== actorOrgId)) {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        const doc = await db
            .collection('tenants')
            .doc(normalizedTenantId)
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
                tenantId: normalizedTenantId,
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
        const normalizedTenantId = tenantId.trim();
        if (!isValidDocId(normalizedTenantId)) {
            return { success: false, error: 'Invalid tenant id' };
        }

        const session = await requireUser();
        const role = typeof session === 'object' && session ? (session as { role?: string }).role : null;
        const isSuperUser = isSuperRole(role);
        const actorOrgId = getActorOrgId(session);
        if (!canManageTenantSettings(role)) {
            return { success: false, error: 'Unauthorized' };
        }
        if (!isSuperUser && (!actorOrgId || normalizedTenantId !== actorOrgId)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Validate settings
        const currentSettings = await getTenantAISettings(normalizedTenantId);
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
            .doc(normalizedTenantId)
            .collection('settings')
            .doc('ai')
            .set({
                ...parsed.data,
                updatedAt: new Date().toISOString(),
                updatedBy: session.uid,
            }, { merge: true });

        logger.info('[AISettings] Tenant settings saved', {
            tenantId: normalizedTenantId,
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
        const normalizedUserId = userId.trim();
        if (!isValidDocId(normalizedUserId)) {
            return DEFAULT_USER_AI_SETTINGS;
        }

        const session = await requireUser();
        const role = typeof session === 'object' && session ? (session as { role?: string }).role : null;
        const isSuperUser = isSuperRole(role);
        if (!isSuperUser && session.uid !== normalizedUserId) {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        const doc = await db
            .collection('users')
            .doc(normalizedUserId)
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
                userId: normalizedUserId,
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
        const session = await requireUser();
        const role = typeof session === 'object' && session ? (session as { role?: string }).role : null;
        const isSuperUser = isSuperRole(role);
        const actorOrgId = getActorOrgId(session);
        const normalizedTenantId = tenantId?.trim();
        const normalizedUserId = userId?.trim();
        const validTenantId = normalizedTenantId && isValidDocId(normalizedTenantId)
            ? normalizedTenantId
            : undefined;
        const validUserId = normalizedUserId && isValidDocId(normalizedUserId)
            ? normalizedUserId
            : undefined;

        const scopedTenantId = validTenantId && (isSuperUser || (!!actorOrgId && validTenantId === actorOrgId))
            ? validTenantId
            : undefined;
        const scopedUserId = validUserId && (isSuperUser || validUserId === session.uid)
            ? validUserId
            : undefined;

        const [tenant, user] = await Promise.all([
            scopedTenantId ? getTenantAISettings(scopedTenantId) : Promise.resolve(null),
            scopedUserId ? getUserAISettings(scopedUserId) : Promise.resolve(null),
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

    if (!tenantId || !isValidDocId(tenantId)) {
        return null;
    }

    return getTenantAISettings(tenantId);
}
