/**
 * Craig Campaign Optimizer Service
 * 
 * Combines:
 * - Campaign Priority Selection (Phase 1)
 * - Subject Line A/B Testing with Bandits (Phase 2)
 * - Send Time Optimization
 * - Event Logging for Feedback Loop
 */

import {
    Campaign,
    selectTopCampaign,
    rankCampaigns,
    computeCampaignPriority,
    pickSendTime
} from './craig-priority';
import {
    BanditState,
    createBandit,
    selectArm,
    updateArm,
    getBanditStats
} from './bandit';
import { logAlgorithmEvent } from './events';
import { CraigSendEvent } from './schema';
import { logger } from '@/lib/logger';

// --- Types ---

export interface CampaignVariant {
    variant_id: string;
    subject_line: string;
    preview_text?: string;
    content_template?: string;
}

export interface OptimizedCampaign extends Campaign {
    selected_variant: CampaignVariant;
    scheduled_send_time: Date;
    priority: number;
    is_variant_exploration: boolean;
}

export interface CampaignOptimizationRequest {
    brand_id: string;
    campaigns: Campaign[];
    variants_per_campaign: Record<string, CampaignVariant[]>; // campaign_id -> variants
    segment_type?: string;
}

export interface CampaignOptimizationResponse {
    selected_campaign: OptimizedCampaign | null;
    all_ranked: Array<{ campaign_id: string; priority: number; rank: number }>;
}

// --- Bandit State Cache ---

const subjectBanditCache: Map<string, BanditState> = new Map();

function getCampaignBandit(brandId: string, campaignId: string, variantIds: string[]): BanditState {
    const key = `craig_subject_${brandId}_${campaignId}`;

    let state = subjectBanditCache.get(key);
    if (!state) {
        state = createBandit(key, variantIds, 'thompson');
        subjectBanditCache.set(key, state);
    }

    return state;
}

function saveCampaignBandit(brandId: string, campaignId: string, state: BanditState): void {
    const key = `craig_subject_${brandId}_${campaignId}`;
    subjectBanditCache.set(key, state);
}

// --- Main Optimization Function ---

/**
 * Selects and optimizes the next campaign to send.
 */
export async function optimizeCampaignSelection(
    request: CampaignOptimizationRequest
): Promise<CampaignOptimizationResponse> {
    const { brand_id, campaigns, variants_per_campaign, segment_type = 'default' } = request;

    // 1. Rank all campaigns by priority (Phase 1)
    const ranked = rankCampaigns(campaigns);

    // 2. Select top campaign
    const topCampaign = selectTopCampaign(campaigns);

    if (!topCampaign) {
        return {
            selected_campaign: null,
            all_ranked: ranked.map(c => ({
                campaign_id: c.campaign_id,
                priority: c.priority,
                rank: c.priority_rank,
            })),
        };
    }

    // 3. Select variant using bandit (Phase 2)
    const variants = variants_per_campaign[topCampaign.campaign_id] || [];
    let selectedVariant: CampaignVariant;
    let isVariantExploration = false;

    if (variants.length > 1) {
        const variantIds = variants.map(v => v.variant_id);
        const banditState = getCampaignBandit(brand_id, topCampaign.campaign_id, variantIds);
        const selection = selectArm(banditState);

        selectedVariant = variants.find(v => v.variant_id === selection.arm_id) || variants[0];
        isVariantExploration = selection.is_exploration;

        logger.debug(`[Craig Optimizer] Selected variant ${selection.arm_id} (exploration: ${selection.is_exploration})`);
    } else if (variants.length === 1) {
        selectedVariant = variants[0];
    } else {
        // Default variant
        selectedVariant = {
            variant_id: 'default',
            subject_line: topCampaign.name,
        };
    }

    // 4. Determine send time
    const scheduledSendTime = pickSendTime(segment_type);

    // 5. Log event
    await logAlgorithmEvent({
        event_type: 'craig_send',
        brand_id,
        payload: {
            campaign_id: topCampaign.campaign_id,
            segment_id: topCampaign.segment_id,
            variant_id: selectedVariant.variant_id,
            send_time: scheduledSendTime.toISOString(),
            priority_score: topCampaign.priority,
            recipient_count: 0, // Will be filled by sender
        },
    });

    return {
        selected_campaign: {
            ...topCampaign,
            selected_variant: selectedVariant,
            scheduled_send_time: scheduledSendTime,
            is_variant_exploration: isVariantExploration,
        },
        all_ranked: ranked.map(c => ({
            campaign_id: c.campaign_id,
            priority: c.priority,
            rank: c.priority_rank,
        })),
    };
}

/**
 * Records engagement feedback for a campaign variant.
 */
export async function recordCampaignEngagement(
    brand_id: string,
    campaign_id: string,
    variant_id: string,
    action: 'open' | 'click' | 'unsubscribe' | 'conversion',
    value?: number
): Promise<void> {
    // 1. Log event
    await logAlgorithmEvent({
        event_type: 'craig_engagement',
        brand_id,
        payload: {
            campaign_id,
            variant_id,
            action,
            value,
        },
    });

    // 2. Update subject line bandit
    const reward = ['open', 'click', 'conversion'].includes(action);

    const banditState = getCampaignBandit(brand_id, campaign_id, [variant_id]);
    const updatedState = updateArm(banditState, variant_id, reward);
    saveCampaignBandit(brand_id, campaign_id, updatedState);

    logger.debug(`[Craig Optimizer] Recorded engagement: ${action} for ${variant_id} (reward: ${reward})`);
}

/**
 * Gets optimization stats for a campaign (for dashboard).
 */
export function getCampaignStats(brand_id: string, campaign_id: string): {
    bandit_stats: ReturnType<typeof getBanditStats> | null;
    priority: number;
} {
    const key = `craig_subject_${brand_id}_${campaign_id}`;
    const state = subjectBanditCache.get(key);

    return {
        bandit_stats: state ? getBanditStats(state) : null,
        priority: 0, // Would need campaign data to compute
    };
}

// --- Fatigue Management ---

/**
 * Computes fatigue score for a segment based on recent sends.
 * Higher = more fatigued (should send less).
 */
export function computeSegmentFatigue(
    recentSendDates: Date[],
    windowDays: number = 7
): number {
    const now = new Date();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    const recentSends = recentSendDates.filter(d =>
        (now.getTime() - d.getTime()) < windowMs
    );

    // Fatigue scale: 0-100
    // 0 sends = 0 fatigue
    // 7+ sends in window = 100 fatigue
    return Math.min(100, (recentSends.length / 7) * 100);
}

/**
 * Updates a campaign's fatigue score based on segment history.
 */
export function updateCampaignFatigue(
    campaign: Campaign,
    segmentSendHistory: Date[]
): Campaign {
    const fatigueScore = computeSegmentFatigue(segmentSendHistory);

    return {
        ...campaign,
        fatigue_score: fatigueScore,
    };
}
