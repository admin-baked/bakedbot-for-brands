/**
 * Knowledge Engine — Public API
 *
 * Re-exports the full Phase 1 surface. Callers import from here, not from internals.
 */

// Types
export type {
  KnowledgeDomain,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  RuntimeKnowledgeContext,
  KnowledgeEntity,
  KnowledgeClaim,
  KnowledgeAlert,
  IngestResult,
  TargetAgent,
  ImpactLevel,
  ClaimState,
} from './types';

// Search + context
export { searchKnowledge, searchKnowledgeForExecutiveBrief } from './search';
export { buildWelcomePlaybookKnowledgeContext, buildCompetitiveIntelActionContext } from './runtime-context';

// Ingestion
export { ingestCompetitiveIntelKnowledge } from './ingest-competitive-intel';
export { ingestCampaignHistoryKnowledge } from './ingest-campaign-history';
export { ingestPlaybookRunKnowledge } from './ingest-playbook-runs';
export { ingestAgentObservation } from './ingest-agent-observations';

// Alerts
export { generateKnowledgeAlerts } from './alerts';

// Letta promotion
export { promoteRuntimeKnowledgeToLetta, promoteKnowledgeSliceToLettaBlocks, buildKnowledgeBackedWorkingSet } from './letta-promotion';

// Firestore queries (for dashboard server actions)
export { getRecentAlerts, getRecentClaims } from './firestore-repo';

// Scoring (for tests)
export { computeConfidenceScore, getConfidenceBand, computeClaimState, getRecencyBucket } from './scoring';
export { isEligibleForLettaPromotion } from './promotion-policy';
