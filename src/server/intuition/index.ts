/**
 * Intuition OS - Module Index
 * 
 * The Four Intuition Loops:
 * - Loop 1: Agent Events (Log Everything)
 * - Loop 2: Agent Memories (Summarize & Cluster)
 * - Loop 3: Heuristics (Runtime Retrieval)
 * - Loop 4: Outcomes (Feedback Evolution)
 */

// Schema & Types
export * from './schema';

// Loop 1: Agent Events
export {
    logAgentEvent,
    getRecentEvents,
    getSessionEvents,
    getEventCounts,
    logRecommendationShown,
    logProductClicked,
    logOrderCompleted,
    logFeedback,
    forceFlushEvents,
} from './agent-events';

// Loop 3: Heuristics Engine
export {
    createHeuristic,
    getHeuristics,
    updateHeuristicStats,
    evaluateCondition,
    evaluateHeuristic,
    evaluateHeuristics,
    applyHeuristicAction,
    HEURISTIC_TEMPLATES,
    type HeuristicResult,
} from './heuristics';

// Confidence Scoring
export {
    calculateConfidenceScore,
    shouldUseFastPath,
    explainConfidence,
    calculateDataRecency,
    calculateDataDensity,
    calculateHeuristicCoverage,
    calculatePatternMatch,
    calculateAnomalyScore,
    type ConfidenceInput,
} from './confidence';

// Starter Packs (Cold Start)
export {
    getStarterPackDefinition,
    applyStarterPack,
    getBaselineMetrics,
    hasStarterPack,
} from './starter-packs';
