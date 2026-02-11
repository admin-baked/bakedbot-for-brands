/**
 * Memory Types and Schemas for BakedBot Intelligence
 *
 * Based on Richmond Alake's Memory Engineering Framework:
 * - Episodic Memory: Timestamped conversations and experiences
 * - Semantic Memory: Facts, knowledge, entities
 * - Procedural Memory: Workflow trajectories and skills
 * - Associative Memory: Pattern-triggered recall via graphs
 *
 * Mapped to Letta's Architecture:
 * - Memory Blocks (in-context) = Working Memory
 * - Archival Memory = Semantic Memory
 * - Conversation Search = Episodic Memory
 * - Workflow Memory (custom) = Procedural Memory
 */

import { z } from 'zod';

// =============================================================================
// MEMORY UNIT: The Atom of Memory
// =============================================================================

export const MemoryUnitSchema = z.object({
    id: z.string(),
    content: z.string(),
    type: z.enum(['episodic', 'semantic', 'procedural', 'associative']),
    timestamp: z.date(),
    agent: z.string(),              // Who created this memory
    tenantId: z.string(),           // Brand/Dispensary scope
    importance: z.number().min(0).max(1).default(0.5),  // Weighting factor
    recency_score: z.number().optional(),  // Computed at retrieval
    tags: z.array(z.string()).default([]),
    embedding: z.array(z.number()).optional(),  // Vector for semantic search
    references: z.array(z.string()).default([]), // IDs of related memories (associative)
    metadata: z.record(z.unknown()).optional(),
});

export type MemoryUnit = z.infer<typeof MemoryUnitSchema>;

// =============================================================================
// EPISODIC MEMORY: Conversations and Experiences
// =============================================================================

export const EpisodicMemorySchema = MemoryUnitSchema.extend({
    type: z.literal('episodic'),
    conversationId: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']),
    sessionId: z.string().optional(),
});

export type EpisodicMemory = z.infer<typeof EpisodicMemorySchema>;

// =============================================================================
// SEMANTIC MEMORY: Facts and Knowledge
// =============================================================================

export const SemanticMemorySchema = MemoryUnitSchema.extend({
    type: z.literal('semantic'),
    category: z.string().optional(),  // e.g., 'competitor', 'product', 'user_preference'
    confidence: z.number().min(0).max(1).default(1),
    source: z.string().optional(),    // Where did this fact come from?
    validUntil: z.date().optional(),  // Some facts expire
});

export type SemanticMemory = z.infer<typeof SemanticMemorySchema>;

// =============================================================================
// PROCEDURAL MEMORY: Workflow Trajectories
// =============================================================================

export const WorkflowStepSchema = z.object({
    stepNumber: z.number(),
    toolName: z.string(),
    args: z.record(z.unknown()),
    result: z.unknown(),
    success: z.boolean(),
    duration_ms: z.number().optional(),
});

export const ProceduralMemorySchema = MemoryUnitSchema.extend({
    type: z.literal('procedural'),
    taskDescription: z.string(),
    steps: z.array(WorkflowStepSchema),
    outcome: z.enum(['success', 'partial', 'failure']),
    totalDuration_ms: z.number().optional(),
    reusable: z.boolean().default(true),  // Can this trajectory be applied to similar tasks?
});

export type ProceduralMemory = z.infer<typeof ProceduralMemorySchema>;

// =============================================================================
// ASSOCIATIVE MEMORY: Graph Edges
// =============================================================================

export const MemoryEdgeSchema = z.object({
    id: z.string(),
    fromMemoryId: z.string(),
    toMemoryId: z.string(),
    relation: z.enum([
        'similar_to',     // Semantic similarity
        'followed_by',    // Temporal sequence
        'caused',         // Causal relationship
        'referenced_in',  // Cross-reference
        'contradicts',    // Conflicting information
        'supersedes',     // Newer info replacing old
    ]),
    strength: z.number().min(0).max(1).default(0.5),
    createdAt: z.date(),
    createdBy: z.string(),  // Agent that created the edge
});

export type MemoryEdge = z.infer<typeof MemoryEdgeSchema>;

// =============================================================================
// MEMORY SEARCH RESULTS (with Letta RRF scores)
// =============================================================================

export const MemorySearchResultSchema = z.object({
    memory: MemoryUnitSchema,
    scores: z.object({
        rrf_score: z.number().optional(),      // Reciprocal Rank Fusion
        vector_rank: z.number().optional(),    // Semantic similarity rank
        fts_rank: z.number().optional(),       // Full-text search rank
        recency_score: z.number().optional(),  // Time decay
        importance_score: z.number().optional(), // Cross-reference count
        final_score: z.number(),               // Weighted combination
    }),
});

export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>;

// =============================================================================
// MEMORY WEIGHTING CONFIGURATION
// =============================================================================

export const MemoryWeightingConfigSchema = z.object({
    relevance_weight: z.number().default(0.5),   // Semantic similarity
    recency_weight: z.number().default(0.3),     // Time decay
    importance_weight: z.number().default(0.2),  // Reference count
    recency_decay_hours: z.number().default(168), // 1 week half-life
});

export type MemoryWeightingConfig = z.infer<typeof MemoryWeightingConfigSchema>;

// =============================================================================
// CONVERSATION CONTEXT (for Episodic Memory)
// =============================================================================

export const ConversationContextSchema = z.object({
    conversationId: z.string(),
    agentId: z.string(),
    tenantId: z.string(),
    startedAt: z.date(),
    lastMessageAt: z.date(),
    messageCount: z.number(),
    summary: z.string().optional(),
    participants: z.array(z.string()),  // user IDs, agent names
    tags: z.array(z.string()).default([]),
});

export type ConversationContext = z.infer<typeof ConversationContextSchema>;

// =============================================================================
// SLEEP-TIME CONSOLIDATION RESULT
// =============================================================================

export const SleepTimeConsolidationSchema = z.object({
    id: z.string(),
    agentId: z.string(),
    tenantId: z.string(),
    triggeredAt: z.date(),
    completedAt: z.date().optional(),
    status: z.enum(['running', 'completed', 'failed']),
    inputMessages: z.number(),       // How many messages were processed
    outputInsights: z.array(z.string()),  // Distilled learnings
    blocksUpdated: z.array(z.string()),   // Which memory blocks were modified
    newArchivalEntries: z.number(),       // How many facts were archived
});

export type SleepTimeConsolidation = z.infer<typeof SleepTimeConsolidationSchema>;

// =============================================================================
// MERIDIAN-ENHANCED MEMORY FEATURES
// =============================================================================

/**
 * Confidence scoring for all memory entries (MERIDIAN Receipts-Backed Protocol)
 * Every factual claim includes a confidence score (0.00-1.00) and source attribution
 */
export const MemoryConfidenceSchema = z.object({
    overall: z.number().min(0).max(1),  // Overall confidence in this memory
    claims: z.array(z.object({
        text: z.string(),                 // The specific claim
        score: z.number().min(0).max(1),  // Confidence in this claim
        source: z.enum([
            'memory',           // Retrieved from Letta archival
            'pos_api',          // Direct from POS system (high confidence)
            'web_search',       // Web search result
            'inference',        // AI-inferred (lower confidence)
            'user_stated',      // User explicitly stated
            'competitor_intel', // Ezal scrape (medium confidence)
            'calculated',       // Computed from data
        ]),
        lastVerified: z.date().optional(),  // When was this last checked?
    })).optional(),
});

export type MemoryConfidence = z.infer<typeof MemoryConfidenceSchema>;

/**
 * Fact vs Speculation labeling (MERIDIAN Safety Protocol)
 * Enforces distinction between verified facts and AI inferences
 */
export const MemoryEvidenceSchema = z.object({
    type: z.enum([
        'fact',         // Verified, grounded in data
        'speculation',  // AI inference, not yet verified
        'opinion',      // User preference or subjective statement
        'hypothesis',   // Testable claim, needs validation
    ]),
    verificationStatus: z.enum([
        'verified',     // Confirmed by authoritative source
        'pending',      // Awaiting verification
        'challenged',   // Contradicted by other evidence
        'expired',      // Was true, but may be outdated
    ]).default('pending'),
    verifiedBy: z.string().optional(),  // Agent or system that verified
    verifiedAt: z.date().optional(),
    expiresAt: z.date().optional(),     // When this fact becomes stale
});

export type MemoryEvidence = z.infer<typeof MemoryEvidenceSchema>;

/**
 * Memory Conflict Detection (MERIDIAN Memory Gardening)
 * Identifies contradictory facts in the memory system
 */
export const MemoryConflictSchema = z.object({
    id: z.string(),
    memoryId1: z.string(),
    memoryId2: z.string(),
    conflictType: z.enum([
        'direct_contradiction',  // "X is Y" vs "X is not Y"
        'outdated_superseded',   // Older fact replaced by newer
        'partial_overlap',       // Partially conflicting claims
        'source_disagreement',   // Same topic, different sources, different claims
    ]),
    severity: z.enum(['critical', 'warning', 'minor']),
    detectedAt: z.date(),
    detectedBy: z.string(),  // Agent or service that detected conflict
    resolution: z.enum([
        'unresolved',
        'keep_both',      // Both valid in different contexts
        'keep_newer',     // Supersedes older fact
        'keep_higher_confidence',  // Trust higher confidence source
        'manual_review',  // Needs human decision
    ]).default('unresolved'),
    resolvedAt: z.date().optional(),
    resolvedBy: z.string().optional(),
});

export type MemoryConflict = z.infer<typeof MemoryConflictSchema>;

/**
 * Memory Health Metrics (MERIDIAN Memory Gardening)
 * Track the health and quality of the memory system
 */
export const MemoryHealthMetricsSchema = z.object({
    agentId: z.string(),
    tenantId: z.string(),
    timestamp: z.date(),

    // Volume metrics
    totalMemories: z.number(),
    byType: z.object({
        episodic: z.number(),
        semantic: z.number(),
        procedural: z.number(),
        associative: z.number(),
    }),

    // Quality metrics
    averageConfidence: z.number().min(0).max(1),
    factVsSpeculationRatio: z.number(),  // Higher is better
    conflictsDetected: z.number(),
    conflictsResolved: z.number(),

    // Freshness metrics
    staleMemories: z.number(),            // Older than threshold
    expiredFacts: z.number(),             // Past validUntil date
    averageAgeHours: z.number(),

    // Usage metrics
    retrievalsLast24h: z.number(),
    lastGardeningRun: z.date().optional(),
    gardeningRecommended: z.boolean(),
});

export type MemoryHealthMetrics = z.infer<typeof MemoryHealthMetricsSchema>;

/**
 * Memory Gardening Report (MERIDIAN Auto-Cleanup)
 * Results from automated memory cleanup and consolidation
 */
export const MemoryGardeningReportSchema = z.object({
    id: z.string(),
    agentId: z.string(),
    tenantId: z.string(),
    startedAt: z.date(),
    completedAt: z.date().optional(),
    status: z.enum(['running', 'completed', 'failed']),

    // Input
    memoriesScanned: z.number(),
    scanCriteria: z.object({
        minAge: z.number().optional(),          // Days old
        maxRelevanceScore: z.number().optional(), // Below threshold
        includeUnverified: z.boolean(),
    }),

    // Actions taken
    memoriesRemoved: z.number(),
    memoriesMerged: z.number(),
    conflictsDetected: z.number(),
    conflictsResolved: z.number(),
    factsExpired: z.number(),

    // Details
    removedMemoryIds: z.array(z.string()),
    conflictReports: z.array(MemoryConflictSchema),

    // Improvements
    spaceReclaimed: z.number(),  // Estimated tokens saved
    healthScoreBefore: z.number().min(0).max(100),
    healthScoreAfter: z.number().min(0).max(100),

    recommendations: z.array(z.string()),  // Suggestions for next gardening
});

export type MemoryGardeningReport = z.infer<typeof MemoryGardeningReportSchema>;

/**
 * Enhanced Semantic Memory with MERIDIAN features
 */
export const MeridianSemanticMemorySchema = SemanticMemorySchema.extend({
    confidence: MemoryConfidenceSchema,  // Replaces simple number
    evidence: MemoryEvidenceSchema,
    conflictedWith: z.array(z.string()).optional(),  // IDs of conflicting memories
    supersedes: z.string().optional(),    // ID of older memory this replaces
    supersededBy: z.string().optional(),  // ID of newer memory that replaced this
});

export type MeridianSemanticMemory = z.infer<typeof MeridianSemanticMemorySchema>;
