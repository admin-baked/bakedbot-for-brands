/**
 * Smokey Recommender Service
 * 
 * Combines:
 * - Deterministic SKU Scoring (Phase 1)
 * - Contextual Bandit for Top-N Exploration (Phase 2)
 * - Event Logging for Feedback Loop
 * 
 * This is the main entry point for product recommendations.
 */

import {
    rankSkus,
    UserContext,
    SkuData,
    BrandScoringConfig,
    DEFAULT_BRAND_CONFIG,
    RankedSku
} from './smokey-scoring';
import {
    BanditState,
    createBandit,
    selectArm,
    updateArm,
    getBanditStats
} from './bandit';
import { logAlgorithmEvent } from './events';
import { SmokeyRecEvent, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './schema';
import { logger } from '@/lib/logger';

// --- Types ---

export interface RecommendationRequest {
    brand_id: string;
    user_id?: string;
    session_id?: string;
    query: string;
    user_context: UserContext;
    available_skus: SkuData[];
    config?: BrandScoringConfig;
    top_k?: number;
}

export interface RecommendationResponse {
    recommendations: RankedSku[];
    event_id: string;
    algorithm_used: 'deterministic' | 'bandit';
    exploration_applied: boolean;
}

// --- Bandit State Cache (In-memory for V1, should be Firestore in production) ---

const banditCache: Map<string, BanditState> = new Map();

function getBrandBandit(brandId: string, armIds: string[]): BanditState {
    const key = `smokey_rec_${brandId}`;

    let state = banditCache.get(key);
    if (!state) {
        state = createBandit(key, armIds, 'thompson');
        banditCache.set(key, state);
    }

    // Ensure all arms exist (add new ones if products change)
    const existingArmIds = new Set(state.arms.map(a => a.arm_id));
    for (const armId of armIds) {
        if (!existingArmIds.has(armId)) {
            state.arms.push({
                arm_id: armId,
                successes: 0,
                failures: 0,
                pulls: 0,
            });
        }
    }

    return state;
}

function saveBrandBandit(brandId: string, state: BanditState): void {
    const key = `smokey_rec_${brandId}`;
    banditCache.set(key, state);
}

// --- Main Recommendation Function ---

/**
 * Generates product recommendations using algorithm + bandit.
 */
export async function getRecommendations(
    request: RecommendationRequest
): Promise<RecommendationResponse> {
    const {
        brand_id,
        user_id,
        session_id,
        query,
        user_context,
        available_skus,
        config = DEFAULT_BRAND_CONFIG,
        top_k = 5,
    } = request;

    // 1. Deterministic Scoring (Phase 1)
    const rankedSkus = rankSkus(user_context, available_skus, config, top_k * 2); // Get 2x for bandit pool

    if (rankedSkus.length === 0) {
        logger.warn('[Smokey Recommender] No SKUs to recommend');
        return {
            recommendations: [],
            event_id: '',
            algorithm_used: 'deterministic',
            exploration_applied: false,
        };
    }

    // 2. Bandit Exploration for Top Slot (Phase 2)
    let finalRecommendations = rankedSkus.slice(0, top_k);
    let explorationApplied = false;

    // Only apply bandit if we have enough candidates
    if (rankedSkus.length >= 3) {
        const topCandidates = rankedSkus.slice(0, Math.min(10, rankedSkus.length));
        const armIds = topCandidates.map(s => s.sku_id);

        const banditState = getBrandBandit(brand_id, armIds);
        const selection = selectArm(banditState);

        // If bandit selects a different #1 than scoring, swap
        if (selection.arm_id !== finalRecommendations[0]?.sku_id) {
            const banditPick = topCandidates.find(s => s.sku_id === selection.arm_id);
            if (banditPick) {
                // Move bandit pick to position 1
                finalRecommendations = [
                    { ...banditPick, rank: 1 },
                    ...finalRecommendations
                        .filter(s => s.sku_id !== selection.arm_id)
                        .slice(0, top_k - 1)
                        .map((s, i) => ({ ...s, rank: i + 2 })),
                ];
                explorationApplied = true;

                logger.debug(`[Smokey Recommender] Bandit exploration: ${selection.arm_id} (exploration: ${selection.is_exploration})`);
            }
        }
    }

    // 3. Log Event (for feedback loop)
    const eventPayload: SmokeyRecEvent['payload'] = {
        query,
        user_context: {
            intent: user_context.intent,
            tolerance_level: user_context.tolerance_level,
            preferred_effects: user_context.preferred_effects,
            price_preference: user_context.price_preference,
        },
        skus_considered: available_skus.map(s => s.sku_id),
        skus_ranked: rankedSkus.map(s => ({
            sku_id: s.sku_id,
            score: s.score,
            rank: s.rank,
        })),
        skus_shown: finalRecommendations.map(s => s.sku_id),
        scoring_weights: config.weights,
    };

    const eventId = await logAlgorithmEvent({
        event_type: 'smokey_rec',
        brand_id,
        user_id,
        session_id,
        payload: eventPayload,
    });

    return {
        recommendations: finalRecommendations,
        event_id: eventId,
        algorithm_used: explorationApplied ? 'bandit' : 'deterministic',
        exploration_applied: explorationApplied,
    };
}

/**
 * Records feedback for a recommendation.
 * Updates the bandit to learn from user behavior.
 */
export async function recordFeedback(
    brand_id: string,
    recommendation_event_id: string,
    sku_id: string,
    action: 'click' | 'add_to_cart' | 'purchase' | 'thumbs_up' | 'thumbs_down' | 'dismiss',
    value?: number
): Promise<void> {
    // 1. Log feedback event
    await logAlgorithmEvent({
        event_type: 'smokey_feedback',
        brand_id,
        payload: {
            recommendation_event_id,
            sku_id,
            action,
            value,
        },
    });

    // 2. Update bandit
    const reward = ['click', 'add_to_cart', 'purchase', 'thumbs_up'].includes(action);

    const banditState = getBrandBandit(brand_id, [sku_id]);
    const updatedState = updateArm(banditState, sku_id, reward);
    saveBrandBandit(brand_id, updatedState);

    logger.debug(`[Smokey Recommender] Recorded feedback: ${action} for ${sku_id} (reward: ${reward})`);
}

/**
 * Gets recommendation stats for a brand (for dashboard).
 */
export function getRecommendationStats(brand_id: string): {
    bandit_stats: ReturnType<typeof getBanditStats> | null;
    config: BrandScoringConfig;
} {
    const key = `smokey_rec_${brand_id}`;
    const state = banditCache.get(key);

    return {
        bandit_stats: state ? getBanditStats(state) : null,
        config: DEFAULT_BRAND_CONFIG,
    };
}
