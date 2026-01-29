'use server';

/**
 * Role-Based Ground Truth Server Actions (v2.0)
 *
 * CRUD operations for managing role-specific ground truth with preset prompts,
 * workflow guides, and tenant overrides.
 *
 * Access Control:
 * - Super admins: Full access to all role ground truth
 * - Brand/Dispensary admins: Read access to their role + manage tenant overrides
 *
 * Collections:
 * - ground_truth_v2/{roleId} - Global role defaults
 * - tenants/{tenantId}/ground_truth_overrides/{roleId} - Tenant-specific overrides
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type {
    RoleContextType,
    RoleGroundTruth,
    PresetPromptTemplate,
    WorkflowGuide,
    TenantGroundTruthOverride,
    GroundTruthQAPair,
    GroundTruthCategory,
} from '@/types/ground-truth';
import {
    RoleGroundTruthSchema,
    PresetPromptTemplateSchema,
    WorkflowGuideSchema,
    TenantGroundTruthOverrideSchema,
    mergeWithTenantOverrides,
} from '@/types/ground-truth';

// ============================================================================
// Types
// ============================================================================

export interface ActionResult<T = undefined> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface RoleGroundTruthSummary {
    role: RoleContextType;
    version: string;
    totalQAPairs: number;
    totalPresetPrompts: number;
    totalWorkflowGuides: number;
    categories: string[];
    lastUpdated: string;
    hasOverrides?: boolean;
}

// ============================================================================
// Access Control Helpers
// ============================================================================

/**
 * Check if user can access role-specific ground truth
 */
async function canAccessRole(userRole: string, targetRole: RoleContextType): Promise<boolean> {
    // Super admins can access all
    if (userRole === 'super_user' || userRole === 'super_admin') {
        return true;
    }

    // Brand admins can access brand role
    if (userRole === 'brand' && targetRole === 'brand') {
        return true;
    }

    // Dispensary admins can access dispensary role
    if (userRole === 'dispensary' && targetRole === 'dispensary') {
        return true;
    }

    // Customer role is public (for Smokey)
    if (targetRole === 'customer') {
        return true;
    }

    return false;
}

/**
 * Check if user can write to role ground truth (super admin only)
 */
function canWriteRoleGroundTruth(userRole: string): boolean {
    return userRole === 'super_user' || userRole === 'super_admin';
}

/**
 * Check if user can manage tenant overrides
 */
async function canManageTenantOverrides(
    userId: string,
    userRole: string,
    tenantId: string
): Promise<boolean> {
    // Super admins can manage all
    if (userRole === 'super_user' || userRole === 'super_admin') {
        return true;
    }

    // Check if user is admin of this tenant
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Brand admin
    if (userRole === 'brand' && (userData?.brandId === tenantId || userData?.brandId === `brand_${tenantId}`)) {
        return true;
    }

    // Dispensary admin
    if (userRole === 'dispensary' && (userData?.locationId === tenantId || userData?.locationId === `location_${tenantId}`)) {
        return true;
    }

    return false;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get role-specific ground truth from Firestore
 */
export async function getRoleGroundTruth(
    role: RoleContextType
): Promise<ActionResult<RoleGroundTruth>> {
    try {
        const user = await requireUser();

        // Check access
        const hasAccess = await canAccessRole(user.role, role);
        if (!hasAccess) {
            return {
                success: false,
                message: 'Unauthorized: Cannot access this role ground truth',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const roleDoc = await db.collection('ground_truth_v2').doc(role).get();

        if (!roleDoc.exists) {
            return {
                success: false,
                message: `Ground truth not found for role: ${role}`,
                error: 'NOT_FOUND',
            };
        }

        // Load categories and QA pairs from subcollections
        const categoriesSnapshot = await db
            .collection('ground_truth_v2')
            .doc(role)
            .collection('categories')
            .get();

        const categories: Record<string, GroundTruthCategory> = {};

        for (const catDoc of categoriesSnapshot.docs) {
            const qaPairsSnapshot = await catDoc.ref.collection('qa_pairs').get();
            const qaPairs = qaPairsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GroundTruthQAPair[];

            categories[catDoc.id] = {
                description: catDoc.data().description || '',
                qa_pairs: qaPairs,
            };
        }

        const roleData = roleDoc.data();
        const roleGT: RoleGroundTruth = {
            ...roleData,
            role,
            categories,
        } as RoleGroundTruth;

        // Validate schema
        const validation = RoleGroundTruthSchema.safeParse(roleGT);
        if (!validation.success) {
            logger.error('[RoleGroundTruth] Schema validation failed', { errors: validation.error });
            return {
                success: false,
                message: 'Invalid ground truth data structure',
                error: 'VALIDATION_ERROR',
            };
        }

        return {
            success: true,
            message: 'Role ground truth loaded successfully',
            data: roleGT,
        };
    } catch (error) {
        logger.error('[getRoleGroundTruth] Error loading role ground truth', { error, role });
        return {
            success: false,
            message: 'Failed to load role ground truth',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get merged ground truth (global + tenant overrides)
 */
export async function getMergedGroundTruth(
    role: RoleContextType,
    tenantId?: string
): Promise<ActionResult<RoleGroundTruth>> {
    try {
        const user = await requireUser();

        // Load base role ground truth
        const baseResult = await getRoleGroundTruth(role);
        if (!baseResult.success || !baseResult.data) {
            return baseResult;
        }

        // If no tenantId provided, return base
        if (!tenantId) {
            return baseResult;
        }

        // Load tenant overrides
        const db = getAdminFirestore();
        const overrideDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('ground_truth_overrides')
            .doc(role)
            .get();

        if (!overrideDoc.exists) {
            // No overrides, return base
            return baseResult;
        }

        const overrideData = overrideDoc.data() as TenantGroundTruthOverride;

        // Merge base with overrides
        const merged = mergeWithTenantOverrides(baseResult.data, overrideData);

        return {
            success: true,
            message: 'Merged ground truth loaded successfully',
            data: merged,
        };
    } catch (error) {
        logger.error('[getMergedGroundTruth] Error merging ground truth', { error, role, tenantId });
        return {
            success: false,
            message: 'Failed to merge ground truth',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get preset prompts for a role
 */
export async function getPresetPrompts(
    role: RoleContextType,
    tenantId?: string
): Promise<ActionResult<PresetPromptTemplate[]>> {
    try {
        const result = await getMergedGroundTruth(role, tenantId);
        if (!result.success || !result.data) {
            return {
                success: false,
                message: result.message,
                error: result.error,
            };
        }

        return {
            success: true,
            message: 'Preset prompts loaded successfully',
            data: result.data.preset_prompts || [],
        };
    } catch (error) {
        logger.error('[getPresetPrompts] Error loading preset prompts', { error, role });
        return {
            success: false,
            message: 'Failed to load preset prompts',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get workflow guides for a role
 */
export async function getWorkflowGuides(
    role: RoleContextType,
    tenantId?: string
): Promise<ActionResult<WorkflowGuide[]>> {
    try {
        const result = await getMergedGroundTruth(role, tenantId);
        if (!result.success || !result.data) {
            return {
                success: false,
                message: result.message,
                error: result.error,
            };
        }

        return {
            success: true,
            message: 'Workflow guides loaded successfully',
            data: result.data.workflow_guides || [],
        };
    } catch (error) {
        logger.error('[getWorkflowGuides] Error loading workflow guides', { error, role });
        return {
            success: false,
            message: 'Failed to load workflow guides',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * List all role ground truth summaries
 */
export async function listRoleGroundTruth(): Promise<ActionResult<RoleGroundTruthSummary[]>> {
    try {
        const user = await requireUser();

        // Only super admins can list all
        if (!canWriteRoleGroundTruth(user.role)) {
            return {
                success: false,
                message: 'Unauthorized: Super admin access required',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const rolesSnapshot = await db.collection('ground_truth_v2').get();

        const summaries: RoleGroundTruthSummary[] = [];

        for (const roleDoc of rolesSnapshot.docs) {
            const roleData = roleDoc.data();
            const role = roleDoc.id as RoleContextType;

            // Count categories and QA pairs
            const categoriesSnapshot = await roleDoc.ref.collection('categories').get();
            let totalQAPairs = 0;

            for (const catDoc of categoriesSnapshot.docs) {
                const qaPairsSnapshot = await catDoc.ref.collection('qa_pairs').get();
                totalQAPairs += qaPairsSnapshot.size;
            }

            summaries.push({
                role,
                version: roleData.metadata?.version || '2.0',
                totalQAPairs,
                totalPresetPrompts: roleData.preset_prompts?.length || 0,
                totalWorkflowGuides: roleData.workflow_guides?.length || 0,
                categories: categoriesSnapshot.docs.map(d => d.id),
                lastUpdated: roleData.metadata?.last_updated || new Date().toISOString(),
            });
        }

        return {
            success: true,
            message: 'Role ground truth summaries loaded',
            data: summaries,
        };
    } catch (error) {
        logger.error('[listRoleGroundTruth] Error listing role ground truth', { error });
        return {
            success: false,
            message: 'Failed to list role ground truth',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// WRITE OPERATIONS (Super Admin Only)
// ============================================================================

/**
 * Create or update preset prompt in role ground truth
 */
export async function upsertPresetPrompt(
    role: RoleContextType,
    prompt: PresetPromptTemplate
): Promise<ActionResult<PresetPromptTemplate>> {
    try {
        const user = await requireUser();

        // Check access
        if (!canWriteRoleGroundTruth(user.role)) {
            return {
                success: false,
                message: 'Unauthorized: Super admin access required',
                error: 'FORBIDDEN',
            };
        }

        // Validate schema
        const validation = PresetPromptTemplateSchema.safeParse(prompt);
        if (!validation.success) {
            return {
                success: false,
                message: 'Invalid preset prompt data',
                error: 'VALIDATION_ERROR',
            };
        }

        const db = getAdminFirestore();
        const roleRef = db.collection('ground_truth_v2').doc(role);
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return {
                success: false,
                message: `Ground truth not found for role: ${role}`,
                error: 'NOT_FOUND',
            };
        }

        const roleData = roleDoc.data();
        const presetPrompts = roleData?.preset_prompts || [];

        // Find and replace or append
        const existingIndex = presetPrompts.findIndex((p: PresetPromptTemplate) => p.id === prompt.id);
        if (existingIndex >= 0) {
            presetPrompts[existingIndex] = { ...prompt, updatedAt: new Date().toISOString() };
        } else {
            presetPrompts.push({ ...prompt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }

        await roleRef.update({
            preset_prompts: presetPrompts,
            'metadata.last_updated': new Date().toISOString(),
        });

        logger.info('[upsertPresetPrompt] Preset prompt saved', { role, promptId: prompt.id });

        return {
            success: true,
            message: 'Preset prompt saved successfully',
            data: prompt,
        };
    } catch (error) {
        logger.error('[upsertPresetPrompt] Error saving preset prompt', { error, role });
        return {
            success: false,
            message: 'Failed to save preset prompt',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Delete preset prompt from role ground truth
 */
export async function deletePresetPrompt(
    role: RoleContextType,
    promptId: string
): Promise<ActionResult> {
    try {
        const user = await requireUser();

        // Check access
        if (!canWriteRoleGroundTruth(user.role)) {
            return {
                success: false,
                message: 'Unauthorized: Super admin access required',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const roleRef = db.collection('ground_truth_v2').doc(role);
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return {
                success: false,
                message: `Ground truth not found for role: ${role}`,
                error: 'NOT_FOUND',
            };
        }

        const roleData = roleDoc.data();
        const presetPrompts = roleData?.preset_prompts || [];

        // Remove prompt
        const filtered = presetPrompts.filter((p: PresetPromptTemplate) => p.id !== promptId);

        if (filtered.length === presetPrompts.length) {
            return {
                success: false,
                message: 'Preset prompt not found',
                error: 'NOT_FOUND',
            };
        }

        await roleRef.update({
            preset_prompts: filtered,
            'metadata.last_updated': new Date().toISOString(),
        });

        logger.info('[deletePresetPrompt] Preset prompt deleted', { role, promptId });

        return {
            success: true,
            message: 'Preset prompt deleted successfully',
        };
    } catch (error) {
        logger.error('[deletePresetPrompt] Error deleting preset prompt', { error, role, promptId });
        return {
            success: false,
            message: 'Failed to delete preset prompt',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Add workflow guide to role ground truth
 */
export async function upsertWorkflowGuide(
    role: RoleContextType,
    workflow: WorkflowGuide
): Promise<ActionResult<WorkflowGuide>> {
    try {
        const user = await requireUser();

        // Check access
        if (!canWriteRoleGroundTruth(user.role)) {
            return {
                success: false,
                message: 'Unauthorized: Super admin access required',
                error: 'FORBIDDEN',
            };
        }

        // Validate schema
        const validation = WorkflowGuideSchema.safeParse(workflow);
        if (!validation.success) {
            return {
                success: false,
                message: 'Invalid workflow guide data',
                error: 'VALIDATION_ERROR',
            };
        }

        const db = getAdminFirestore();
        const roleRef = db.collection('ground_truth_v2').doc(role);
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return {
                success: false,
                message: `Ground truth not found for role: ${role}`,
                error: 'NOT_FOUND',
            };
        }

        const roleData = roleDoc.data();
        const workflowGuides = roleData?.workflow_guides || [];

        // Find and replace or append
        const existingIndex = workflowGuides.findIndex((w: WorkflowGuide) => w.id === workflow.id);
        if (existingIndex >= 0) {
            workflowGuides[existingIndex] = workflow;
        } else {
            workflowGuides.push(workflow);
        }

        await roleRef.update({
            workflow_guides: workflowGuides,
            'metadata.last_updated': new Date().toISOString(),
        });

        logger.info('[upsertWorkflowGuide] Workflow guide saved', { role, workflowId: workflow.id });

        return {
            success: true,
            message: 'Workflow guide saved successfully',
            data: workflow,
        };
    } catch (error) {
        logger.error('[upsertWorkflowGuide] Error saving workflow guide', { error, role });
        return {
            success: false,
            message: 'Failed to save workflow guide',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// TENANT OVERRIDE OPERATIONS
// ============================================================================

/**
 * Add tenant-specific preset prompt override
 */
export async function addTenantPresetOverride(
    tenantId: string,
    role: RoleContextType,
    preset: PresetPromptTemplate
): Promise<ActionResult<PresetPromptTemplate>> {
    try {
        const user = await requireUser();

        // Check access
        const hasAccess = await canManageTenantOverrides(user.uid, user.role, tenantId);
        if (!hasAccess) {
            return {
                success: false,
                message: 'Unauthorized: Cannot manage this tenant overrides',
                error: 'FORBIDDEN',
            };
        }

        // Validate schema
        const validation = PresetPromptTemplateSchema.safeParse(preset);
        if (!validation.success) {
            return {
                success: false,
                message: 'Invalid preset prompt data',
                error: 'VALIDATION_ERROR',
            };
        }

        const db = getAdminFirestore();
        const overrideRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('ground_truth_overrides')
            .doc(role);

        const overrideDoc = await overrideRef.get();

        if (!overrideDoc.exists) {
            // Create new override document
            const newOverride: TenantGroundTruthOverride = {
                tenantId,
                roleId: role,
                preset_prompts: [preset],
                disabled_presets: [],
                custom_workflows: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await overrideRef.set(newOverride);
        } else {
            // Update existing
            const overrideData = overrideDoc.data();
            const presetPrompts = overrideData?.preset_prompts || [];

            // Find and replace or append
            const existingIndex = presetPrompts.findIndex((p: PresetPromptTemplate) => p.id === preset.id);
            if (existingIndex >= 0) {
                presetPrompts[existingIndex] = preset;
            } else {
                presetPrompts.push(preset);
            }

            await overrideRef.update({
                preset_prompts: presetPrompts,
                updatedAt: new Date().toISOString(),
            });
        }

        logger.info('[addTenantPresetOverride] Tenant preset override added', { tenantId, role, promptId: preset.id });

        return {
            success: true,
            message: 'Tenant preset override added successfully',
            data: preset,
        };
    } catch (error) {
        logger.error('[addTenantPresetOverride] Error adding tenant override', { error, tenantId, role });
        return {
            success: false,
            message: 'Failed to add tenant override',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Disable global preset for a tenant
 */
export async function disableTenantPreset(
    tenantId: string,
    role: RoleContextType,
    presetId: string
): Promise<ActionResult> {
    try {
        const user = await requireUser();

        // Check access
        const hasAccess = await canManageTenantOverrides(user.uid, user.role, tenantId);
        if (!hasAccess) {
            return {
                success: false,
                message: 'Unauthorized: Cannot manage this tenant overrides',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const overrideRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('ground_truth_overrides')
            .doc(role);

        const overrideDoc = await overrideRef.get();

        if (!overrideDoc.exists) {
            // Create new with disabled preset
            const newOverride: TenantGroundTruthOverride = {
                tenantId,
                roleId: role,
                preset_prompts: [],
                disabled_presets: [presetId],
                custom_workflows: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await overrideRef.set(newOverride);
        } else {
            // Update existing
            const overrideData = overrideDoc.data();
            const disabledPresets = overrideData?.disabled_presets || [];

            if (!disabledPresets.includes(presetId)) {
                disabledPresets.push(presetId);
                await overrideRef.update({
                    disabled_presets: disabledPresets,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        logger.info('[disableTenantPreset] Preset disabled for tenant', { tenantId, role, presetId });

        return {
            success: true,
            message: 'Preset disabled successfully',
        };
    } catch (error) {
        logger.error('[disableTenantPreset] Error disabling preset', { error, tenantId, role, presetId });
        return {
            success: false,
            message: 'Failed to disable preset',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Enable previously disabled preset for a tenant
 */
export async function enableTenantPreset(
    tenantId: string,
    role: RoleContextType,
    presetId: string
): Promise<ActionResult> {
    try {
        const user = await requireUser();

        // Check access
        const hasAccess = await canManageTenantOverrides(user.uid, user.role, tenantId);
        if (!hasAccess) {
            return {
                success: false,
                message: 'Unauthorized: Cannot manage this tenant overrides',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const overrideRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('ground_truth_overrides')
            .doc(role);

        const overrideDoc = await overrideRef.get();

        if (!overrideDoc.exists) {
            return {
                success: false,
                message: 'No overrides found for this tenant',
                error: 'NOT_FOUND',
            };
        }

        const overrideData = overrideDoc.data();
        const disabledPresets = overrideData?.disabled_presets || [];

        const filtered = disabledPresets.filter((id: string) => id !== presetId);

        await overrideRef.update({
            disabled_presets: filtered,
            updatedAt: new Date().toISOString(),
        });

        logger.info('[enableTenantPreset] Preset enabled for tenant', { tenantId, role, presetId });

        return {
            success: true,
            message: 'Preset enabled successfully',
        };
    } catch (error) {
        logger.error('[enableTenantPreset] Error enabling preset', { error, tenantId, role, presetId });
        return {
            success: false,
            message: 'Failed to enable preset',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get tenant overrides (without merging with global)
 */
export async function getTenantOverrides(
    tenantId: string,
    role: RoleContextType
): Promise<ActionResult<TenantGroundTruthOverride>> {
    try {
        const user = await requireUser();

        // Check access
        const hasAccess = await canManageTenantOverrides(user.uid, user.role, tenantId);
        if (!hasAccess) {
            return {
                success: false,
                message: 'Unauthorized: Cannot access this tenant overrides',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const overrideDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('ground_truth_overrides')
            .doc(role)
            .get();

        if (!overrideDoc.exists) {
            return {
                success: true,
                message: 'No overrides found for this tenant',
                data: {
                    tenantId,
                    roleId: role,
                    preset_prompts: [],
                    disabled_presets: [],
                    custom_workflows: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            };
        }

        const data = overrideDoc.data() as TenantGroundTruthOverride;

        return {
            success: true,
            message: 'Tenant overrides loaded successfully',
            data,
        };
    } catch (error) {
        logger.error('[getTenantOverrides] Error loading tenant overrides', { error, tenantId, role });
        return {
            success: false,
            message: 'Failed to load tenant overrides',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Delete tenant-specific preset prompt override
 */
export async function deleteTenantPresetOverride(
    tenantId: string,
    role: RoleContextType,
    presetId: string
): Promise<ActionResult> {
    try {
        const user = await requireUser();

        // Check access
        const hasAccess = await canManageTenantOverrides(user.uid, user.role, tenantId);
        if (!hasAccess) {
            return {
                success: false,
                message: 'Unauthorized: Cannot manage this tenant overrides',
                error: 'FORBIDDEN',
            };
        }

        const db = getAdminFirestore();
        const overrideRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('ground_truth_overrides')
            .doc(role);

        const overrideDoc = await overrideRef.get();

        if (!overrideDoc.exists) {
            return {
                success: false,
                message: 'No overrides found for this tenant',
                error: 'NOT_FOUND',
            };
        }

        const overrideData = overrideDoc.data();
        const presetPrompts = overrideData?.preset_prompts || [];

        // Filter out the preset to delete
        const filtered = presetPrompts.filter((p: PresetPromptTemplate) => p.id !== presetId);

        await overrideRef.update({
            preset_prompts: filtered,
            updatedAt: new Date().toISOString(),
        });

        logger.info('[deleteTenantPresetOverride] Tenant preset override deleted', { tenantId, role, presetId });

        return {
            success: true,
            message: 'Tenant preset override deleted successfully',
        };
    } catch (error) {
        logger.error('[deleteTenantPresetOverride] Error deleting tenant override', { error, tenantId, role, presetId });
        return {
            success: false,
            message: 'Failed to delete tenant override',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
