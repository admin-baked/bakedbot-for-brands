/**
 * Role-Based Ground Truth Loader (v2.0)
 *
 * Dynamic loader for role-specific ground truth with tenant override support.
 * Integrates with agent initialization to provide role-specific context.
 *
 * Load Strategy:
 * 1. Load base role ground truth from Firestore (ground_truth_v2/{roleId})
 * 2. If tenantId provided, load tenant overrides
 * 3. Merge base + overrides
 * 4. Build role-specific system prompt additions
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sanitizeForPrompt } from '@/server/security';
import type {
    RoleContextType,
    RoleGroundTruth,
    TenantGroundTruthOverride,
    GroundTruthCategory,
    GroundTruthQAPair,
    PresetPromptTemplate,
    WorkflowGuide,
    RoleAgentPersona,
} from '@/types/ground-truth';
import {
    RoleGroundTruthSchema,
    mergeWithTenantOverrides,
    getAllQAPairs,
    getCriticalQAPairs,
} from '@/types/ground-truth';
import type { InboxAgentPersona } from '@/types/inbox';

// ============================================================================
// DYNAMIC LOADER
// ============================================================================

/**
 * Load role-specific ground truth with optional tenant overrides
 *
 * @param role - Role context type (brand, dispensary, super_user, customer)
 * @param tenantId - Optional tenant ID for loading tenant-specific overrides
 * @returns RoleGroundTruth or null if not found
 */
export async function loadRoleGroundTruth(
    role: RoleContextType,
    tenantId?: string
): Promise<RoleGroundTruth | null> {
    try {
        // Load base role ground truth from Firestore
        const baseGT = await loadRoleFromFirestore(role);
        if (!baseGT) {
            logger.debug(`[RoleGrounding] No ground truth found for role: ${role}`);
            return null;
        }

        // If no tenantId, return base
        if (!tenantId) {
            logger.info(`[RoleGrounding] Loaded base ground truth for role: ${role}`);
            return baseGT;
        }

        // Load tenant overrides
        const override = await loadTenantOverrides(tenantId, role);
        if (!override) {
            logger.info(`[RoleGrounding] Loaded base ground truth for role: ${role} (no tenant overrides)`);
            return baseGT;
        }

        // Merge base with overrides
        const merged = mergeWithTenantOverrides(baseGT, override);
        logger.info(`[RoleGrounding] Loaded merged ground truth for role: ${role}, tenant: ${tenantId}`, {
            basePresets: baseGT.preset_prompts.length,
            tenantPresets: override.preset_prompts.length,
            disabledPresets: override.disabled_presets.length,
            finalPresets: merged.preset_prompts.length,
        });

        return merged;
    } catch (error) {
        logger.error('[RoleGrounding] Error loading role ground truth', {
            error: error instanceof Error ? error.message : String(error),
            role,
            tenantId,
        });
        return null;
    }
}

/**
 * Load base role ground truth from Firestore (ground_truth_v2/{roleId})
 */
async function loadRoleFromFirestore(role: RoleContextType): Promise<RoleGroundTruth | null> {
    let db;
    try {
        db = getAdminFirestore();
    } catch (error) {
        logger.debug(`[RoleGrounding] Firebase not available: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }

    // Get main document
    const docRef = db.collection('ground_truth_v2').doc(role);
    const doc = await docRef.get();

    if (!doc.exists) {
        logger.debug(`[RoleGrounding] No Firestore document for role: ${role}`);
        return null;
    }

    const data = doc.data()!;

    // Load categories and QA pairs
    const categoriesSnap = await docRef.collection('categories').orderBy('sort_order').get();
    const categories: Record<string, GroundTruthCategory> = {};

    for (const catDoc of categoriesSnap.docs) {
        const catData = catDoc.data();

        // Load QA pairs for this category
        // SECURITY: Sanitize to prevent prompt injection
        const pairsSnap = await catDoc.ref.collection('qa_pairs').get();
        const qa_pairs = pairsSnap.docs.map(p => ({
            id: p.id,
            question: sanitizeForPrompt(p.data().question || '', 500),
            ideal_answer: sanitizeForPrompt(p.data().ideal_answer || '', 2000),
            context: p.data().context ? sanitizeForPrompt(p.data().context, 500) : '',
            intent: p.data().intent || '',
            keywords: p.data().keywords || [],
            priority: p.data().priority || 'medium',
        })) as GroundTruthQAPair[];

        categories[catDoc.id] = {
            description: catData.description,
            qa_pairs,
        };
    }

    // Construct full RoleGroundTruth object
    const roleGT: RoleGroundTruth = {
        role,
        metadata: data.metadata || {
            dispensary: `${role} Ground Truth`,
            version: '2.0',
            created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            total_qa_pairs: 0,
            author: 'System',
        },
        categories,
        evaluation_config: data.evaluation_config || {
            scoring_weights: {
                keyword_coverage: 0.3,
                intent_match: 0.4,
                factual_accuracy: 0.2,
                tone_appropriateness: 0.1,
            },
            target_metrics: {
                overall_accuracy: 0.85,
                compliance_accuracy: 1.0,
                product_recommendations: 0.9,
                store_information: 0.95,
            },
            priority_levels: {
                critical: 'Must be 100% accurate',
                high: 'Target 95% accuracy',
                medium: 'Target 85% accuracy',
            },
        },
        maintenance_schedule: data.maintenance_schedule || {
            weekly: [],
            monthly: [],
            quarterly: [],
        },
        recommendation_config: data.recommendation_config,
        preset_prompts: data.preset_prompts || [],
        workflow_guides: data.workflow_guides || [],
        agent_personas: data.agent_personas,
    };

    // Update total QA pairs count
    roleGT.metadata.total_qa_pairs = getAllQAPairs(roleGT).length;

    // Validate schema
    const validation = RoleGroundTruthSchema.safeParse(roleGT);
    if (!validation.success) {
        logger.error('[RoleGrounding] Schema validation failed', {
            role,
            errors: validation.error.errors,
        });
        return null;
    }

    return roleGT;
}

/**
 * Load tenant-specific overrides from Firestore
 */
async function loadTenantOverrides(
    tenantId: string,
    role: RoleContextType
): Promise<TenantGroundTruthOverride | null> {
    let db;
    try {
        db = getAdminFirestore();
    } catch (error) {
        logger.debug(`[RoleGrounding] Firebase not available for tenant overrides`);
        return null;
    }

    const overrideRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('ground_truth_overrides')
        .doc(role);

    const overrideDoc = await overrideRef.get();

    if (!overrideDoc.exists) {
        return null;
    }

    const data = overrideDoc.data()!;

    return {
        tenantId,
        roleId: role,
        preset_prompts: data.preset_prompts || [],
        disabled_presets: data.disabled_presets || [],
        custom_workflows: data.custom_workflows || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
    };
}

// ============================================================================
// SYSTEM PROMPT BUILDERS
// ============================================================================

/**
 * Build role-specific system prompt additions for an agent
 *
 * This builds the role-specific context that gets appended to the agent's
 * base system prompt during initialization.
 *
 * @param roleGT - Role ground truth
 * @param agentId - Agent persona ID
 * @param mode - Grounding mode (full, condensed, critical_only)
 * @returns System prompt string to append
 */
export function buildRoleSystemPrompt(
    roleGT: RoleGroundTruth,
    agentId: InboxAgentPersona,
    mode: 'full' | 'condensed' | 'critical_only' = 'full'
): string {
    const sections: string[] = [];

    // 1. Agent-specific persona additions
    const agentPersona = roleGT.agent_personas?.[agentId];
    if (agentPersona) {
        sections.push(buildAgentPersonaSection(agentPersona));
    }

    // 2. QA pairs grounding
    const qaSection = buildQAGroundingSection(roleGT, mode);
    if (qaSection) {
        sections.push(qaSection);
    }

    // 3. Workflow guidance (condensed mode only)
    if (mode !== 'critical_only' && roleGT.workflow_guides.length > 0) {
        const workflowSection = buildWorkflowGuidanceSection(roleGT);
        if (workflowSection) {
            sections.push(workflowSection);
        }
    }

    return sections.join('\n\n');
}

/**
 * Build agent persona customization section
 */
function buildAgentPersonaSection(persona: RoleAgentPersona): string {
    const lines: string[] = [
        '=== ROLE-SPECIFIC GUIDANCE ===',
        '',
        persona.system_prompt_additions,
    ];

    if (persona.dos.length > 0) {
        lines.push('', 'DO:');
        persona.dos.forEach(d => lines.push(`- ${d}`));
    }

    if (persona.donts.length > 0) {
        lines.push('', 'DON\'T:');
        persona.donts.forEach(d => lines.push(`- ${d}`));
    }

    if (persona.example_responses.length > 0) {
        lines.push('', 'EXAMPLE RESPONSES:');
        persona.example_responses.forEach((ex, i) => {
            lines.push(`${i + 1}. ${ex}`);
        });
    }

    return lines.join('\n');
}

/**
 * Build QA grounding section (similar to existing grounding builder)
 */
function buildQAGroundingSection(
    roleGT: RoleGroundTruth,
    mode: 'full' | 'condensed' | 'critical_only'
): string {
    let qaPairs: GroundTruthQAPair[] = [];

    if (mode === 'critical_only') {
        // Only critical compliance QAs
        qaPairs = getCriticalQAPairs(roleGT);
    } else if (mode === 'condensed') {
        // Critical + high priority
        qaPairs = getAllQAPairs(roleGT).filter(
            qa => qa.priority === 'critical' || qa.priority === 'high'
        );
    } else {
        // All QA pairs
        qaPairs = getAllQAPairs(roleGT);
    }

    if (qaPairs.length === 0) {
        return '';
    }

    const lines: string[] = [
        '=== ROLE-SPECIFIC KNOWLEDGE BASE ===',
        '',
        `You have been provided with ${qaPairs.length} verified question-answer pairs for this role.`,
        'When users ask questions covered by this knowledge base, use these ideal answers as your primary source.',
        '',
    ];

    // Group by category
    const byCategory: Record<string, GroundTruthQAPair[]> = {};
    for (const [catKey, category] of Object.entries(roleGT.categories)) {
        const categoryQAs = qaPairs.filter(qa =>
            category.qa_pairs.some(cqa => cqa.id === qa.id)
        );
        if (categoryQAs.length > 0) {
            byCategory[catKey] = categoryQAs;
        }
    }

    for (const [catKey, categoryQAs] of Object.entries(byCategory)) {
        const category = roleGT.categories[catKey];
        lines.push(`### ${category.description}`);
        lines.push('');

        categoryQAs.forEach((qa, i) => {
            lines.push(`${i + 1}. Q: ${qa.question}`);
            lines.push(`   A: ${qa.ideal_answer}`);
            if (qa.context) {
                lines.push(`   Context: ${qa.context}`);
            }
            lines.push('');
        });
    }

    return lines.join('\n');
}

/**
 * Build workflow guidance section (condensed overview)
 */
function buildWorkflowGuidanceSection(roleGT: RoleGroundTruth): string {
    const lines: string[] = [
        '=== AVAILABLE WORKFLOWS ===',
        '',
        'The following workflows are available to guide users through complex tasks:',
        '',
    ];

    roleGT.workflow_guides.forEach((workflow, i) => {
        lines.push(`${i + 1}. **${workflow.title}** (${workflow.difficulty})`);
        lines.push(`   ${workflow.description}`);
        lines.push(`   Steps: ${workflow.steps.length} | Est. Time: ${workflow.estimatedTime || 'N/A'}`);
        lines.push('');
    });

    lines.push('When users need help with these workflows, guide them step-by-step through the process.');

    return lines.join('\n');
}

// ============================================================================
// PRESET PROMPT HELPERS
// ============================================================================

/**
 * Get preset prompts for a role with optional tenant overrides
 *
 * This is a convenience function for quickly loading just preset prompts
 * without the full ground truth.
 */
export async function getPresetPromptsForRole(
    role: RoleContextType,
    tenantId?: string
): Promise<PresetPromptTemplate[]> {
    const roleGT = await loadRoleGroundTruth(role, tenantId);
    if (!roleGT) {
        return [];
    }
    return roleGT.preset_prompts || [];
}

/**
 * Get workflow guides for a role with optional tenant overrides
 */
export async function getWorkflowGuidesForRole(
    role: RoleContextType,
    tenantId?: string
): Promise<WorkflowGuide[]> {
    const roleGT = await loadRoleGroundTruth(role, tenantId);
    if (!roleGT) {
        return [];
    }
    return roleGT.workflow_guides || [];
}

/**
 * Check if role has ground truth configured
 */
export async function hasRoleGroundTruth(role: RoleContextType): Promise<boolean> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('ground_truth_v2').doc(role).get();
        return doc.exists;
    } catch (error) {
        logger.warn(`[RoleGrounding] Error checking for role ground truth`, {
            error: error instanceof Error ? error.message : String(error),
            role,
        });
        return false;
    }
}

// ============================================================================
// CACHE UTILITIES (Future Enhancement)
// ============================================================================

/**
 * Cache for role ground truth (to reduce Firestore reads)
 *
 * Future enhancement: Implement Redis caching with TTL
 * For now, this is a simple in-memory cache with 5-minute TTL
 */
const roleGroundTruthCache = new Map<string, { data: RoleGroundTruth; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached role ground truth
 */
function getCachedRoleGroundTruth(
    role: RoleContextType,
    tenantId?: string
): RoleGroundTruth | null {
    const cacheKey = tenantId ? `${role}:${tenantId}` : role;
    const cached = roleGroundTruthCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
        return cached.data;
    }

    // Expired or not found
    if (cached) {
        roleGroundTruthCache.delete(cacheKey);
    }

    return null;
}

/**
 * Cache role ground truth
 */
function cacheRoleGroundTruth(
    role: RoleContextType,
    data: RoleGroundTruth,
    tenantId?: string
): void {
    const cacheKey = tenantId ? `${role}:${tenantId}` : role;
    roleGroundTruthCache.set(cacheKey, {
        data,
        expires: Date.now() + CACHE_TTL,
    });
}

/**
 * Invalidate cache for a role (call after updates)
 */
export function invalidateRoleGroundTruthCache(
    role: RoleContextType,
    tenantId?: string
): void {
    if (tenantId) {
        roleGroundTruthCache.delete(`${role}:${tenantId}`);
    } else {
        // Invalidate all cache entries for this role
        for (const key of roleGroundTruthCache.keys()) {
            if (key.startsWith(`${role}:`)) {
                roleGroundTruthCache.delete(key);
            }
        }
        roleGroundTruthCache.delete(role);
    }
    logger.debug(`[RoleGrounding] Cache invalidated for role: ${role}`, { tenantId });
}
