/**
 * Skill Invocation Types
 *
 * Durable log of a signal-to-artifact execution run.
 * Collection path: skill_invocations/{orgId}/runs/{runId}
 */

import type { Timestamp } from 'firebase-admin/firestore';
import type { SkillSignalKind } from '@/types/skill-signal';

// ============ Status ============

export type SkillInvocationStatus =
    | 'routing'             // Resolving skill from registry
    | 'context_assembly'    // Fetching org data + business objects
    | 'prompt_built'        // Prompt assembled; ready for agent execution
    | 'artifact_saved'      // Artifact persisted to Firestore
    | 'gated'               // Waiting on human approval (draft_only / always_escalate)
    | 'failed';             // Error during any step

// ============ Invocation record ============

export interface SkillInvocationRecord {
    id: string;
    orgId: string;
    skillName: string;
    agentOwner: string;
    signalKind: SkillSignalKind;
    triggeredBy: string;
    artifactId?: string;            // Set after artifact is saved
    approvalId?: string;            // Set if a policy gate created an approval record
    status: SkillInvocationStatus;
    durationMs?: number;
    errorMessage?: string;
    promptTokenEstimate?: number;
    createdAt: Timestamp;
    completedAt?: Timestamp;
}

export type CreateSkillInvocationInput = Omit<SkillInvocationRecord, 'id' | 'createdAt' | 'completedAt'>;
