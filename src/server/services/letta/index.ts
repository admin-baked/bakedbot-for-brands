/**
 * BakedBot Intelligence - Unified Memory System
 *
 * This module exports all Letta-based memory services following
 * Richmond Alake's Memory Engineering Framework.
 *
 * Memory Hierarchy:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    CONTEXT WINDOW                            │
 * │  ┌─────────────┐   ┌─────────────────────────────────────┐  │
 * │  │ System      │   │ Core Memory (In-Context Blocks)     │  │
 * │  │ Prompt      │   │ - brand_context                     │  │
 * │  │             │   │ - agent_*_memory                    │  │
 * │  │             │   │ - compliance_policies (read-only)   │  │
 * │  └─────────────┘   └─────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────┘
 *                               │
 *               (semantic/temporal search on demand)
 *                               │
 * ┌─────────────────────────────────────────────────────────────┐
 * │              EXTERNAL MEMORY (Out-of-Context)               │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
 * │  │  Semantic   │  │  Episodic   │  │    Procedural       │ │
 * │  │  (Archival) │  │(Conversation│  │ (Workflow Memory)   │ │
 * │  │  - Facts    │  │   Search)   │  │ - Tool trajectories │ │
 * │  │  - Knowledge│  │  - History  │  │ - Success patterns  │ │
 * │  └─────────────┘  └─────────────┘  └─────────────────────┘ │
 * └─────────────────────────────────────────────────────────────┘
 *
 * References:
 * - Richmond Alake's Memory Engineering Framework
 * - Letta Documentation: https://docs.letta.com
 * - Stanford "Generative Agents" Paper
 */

// Core Letta Client
export { lettaClient, LettaClient } from './client';
export type { LettaAgent, LettaBlock, LettaMessage } from './client';

// Shared Memory Blocks (Working Memory)
export { lettaBlockManager, LettaBlockManager, BLOCK_LABELS } from './block-manager';

// Memory Type Schemas
export {
    MemoryUnitSchema,
    EpisodicMemorySchema,
    SemanticMemorySchema,
    ProceduralMemorySchema,
    WorkflowStepSchema,
    MemoryEdgeSchema,
    MemorySearchResultSchema,
    MemoryWeightingConfigSchema,
    ConversationContextSchema,
    SleepTimeConsolidationSchema,
} from './memory-types';
export type {
    MemoryUnit,
    EpisodicMemory,
    SemanticMemory,
    ProceduralMemory,
    MemoryEdge,
    MemorySearchResult,
    MemoryWeightingConfig,
    ConversationContext,
    SleepTimeConsolidation,
} from './memory-types';

// Episodic Memory Service (Conversation Search)
export { episodicMemoryService, EpisodicMemoryService } from './episodic-memory';

// Procedural Memory Service (Workflow Trajectories)
export {
    proceduralMemoryService,
    ProceduralMemoryService,
    persistWorkflowFromHarness,
} from './procedural-memory';
export type { WorkflowStep, WorkflowTrajectory } from './procedural-memory';

// Sleep-Time Agent (Background Consolidation)
export {
    sleepTimeService,
    SleepTimeAgentService,
    runScheduledConsolidation,
} from './sleeptime-agent';
export type { SleepTimeConfig } from './sleeptime-agent';

// Associative Memory (Graph Relationships)
export {
    associativeMemoryService,
    AssociativeMemoryService,
} from './associative-memory';
export type { RelationType, CreateEdgeParams } from './associative-memory';

// Memory Bridge (Letta <-> Firestore Sync)
export {
    memoryBridgeService,
    MemoryBridgeService,
    runScheduledMemoryBridgeSync,
} from './memory-bridge';
export type { SyncRecord } from './memory-bridge';

// Conversations API (Parallel Threads)
export {
    conversationsService,
    ConversationsService,
} from './conversations';
export type { LettaConversation, ConversationMessage, SendMessageOptions } from './conversations';

// Archival Tags (Memory Organization)
export {
    archivalTagsService,
    ArchivalTagsService,
    TAG_PREFIXES,
    CATEGORY_TAGS,
    AGENT_TAGS,
} from './archival-tags';
export type { TaggedMemory, TagIndex } from './archival-tags';
