/**
 * Unified Artifact Storage Schema
 *
 * Consolidates separate collections (carousels, bundles, creative) into
 * a single polymorphic artifacts collection for easier management and consistency.
 */

import type { Carousel } from './carousels';
import type { BundleDeal } from './bundles';
import type { CreativeContent } from './creative-content';
import type { InboxArtifactStatus } from './inbox';

/**
 * Unified artifact type discriminator
 */
export type UnifiedArtifactType =
    // Core marketing artifacts
    | 'carousel'
    | 'bundle'
    | 'creative_content'
    | 'sell_sheet'
    | 'report'
    | 'outreach_draft'
    | 'event_promo'
    // Growth artifacts
    | 'growth_report'
    | 'churn_scorecard'
    | 'revenue_model'
    | 'pipeline_report'
    | 'health_scorecard'
    | 'market_analysis'
    | 'partnership_deck'
    | 'experiment_plan'
    // Operations artifacts
    | 'standup_notes'
    | 'sprint_plan'
    | 'incident_report'
    | 'postmortem'
    | 'feature_spec'
    | 'technical_design'
    | 'release_notes'
    | 'onboarding_checklist'
    | 'content_calendar'
    | 'okr_document'
    | 'meeting_notes'
    | 'board_deck'
    | 'budget_model'
    | 'job_spec'
    | 'research_brief'
    | 'compliance_brief';

/**
 * Source type for tracking origin during migration
 */
export type ArtifactSourceType =
    | 'inbox'   // Created through unified inbox
    | 'legacy'  // Migrated from old standalone pages
    | 'api'     // Created via API
    | 'import'; // Imported from external source

/**
 * Unified artifact schema
 *
 * Benefits:
 * - Single source of truth for all artifacts
 * - Consistent approval workflow
 * - Easier querying and analytics
 * - Unified versioning and history
 */
export interface UnifiedArtifact {
    // Core identity
    id: string;
    type: UnifiedArtifactType;

    // Organization context
    orgId: string;
    brandId?: string;
    dispensaryId?: string;

    // Status tracking
    status: InboxArtifactStatus;
    sourceType: ArtifactSourceType;

    // Polymorphic data (type-specific payload)
    data: Carousel | BundleDeal | CreativeContent | Record<string, unknown>;

    // Metadata
    title: string;
    description?: string;
    tags?: string[];

    // Thread linkage (if created through inbox)
    threadId?: string;

    // Agent attribution
    createdBy: string; // User ID or agent name
    generatedBy?: string; // Agent that generated the artifact
    rationale?: string; // Why the agent suggested this

    // Approval workflow
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;

    // Publishing
    publishedBy?: string;
    publishedAt?: Date;
    publishedTo?: string[]; // Channels/platforms published to

    // Version control
    version: number;
    previousVersionId?: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
}

/**
 * Artifact version history entry
 */
export interface ArtifactVersion {
    id: string;
    artifactId: string;
    version: number;
    data: Record<string, unknown>;
    changedBy: string;
    changeReason?: string;
    createdAt: Date;
}

/**
 * Artifact analytics event
 */
export interface ArtifactEvent {
    id: string;
    artifactId: string;
    eventType: 'created' | 'updated' | 'approved' | 'rejected' | 'published' | 'archived' | 'viewed' | 'clicked';
    userId?: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
}

/**
 * Helper to create a new unified artifact
 */
export function createUnifiedArtifact(input: {
    type: UnifiedArtifactType;
    orgId: string;
    data: Carousel | BundleDeal | CreativeContent | Record<string, unknown>;
    title: string;
    createdBy: string;
    sourceType?: ArtifactSourceType;
    threadId?: string;
    generatedBy?: string;
    rationale?: string;
    brandId?: string;
    dispensaryId?: string;
}): UnifiedArtifact {
    return {
        id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: input.type,
        orgId: input.orgId,
        brandId: input.brandId,
        dispensaryId: input.dispensaryId,
        status: 'draft',
        sourceType: input.sourceType || 'inbox',
        data: input.data,
        title: input.title,
        threadId: input.threadId,
        createdBy: input.createdBy,
        generatedBy: input.generatedBy,
        rationale: input.rationale,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * Type guard to check if artifact is from inbox
 */
export function isInboxArtifact(artifact: UnifiedArtifact): boolean {
    return artifact.sourceType === 'inbox' && !!artifact.threadId;
}

/**
 * Type guard to check if artifact is legacy
 */
export function isLegacyArtifact(artifact: UnifiedArtifact): boolean {
    return artifact.sourceType === 'legacy';
}

/**
 * Get display name for artifact type
 */
export function getArtifactTypeName(type: UnifiedArtifactType): string {
    const typeNames: Record<UnifiedArtifactType, string> = {
        carousel: 'Carousel',
        bundle: 'Bundle Deal',
        creative_content: 'Creative Content',
        sell_sheet: 'Sell Sheet',
        report: 'Report',
        outreach_draft: 'Outreach Draft',
        event_promo: 'Event Promo',
        growth_report: 'Growth Report',
        churn_scorecard: 'Churn Scorecard',
        revenue_model: 'Revenue Model',
        pipeline_report: 'Pipeline Report',
        health_scorecard: 'Health Scorecard',
        market_analysis: 'Market Analysis',
        partnership_deck: 'Partnership Deck',
        experiment_plan: 'Experiment Plan',
        standup_notes: 'Standup Notes',
        sprint_plan: 'Sprint Plan',
        incident_report: 'Incident Report',
        postmortem: 'Postmortem',
        feature_spec: 'Feature Spec',
        technical_design: 'Technical Design',
        release_notes: 'Release Notes',
        onboarding_checklist: 'Onboarding Checklist',
        content_calendar: 'Content Calendar',
        okr_document: 'OKR Document',
        meeting_notes: 'Meeting Notes',
        board_deck: 'Board Deck',
        budget_model: 'Budget Model',
        job_spec: 'Job Spec',
        research_brief: 'Research Brief',
        compliance_brief: 'Compliance Brief',
    };

    return typeNames[type] || type;
}
