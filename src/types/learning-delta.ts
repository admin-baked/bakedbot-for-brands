/**
 * Learning Delta Types
 *
 * A LearningDelta is a proposed behavior change derived from telemetry,
 * feedback, procedural memory, or production incidents. Deltas are proposed
 * by the nightly consolidation cron and require approval before being applied.
 *
 * Firestore path: learning_deltas/{deltaId}
 *
 * Flow:
 *   1. Nightly cron analyzes telemetry + feedback + procedural memory
 *   2. Produces LearningDelta proposals with `status: 'proposed'`
 *   3. Human or Linus reviews and approves/rejects
 *   4. Approved deltas are applied (route update, instruction update, eval case, etc.)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

export type LearningDeltaCategory =
  | 'tool_failure_pattern'        // Repeated tool failures with same error type
  | 'compliance_catch_pattern'    // Repeated compliance violations on same content type
  | 'high_performing_workflow'    // Workflow trajectories with consistently high success
  | 'manual_override_pattern'     // Users repeatedly overriding agent decisions
  | 'dead_end_loop'               // Agent entering loops without resolution
  | 'brand_brain_update'          // Proposed update to OrgProfile.operations
  | 'eval_case_candidate';        // New golden set test case from production data

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Source
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningEvidence {
  source: 'telemetry' | 'feedback' | 'procedural_memory' | 'golden_set' | 'production_incident';
  /** How many times this pattern was observed */
  count: number;
  /** Time window, e.g. '7d', '24h' */
  timeWindow: string;
  /** Reference IDs for supporting evidence */
  sampleIds?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposed Action
// ─────────────────────────────────────────────────────────────────────────────

export type LearningActionType =
  | 'update_routing'           // Change tool routing or priority
  | 'update_instructions'      // Modify agent system prompt
  | 'update_brand_brain'       // Merge change into OrgProfile.operations
  | 'add_eval_case'            // Append to golden set
  | 'update_guardrail';        // Add/modify Deebo rule

export interface LearningProposedAction {
  type: LearningActionType;
  /** File path or Firestore path of the target */
  target: string;
  /** Human-readable proposed change */
  diff: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Type
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningDelta {
  id: string;
  category: LearningDeltaCategory;
  /** null = global (applies to all orgs) */
  orgId?: string;
  /** null = all agents */
  agentName?: string;
  /** Human-readable description of the pattern */
  summary: string;
  evidence: LearningEvidence;
  proposedAction: LearningProposedAction;
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  /** ISO timestamp */
  proposedAt: string;
  /** uid or 'linus' */
  reviewedBy?: string;
  /** ISO timestamp */
  reviewedAt?: string;
  /** ISO timestamp */
  appliedAt?: string;
  /** Rejection reason if status is 'rejected' */
  rejectionReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function createLearningDelta(
  fields: Omit<LearningDelta, 'id' | 'proposedAt' | 'status'>,
): LearningDelta {
  return {
    ...fields,
    id: `delta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    proposedAt: new Date().toISOString(),
    status: 'proposed',
  };
}
