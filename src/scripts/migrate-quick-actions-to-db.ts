/**
 * Migration Script: Quick Actions → Database (v2.0)
 *
 * Migrates hardcoded inbox quick actions and templates to role-based ground truth in Firestore.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-quick-actions-to-db.ts [--dry-run] [--role brand|dispensary|super_user|customer]
 *
 * What gets migrated:
 * 1. INBOX_QUICK_ACTIONS from src/types/inbox.ts (50+ actions)
 * 2. Campaign templates from Creative Center (future)
 * 3. Quick start cards (future)
 * 4. Playbook templates (future)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { INBOX_QUICK_ACTIONS } from '@/types/inbox';
import type { InboxQuickAction } from '@/types/inbox';
import type { RoleContextType, PresetPromptTemplate, RoleGroundTruth } from '@/types/ground-truth';
import { extractTemplateVariables } from '@/types/ground-truth';

// ============================================================================
// Configuration
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_ROLE = process.argv.find(arg => ['brand', 'dispensary', 'super_user', 'customer'].includes(arg.replace('--role=', '')))?.replace('--role=', '') as RoleContextType | undefined;

// Role mapping constants from inbox.ts
const ALL_BUSINESS_ROLES = ['brand', 'dispensary'];
const ALL_ROLES = ['brand', 'dispensary', 'super_user', 'customer'];

// ============================================================================
// Conversion Logic
// ============================================================================

/**
 * Convert InboxQuickAction to PresetPromptTemplate
 */
function convertQuickActionToPreset(action: InboxQuickAction): PresetPromptTemplate {
    const variables = extractTemplateVariables(action.promptTemplate);

    return {
        id: action.id,
        label: action.label,
        description: action.description,
        threadType: action.threadType,
        defaultAgent: action.defaultAgent,
        promptTemplate: action.promptTemplate,
        variables,
        category: inferCategory(action),
        roles: action.roles,
        icon: action.icon,
        version: '2.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Infer category from thread type and roles
 */
function inferCategory(action: InboxQuickAction): string {
    // Super user categorization
    if (action.roles.includes('super_user')) {
        if (['growth_review', 'churn_risk', 'revenue_forecast', 'pipeline', 'customer_health'].includes(action.threadType)) {
            return 'growth_management';
        }
        if (['market_intel', 'bizdev', 'experiment'].includes(action.threadType)) {
            return 'strategic_initiatives';
        }
        if (['daily_standup', 'sprint_planning', 'incident_response', 'release'].includes(action.threadType)) {
            return 'engineering';
        }
        if (['customer_onboarding', 'customer_feedback', 'support_escalation'].includes(action.threadType)) {
            return 'customer_success';
        }
        if (['content_calendar', 'launch_campaign', 'seo_sprint'].includes(action.threadType)) {
            return 'content_marketing';
        }
        if (['weekly_sync', 'quarterly_planning', 'board_prep'].includes(action.threadType)) {
            return 'executive';
        }
        if (['budget_planning', 'billing_review', 'vendor_management'].includes(action.threadType)) {
            return 'finance';
        }
        if (['compliance_audit', 'compliance_research'].includes(action.threadType)) {
            return 'compliance';
        }
        if (['deep_research', 'market_research'].includes(action.threadType)) {
            return 'research';
        }
        if (['hiring'].includes(action.threadType)) {
            return 'people_ops';
        }
    }

    // Customer categorization
    if (action.roles.includes('customer')) {
        if (['product_discovery'].includes(action.threadType)) {
            return 'shopping';
        }
        if (['support'].includes(action.threadType)) {
            return 'support';
        }
        return 'general';
    }

    // Brand/Dispensary categorization
    if (['carousel', 'bundle', 'creative', 'campaign', 'qr_code'].includes(action.threadType)) {
        return 'marketing';
    }
    if (['launch'].includes(action.threadType)) {
        return 'product_launches';
    }
    if (['performance'].includes(action.threadType)) {
        return 'analytics';
    }
    if (['outreach'].includes(action.threadType)) {
        return 'customer_engagement';
    }
    if (['inventory_promo'].includes(action.threadType)) {
        return 'inventory_management';
    }
    if (['event'].includes(action.threadType)) {
        return 'events';
    }
    if (['retail_partner'].includes(action.threadType)) {
        return 'partnerships';
    }

    return 'general';
}

/**
 * Group preset prompts by role
 */
function groupByRole(presets: PresetPromptTemplate[]): Record<RoleContextType, PresetPromptTemplate[]> {
    const grouped: Record<RoleContextType, PresetPromptTemplate[]> = {
        brand: [],
        dispensary: [],
        super_user: [],
        customer: [],
    };

    for (const preset of presets) {
        for (const role of preset.roles) {
            // Map role strings to RoleContextType
            if (role === 'brand') {
                grouped.brand.push(preset);
            } else if (role === 'dispensary') {
                grouped.dispensary.push(preset);
            } else if (role === 'super_user') {
                grouped.super_user.push(preset);
            } else if (role === 'customer') {
                grouped.customer.push(preset);
            }
        }
    }

    return grouped;
}

/**
 * Get or create base role ground truth structure
 */
async function getOrCreateRoleGroundTruth(
    role: RoleContextType,
    db: FirebaseFirestore.Firestore
): Promise<Partial<RoleGroundTruth>> {
    const docRef = db.collection('ground_truth_v2').doc(role);
    const doc = await docRef.get();

    if (doc.exists) {
        return doc.data() as Partial<RoleGroundTruth>;
    }

    // Create base structure
    const baseGT: Partial<RoleGroundTruth> = {
        metadata: {
            dispensary: `${role.charAt(0).toUpperCase() + role.slice(1)} Ground Truth`,
            address: 'N/A',
            version: '2.0',
            created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            total_qa_pairs: 0,
            author: 'Migration Script',
        },
        evaluation_config: {
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
        maintenance_schedule: {
            weekly: [],
            monthly: [],
            quarterly: [],
        },
        preset_prompts: [],
        workflow_guides: [],
    };

    return baseGT;
}

/**
 * Migrate preset prompts for a specific role
 */
async function migrateRolePresets(
    role: RoleContextType,
    presets: PresetPromptTemplate[],
    db: FirebaseFirestore.Firestore
): Promise<void> {
    logger.info(`[Migration] Migrating ${presets.length} preset prompts for role: ${role}`);

    // Get or create base ground truth
    const baseGT = await getOrCreateRoleGroundTruth(role, db);

    // Merge existing presets with migrated ones (avoid duplicates by ID)
    const existingPresets = (baseGT.preset_prompts || []) as PresetPromptTemplate[];
    const existingIds = new Set(existingPresets.map(p => p.id));

    const newPresets = presets.filter(p => !existingIds.has(p.id));
    const allPresets = [...existingPresets, ...newPresets];

    // Update Firestore
    const docRef = db.collection('ground_truth_v2').doc(role);

    if (DRY_RUN) {
        logger.info(`[Migration] DRY RUN: Would update role=${role} with ${allPresets.length} presets (${newPresets.length} new)`);
        return;
    }

    await docRef.set(
        {
            ...baseGT,
            preset_prompts: allPresets,
            metadata: {
                ...baseGT.metadata,
                last_updated: new Date().toISOString(),
            },
        },
        { merge: true }
    );

    logger.info(`[Migration] ✅ Migrated ${newPresets.length} new presets for role: ${role} (${allPresets.length} total)`);
}

/**
 * Generate migration summary
 */
function generateSummary(grouped: Record<RoleContextType, PresetPromptTemplate[]>): void {
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));

    for (const [role, presets] of Object.entries(grouped)) {
        console.log(`\n${role.toUpperCase()}: ${presets.length} presets`);

        // Group by category
        const byCategory: Record<string, number> = {};
        for (const preset of presets) {
            byCategory[preset.category] = (byCategory[preset.category] || 0) + 1;
        }

        for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
            console.log(`  - ${category}: ${count}`);
        }
    }

    console.log('\n' + '='.repeat(80));
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function main() {
    logger.info('[Migration] Starting quick actions migration...');
    logger.info(`[Migration] Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    if (SPECIFIC_ROLE) {
        logger.info(`[Migration] Role filter: ${SPECIFIC_ROLE}`);
    }

    try {
        // Initialize Firestore
        const db = getAdminFirestore();

        // Step 1: Convert all quick actions to preset prompts
        logger.info(`[Migration] Converting ${INBOX_QUICK_ACTIONS.length} quick actions...`);
        const presets = INBOX_QUICK_ACTIONS.map(convertQuickActionToPreset);

        // Step 2: Group by role
        const grouped = groupByRole(presets);

        // Step 3: Generate summary
        generateSummary(grouped);

        // Step 4: Migrate to database
        const rolesToMigrate = SPECIFIC_ROLE ? [SPECIFIC_ROLE] : (['brand', 'dispensary', 'super_user', 'customer'] as RoleContextType[]);

        for (const role of rolesToMigrate) {
            const rolePresets = grouped[role];
            if (rolePresets.length > 0) {
                await migrateRolePresets(role, rolePresets, db);
            }
        }

        logger.info('[Migration] ✅ Migration completed successfully');

        if (DRY_RUN) {
            console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
            console.log('Run without --dry-run to apply changes');
        }
    } catch (error) {
        logger.error('[Migration] ❌ Migration failed', { error });
        process.exit(1);
    }
}

// ============================================================================
// Execute
// ============================================================================

if (require.main === module) {
    main().then(() => {
        process.exit(0);
    });
}

export { convertQuickActionToPreset, groupByRole, inferCategory };
