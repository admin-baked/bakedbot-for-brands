/**
 * Knowledge Engine — Core Types
 *
 * Shared interfaces used across the knowledge engine service layer.
 * Firestore document types, search contracts, and runtime context shapes.
 */

import type { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// DOMAIN
// =============================================================================

export type KnowledgeDomain =
  | 'competitive_intel'
  | 'campaign_history'
  | 'welcome_playbooks'
  | 'checkin_flow'
  | 'playbook_420'; // org-agnostic — covers Thrive 4/20 and future tenants

export type EntityType =
  | 'brand'
  | 'competitor'
  | 'product'
  | 'campaign'
  | 'playbook'
  | 'flow'
  | 'audience_segment'  // Phase 2+
  | 'location'          // Phase 2+
  | 'metric_snapshot';  // Phase 2+ (compliance_rule deferred to Phase 2+)

export type ClaimState = 'signal' | 'working_fact' | 'verified_fact' | 'dismissed';
export type ConfidenceBand = 'low' | 'medium' | 'high';
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
export type RecencyBucket = 'today' | '7d' | '14d' | '30d' | 'stale';

export type TrustClass =
  | 'first_party'
  | 'trusted_external'
  | 'external'
  | 'agent_generated';

export type EvidenceType =
  | 'first_party_system'
  | 'first_party_user'
  | 'external_scrape'
  | 'external_api'
  | 'inferred'
  | 'human_reviewed';

export type TargetAgent = 'marty' | 'craig' | 'ezal' | 'system';

export type TargetBlock =
  | 'executive_workspace'
  | 'brand_context'
  | 'playbook_status'
  | 'agent_craig_memory'
  | 'agent_ezal_memory';

// =============================================================================
// FIRESTORE DOCUMENT INTERFACES
// =============================================================================

export interface KnowledgeEntity {
  id: string;
  tenantId: string;
  entityType: EntityType;
  externalRef?: string;
  name: string;
  canonicalName: string;
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  metadata: Record<string, unknown>;
  sourceIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KnowledgeSource {
  id: string;
  tenantId: string;
  sourceType:
    | 'competitive_report'
    | 'competitor_snapshot'
    | 'campaign_record'
    | 'playbook_run'
    | 'checkin_event'
    | 'agent_observation'
    | 'manual_note'
    | 'first_party_metric';
  title: string;
  sourceRef: string;
  url?: string;
  observedAt: Timestamp;
  importedAt: Timestamp;
  trustClass: TrustClass;
  checksum: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeObservation {
  id: string;
  tenantId: string;
  sourceId: string;
  observationType:
    | 'competitor_change'
    | 'campaign_outcome'
    | 'playbook_outcome'
    | 'customer_flow_outcome'
    | 'market_signal'
    | 'agent_note';
  title: string;
  summary: string;
  entityIds: string[];
  rawContent: string;
  observedAt: Timestamp;
  createdBy: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KnowledgeClaim {
  id: string;
  tenantId: string;
  entityIds: string[];
  observationIds: string[];
  sourceIds: string[];
  claimType:
    | 'competitor_promo'
    | 'competitor_price_shift'
    | 'campaign_pattern'
    | 'playbook_pattern'
    | 'flow_pattern'
    | 'recommendation'
    | 'risk';
  claimText: string;
  state: ClaimState;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  evidenceType: EvidenceType;
  recencyBucket: RecencyBucket;
  impactLevel: ImpactLevel;
  promotedToLetta: boolean;
  promotedAt?: Timestamp;
  expiresAt?: Timestamp;
  supersedesClaimId?: string;
  contradictedByClaimIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KnowledgeEdge {
  id: string;
  tenantId: string;
  fromId: string;
  toId: string;
  edgeType:
    | 'belongs_to_brand'
    | 'competes_with'
    | 'promotes_product'
    | 'observed_in_campaign'
    | 'generated_by_playbook'
    | 'associated_with_flow'
    | 'derived_from_source'
    | 'supports_claim'
    | 'contradicts_claim'
    | 'supersedes_claim'
    | 'recommends_action_for';
  strength: number;
  sourceIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KnowledgeIngestionRun {
  id: string;
  tenantId: string;
  pipeline: 'competitive_intel' | 'campaign_history' | 'playbook_runs' | 'agent_observations';
  status: 'running' | 'completed' | 'failed';
  sourceCount: number;
  observationCount: number;
  claimCount: number;
  promotedCount: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}

export interface KnowledgeRuntimePromotion {
  id: string;
  tenantId: string;
  targetAgent: TargetAgent;
  targetBlock: TargetBlock;
  claimIds: string[];
  reason: 'high_confidence_recent' | 'playbook_runtime_context' | 'boardroom_brief' | 'manual_force';
  payload: string;
  createdAt: Timestamp;
}

export interface KnowledgeAlert {
  id: string;
  tenantId: string;
  category: 'competitive' | 'playbook' | 'campaign' | 'boardroom';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  claimIds: string[];
  actionOwner: 'marty' | 'craig' | 'ezal' | 'ops';
  surfacedInBoardroom: boolean;
  surfacedInIntelligence: boolean;
  mirroredInsightId?: string;
  createdAt: Timestamp;
}

// =============================================================================
// SEARCH CONTRACTS
// =============================================================================

export interface KnowledgeSearchRequest {
  tenantId: string;
  query: string;
  domain?: KnowledgeDomain;
  entityTypes?: EntityType[];
  minConfidence?: number;
  state?: ClaimState[];
  lookbackDays?: number;
  limit?: number;
}

export interface KnowledgeSearchResult {
  claimId: string;
  text: string;
  confidenceScore: number;
  state: ClaimState;
  sourceTitles: string[];
  entityNames: string[];
  explanation: string;
  score: number; // blended retrieval score
}

// =============================================================================
// RUNTIME CONTEXT
// =============================================================================

export interface RuntimeKnowledgeContext {
  tenantId: string;
  domain: KnowledgeDomain;
  summary: string;
  topClaims: KnowledgeSearchResult[];
  promotedClaimIds: string[];
}

// =============================================================================
// INGESTION RESULTS
// =============================================================================

export interface IngestResult {
  sourceId: string;
  observationIds: string[];
  claimIds: string[];
}

// =============================================================================
// LANCEDB ROW TYPES (flat — no nested objects allowed)
// =============================================================================

export interface KnowledgeChunkRow {
  [key: string]: unknown;
  id: string;
  tenantId: string;
  chunkType: 'observation' | 'claim' | 'source_excerpt' | 'playbook_context';
  entityIds: string;   // JSON-encoded string[]
  claimIds: string;    // JSON-encoded string[]
  sourceIds: string;   // JSON-encoded string[]
  text: string;
  vector: number[];
  confidenceScore: number;
  state: string;
  domain: string;
  recencyScore: number;
  createdAtIso: string;
}

export interface KnowledgeEntityIndexRow {
  [key: string]: unknown;
  id: string;
  tenantId: string;
  entityType: string;
  canonicalName: string;
  text: string;
  vector: number[];
  tags: string;        // JSON-encoded string[]
  createdAtIso: string;
}
