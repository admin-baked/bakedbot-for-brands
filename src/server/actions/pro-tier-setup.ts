'use server';

/**
 * Pro & Enterprise Tier Setup Actions
 *
 * Handles post-signup initialization for paid tier users:
 * - Assigns tier-specific playbook templates
 * - Enables premium features (higher competitor limits, daily intel, etc.)
 * - Seeds additional onboarding resources
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { assignTierPlaybooks } from '@/server/actions/playbooks';

export interface ProTierSetupResult {
    success: boolean;
    playbooksAssigned: string[];
    featuresEnabled: string[];
    error?: string;
}

/**
 * Initialize Pro tier features for a new Pro user
 * Called after org creation during signup
 */
export async function initializeProTierSetup(orgId: string): Promise<ProTierSetupResult> {
    logger.info('[ProTierSetup] Starting Pro tier initialization', {
        orgId,
    });

    try {
        // 1. Assign Pro-tier exclusive playbooks
        const { assigned: playbooksAssigned, error: playbookError } = await assignTierPlaybooks(
            orgId,
            'pro'
        );

        if (playbookError) {
            logger.warn('[ProTierSetup] Failed to assign playbooks', { orgId, error: playbookError });
        } else {
            logger.info('[ProTierSetup] Assigned Pro playbooks', {
                orgId,
                count: playbooksAssigned.length,
                playbooks: playbooksAssigned,
            });
        }

        // 2. Enable Pro tier features in org document
        const { firestore } = await createServerClient();
        await firestore.collection('organizations').doc(orgId).update({
            subscriptionTier: 'pro',
            features: {
                competitorsLimit: 10,
                scansPerMonth: 100,
                aiInsights: true,
                customAlerts: true,
                dataExport: true,
                dailyIntel: true,
                campaignAnalytics: true,
                enabledAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
        });

        logger.info('[ProTierSetup] Pro tier features enabled', { orgId });

        return {
            success: true,
            playbooksAssigned,
            featuresEnabled: [
                'dailyCompetitiveIntel',
                'campaignAnalytics',
                'revenueOptimizer',
            ],
        };
    } catch (error) {
        logger.error('[ProTierSetup] Setup failed', { orgId, error });
        return {
            success: false,
            playbooksAssigned: [],
            featuresEnabled: [],
            error: error instanceof Error ? error.message : 'Unknown error during Pro tier setup',
        };
    }
}

/**
 * Initialize Enterprise tier features for a new Enterprise user
 * Called after org creation during signup
 */
export async function initializeEnterpriseTierSetup(orgId: string): Promise<ProTierSetupResult> {
    logger.info('[EnterpriseTierSetup] Starting Enterprise tier initialization', {
        orgId,
    });

    try {
        // 1. Assign Enterprise-tier exclusive playbooks (includes Pro playbooks)
        const { assigned: playbooksAssigned, error: playbookError } = await assignTierPlaybooks(
            orgId,
            'enterprise'
        );

        if (playbookError) {
            logger.warn('[EnterpriseTierSetup] Failed to assign playbooks', {
                orgId,
                error: playbookError,
            });
        } else {
            logger.info('[EnterpriseTierSetup] Assigned Enterprise playbooks', {
                orgId,
                count: playbooksAssigned.length,
                playbooks: playbooksAssigned,
            });
        }

        // 2. Enable Enterprise tier features in org document
        const { firestore } = await createServerClient();
        await firestore.collection('organizations').doc(orgId).update({
            subscriptionTier: 'enterprise',
            features: {
                competitorsLimit: null, // Unlimited
                scansPerMonth: null, // Unlimited
                aiInsights: true,
                customAlerts: true,
                dataExport: true,
                apiAccess: true,
                whiteLabel: true,
                dailyIntel: true,
                campaignAnalytics: true,
                realtimeIntel: true,
                accountSummaries: true,
                integrationHealth: true,
                enabledAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
        });

        logger.info('[EnterpriseTierSetup] Enterprise tier features enabled', { orgId });

        return {
            success: true,
            playbooksAssigned,
            featuresEnabled: [
                'realtimeCompetitiveIntel',
                'dailyAccountSummary',
                'integrationHealth',
                'campaignAnalytics',
                'apiAccess',
                'whiteLabelOptions',
            ],
        };
    } catch (error) {
        logger.error('[EnterpriseTierSetup] Setup failed', { orgId, error });
        return {
            success: false,
            playbooksAssigned: [],
            featuresEnabled: [],
            error: error instanceof Error ? error.message : 'Unknown error during Enterprise tier setup',
        };
    }
}

/**
 * Get tier setup status for an organization
 */
export async function getTierSetupStatus(
    orgId: string
): Promise<{
    subscriptionTier?: string;
    playbookCount: number;
    featuresEnabled: string[];
}> {
    try {
        const { firestore } = await createServerClient();
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();

        if (!orgDoc.exists) {
            return {
                playbookCount: 0,
                featuresEnabled: [],
            };
        }

        const orgData = orgDoc.data();
        const tier = orgData?.subscriptionTier || 'free';

        // Count playbooks for this org
        const playbooksSnap = await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('playbooks')
            .where('status', '==', 'active')
            .get();

        const featuresEnabled = Object.keys(orgData?.features || {}).filter(
            key => orgData?.features?.[key] === true || orgData?.features?.[key] === null
        );

        return {
            subscriptionTier: tier,
            playbookCount: playbooksSnap.size,
            featuresEnabled,
        };
    } catch (error) {
        logger.error('[ProTierSetup] Failed to get setup status', { orgId, error });
        return {
            playbookCount: 0,
            featuresEnabled: [],
        };
    }
}
