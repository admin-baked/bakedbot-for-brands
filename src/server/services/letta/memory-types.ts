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
