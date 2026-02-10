/**
 * Setup Thrive Syracuse Tenant Override
 *
 * Creates tenant-specific ground truth overrides for Thrive Syracuse dispensary.
 * This provides customized preset prompts and workflow guides specific to their operations.
 *
 * Run with: npx tsx scripts/setup-thrive-tenant-override.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
        process.exit(1);
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (error) {
        console.error('❌ Failed to parse service account key:', error);
        process.exit(1);
    }
}

const db = getFirestore();

const TENANT_ID = 'org_thrive_syracuse';
const ROLE_ID = 'dispensary';

interface TenantGroundTruthOverride {
    tenantId: string;
    roleId: string;
    preset_prompts: PresetPromptTemplate[];
    disabled_presets: string[];
    custom_workflows: WorkflowGuide[];
    createdAt: string;
    updatedAt: string;
}

interface PresetPromptTemplate {
    id: string;
    label: string;
    description: string;
    threadType: string;
    defaultAgent: string;
    promptTemplate: string;
    variables?: string[];
    category: string;
    roles: string[];
    icon?: string;
    version: string;
}

interface WorkflowGuide {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
    steps: WorkflowStep[];
    agents: string[];
}

interface WorkflowStep {
    title: string;
    description: string;
    agent?: string;
    action?: string;
}

async function setupThriveOverride() {
    console.log('🚀 Setting up Thrive Syracuse tenant override...\n');

    // Thrive-specific preset prompts
    const presetPrompts: PresetPromptTemplate[] = [
        {
            id: 'thrive-daily-inventory',
            label: 'Daily Inventory Check',
            description: 'Check low stock items and expiring inventory for Thrive Syracuse',
            threadType: 'operations',
            defaultAgent: 'pops',
            promptTemplate: 'Run a daily inventory check for Thrive Syracuse. Identify any items with less than {{lowStockThreshold}} units in stock and any products expiring within the next {{expirationDays}} days. Prioritize flower and vape categories.',
            variables: ['lowStockThreshold', 'expirationDays'],
            category: 'operations',
            roles: ['dispensary', 'super_user'],
            icon: 'Package',
            version: '1.0',
        },
        {
            id: 'thrive-price-check',
            label: 'Syracuse Price Check',
            description: 'Compare Thrive pricing against Syracuse area competitors',
            threadType: 'competitive_intel',
            defaultAgent: 'ezal',
            promptTemplate: 'Run a competitive price check for Thrive Syracuse against other dispensaries in the Syracuse metro area. Focus on {{category}} products and identify any significant price gaps on popular brands like Off Hours and Kiefers.',
            variables: ['category'],
            category: 'competitive_intel',
            roles: ['dispensary', 'super_user'],
            icon: 'TrendingUp',
            version: '1.0',
        },
        {
            id: 'thrive-loyalty-report',
            label: 'Loyalty Program Report',
            description: 'Generate weekly loyalty program performance report',
            threadType: 'analytics',
            defaultAgent: 'mrs_parker',
            promptTemplate: 'Generate a loyalty program report for Thrive Syracuse covering the last {{days}} days. Include total rewards earned, rewards redeemed, top loyalty members, and recommendations for improving customer retention.',
            variables: ['days'],
            category: 'analytics',
            roles: ['dispensary', 'super_user'],
            icon: 'Heart',
            version: '1.0',
        },
        {
            id: 'thrive-sms-campaign',
            label: 'Syracuse SMS Campaign',
            description: 'Create a localized SMS campaign for Syracuse customers',
            threadType: 'marketing',
            defaultAgent: 'craig',
            promptTemplate: 'Create an SMS campaign for Thrive Syracuse promoting {{promotion}}. Target customers within the Syracuse area. Include a clear call-to-action and mention our location on Erie Blvd. Keep it compliant with NY cannabis advertising regulations.',
            variables: ['promotion'],
            category: 'marketing',
            roles: ['dispensary', 'super_user'],
            icon: 'MessageSquare',
            version: '1.0',
        },
    ];

    // Thrive-specific workflow guides
    const customWorkflows: WorkflowGuide[] = [
        {
            id: 'thrive-morning-checklist',
            title: 'Thrive Morning Opening Checklist',
            description: 'Complete morning opening procedures for Thrive Syracuse',
            category: 'operations',
            difficulty: 'beginner',
            estimatedTime: '15 minutes',
            steps: [
                {
                    title: 'Check POS Sync Status',
                    description: 'Verify Alleaves POS sync completed overnight and all products are up-to-date',
                    agent: 'pops',
                    action: 'Run inventory sync check',
                },
                {
                    title: 'Review Low Stock Alerts',
                    description: 'Check for any products that need reordering before opening',
                    agent: 'pops',
                    action: 'Generate low stock report',
                },
                {
                    title: 'Check Competitor Prices',
                    description: 'Quick scan of Syracuse competitor pricing changes',
                    agent: 'ezal',
                    action: 'Run morning price check',
                },
                {
                    title: 'Review Pending Customer Messages',
                    description: 'Check for any customer inquiries from overnight',
                    agent: 'smokey',
                    action: 'Review chat queue',
                },
            ],
            agents: ['pops', 'ezal', 'smokey'],
        },
        {
            id: 'thrive-weekly-review',
            title: 'Thrive Weekly Business Review',
            description: 'Comprehensive weekly review of Thrive Syracuse performance',
            category: 'analytics',
            difficulty: 'intermediate',
            estimatedTime: '30 minutes',
            steps: [
                {
                    title: 'Sales Performance Analysis',
                    description: 'Review top sellers, revenue trends, and category performance',
                    agent: 'pops',
                    action: 'Generate weekly sales report',
                },
                {
                    title: 'Competitive Position Review',
                    description: 'Analyze market position vs Syracuse competitors',
                    agent: 'ezal',
                    action: 'Run competitive analysis',
                },
                {
                    title: 'Customer Loyalty Metrics',
                    description: 'Review loyalty program performance and customer retention',
                    agent: 'mrs_parker',
                    action: 'Generate loyalty report',
                },
                {
                    title: 'Marketing Campaign Review',
                    description: 'Analyze SMS and email campaign performance',
                    agent: 'craig',
                    action: 'Review campaign metrics',
                },
                {
                    title: 'Compliance Check',
                    description: 'Verify all NY OCM compliance requirements are met',
                    agent: 'deebo',
                    action: 'Run compliance audit',
                },
            ],
            agents: ['pops', 'ezal', 'mrs_parker', 'craig', 'deebo'],
        },
    ];

    // No disabled presets - Thrive uses all standard presets plus their custom ones
    const disabledPresets: string[] = [];

    const override: TenantGroundTruthOverride = {
        tenantId: TENANT_ID,
        roleId: ROLE_ID,
        preset_prompts: presetPrompts,
        disabled_presets: disabledPresets,
        custom_workflows: customWorkflows,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // Write to Firestore
    const overrideRef = db
        .collection('tenants')
        .doc(TENANT_ID)
        .collection('ground_truth_overrides')
        .doc(ROLE_ID);

    await overrideRef.set(override);

    console.log('✅ Thrive Syracuse tenant override created successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Tenant: ${TENANT_ID}`);
    console.log(`   - Role: ${ROLE_ID}`);
    console.log(`   - Custom Preset Prompts: ${presetPrompts.length}`);
    console.log(`   - Custom Workflows: ${customWorkflows.length}`);
    console.log(`   - Disabled Presets: ${disabledPresets.length}`);
    console.log('\n📍 Firestore Path: tenants/org_thrive_syracuse/ground_truth_overrides/dispensary');
}

// Run the setup
setupThriveOverride()
    .then(() => {
        console.log('\n🎉 Setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
