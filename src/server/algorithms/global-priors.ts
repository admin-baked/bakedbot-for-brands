/**
 * Global Priors & Cross-Tenant Learning
 * 
 * Phase 3: "Algorithmic Intuition"
 * 
 * Aggregates anonymized learning across all brands to:
 * - Build shared priors (what works across the fleet)
 * - Warm-start new brands with industry knowledge
 * - Continuously improve global baselines
 * 
 * This is the MOAT: General experience + local adaptation.
 */

import { ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './schema';
import { BanditArm, BanditState } from './bandit';
import { logger } from '@/lib/logger';

// --- Types ---

/**
 * Represents learned patterns across all tenants.
 */
export interface GlobalPrior {
    prior_id: string;
    pattern_type: 'effect_mapping' | 'pricing' | 'timing' | 'compliance';
    pattern_key: string; // e.g., "sleep_gummy_low_tolerance"
    data: Record<string, number>; // Pattern-specific learned values
    sample_count: number;
    confidence: number; // 0-1
    last_updated: string;
}

/**
 * Aggregated bandit stats from all brands (anonymized).
 */
export interface AggregatedBanditStats {
    arm_pattern: string; // e.g., "category:gummies" or "effect:sleep"
    total_successes: number;
    total_failures: number;
    total_pulls: number;
    brand_count: number; // How many brands contributed
}

/**
 * Global scoring weights learned from cross-tenant data.
 */
export interface GlobalScoringWeights extends ScoringWeights {
    confidence: number;
    sample_size: number;
    last_computed: string;
}

/**
 * Segment-specific learned patterns.
 */
export interface SegmentPattern {
    segment_type: string; // "recreational", "medical", "new_user", etc.
    best_hours: number[];
    best_days: number[];
    avg_open_rate: number;
    sample_size: number;
}

// --- In-Memory Global State (V1) ---
// In production, this would be Firestore collections

const globalPriors: Map<string, GlobalPrior> = new Map();
const aggregatedStats: Map<string, AggregatedBanditStats> = new Map();
let globalWeights: GlobalScoringWeights | null = null;
const segmentPatterns: Map<string, SegmentPattern> = new Map();

// --- Effect Pattern Learning ---

/**
 * Known effect-to-recommendation mappings (bootstrap data).
 * These are industry patterns that we know work well.
 */
const BOOTSTRAP_EFFECT_PATTERNS: Record<string, Record<string, number>> = {
    'sleep': {
        'form:gummy': 0.8,
        'form:tincture': 0.7,
        'thc_range:low': 0.9,
        'cbd_presence:high': 0.85,
        'terpene:myrcene': 0.75,
    },
    'pain_relief': {
        'form:topical': 0.85,
        'form:tincture': 0.7,
        'cbd_presence:high': 0.9,
        'thc_range:medium': 0.6,
    },
    'energy': {
        'form:vape': 0.8,
        'form:flower': 0.75,
        'thc_range:high': 0.65,
        'terpene:limonene': 0.8,
        'strain_type:sativa': 0.9,
    },
    'relaxation': {
        'form:flower': 0.8,
        'form:gummy': 0.75,
        'thc_range:medium': 0.7,
        'terpene:linalool': 0.75,
    },
    'social': {
        'form:preroll': 0.85,
        'form:vape': 0.7,
        'thc_range:medium': 0.75,
        'strain_type:hybrid': 0.8,
    },
};

/**
 * Gets the global prior for an effect-based recommendation.
 * Returns learned patterns or bootstrap defaults.
 */
export function getEffectPrior(intent: string): Record<string, number> {
    const normalizedIntent = intent.toLowerCase().replace(/\s+/g, '_');

    // Check for learned prior
    const priorKey = `effect:${normalizedIntent}`;
    const learned = globalPriors.get(priorKey);

    if (learned && learned.confidence > 0.7) {
        return learned.data;
    }

    // Fall back to bootstrap
    return BOOTSTRAP_EFFECT_PATTERNS[normalizedIntent] || {};
}

// --- Scoring Weight Aggregation ---

/**
 * Contributes a brand's learned weights to the global pool.
 * Called periodically by brands after learning.
 */
export function contributeWeights(
    brandId: string,
    weights: ScoringWeights,
    sampleSize: number
): void {
    // Store contribution (anonymized)
    const contribution = {
        weights,
        sample_size: sampleSize,
        contributed_at: new Date().toISOString(),
    };

    // In production, this would write to Firestore
    // For V1, we just trigger recomputation
    logger.debug(`[GlobalPriors] Brand ${brandId.slice(0, 8)} contributed weights (n=${sampleSize})`);

    // Trigger recomputation
    recomputeGlobalWeights();
}

/**
 * Recomputes global weights from all contributions.
 * Uses weighted average based on sample size.
 */
function recomputeGlobalWeights(): void {
    // V1: Since we don't have real contributions yet, use defaults with confidence
    globalWeights = {
        ...DEFAULT_SCORING_WEIGHTS,
        confidence: 0.5, // Medium confidence until we have real data
        sample_size: 1000, // Bootstrap sample
        last_computed: new Date().toISOString(),
    };
}

/**
 * Gets the current global scoring weights.
 * Returns defaults if no global data exists.
 */
export function getGlobalWeights(): GlobalScoringWeights {
    if (!globalWeights) {
        recomputeGlobalWeights();
    }
    return globalWeights!;
}

/**
 * Gets warm-start weights for a new brand.
 * Blends global priors with defaults.
 */
export function getWarmStartWeights(brandContext?: {
    industry?: string;
    region?: string;
    size?: 'small' | 'medium' | 'large';
}): ScoringWeights {
    const global = getGlobalWeights();

    // For now, just return global weights
    // In future, we'd adjust based on brand context
    return {
        effect_match: global.effect_match,
        chemotype_match: global.chemotype_match,
        business_score: global.business_score,
        risk_penalty: global.risk_penalty,
    };
}

// --- Bandit Aggregation ---

/**
 * Contributes a brand's bandit stats to the global pool.
 * Stats are anonymized (no brand/user identifiers).
 */
export function contributeBanditStats(
    brandId: string,
    banditId: string,
    arms: BanditArm[]
): void {
    for (const arm of arms) {
        // Extract pattern from arm_id (e.g., "sku_abc123" → category or effect pattern)
        const pattern = extractArmPattern(arm.arm_id);
        if (!pattern) continue;

        const existing = aggregatedStats.get(pattern) || {
            arm_pattern: pattern,
            total_successes: 0,
            total_failures: 0,
            total_pulls: 0,
            brand_count: 0,
        };

        aggregatedStats.set(pattern, {
            ...existing,
            total_successes: existing.total_successes + arm.successes,
            total_failures: existing.total_failures + arm.failures,
            total_pulls: existing.total_pulls + arm.pulls,
            brand_count: existing.brand_count + 1,
        });
    }

    logger.debug(`[GlobalPriors] Aggregated ${arms.length} arms from brand ${brandId.slice(0, 8)}`);
}

/**
 * Extracts a generalizable pattern from an arm ID.
 */
function extractArmPattern(armId: string): string | null {
    // V1: Simple patterns based on naming conventions
    // In production, this would look up SKU metadata

    if (armId.includes('gummy') || armId.includes('gummies')) {
        return 'category:gummies';
    }
    if (armId.includes('flower')) {
        return 'category:flower';
    }
    if (armId.includes('vape')) {
        return 'category:vape';
    }
    if (armId.includes('preroll')) {
        return 'category:preroll';
    }
    if (armId.includes('concentrate')) {
        return 'category:concentrate';
    }

    return null;
}

/**
 * Gets aggregated success rate for a pattern.
 */
export function getPatternSuccessRate(pattern: string): number | null {
    const stats = aggregatedStats.get(pattern);
    if (!stats || stats.total_pulls < 100) {
        return null; // Not enough data
    }

    return stats.total_successes / stats.total_pulls;
}

/**
 * Gets the best-performing patterns globally.
 */
export function getTopPatterns(limit: number = 10): AggregatedBanditStats[] {
    const allPatterns = Array.from(aggregatedStats.values())
        .filter(s => s.total_pulls >= 50) // Minimum significance
        .sort((a, b) => {
            const rateA = a.total_successes / a.total_pulls;
            const rateB = b.total_successes / b.total_pulls;
            return rateB - rateA;
        });

    return allPatterns.slice(0, limit);
}

// --- Segment Pattern Learning ---

/**
 * Contributes segment timing data to global pool.
 */
export function contributeSegmentTiming(
    segmentType: string,
    sendHour: number,
    sendDay: number,
    wasOpened: boolean
): void {
    const existing = segmentPatterns.get(segmentType) || {
        segment_type: segmentType,
        best_hours: [],
        best_days: [],
        avg_open_rate: 0,
        sample_size: 0,
    };

    // Running average update
    const newSample = existing.sample_size + 1;
    const newOpenRate = (existing.avg_open_rate * existing.sample_size + (wasOpened ? 1 : 0)) / newSample;

    // Track successful hours/days
    if (wasOpened) {
        if (!existing.best_hours.includes(sendHour)) {
            existing.best_hours.push(sendHour);
        }
        if (!existing.best_days.includes(sendDay)) {
            existing.best_days.push(sendDay);
        }
    }

    segmentPatterns.set(segmentType, {
        ...existing,
        avg_open_rate: newOpenRate,
        sample_size: newSample,
    });
}

/**
 * Gets learned timing patterns for a segment.
 */
export function getSegmentTimingPrior(segmentType: string): SegmentPattern | null {
    const pattern = segmentPatterns.get(segmentType);
    if (!pattern || pattern.sample_size < 100) {
        return null;
    }
    return pattern;
}

// --- Cross-Tenant Insight Generation ---

export interface CrossTenantInsight {
    insight_id: string;
    insight_type: 'recommendation' | 'pricing' | 'timing' | 'compliance';
    title: string;
    description: string;
    confidence: number;
    brands_affected: number;
    data: Record<string, any>;
}

/**
 * Generates insights from cross-tenant learning.
 * These can be surfaced in dashboards or used by agents.
 */
export function generateCrossTenantInsights(): CrossTenantInsight[] {
    const insights: CrossTenantInsight[] = [];

    // Insight 1: Top performing product categories
    const topPatterns = getTopPatterns(5);
    if (topPatterns.length > 0) {
        const best = topPatterns[0];
        const successRate = (best.total_successes / best.total_pulls * 100).toFixed(1);

        insights.push({
            insight_id: 'insight_top_category',
            insight_type: 'recommendation',
            title: `${best.arm_pattern} performs best across brands`,
            description: `${successRate}% success rate across ${best.brand_count} brands`,
            confidence: Math.min(0.95, best.total_pulls / 1000),
            brands_affected: best.brand_count,
            data: { pattern: best.arm_pattern, success_rate: successRate },
        });
    }

    // Insight 2: Effect-based patterns
    for (const [effect, patterns] of Object.entries(BOOTSTRAP_EFFECT_PATTERNS)) {
        const topPattern = Object.entries(patterns)
            .sort(([, a], [, b]) => b - a)[0];

        if (topPattern) {
            insights.push({
                insight_id: `insight_effect_${effect}`,
                insight_type: 'recommendation',
                title: `For "${effect}" intent, recommend ${topPattern[0]}`,
                description: `${(topPattern[1] * 100).toFixed(0)}% correlation with successful recs`,
                confidence: topPattern[1],
                brands_affected: 0, // Bootstrap data
                data: { effect, pattern: topPattern[0], score: topPattern[1] },
            });
        }
    }

    return insights;
}

// --- Initialization ---

/**
 * Initializes global priors with bootstrap data.
 * Called once at server start.
 */
export function initializeGlobalPriors(): void {
    // Bootstrap effect priors
    for (const [effect, patterns] of Object.entries(BOOTSTRAP_EFFECT_PATTERNS)) {
        globalPriors.set(`effect:${effect}`, {
            prior_id: `prior_effect_${effect}`,
            pattern_type: 'effect_mapping',
            pattern_key: effect,
            data: patterns,
            sample_count: 100, // Bootstrap
            confidence: 0.6, // Medium confidence for bootstrap
            last_updated: new Date().toISOString(),
        });
    }

    // Initialize global weights
    recomputeGlobalWeights();

    logger.info('[GlobalPriors] Initialized with bootstrap data');
}

// Initialize on module load
initializeGlobalPriors();
