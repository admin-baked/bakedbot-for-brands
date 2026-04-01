/**
 * Skill Artifact Types
 *
 * Named business output objects produced by agent skills.
 * Distinct from chat display artifacts (artifact.ts) and infra approval requests (approval-queue.ts).
 *
 * Collection path: agent_artifacts/{orgId}/artifacts/{artifactId}
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============ Approval Postures (mirrors skill YAML metadata) ============

export type ApprovalPosture =
    | 'inform_only'           // FYI — no human action needed
    | 'draft_only'            // Human must review + approve before anything sends
    | 'recommend_only'        // Suggestion; human decides whether to act
    | 'execute_within_limits' // Agent can act within pre-approved bounds
    | 'always_escalate';      // Always requires human sign-off, no exceptions

// ============ Skill Artifact Types (all named skill outputs) ============

export type SkillArtifactType =
    // Campaign & marketing
    | 'campaign_draft_bundle'            // craig-campaign → draft_only
    | 'campaign_brief'                   // loyalty-reengagement-opportunity-review → recommend_only (handoff to Craig)
    // Intelligence & analysis
    | 'competitor_watch_report'          // competitive-intel → recommend_only
    | 'competitor_promo_watch_report'    // competitor-promo-watch → recommend_only
    | 'menu_gap_analysis'                // menu-gap-analysis → recommend_only
    // Operations
    | 'ops_memo'                         // daily-dispensary-ops-review → inform_only
    | 'diagnosis_report'                 // low-performing-promo-diagnosis → inform_only
    // Brand
    | 'account_tier_review'             // retail-account-opportunity-review → recommend_only
    // Grower
    | 'aging_risk_report'               // inventory-aging-risk-review → recommend_only / always_escalate for disposal
    | 'partner_velocity_report';         // sell-through-partner-analysis → recommend_only

// ============ Artifact Status ============

export type SkillArtifactStatus =
    | 'pending_review'  // Awaiting human action (draft_only / always_escalate)
    | 'reviewed'        // Human has seen it (inform_only / recommend_only)
    | 'approved'        // Human approved (draft_only)
    | 'rejected'        // Human rejected / asked for revision
    | 'acted_on'        // Downstream action taken (e.g., Craig received campaign_brief)
    | 'superseded';     // A newer artifact replaces this one

// ============ Core Artifact Interface ============

export interface SkillArtifact {
    id: string;
    orgId: string;
    skillName: string;                  // e.g., 'craig-campaign', 'competitive-intel'
    artifactType: SkillArtifactType;
    approvalPosture: ApprovalPosture;
    riskLevel: 'low' | 'medium' | 'high';
    status: SkillArtifactStatus;

    // Structured output from the skill
    payload: SkillArtifactPayload;

    // Provenance
    producedBy: string;                 // Agent persona (e.g., 'craig', 'ezal')
    triggeredBy?: string;               // userId or agent that invoked the skill
    threadId?: string;                  // Inbox thread this artifact belongs to

    // Downstream routing
    downstreamConsumers?: string[];     // e.g., ['deebo', 'mailjet']
    reviewNote?: string;                // One-sentence note for the human reviewer

    // Policy gate back-links
    approvalId?: string;                // Set by skill-policy-gate after approval record created
    contentHash?: string;               // SHA-256 of JSON.stringify(payload); used for edit distance

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    reviewedAt?: Timestamp;
    reviewedBy?: string;
}

// ============ Payload Union ============

export type SkillArtifactPayload =
    | CampaignDraftBundlePayload
    | CampaignBriefPayload
    | CompetitorWatchReportPayload
    | CompetitorPromoWatchReportPayload
    | MenuGapAnalysisPayload
    | OpsMemoPayload
    | DiagnosisReportPayload
    | AccountTierReviewPayload
    | AgingRiskReportPayload
    | PartnerVelocityReportPayload;

// ---- Campaign draft bundle (craig-campaign) ----
export interface CampaignDraftBundlePayload {
    kind: 'campaign_draft_bundle';
    goal: string;
    segment: string;
    channels: string[];
    estimatedReach: number;
    marginCheck: { result: string; impactPct?: number };
    complianceStatus: 'pass' | 'flagged';
    variations: Array<{ name: string; copy: Record<string, string> }>;
}

// ---- Campaign brief (loyalty-reengagement → Craig handoff) ----
export interface CampaignBriefPayload {
    kind: 'campaign_brief';
    goal: string;
    segment: string;
    suggestedChannels: string[];
    audienceSize?: number;
    rationale: string;
    suggestedOffer?: string;
    urgency: 'low' | 'medium' | 'high';
}

// ---- Competitor watch report ----
interface CompetitorWatchBase {
    dataSource: string;
    confidence: 'high' | 'medium' | 'low';
    competitorsTracked: number;
    topThreats: Array<{
        competitor: string;
        product: string;
        theirPrice?: number;
        ourPrice?: number;
        gapPct?: number;
        severity: 'P0' | 'P1' | 'P2';
    }>;
    synthesis: string;
    p0Fired: boolean;
}

export interface CompetitorWatchReportPayload extends CompetitorWatchBase {
    kind: 'competitor_watch_report';
}

export interface CompetitorPromoWatchReportPayload extends CompetitorWatchBase {
    kind: 'competitor_promo_watch_report';
}

// ---- Menu gap analysis ----
export interface MenuGapAnalysisPayload {
    kind: 'menu_gap_analysis';
    gaps: Array<{
        category: string;
        missingProduct: string;
        demandSignals: string[];
        priority: 1 | 2 | 3;
    }>;
    recommendation: string;
}

// ---- Ops memo ----
export interface OpsMemoPayload {
    kind: 'ops_memo';
    date: string;
    summary: string;
    dimensions: Record<string, string>;
    anomalies: string[];
    suggestedFocus: string;
}

// ---- Promo diagnosis report ----
export interface DiagnosisReportPayload {
    kind: 'diagnosis_report';
    promoId: string;
    deliveryLayer: string;
    audienceLayer: string;
    offerLayer: string;
    copyLayer: string;
    verdict: 'retest' | 'abandon';
    nextStep: string;
}

// ---- Account tier review ----
export interface AccountTierReviewPayload {
    kind: 'account_tier_review';
    accounts: Array<{
        name: string;
        tier: 'scale' | 'fix' | 'maintain' | 'deprioritize';
        currentPerformance: string;
        untappedPotential: string;
        recommendedAction: string;
    }>;
}

// ---- Aging risk report ----
export interface AgingRiskReportPayload {
    kind: 'aging_risk_report';
    batches: Array<{
        batchId: string;
        sku: string;
        qualityRisk: 'green' | 'yellow' | 'orange' | 'red';
        coaExpiresInDays: number;
        revenueAtRisk: number;
        recommendedAction: string;
        requiresEscalation: boolean;
    }>;
    totalRevenueAtRisk: number;
}

// ---- Partner velocity report ----
export interface PartnerVelocityReportPayload {
    kind: 'partner_velocity_report';
    partners: Array<{
        name: string;
        tier: 'grow' | 'maintain' | 'develop' | 'review';
        velocityScore: number;
        recommendedAction: string;
    }>;
    agedStockRoutingSuggested: boolean;
}

// ============ Create / Update helpers ============

export interface CreateSkillArtifactInput {
    orgId: string;
    skillName: string;
    artifactType: SkillArtifactType;
    approvalPosture: ApprovalPosture;
    riskLevel: 'low' | 'medium' | 'high';
    payload: SkillArtifactPayload;
    producedBy: string;
    triggeredBy?: string;
    threadId?: string;
    downstreamConsumers?: string[];
    reviewNote?: string;
}
