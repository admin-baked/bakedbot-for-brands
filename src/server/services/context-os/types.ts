/**
 * Context OS - Decision Lineage Types
 * 
 * The "Why" Layer: Captures the reasoning behind every decision.
 * Transforms tribal knowledge into a searchable, scalable asset.
 */

/**
 * The outcome of a Gauntlet evaluator check
 */
export interface EvaluatorResult {
  evaluatorName: string;
  passed: boolean;
  score: number;
  issues: string[];
  suggestion?: string;
}

/**
 * Core Decision Trace - the fundamental unit of Context OS
 * Captures WHO made a decision, WHAT they decided, and WHY.
 */
export interface DecisionTrace {
  /** Unique identifier for this decision */
  id: string;
  
  /** When the decision was made */
  timestamp: Date;
  
  /** Which agent made this decision */
  agentId: string;
  
  /** The task or question that triggered this decision */
  task: string;
  
  /** The original user prompt (if applicable) */
  originalPrompt?: string;
  
  /** Inputs/context available at decision time */
  inputs: Record<string, any>;
  
  /** The agent's reasoning for the decision */
  reasoning: string;
  
  /** The final outcome */
  outcome: 'approved' | 'rejected' | 'modified' | 'pending';
  
  /** Results from Gauntlet verification (if applicable) */
  evaluators?: EvaluatorResult[];
  
  /** IDs of related/linked decisions (for decision chains) */
  linkedDecisions?: string[];
  
  /** The actual output/response from the agent */
  output?: any;
  
  /** Metadata for filtering and scoping */
  metadata: {
    brandId?: string;
    userId?: string;
    sessionId?: string;
    playbookId?: string;
    retryCount?: number;
  };
}

/**
 * Filter options for querying decision traces
 */
export interface DecisionFilter {
  agentId?: string;
  brandId?: string;
  userId?: string;
  sessionId?: string;
  outcome?: DecisionTrace['outcome'];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * A context query result
 */
export interface ContextAnswer {
  /** The original question */
  question: string;
  
  /** AI-generated answer based on decision history */
  answer: string;
  
  /** Relevant decision traces that informed the answer */
  relevantDecisions: DecisionTrace[];
  
  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Input for logging a business decision (via agent tool)
 */
export interface DecisionLogInput {
  decision: string;
  reasoning: string;
  category: 'pricing' | 'marketing' | 'compliance' | 'operations' | 'strategy' | 'other';
  linkedEntityId?: string; // e.g., productId, campaignId
}

/**
 * Entity node in the Context Graph (Phase 3 - GraphRAG)
 */
export interface ContextEntity {
  id: string;
  type: 'product' | 'brand' | 'customer' | 'campaign' | 'competitor' | 'regulation' | 'agent';
  name: string;
  attributes: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Relationship edge in the Context Graph (Phase 3 - GraphRAG)
 */
export interface ContextRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'influences' | 'triggers' | 'depends_on' | 'competes_with' | 'regulates' | 'decided_by';
  weight: number; // 0-1 strength of relationship
  decisionTraceId?: string; // Link to the decision that created this relationship
  createdAt: Date;
}
