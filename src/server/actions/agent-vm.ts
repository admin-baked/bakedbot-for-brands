'use server';

import type { DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { AgentPersona } from '@/app/dashboard/ceo/agents/personas';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { omitUndefinedDeep } from '@/lib/utils';
import { runAgentCore } from '@/server/agents/agent-runner';
import { requireUser } from '@/server/auth/auth';
import { dispatchAgentJob, type AgentJobPayload } from '@/server/jobs/dispatch';
import { approveRequest } from './approvals';

interface StoredResumeOptions {
    modelLevel?: string;
    brandId?: string | null;
    projectId?: string;
    source?: string;
    context?: Record<string, unknown>;
}

interface StoredAgentJob {
    userId: string;
    userInput: string;
    persona: AgentPersona;
    brandId?: string | null;
    resumeOptions?: StoredResumeOptions;
}

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function validatePathSegment(value: string, fieldName: string): void {
    if (!value || value.includes('/')) {
        throw new Error(`Invalid ${fieldName}`);
    }
}

function buildResumePayload(
    sourceJob: StoredAgentJob,
    approvalId: string,
    sourceJobId: string
): AgentJobPayload {
    const brandId = sourceJob.resumeOptions?.brandId || sourceJob.brandId || undefined;

    return {
        userId: sourceJob.userId,
        userInput: sourceJob.userInput,
        persona: sourceJob.persona,
        jobId: crypto.randomUUID(),
        options: omitUndefinedDeep({
            modelLevel: (sourceJob.resumeOptions?.modelLevel as AgentJobPayload['options']['modelLevel']) || 'standard',
            brandId,
            projectId: sourceJob.resumeOptions?.projectId,
            source: 'vm_approval_resume',
            context: {
                ...sourceJob.resumeOptions?.context,
                approvedApprovalId: approvalId,
                resumeFromJobId: sourceJobId,
            },
        }),
    };
}

function buildMockUserToken(user: DecodedIdToken, brandId?: string): DecodedIdToken {
    return {
        uid: user.uid,
        email: user.email || '',
        email_verified: true,
        role: (user as { role?: string }).role || 'customer',
        brandId: brandId || (user as { brandId?: string }).brandId || (user as { orgId?: string }).orgId || undefined,
        auth_time: user.auth_time || Date.now() / 1000,
        iat: user.iat || Date.now() / 1000,
        exp: user.exp || (Date.now() / 1000) + 3600,
        aud: user.aud || 'bakedbot',
        iss: user.iss || 'https://securetoken.google.com/bakedbot',
        sub: user.sub || user.uid,
        firebase: user.firebase || { identities: {}, sign_in_provider: 'custom' },
    } as DecodedIdToken;
}

async function launchResumeJob(
    sourceJob: StoredAgentJob,
    sourceJobId: string,
    approvalId: string,
    user: DecodedIdToken
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    const db = getAdminFirestore();
    const payload = buildResumePayload(sourceJob, approvalId, sourceJobId);

    const resumeOptions = omitUndefinedDeep({
        modelLevel: payload.options.modelLevel,
        brandId: payload.options.brandId || null,
        projectId: payload.options.projectId,
        source: payload.options.source,
        context: payload.options.context,
    });

    await db.collection('jobs').doc(payload.jobId).set(omitUndefinedDeep({
        status: 'pending',
        userId: sourceJob.userId,
        userInput: sourceJob.userInput,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        persona: sourceJob.persona,
        brandId: payload.options.brandId || null,
        resumeOptions,
        resumedFromJobId: sourceJobId,
        approvedApprovalId: approvalId,
        thoughts: [],
    }));

    const isDevelopment = process.env.NODE_ENV === 'development';
    let dispatch: Awaited<ReturnType<typeof dispatchAgentJob>> = isDevelopment
        ? {
            success: false,
            error: 'Development mode - using synchronous fallback',
        }
        : {
            success: true,
            taskId: 'sync-fallback',
        };

    if (!isDevelopment) {
        dispatch = await dispatchAgentJob(payload);
    }

    if (dispatch.success) {
        logger.info('[AgentVmAction] Resumed VM job dispatched', {
            sourceJobId,
            approvalId,
            resumeJobId: payload.jobId,
        });
        return { success: true, jobId: payload.jobId };
    }

    try {
        const result = await runAgentCore(
            payload.userInput,
            payload.persona,
            payload.options,
            buildMockUserToken(user, payload.options.brandId),
            payload.jobId
        );

        await db.collection('jobs').doc(payload.jobId).update({
            status: 'completed',
            result: JSON.parse(JSON.stringify(result)),
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('[AgentVmAction] Resumed VM job completed synchronously', {
            sourceJobId,
            approvalId,
            resumeJobId: payload.jobId,
        });

        return { success: true, jobId: payload.jobId };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resume approved VM run';
        await db.collection('jobs').doc(payload.jobId).update({
            status: 'failed',
            error: message,
            failedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.error('[AgentVmAction] Resumed VM job failed', {
            sourceJobId,
            approvalId,
            resumeJobId: payload.jobId,
            error: message,
        });

        return { success: false, error: message };
    }
}

// ---------------------------------------------------------------------------
// executeVmStep — run a JavaScript step through /api/vm/run and update the
// vm_run artifact in Firestore.
// ---------------------------------------------------------------------------

export async function executeVmStep(input: {
    runId: string;
    stepId: string;
    code: string;
    language?: string;
    timeoutMs?: number;
}): Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    durationMs?: number;
    error?: string;
}> {
    try {
        await requireUser();

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/vm/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: input.code,
                language: input.language ?? 'javascript',
                runId: input.runId,
                stepId: input.stepId,
                timeout: input.timeoutMs,
            }),
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const result = await response.json() as {
            success: boolean;
            stdout: string;
            stderr: string;
            exitCode: number;
            durationMs: number;
        };

        logger.info('[AgentVmAction] executeVmStep completed', {
            runId: input.runId,
            stepId: input.stepId,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
        });

        return {
            success: result.success,
            stdout: result.stdout,
            stderr: result.stderr,
            durationMs: result.durationMs,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[AgentVmAction] executeVmStep failed', { error: message, input });
        return { success: false, error: message };
    }
}

export async function resolveVmToolApproval(input: {
    orgId: string;
    approvalId: string;
    sourceJobId: string;
    decision: 'approved' | 'rejected';
}): Promise<{ success: boolean; resumeJobId?: string; error?: string }> {
    try {
        validatePathSegment(input.orgId, 'orgId');
        validatePathSegment(input.approvalId, 'approvalId');
        validatePathSegment(input.sourceJobId, 'sourceJobId');

        const user = await requireUser();
        const role = (user as { role?: string }).role;
        const isSuperUser = isSuperRole(role);

        const db = getAdminFirestore();
        const sourceJobDoc = await db.collection('jobs').doc(input.sourceJobId).get();
        if (!sourceJobDoc.exists) {
            return { success: false, error: 'Source job not found' };
        }

        const sourceJob = sourceJobDoc.data() as StoredAgentJob;
        if (!isSuperUser && sourceJob.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        await approveRequest(input.orgId, input.approvalId, input.decision === 'approved');

        if (input.decision === 'rejected') {
            return { success: true };
        }

        return await launchResumeJob(sourceJob, input.sourceJobId, input.approvalId, user);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resolve VM approval';
        logger.error('[AgentVmAction] resolveVmToolApproval failed', {
            error: message,
            input,
        });
        return { success: false, error: message };
    }
}
