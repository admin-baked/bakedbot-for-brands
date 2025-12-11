/**
 * Algorithm Module Index
 * Exports all algorithm functions for easy importing.
 */

// Event Logging
export * from './events';

// Schema & Types
export * from './schema';

// Smokey Scoring
export {
    computeSkuScore,
    rankSkus,
    DEFAULT_BRAND_CONFIG,
    type UserContext,
    type SkuData,
    type BrandScoringConfig,
    type RankedSku,
} from './smokey-scoring';

// Craig Priority
export {
    computeCampaignPriority,
    selectTopCampaign,
    rankCampaigns,
    getSendTimeHeuristic,
    pickSendTime,
    type Campaign,
    type PrioritizedCampaign,
} from './craig-priority';

// Pops Anomaly Detection
export {
    computeEWMA,
    detectAnomaly,
    analyzeMetrics,
    getAnomalies,
    computeExperimentLift,
    DEFAULT_ANOMALY_CONFIG,
    type MetricDataPoint,
    type AnomalyConfig,
    type ExperimentStats,
} from './pops-anomaly';

// --- Phase 2: Bandit Learning ---

// Multi-Armed Bandit
export {
    createBandit,
    selectArm,
    updateArm,
    thompsonSample,
    ucbSelect,
    epsilonGreedySelect,
    getBestArm,
    getBanditStats,
    type BanditState,
    type BanditArm,
    type BanditSelection,
} from './bandit';

// Smokey Recommender
export {
    getRecommendations,
    recordFeedback,
    getRecommendationStats,
    type RecommendationRequest,
    type RecommendationResponse,
} from './smokey-recommender';

// Craig Optimizer
export {
    optimizeCampaignSelection,
    recordCampaignEngagement,
    getCampaignStats,
    computeSegmentFatigue,
    updateCampaignFatigue,
    type CampaignVariant,
    type OptimizedCampaign,
    type CampaignOptimizationRequest,
    type CampaignOptimizationResponse,
} from './craig-optimizer';
