
/**
 * 3-Layer Stack Architecture: Primitives
 * 
 * This file defines the core data structures for the "Intuition OS" runtime.
 * These types enable agents to Plan (System 2), Execute (System 1), and Learn (Domain Memory).
 */

export type EntityId = string;
export type AgentId = 'smokey' | 'craig' | 'money_mike' | 'mrs_parker' | 'pops' | 'felisha';

// ==========================================
// Layer 1: The Artifact (The Output)
// ==========================================

export interface Artifact {
    id: string;
    type: 'code' | 'json' | 'text' | 'image' | 'file_path';
    content: string | object;
    metadata?: Record<string, any>;
    createdAt: Date;
    createdBy: AgentId;
}

// ==========================================
// Layer 2: The Logic (The Process)
// ==========================================

/**
 * A discrete unit of work that an agent needs to perform.
 * This is the input to the Agent Kernel.
 */
export interface WorkOrder {
    id: string;
    agentId: AgentId;
    goal: string; // "Draft a welcome email for User X"

    // The "State Snapshot" context needed to do the work
    context: StateSnapshot;

    // Constraints
    priority: 'low' | 'medium' | 'high';
    deadline?: Date;
    maxBudget?: number; // e.g. token cost or API calls
}

/**
 * A frozen capture of all relevant state needed to execute a WorkOrder.
 * This ensures determinism and replayability.
 */
export interface StateSnapshot {
    userId?: string;
    brandId?: string;

    // Relevant DB state (e.g. current product prices, user preferences)
    data: Record<string, any>;

    // Immediate previous conversation history
    conversationHistory?: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];

    capturedAt: Date;
}

// ==========================================
// Layer 3: Memory & Feedback (The Learning)
// ==========================================

/**
 * The record of *how* a WorkOrder was executed.
 * This is what gets saved to Domain Memory for future "System 1" optimization.
 */
export interface Trace {
    id: string;
    workOrderId: string;

    // The path taken
    method: 'system_1_heuristic' | 'system_2_planning';
    steps: TraceStep[];

    // The result
    outputArtifactId?: string;
    error?: string;

    durationMs: number;
    cost?: number;

    startedAt: Date;
    completedAt: Date;
}

export interface TraceStep {
    stepId: string;
    action: string; // e.g. "search_database", "call_llm"
    input: any;
    output: any;
    timestamp: Date;
}

/**
 * The signal used to reinforce or discard a specific Trace pattern.
 */
export interface OutcomeFeedback {
    id: string;
    traceId: string;
    workOrderId: string;

    // Explicit User Feedback
    userRating?: 1 | -1; // Thumbs up/down
    userComment?: string;

    // Implicit Heuristic Score (0.0 to 1.0)
    // e.g. Did the code compile? Did the user reply?
    heuristicScore?: number;

    createdAt: Date;
}
