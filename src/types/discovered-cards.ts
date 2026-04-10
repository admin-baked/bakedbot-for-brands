/**
 * Discovered Cards Types
 *
 * Types for the weekly briefing card discovery system.
 * LLM-proposed card definitions, approval pattern tracking, and autonomy escalation.
 */

import type { InsightCategory, InsightSeverity } from './insight-cards';
import type { InboxThreadType } from './inbox';

// ============ Card Definition ============

export type CardDataSourceType =
  | 'pos'
  | 'competitive'
  | 'reddit'
  | 'jina'
  | 'crm'
  | 'multi';

export type CardQueryType =
  | 'reddit_search'
  | 'pos_velocity'
  | 'pos_orders'
  | 'competitive_scan'
  | 'crm_segments'
  | 'jina_search'
  | 'composite';

export interface CardQueryConfig {
  type: CardQueryType;
  query?: string;
  subreddit?: string;
  posMetric?: string;
  filterCriteria?: Record<string, unknown>;
}

export interface CardCtaAction {
  label: string;
  threadType: InboxThreadType;
  threadPromptTemplate: string;
}

export type CardDefinitionStatus = 'active' | 'retired' | 'rejected';

export interface DiscoveredCardDefinition {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: InsightCategory;
  agentId: string;
  agentName: string;
  dataSource: CardDataSourceType;
  queryConfig: CardQueryConfig;
  headlineTemplate: string;
  subtextTemplate?: string;
  ctaAction: CardCtaAction;
  severity: InsightSeverity;
  proposedWeek: string;       // ISO week: "2026-W15"
  status: CardDefinitionStatus;
  generationCount: number;
  lastGeneratedAt?: Date;
  proposedAt: Date;
  activatedAt?: Date;
  retiredAt?: Date;
}

// ============ Approval Patterns ============

export type AutonomyLevel = 1 | 2 | 3 | 4;

export interface ApprovalPatternRecord {
  id: string;
  orgId: string;
  cardDefinitionId: string;
  cardTitle: string;
  totalDecisions: number;
  approvals: number;
  declines: number;
  approvalRate: number;
  avgResponseLatencyMs: number;
  consecutiveApprovals: number;
  consecutiveDeclines: number;
  autonomyLevel: AutonomyLevel;
  autonomyEscalatedAt?: Date;
  lastDecisionAt: Date;
  updatedAt: Date;
}

// ============ Autonomy Escalation ============

export interface AutonomyEscalationResult {
  previousLevel: AutonomyLevel;
  newLevel: AutonomyLevel;
  escalated: boolean;
  reason?: string;
}

/** Thresholds for autonomy escalation */
export const AUTONOMY_THRESHOLDS = {
  /** Level 1 → 2: consecutive approvals needed */
  L2_CONSECUTIVE: 5,
  /** Level 1 → 2: minimum approval rate */
  L2_RATE: 0.8,
  /** Level 2 → 3: consecutive approvals needed */
  L3_CONSECUTIVE: 10,
  /** Level 2 → 3: minimum approval rate */
  L3_RATE: 0.9,
  /** Level 3 → 4: consecutive approvals needed */
  L4_CONSECUTIVE: 20,
  /** Level 3 → 4: no undo within this many days */
  L4_NO_UNDO_DAYS: 30,
  /** Demotion trigger: consecutive declines */
  DEMOTE_DECLINES: 2,
} as const;

// ============ LLM Discovery Proposal ============

/** Shape returned by the LLM tool_use call during weekly discovery */
export interface CardProposal {
  title: string;
  description: string;
  category: InsightCategory;
  agentId: string;
  agentName: string;
  dataSource: CardDataSourceType;
  queryConfig: CardQueryConfig;
  headlineTemplate: string;
  subtextTemplate?: string;
  ctaAction: CardCtaAction;
  severity: InsightSeverity;
}
