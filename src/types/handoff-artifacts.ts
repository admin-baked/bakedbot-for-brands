/**
 * Handoff Artifact Types
 *
 * Typed contracts for inter-agent communication. Replaces loose
 * `Record<string, any>` payloads on the agent bus with discriminated unions.
 *
 * Each artifact has a `kind` discriminator, agent attribution, confidence
 * score, and a typed `payload` specific to the handoff type.
 *
 * Usage:
 *   import { sendHandoff } from '@/server/intuition/handoff';
 *   await sendHandoff(tenantId, { kind: 'campaign_brief', ... });
 */

// ─────────────────────────────────────────────────────────────────────────────
// Kind Discriminator
// ─────────────────────────────────────────────────────────────────────────────

export type HandoffArtifactKind =
  | 'audience_insight'
  | 'campaign_brief'
  | 'compliance_decision'
  | 'competitive_intel'
  | 'recommendation_set'
  | 'landing_page_brief'
  | 'retail_routing_decision';

// ─────────────────────────────────────────────────────────────────────────────
// Base Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface HandoffBase {
  id: string;
  kind: HandoffArtifactKind;
  fromAgent: string;
  toAgent: string | 'broadcast';
  orgId: string;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp — optional expiry */
  expiresAt?: string;
  /** Agent's self-assessed confidence in this artifact (0.0–1.0) */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete Artifacts
// ─────────────────────────────────────────────────────────────────────────────

/** Pops → Craig/Smokey: audience segment insight with trend direction */
export interface AudienceInsightArtifact extends HandoffBase {
  kind: 'audience_insight';
  payload: {
    segmentId: string;
    insight: string;
    dataPoints: number;
    trend: 'growing' | 'stable' | 'declining';
    recommendation?: string;
  };
}

/** Craig → Deebo/Smokey/Pages: structured campaign brief ready for review */
export interface CampaignBriefArtifact extends HandoffBase {
  kind: 'campaign_brief';
  payload: {
    campaignName: string;
    objective: string;
    targetSegments: string[];
    channels: string[];
    heroProducts: string[];
    copy: { headline: string; body: string; cta: string };
    scheduledDate?: string;
    budget?: number;
  };
}

/** Deebo → Craig/Smokey: compliance verdict on content or campaign */
export interface ComplianceDecisionArtifact extends HandoffBase {
  kind: 'compliance_decision';
  payload: {
    contentHash: string;
    status: 'pass' | 'fail' | 'warn';
    violations: { rule: string; severity: string; excerpt: string }[];
    jurisdictions: string[];
    suggestedFixes?: string[];
  };
}

/** Ezal → Craig/Pops: competitive threat or pricing intelligence */
export interface CompetitiveIntelArtifact extends HandoffBase {
  kind: 'competitive_intel';
  payload: {
    competitorName: string;
    productId?: string;
    pricePoint?: number;
    dealType?: string;
    threatLevel: 'low' | 'medium' | 'high';
    suggestedResponse?: string;
  };
}

/** Smokey → Craig/Pages: product recommendation set for a customer or segment */
export interface RecommendationSetArtifact extends HandoffBase {
  kind: 'recommendation_set';
  payload: {
    customerId?: string;
    products: { skuId: string; name: string; score: number; reason: string }[];
    strategy: string;
  };
}

/** Craig → Pages/UI: landing page brief for generation */
export interface LandingPageBriefArtifact extends HandoffBase {
  kind: 'landing_page_brief';
  payload: {
    pageType: string;
    headline: string;
    sections: { title: string; content: string }[];
    cta: string;
    heroProductIds?: string[];
  };
}

/** Pops/Smokey → fulfillment: retail routing decision */
export interface RetailRoutingDecisionArtifact extends HandoffBase {
  kind: 'retail_routing_decision';
  payload: {
    orderId?: string;
    customerId?: string;
    selectedRetailerId: string;
    reason: string;
    alternatives: { retailerId: string; score: number }[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated Union
// ─────────────────────────────────────────────────────────────────────────────

export type HandoffArtifact =
  | AudienceInsightArtifact
  | CampaignBriefArtifact
  | ComplianceDecisionArtifact
  | CompetitiveIntelArtifact
  | RecommendationSetArtifact
  | LandingPageBriefArtifact
  | RetailRoutingDecisionArtifact;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Type guard for handoff artifacts */
export function isHandoffArtifact(obj: unknown): obj is HandoffArtifact {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'kind' in obj &&
    'fromAgent' in obj &&
    'payload' in obj
  );
}

/** Create a handoff artifact with auto-generated ID and timestamp */
export function createHandoff<T extends HandoffArtifact>(
  fields: Omit<T, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): T {
  return {
    ...fields,
    id: fields.id ?? `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: fields.createdAt ?? new Date().toISOString(),
  } as T;
}
