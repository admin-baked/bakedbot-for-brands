/**
 * Competitive Intelligence → Automated Actions
 *
 * Triggers automated responses based on competitive intelligence:
 * - Price adjustments (Money Mike)
 * - Counter-campaigns (Craig)
 * - Inventory alerts (Pops)
 * - Margin optimization (Money Mike)
 */

import { logger } from '@/lib/logger';
import { createServerClient } from '@/firebase/server-client';
import type { EzalSnapshot } from '@/types/ezal-snapshot';

export interface CompetitiveAction {
    type: 'price_adjustment' | 'counter_campaign' | 'inventory_alert' | 'margin_optimization';
    priority: 'low' | 'medium' | 'high' | 'critical';
    competitorName: string;
    trigger: string;
    recommendation: string;
    data: Record<string, any>;
    createdAt: Date;
}

interface CompetitiveTrigger {
    competitorId: string;
    competitorName: string;
    snapshot: EzalSnapshot;
    ourPricing?: {
        min: number;
        max: number;
        median: number;
    };
}

/**
 * Analyze competitive intelligence and trigger automated actions
 */
export async function analyzeCompetitiveIntelligence(
    orgId: string,
    competitors: CompetitiveTrigger[]
): Promise<CompetitiveAction[]> {
    const actions: CompetitiveAction[] = [];

    for (const competitor of competitors) {
        // 1. Price Threat Analysis
        const priceActions = analyzePriceThreat(orgId, competitor);
        actions.push(...priceActions);

        // 2. Promotional Activity Analysis
        const promoActions = analyzePromotionalActivity(orgId, competitor);
        actions.push(...promoActions);

        // 3. Product Gap Analysis
        const gapActions = analyzeProductGaps(orgId, competitor);
        actions.push(...gapActions);
    }

    // Store actions in Firestore for agent consumption
    if (actions.length > 0) {
        await storeCompetitiveActions(orgId, actions);
    }

    return actions;
}

/**
 * Analyze if competitor pricing poses a threat
 */
function analyzePriceThreat(
    orgId: string,
    trigger: CompetitiveTrigger
): CompetitiveAction[] {
    const actions: CompetitiveAction[] = [];
    const { competitorName, snapshot, ourPricing } = trigger;

    if (!ourPricing) return actions;

    // Critical: Competitor is 20%+ cheaper on median price
    const medianDifference = ((ourPricing.median - snapshot.priceRange.median) / ourPricing.median) * 100;

    if (medianDifference > 20) {
        actions.push({
            type: 'price_adjustment',
            priority: 'critical',
            competitorName,
            trigger: `${competitorName} median price is ${medianDifference.toFixed(0)}% lower than ours`,
            recommendation: `Consider price adjustment or bundle strategy to maintain competitiveness`,
            data: {
                ourMedian: ourPricing.median,
                theirMedian: snapshot.priceRange.median,
                difference: medianDifference,
                suggestedAction: 'price_match_or_bundle',
            },
            createdAt: new Date(),
        });

        // Also trigger counter-campaign
        actions.push({
            type: 'counter_campaign',
            priority: 'high',
            competitorName,
            trigger: `Significant price gap detected`,
            recommendation: `Launch "Best Value" campaign highlighting quality over price, or create flash sale`,
            data: {
                campaignType: 'defensive',
                targetSegment: 'price_sensitive',
                suggestedChannels: ['sms', 'email'],
            },
            createdAt: new Date(),
        });
    }

    // High: Competitor has aggressive promotions
    if (snapshot.promoCount >= 3 && snapshot.promoSignals.some(p => p.includes('bogo') || p.includes('50%'))) {
        actions.push({
            type: 'counter_campaign',
            priority: 'high',
            competitorName,
            trigger: `${competitorName} running ${snapshot.promoCount} aggressive promotions`,
            recommendation: `Counter with limited-time offer or loyalty bonus`,
            data: {
                theirPromos: snapshot.promoSignals.slice(0, 5),
                suggestedResponse: 'loyalty_multiplier',
            },
            createdAt: new Date(),
        });
    }

    return actions;
}

/**
 * Analyze competitor promotional activity
 */
function analyzePromotionalActivity(
    orgId: string,
    trigger: CompetitiveTrigger
): CompetitiveAction[] {
    const actions: CompetitiveAction[] = [];
    const { competitorName, snapshot } = trigger;

    // Medium: Unusual promotional activity spike
    if (snapshot.promoCount >= 5) {
        actions.push({
            type: 'counter_campaign',
            priority: 'medium',
            competitorName,
            trigger: `${competitorName} has unusually high promotional activity (${snapshot.promoCount} active promos)`,
            recommendation: `Monitor closely. Consider soft counter-campaign (social media, email) without deep discounting`,
            data: {
                promoCount: snapshot.promoCount,
                topPromos: snapshot.promoSignals.slice(0, 3),
                strategy: 'awareness_without_discounting',
            },
            createdAt: new Date(),
        });
    }

    return actions;
}

/**
 * Analyze product category gaps
 */
function analyzeProductGaps(
    orgId: string,
    trigger: CompetitiveTrigger
): CompetitiveAction[] {
    const actions: CompetitiveAction[] = [];
    const { competitorName, snapshot } = trigger;

    // Low: Competitor has categories we don't stock heavily
    const theirCategories = snapshot.categorySignals;

    if (theirCategories.length > 0) {
        actions.push({
            type: 'inventory_alert',
            priority: 'low',
            competitorName,
            trigger: `${competitorName} focusing on categories: ${theirCategories.slice(0, 3).join(', ')}`,
            recommendation: `Review inventory mix. Consider expanding these categories if demand exists`,
            data: {
                categories: theirCategories,
                action: 'inventory_analysis',
            },
            createdAt: new Date(),
        });
    }

    return actions;
}

/**
 * Store competitive actions for agents to consume
 */
async function storeCompetitiveActions(
    orgId: string,
    actions: CompetitiveAction[]
): Promise<void> {
    try {
        const { firestore } = await createServerClient();
        const batch = firestore.batch();

        for (const action of actions) {
            const ref = firestore
                .collection('tenants')
                .doc(orgId)
                .collection('competitive_actions')
                .doc();

            batch.set(ref, {
                ...action,
                orgId,
                status: 'pending',
                createdAt: new Date(),
                resolvedAt: null,
                resolvedBy: null,
            });
        }

        await batch.commit();

        logger.info('[CompetitiveActions] Stored actions:', {
            orgId,
            count: actions.length,
            critical: actions.filter(a => a.priority === 'critical').length,
        });
    } catch (error) {
        logger.error('[CompetitiveActions] Failed to store actions:', { error });
    }
}

/**
 * Execute automated action based on type
 */
export async function executeCompetitiveAction(
    orgId: string,
    action: CompetitiveAction
): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
        switch (action.type) {
            case 'price_adjustment':
                return await executePriceAdjustment(orgId, action);

            case 'counter_campaign':
                return await executeCounterCampaign(orgId, action);

            case 'inventory_alert':
                return await executeInventoryAlert(orgId, action);

            case 'margin_optimization':
                return await executeMarginOptimization(orgId, action);

            default:
                return { success: false, error: 'Unknown action type' };
        }
    } catch (error) {
        logger.error('[CompetitiveActions] Failed to execute action:', { error, action });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Execute price adjustment (Money Mike)
 */
async function executePriceAdjustment(
    orgId: string,
    action: CompetitiveAction
): Promise<{ success: boolean; result?: any }> {
    const { firestore } = await createServerClient();

    // Create a pricing rule suggestion
    const suggestion = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('pricing_suggestions')
        .add({
            type: 'competitive_response',
            competitorName: action.competitorName,
            trigger: action.trigger,
            recommendation: action.recommendation,
            data: action.data,
            status: 'pending_approval',
            createdBy: 'money_mike',
            createdAt: new Date(),
        });

    logger.info('[CompetitiveActions] Created pricing suggestion:', {
        suggestionId: suggestion.id,
        competitorName: action.competitorName,
    });

    return { success: true, result: { suggestionId: suggestion.id } };
}

/**
 * Execute counter-campaign (Craig)
 */
async function executeCounterCampaign(
    orgId: string,
    action: CompetitiveAction
): Promise<{ success: boolean; result?: any }> {
    const { firestore } = await createServerClient();

    // Create a campaign draft
    const campaign = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('campaign_drafts')
        .add({
            name: `Counter: ${action.competitorName}`,
            type: action.data.campaignType || 'defensive',
            trigger: action.trigger,
            recommendation: action.recommendation,
            channels: action.data.suggestedChannels || ['email'],
            targetSegment: action.data.targetSegment || 'all',
            status: 'draft',
            priority: action.priority,
            createdBy: 'craig',
            createdAt: new Date(),
        });

    logger.info('[CompetitiveActions] Created campaign draft:', {
        campaignId: campaign.id,
        competitorName: action.competitorName,
    });

    return { success: true, result: { campaignId: campaign.id } };
}

/**
 * Execute inventory alert (Pops)
 */
async function executeInventoryAlert(
    orgId: string,
    action: CompetitiveAction
): Promise<{ success: boolean; result?: any }> {
    const { firestore } = await createServerClient();

    // Create an inventory recommendation
    const alert = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('inventory_recommendations')
        .add({
            type: 'competitive_gap',
            competitorName: action.competitorName,
            categories: action.data.categories,
            recommendation: action.recommendation,
            status: 'pending_review',
            createdBy: 'pops',
            createdAt: new Date(),
        });

    logger.info('[CompetitiveActions] Created inventory alert:', {
        alertId: alert.id,
        categories: action.data.categories,
    });

    return { success: true, result: { alertId: alert.id } };
}

/**
 * Execute margin optimization (Money Mike)
 */
async function executeMarginOptimization(
    orgId: string,
    action: CompetitiveAction
): Promise<{ success: boolean; result?: any }> {
    const { firestore } = await createServerClient();

    const optimization = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('margin_optimizations')
        .add({
            type: 'competitive_analysis',
            competitorName: action.competitorName,
            data: action.data,
            recommendation: action.recommendation,
            status: 'pending_analysis',
            createdBy: 'money_mike',
            createdAt: new Date(),
        });

    return { success: true, result: { optimizationId: optimization.id } };
}
