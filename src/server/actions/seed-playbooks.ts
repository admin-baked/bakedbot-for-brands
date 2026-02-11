'use server';
/**
 * Seed Playbook Templates Server Action
 *
 * Seeds playbook templates from the deployed app, which already has
 * proper Firebase credentials. Run from the CEO Dashboard.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/actions/auth';
import type { Playbook } from '@/types/playbook';

// Ensure admin app is initialized
getAdminApp();

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
                source: 'firestore',
            },
        },
        {
            id: 'step-2-generate-video',
            action: 'generate_video',
            label: 'Generate promotional video',
            params: {
                provider: 'veo',
                aspectRatio: '9:16',
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
    requiresApproval: true,

    runCount: 0,
    successCount: 0,
    failureCount: 0,

    createdBy: 'system',
    orgId: 'global',

    version: 1,

    metadata: {
        estimatedDuration: '5 minutes',
        estimatedCost: '$0.50-$1.00 per run',
        targetPlatforms: ['instagram', 'tiktok'],
    },
};

const ADDITIONAL_TEMPLATES = [
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

export interface SeedResult {
    success: boolean;
    seeded: string[];
    skipped: string[];
    errors: string[];
}

/**
 * Seed all playbook templates
 * Requires super_user role
 */
export async function seedPlaybookTemplates(): Promise<SeedResult> {
    const { user } = await requireUser(['super_user']);

    const db = getFirestore();
    const now = Timestamp.now();
    const seeded: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    logger.info('[SeedPlaybooks] Starting template seeding', { userId: user.uid });

    // Seed Weekly Deals Video
    try {
        const weeklyDealsRef = db.collection('playbook_templates').doc('weekly-deals-video');
        const existing = await weeklyDealsRef.get();

        if (existing.exists) {
            skipped.push('weekly-deals-video (already exists)');
        } else {
            await weeklyDealsRef.set({
                ...WEEKLY_DEALS_PLAYBOOK,
                createdAt: now,
                updatedAt: now,
            });
            seeded.push('weekly-deals-video');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`weekly-deals-video: ${message}`);
        logger.error('[SeedPlaybooks] Failed to seed weekly-deals-video', { error });
    }

    // Seed additional templates
    for (const template of ADDITIONAL_TEMPLATES) {
        try {
            const templateRef = db.collection('playbook_templates').doc(template.id);
            const existing = await templateRef.get();

            if (existing.exists) {
                skipped.push(`${template.id} (already exists)`);
            } else {
                await templateRef.set({
                    ...template,
                    createdAt: now,
                    updatedAt: now,
                });
                seeded.push(template.id);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`${template.id}: ${message}`);
            logger.error('[SeedPlaybooks] Failed to seed template', { templateId: template.id, error });
        }
    }

    logger.info('[SeedPlaybooks] Seeding complete', { seeded, skipped, errors });

    return {
        success: errors.length === 0,
        seeded,
        skipped,
        errors,
    };
}

/**
 * Install a playbook template for a specific org
 */
export async function installPlaybookTemplate(
    templateId: string,
    orgId: string
): Promise<{ success: boolean; playbookId?: string; error?: string }> {
    const { user } = await requireUser(['super_user', 'brand_admin', 'dispensary_admin']);

    const db = getFirestore();

    try {
        // Get template
        const templateRef = db.collection('playbook_templates').doc(templateId);
        const templateDoc = await templateRef.get();

        if (!templateDoc.exists) {
            return { success: false, error: 'Template not found' };
        }

        const template = templateDoc.data();
        const now = Timestamp.now();
        const playbookId = `${orgId}_${templateId}`;

        // Check if already installed
        const existingRef = db.collection('playbooks').doc(playbookId);
        const existing = await existingRef.get();

        if (existing.exists) {
            return { success: false, error: 'Playbook already installed for this org' };
        }

        // Install playbook
        await existingRef.set({
            ...template,
            id: playbookId,
            orgId,
            templateId,
            isCustom: false,
            createdBy: user.uid,
            createdAt: now,
            updatedAt: now,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
        });

        logger.info('[SeedPlaybooks] Installed template', { templateId, orgId, playbookId });

        return { success: true, playbookId };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[SeedPlaybooks] Failed to install template', { templateId, orgId, error });
        return { success: false, error: message };
    }
}
