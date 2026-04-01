/**
 * Skill Router (Layer 2 — main entry point)
 *
 * Orchestrates the full signal-to-artifact pipeline:
 *   1. Resolve skill from registry
 *   2. Assemble org context
 *   3. Build prompt
 *   4. Save artifact (with content hash)
 *   5. Enforce approval posture (Layer 4)
 *   6. Log invocation record
 *   7. Return SkillRouterResult
 *
 * Usage:
 *   const result = await routeSkillSignal(signal);
 *   if (result.status === 'gated') { // show approval UI }
 *   if (result.status === 'artifact_saved') { // artifact is ready }
 */

import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { resolveSkill } from '@/server/services/skill-registry';
import { assembleSkillContext } from '@/server/services/skill-context-assembler';
import { buildSkillPrompt } from '@/server/services/skill-prompt-builder';
import { saveSkillArtifact, updateSkillArtifactContentHash } from '@/server/services/skill-artifacts';
import { enforceApprovalPosture } from '@/server/services/skill-policy-gate';
import type { SkillSignal } from '@/types/skill-signal';
import type { SkillInvocationRecord, SkillInvocationStatus } from '@/types/skill-invocation';
import type { EnforcementResult } from '@/types/skill-approval';

// ============ Router result ============

export interface SkillRouterResult {
    invocationId: string;
    artifactId?: string;
    status: SkillInvocationStatus;
    gateResult?: EnforcementResult;
    promptResult?: { prompt: string; estimatedTokens: number; contextSummary: string };
    errorMessage?: string;
}

// ============ Main entry point ============

export async function routeSkillSignal(signal: SkillSignal): Promise<SkillRouterResult> {
    const startMs = Date.now();
    let invocationId: string | undefined;

    try {
        // 1. Resolve skill
        const orgProfile = await fetchOrgType(signal.orgId);
        const skill = await resolveSkill(signal, orgProfile?.type as string | undefined);

        if (!skill) {
            logger.warn('[skill-router] no skill resolved', { signal });
            const id = await logInvocation(signal, null, 'failed', 'No skill matched signal');
            return { invocationId: id, status: 'failed', errorMessage: 'No skill matched signal' };
        }

        invocationId = await logInvocation(signal, skill.skillName, 'context_assembly');

        // 2. Assemble context
        const context = await assembleSkillContext(signal, skill);

        // 3. Build prompt
        const promptResult = buildSkillPrompt(context, skill, signal);
        await updateInvocationStatus(signal.orgId, invocationId, 'prompt_built');

        // 4. Save artifact + write content hash via the artifact service
        const contentHash = createHash('sha256').update(promptResult.prompt).digest('hex').slice(0, 16);
        const artifact = await saveSkillArtifact({
            orgId: signal.orgId,
            skillName: skill.skillName,
            artifactType: skill.artifactType,
            approvalPosture: skill.approvalPosture,
            riskLevel: skill.riskLevel,
            payload: {
                kind: skill.artifactType,
                prompt: promptResult.prompt,
                contextSummary: promptResult.contextSummary,
            } as never,
            producedBy: skill.agentOwner,
            triggeredBy: signal.triggeredBy,
            threadId: 'threadId' in signal ? signal.threadId : undefined,
            downstreamConsumers: skill.downstreamConsumers,
            reviewNote: `${skill.skillName} output — ${promptResult.contextSummary}`,
        });
        await updateSkillArtifactContentHash(signal.orgId, artifact.id, contentHash);
        await updateInvocationStatus(signal.orgId, invocationId, 'artifact_saved', artifact.id);

        // 5. Enforce approval posture (Layer 4)
        const gateResult = await enforceApprovalPosture(artifact, signal.orgId);
        const finalStatus: SkillInvocationStatus = gateResult.requiresHuman ? 'gated' : 'artifact_saved';

        await finalizeInvocation(signal.orgId, invocationId, finalStatus, Date.now() - startMs, {
            artifactId: artifact.id,
            approvalId: gateResult.approvalId,
            promptTokenEstimate: promptResult.estimatedTokens,
        });

        logger.info('[skill-router] completed', {
            orgId: signal.orgId,
            skillName: skill.skillName,
            artifactId: artifact.id,
            status: finalStatus,
            durationMs: Date.now() - startMs,
        });

        return {
            invocationId,
            artifactId: artifact.id,
            status: finalStatus,
            gateResult,
            promptResult: {
                prompt: promptResult.prompt,
                estimatedTokens: promptResult.estimatedTokens,
                contextSummary: promptResult.contextSummary,
            },
        };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('[skill-router] failed', { orgId: signal.orgId, err, invocationId });

        if (invocationId) {
            await finalizeInvocation(signal.orgId, invocationId, 'failed', Date.now() - startMs, {}, errorMessage);
        }

        return {
            invocationId: invocationId ?? 'unknown',
            status: 'failed',
            errorMessage,
        };
    }
}

// ============ Invocation log ============

export async function getSkillInvocation(orgId: string, invocationId: string): Promise<SkillInvocationRecord | null> {
    const doc = await getAdminFirestore()
        .collection('skill_invocations')
        .doc(orgId)
        .collection('runs')
        .doc(invocationId)
        .get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SkillInvocationRecord;
}

export async function listSkillInvocations(
    orgId: string,
    filters?: { skillName?: string; status?: SkillInvocationStatus; limit?: number }
): Promise<SkillInvocationRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = getAdminFirestore()
        .collection('skill_invocations')
        .doc(orgId)
        .collection('runs')
        .orderBy('createdAt', 'desc');

    if (filters?.skillName) query = query.where('skillName', '==', filters.skillName);
    if (filters?.status) query = query.where('status', '==', filters.status);
    query = query.limit(filters?.limit ?? 50);

    const snap = await query.get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SkillInvocationRecord));
}

// ============ Internal helpers ============

async function logInvocation(
    signal: SkillSignal,
    skillName: string | null,
    status: SkillInvocationStatus,
    errorMessage?: string
): Promise<string> {
    const record: Omit<SkillInvocationRecord, 'id'> = {
        orgId: signal.orgId,
        skillName: skillName ?? 'unknown',
        agentOwner: 'unknown',
        signalKind: signal.kind,
        triggeredBy: signal.triggeredBy,
        status,
        errorMessage,
        createdAt: Timestamp.now(),
    };
    const docRef = await getAdminFirestore()
        .collection('skill_invocations')
        .doc(signal.orgId)
        .collection('runs')
        .add(record);
    return docRef.id;
}

async function updateInvocationStatus(
    orgId: string,
    invocationId: string,
    status: SkillInvocationStatus,
    artifactId?: string
): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (artifactId) update.artifactId = artifactId;
    await getAdminFirestore()
        .collection('skill_invocations')
        .doc(orgId)
        .collection('runs')
        .doc(invocationId)
        .update(update);
}

async function finalizeInvocation(
    orgId: string,
    invocationId: string,
    status: SkillInvocationStatus,
    durationMs: number,
    extras: { artifactId?: string; approvalId?: string; promptTokenEstimate?: number },
    errorMessage?: string
): Promise<void> {
    await getAdminFirestore()
        .collection('skill_invocations')
        .doc(orgId)
        .collection('runs')
        .doc(invocationId)
        .update({
            status,
            durationMs,
            completedAt: Timestamp.now(),
            ...extras,
            ...(errorMessage ? { errorMessage } : {}),
        });
}

async function fetchOrgType(orgId: string): Promise<{ type?: string } | null> {
    const doc = await getAdminFirestore().collection('organizations').doc(orgId).get().catch(() => null);
    return doc?.data() ?? null;
}
