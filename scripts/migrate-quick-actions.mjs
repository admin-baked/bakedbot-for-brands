/**
 * Migration Script: Quick Actions → Database (v2.0) - Standalone
 *
 * Usage:
 *   node scripts/migrate-quick-actions.mjs [--dry-run] [--role brand|dispensary|super_user|customer]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_ROLE = process.argv
    .find(arg => ['brand', 'dispensary', 'super_user', 'customer'].includes(arg.replace('--role=', '')))
    ?.replace('--role=', '');

console.log(`[Migration] Starting quick actions migration...`);
console.log(`[Migration] Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
if (SPECIFIC_ROLE) {
    console.log(`[Migration] Role filter: ${SPECIFIC_ROLE}`);
}

// ============================================================================
// Firebase Admin Initialization
// ============================================================================

function initializeFirebase() {
    if (getApps().length === 0) {
        // Check for service account key in environment
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            console.error('[Migration] ❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
            process.exit(1);
        }

        // Decode base64 service account key
        const serviceAccount = JSON.parse(
            Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
        );

        initializeApp({
            credential: cert(serviceAccount)
        });

        console.log('[Migration] ✅ Firebase Admin initialized');
    }

    return getFirestore();
}

// ============================================================================
// Import Quick Actions
// ============================================================================

// Load quick actions from the source file
const INBOX_QUICK_ACTIONS = JSON.parse(
    readFileSync(join(__dirname, '..', 'src', 'types', 'inbox-quick-actions.json'), 'utf-8')
);

console.log(`[Migration] Loaded ${INBOX_QUICK_ACTIONS.length} quick actions from source`);

// ============================================================================
// Conversion Logic
// ============================================================================

function extractTemplateVariables(template) {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...template.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
}

function inferCategory(action) {
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

function convertQuickActionToPreset(action) {
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

function groupByRole(presets) {
    const grouped = {
        brand: [],
        dispensary: [],
        super_user: [],
        customer: [],
    };

    for (const preset of presets) {
        for (const role of preset.roles) {
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

function generateSummary(grouped) {
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));

    for (const [role, presets] of Object.entries(grouped)) {
        console.log(`\n${role.toUpperCase()}: ${presets.length} presets`);

        // Group by category
        const byCategory = {};
        for (const preset of presets) {
            byCategory[preset.category] = (byCategory[preset.category] || 0) + 1;
        }

        for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
            console.log(`  - ${category}: ${count}`);
        }
    }

    console.log('\n' + '='.repeat(80));
}

async function getOrCreateRoleGroundTruth(role, db) {
    const docRef = db.collection('ground_truth_v2').doc(role);
    const doc = await docRef.get();

    if (doc.exists) {
        return doc.data();
    }

    // Create base structure
    const baseGT = {
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

async function migrateRolePresets(role, presets, db) {
    console.log(`[Migration] Migrating ${presets.length} preset prompts for role: ${role}`);

    // Get or create base ground truth
    const baseGT = await getOrCreateRoleGroundTruth(role, db);

    // Merge existing presets with migrated ones (avoid duplicates by ID)
    const existingPresets = baseGT.preset_prompts || [];
    const existingIds = new Set(existingPresets.map(p => p.id));

    const newPresets = presets.filter(p => !existingIds.has(p.id));
    const allPresets = [...existingPresets, ...newPresets];

    // Update Firestore
    const docRef = db.collection('ground_truth_v2').doc(role);

    if (DRY_RUN) {
        console.log(`[Migration] DRY RUN: Would update role=${role} with ${allPresets.length} presets (${newPresets.length} new)`);
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

    console.log(`[Migration] ✅ Migrated ${newPresets.length} new presets for role: ${role} (${allPresets.length} total)`);
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function main() {
    try {
        // Step 1: Convert all quick actions to preset prompts
        console.log(`[Migration] Converting ${INBOX_QUICK_ACTIONS.length} quick actions...`);
        const presets = INBOX_QUICK_ACTIONS.map(convertQuickActionToPreset);

        // Step 2: Group by role
        const grouped = groupByRole(presets);

        // Step 3: Generate summary
        generateSummary(grouped);

        // Step 4: Migrate to database (skip Firebase init in dry-run)
        const rolesToMigrate = SPECIFIC_ROLE
            ? [SPECIFIC_ROLE]
            : ['brand', 'dispensary', 'super_user', 'customer'];

        if (!DRY_RUN) {
            // Initialize Firestore only for live runs
            const db = initializeFirebase();

            for (const role of rolesToMigrate) {
                const rolePresets = grouped[role];
                if (rolePresets.length > 0) {
                    await migrateRolePresets(role, rolePresets, db);
                }
            }
        } else {
            // Dry-run mode: just show what would be migrated
            for (const role of rolesToMigrate) {
                const rolePresets = grouped[role];
                if (rolePresets.length > 0) {
                    console.log(`\n[Migration] DRY RUN: Would migrate ${rolePresets.length} presets for role: ${role}`);
                }
            }
        }

        console.log('[Migration] ✅ Migration completed successfully');

        if (DRY_RUN) {
            console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
            console.log('Run without --dry-run to apply changes');
        }

        process.exit(0);
    } catch (error) {
        console.error('[Migration] ❌ Migration failed', error);
        process.exit(1);
    }
}

main();
