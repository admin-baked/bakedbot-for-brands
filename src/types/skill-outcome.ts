/**
 * Skill Outcome Types
 *
 * Firestore records for outcome telemetry — tracks whether skills are
 * actually producing good results (approval rate, edit rate, time to action).
 *
 * Collections:
 *   skill_outcomes/{outcomeId}             — one record per resolution event
 *   skill_metrics_daily/{date}/{skillName} — daily aggregates (90-day TTL)
 */

import type { Timestamp } from 'firebase-admin/firestore';
import type { ApprovalPosture } from '@/types/skill-artifact';

// ============ Outcome event types ============

export type SkillOutcomeType =
    | 'approved'
    | 'approved_with_edits'
    | 'rejected'
    | 'acted_on'        // Downstream action confirmed (e.g., campaign sent)
    | 'superseded'      // A newer artifact replaced this one before action
    | 'expired'         // TTL elapsed without resolution
    | 'auto_approved';  // execute_within_limits gate passed automatically

// ============ Per-resolution outcome record ============

export interface SkillOutcomeRecord {
    id: string;
    orgId: string;
    skillName: string;
    artifactId: string;
    approvalId?: string;
    outcomeType: SkillOutcomeType;
    approvalPosture: ApprovalPosture;
    riskLevel: 'low' | 'medium' | 'high';
    wasEdited: boolean;
    editDistanceScore?: number;     // Normalized 0–1; 0 = identical, 1 = fully replaced
    timeToResolutionMs?: number;    // Milliseconds from artifact creation to resolution
    rejectionReason?: string;
    resolvedBy?: string;
    createdAt: Timestamp;
}

// ============ Daily aggregate metrics ============

export interface SkillAggregateMetrics {
    skillName: string;
    orgId?: string;                 // null = platform-wide aggregate
    periodStart: string;            // ISO date
    periodEnd: string;
    approvalCount: number;
    rejectionCount: number;
    autoApprovalCount: number;
    editRate: number;               // 0–1: fraction of approved artifacts that were edited
    avgEditDistanceScore: number;   // 0–1 average across edited artifacts
    avgTimeToResolutionMs: number;
    rejectionReasonBreakdown: Record<string, number>;
    sampleCount: number;
    computedAt: Timestamp;
}
