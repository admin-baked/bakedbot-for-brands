/**
 * Seed Weekly Deals Video Playbook
 *
 * Creates the "Weekly Deals Video" playbook template that:
 * 1. Fetches current deals from POS/dynamic pricing
 * 2. Generates a promotional video with Veo
 * 3. Generates a social caption
 * 4. Runs Deebo compliance review
 * 5. Submits to approval queue
 * 6. Notifies team via inbox
 *
 * Prerequisites:
 * 1. Authenticate to the correct project:
 *    gcloud config set project bakedbot-prod
 *    gcloud auth application-default login
 *
 * 2. Or use service account key:
 *    set GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
 *
 * Run with:
 *   npx tsx scripts/seed-weekly-deals-playbook.ts --all     # Seed all templates
 *   npx tsx scripts/seed-weekly-deals-playbook.ts [orgId]   # Seed for specific org
 */

import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import type { Playbook } from '../src/types/playbook';

// Initialize Firebase if not already initialized
// Tries service account key first, then falls back to ADC
if (getApps().length === 0) {
    const projectId = process.env.GCLOUD_PROJECT || 'bakedbot-prod';
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
        || path.join(process.cwd(), 'serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
        console.log(`📄 Using service account key: ${serviceAccountPath}`);
        initializeApp({
            credential: cert(serviceAccountPath),
            projectId,
        });
    } else {
        console.log(`🔑 Using Application Default Credentials for project: ${projectId}`);
        console.log(`   If you get permission errors, run:`);
        console.log(`   gcloud config set project ${projectId}`);
        console.log(`   gcloud auth application-default login\n`);
        initializeApp({
            credential: applicationDefault(),
            projectId,
        });
    }
}

const db = getFirestore();

const WEEKLY_DEALS_PLAYBOOK: Omit<Playbook, 'createdAt' | 'updatedAt'> = {
    id: 'weekly-deals-video',
    name: 'Weekly Deals Video',
    description: 'Automatically generates a promotional video featuring this week\'s deals every Monday at 9am. Includes compliance review and approval workflow.',
    status: 'active',
    agent: 'craig',
    category: 'marketing',
    icon: 'Video',

    triggers: [
        {
            type: 'schedule',
            cron: '0 9 * * 1', // Every Monday at 9am
            timezone: 'America/New_York',
        },
    ],

    steps: [
        {
            id: 'step-1-fetch-deals',
            action: 'fetch_deals',
            label: 'Fetch current deals',
            params: {
                source: 'firestore', // or 'pos' for Alleaves
            },
        },
        {
            id: 'step-2-generate-video',
            action: 'generate_video',
            label: 'Generate promotional video',
            params: {
                provider: 'veo',
                aspectRatio: '9:16', // Vertical for Instagram/TikTok
                duration: '5',
                style: 'energetic',
                template: 'deals-showcase',
            },
            condition: '{{deals.length}} > 0',
        },
        {
            id: 'step-3-generate-caption',
            action: 'generate_caption',
            label: 'Generate social caption',
            params: {
                platform: 'instagram',
                includeHashtags: true,
                includeCTA: true,
            },
        },
        {
            id: 'step-4-compliance-review',
            action: 'review',
            label: 'Compliance review (Deebo)',
            agent: 'deebo',
            params: {
                task: 'Review video content for cannabis marketing compliance',
            },
        },
        {
            id: 'step-5-submit-approval',
            action: 'submit_approval',
            label: 'Submit for approval',
            params: {
                platform: 'instagram',
            },
        },
        {
            id: 'step-6-notify',
            action: 'notify',
            label: 'Notify team',
            params: {
                channels: ['inbox'],
                subject: 'Weekly Deals Video Ready for Approval',
                body: 'A new weekly deals video has been generated and is ready for your review. Check the Creative Command Center to approve and schedule.',
            },
        },
    ],

    ownerId: 'system',
    ownerName: 'BakedBot',
    isCustom: false,
    // templateId omitted for templates
    requiresApproval: true,

    runCount: 0,
    successCount: 0,
    failureCount: 0,

    createdBy: 'system',
    orgId: '', // Will be set per-tenant

    version: 1,

    metadata: {
        estimatedDuration: '5 minutes',
        estimatedCost: '$0.50-$1.00 per run',
        targetPlatforms: ['instagram', 'tiktok'],
    },
};

async function seedWeeklyDealsPlaybook(orgId?: string) {
    console.log('🎬 Seeding Weekly Deals Video Playbook...\n');

    const now = new Date();

    if (orgId) {
        // Seed for specific org
        console.log(`📌 Seeding for org: ${orgId}`);
        const playbook: Playbook = {
            ...WEEKLY_DEALS_PLAYBOOK,
            orgId,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection('playbooks').doc(`${orgId}_weekly-deals-video`).set(playbook);
        console.log(`✅ Created playbook: ${orgId}_weekly-deals-video`);
    } else {
        // Seed as template in playbook_templates collection
        console.log('📌 Seeding as global template');
        const template = {
            ...WEEKLY_DEALS_PLAYBOOK,
            orgId: 'global',
            createdAt: now,
            updatedAt: now,
        };

        await db.collection('playbook_templates').doc('weekly-deals-video').set(template);
        console.log('✅ Created template: playbook_templates/weekly-deals-video');
    }

    console.log('\n🎉 Done!');
}

// Additional playbook templates
const PLAYBOOK_TEMPLATES = [
    {
        id: 'daily-product-spotlight',
        name: 'Daily Product Spotlight',
        description: 'Generates a daily image featuring a top-selling product',
        status: 'active' as const,
        agent: 'craig',
        category: 'marketing' as const,
        icon: 'Star',
        triggers: [
            { type: 'schedule' as const, cron: '0 10 * * *', timezone: 'America/New_York' },
        ],
        steps: [
            {
                id: 'step-1',
                action: 'query',
                label: 'Get top products',
                agent: 'smokey',
                params: { task: 'Get top 3 selling products from last week' },
            },
            {
                id: 'step-2',
                action: 'generate_image',
                label: 'Generate spotlight image',
                params: { tier: 'paid', style: 'modern' },
            },
            {
                id: 'step-3',
                action: 'generate_caption',
                label: 'Generate caption',
                params: { platform: 'instagram', includeHashtags: true },
            },
            {
                id: 'step-4',
                action: 'submit_approval',
                label: 'Submit for approval',
                params: { platform: 'instagram' },
            },
        ],
        ownerId: 'system',
        ownerName: 'BakedBot',
        isCustom: false,
        requiresApproval: true,
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        createdBy: 'system',
        orgId: 'global',
        version: 1,
        metadata: {
            estimatedDuration: '2 minutes',
            estimatedCost: '$0.04 per run',
        },
    },
    {
        id: 'competitor-price-alert',
        name: 'Competitor Price Alert',
        description: 'Scans competitors and generates alert video when significant price changes detected',
        status: 'active' as const,
        agent: 'ezal',
        category: 'intel' as const,
        icon: 'TrendingDown',
        triggers: [
            { type: 'schedule' as const, cron: '0 8 * * *', timezone: 'America/New_York' },
        ],
        steps: [
            {
                id: 'step-1',
                action: 'delegate',
                label: 'Scan competitors',
                agent: 'ezal',
                params: { task: 'Scan competitor prices and identify changes > 10%' },
            },
            {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate alert video',
                params: {
                    provider: 'veo',
                    aspectRatio: '16:9',
                    duration: '5',
                    template: 'flash-sale',
                    prompt: 'Competitor just dropped prices! Time to respond.',
                },
                condition: '{{ezal.price_changes.length}} > 0',
            },
            {
                id: 'step-3',
                action: 'notify',
                label: 'Alert team',
                params: {
                    channels: ['inbox', 'email'],
                    subject: '🚨 Competitor Price Alert',
                    body: 'Significant competitor price changes detected. Check Ezal dashboard for details.',
                },
            },
        ],
        ownerId: 'system',
        ownerName: 'BakedBot',
        isCustom: false,
        requiresApproval: false,
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        createdBy: 'system',
        orgId: 'global',
        version: 1,
        metadata: {
            estimatedDuration: '3 minutes',
            estimatedCost: '$0.50-$0.75 per run',
        },
    },
];

async function seedAllTemplates() {
    console.log('📚 Seeding all playbook templates...\n');

    const now = new Date();

    // Seed Weekly Deals Video
    await seedWeeklyDealsPlaybook();

    // Seed additional templates
    for (const template of PLAYBOOK_TEMPLATES) {
        console.log(`📌 Seeding: ${template.name}`);
        await db.collection('playbook_templates').doc(template.id).set({
            ...template,
            createdAt: now,
            updatedAt: now,
        });
        console.log(`✅ Created: playbook_templates/${template.id}`);
    }

    console.log('\n🎉 All templates seeded!');
}

// Run the script
const args = process.argv.slice(2);

if (args[0] === '--all') {
    seedAllTemplates()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Error:', err);
            process.exit(1);
        });
} else {
    const orgId = args[0];
    seedWeeklyDealsPlaybook(orgId)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Error:', err);
            process.exit(1);
        });
}
