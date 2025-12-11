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

// --- Phase 2: Customer Memory ---

export {
    getCustomerMemory,
    createCustomerMemory,
    updateCustomerMemory,
    aggregateCustomerEvents,
    updateMemoryFromEvents,
    getPatternClusters,
    assignCustomerToCluster,
    findSimilarCustomers,
    getCustomerContext,
} from './customer-memory';

// --- Phase 3: Feedback Loop ---

export {
    recordOutcome,
    getRecentOutcomes,
    analyzeHeuristicPerformance,
    runHeuristicEvolutionJob,
    analyzeSystemPerformance,
    type HeuristicPerformance,
    type SystemPerformance,
} from './outcomes';

// --- Phase 4: Multi-Agent Coordination ---

export {
    sendAgentMessage,
    recordReaction,
    getPendingMessages,
    getMessagesRequiringReaction,
    broadcastDemandSpike,
    broadcastComplianceRisk,
    sendCustomerTrend,
    sendInventoryAlert,
    cleanupExpiredMessages,
} from './agent-bus';

// --- Phase 5: Nightly Dream Cycle ---

export {
    runDreamCycle,
    runGlobalDreamCycle,
    type DreamCycleConfig,
    type DreamCycleResult,
} from './dream-cycle';
