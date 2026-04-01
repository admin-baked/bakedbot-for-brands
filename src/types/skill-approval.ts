/**
 * Skill Approval Types
 *
 * Firestore records for skill artifact approval decisions.
 * Skill-domain parallel to ProactiveApprovalRecord.
 * Collection path: skill_approvals/{approvalId}
 */

import type { Timestamp } from 'firebase-admin/firestore';
import type { ApprovalPosture, SkillArtifactPayload } from '@/types/skill-artifact';

// ============ Status ============

export type SkillApprovalStatus =
    | 'pending'             // Awaiting human action
    | 'auto_approved'       // execute_within_limits + low risk → auto-passed
    | 'approved'            // Human approved (optionally with edits)
    | 'rejected'            // Human rejected; artifact moves to 'rejected'
    | 'expired';            // TTL elapsed without resolution

// ============ Enforcement result (returned by policy gate) ============

export interface EnforcementResult {
    allowed: boolean;           // Whether execution may proceed
    requiresHuman: boolean;     // Whether a human approval record was created
    approvalId?: string;        // Set when requiresHuman = true
    reason: string;             // Human-readable explanation
}

// ============ Approval record ============

export interface SkillApprovalRecord {
    id: string;
    orgId: string;
    artifactId: string;
    skillName: string;
    approvalPosture: ApprovalPosture;
    riskLevel: 'low' | 'medium' | 'high';
    status: SkillApprovalStatus;
    resolvedBy?: string;        // userId
    resolvedAt?: Timestamp;
    rejectionReason?: string;
    editedPayload?: SkillArtifactPayload;   // Set if reviewer modifies the artifact
    wasEdited: boolean;
    expiresAt: Timestamp;       // 72-hour default TTL
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type CreateSkillApprovalInput = Omit<
    SkillApprovalRecord,
    'id' | 'status' | 'wasEdited' | 'createdAt' | 'updatedAt'
>;
