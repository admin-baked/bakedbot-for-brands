import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { formatAgentResponse } from '@/lib/agent-response-formatter';
import { getAdminFirestore } from '@/firebase/admin';
import type { AgentJobDraftState, AgentJobStatus } from '@/types/agent-job';
import { truncateAgentJobText } from '@/types/agent-job';

export const JOB_DRAFT_MIN_FLUSH_INTERVAL_MS = 350;
export const JOB_DRAFT_MIN_CHAR_DELTA = 80;

export interface JobDraftUpdateResult {
    applied: boolean;
    status: AgentJobStatus | null;
}

export function sanitizeAgentJobText(content: string): string {
    return truncateAgentJobText(formatAgentResponse(content));
}

export function sanitizeAgentJobResult<T>(result: T): T {
    return JSON.parse(JSON.stringify(result, (_key, value) => {
        if (typeof value === 'function') {
            return undefined;
        }

        if (typeof value === 'string') {
            return sanitizeAgentJobText(value);
        }

        return value;
    })) as T;
}

export function isTerminalJobStatus(status: unknown): status is Extract<AgentJobStatus, 'completed' | 'failed' | 'cancelled'> {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
}

async function updateJobDocumentSafely(
    jobId: string,
    updater: (current: FirebaseFirestore.DocumentData | undefined) => FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> | null,
    firestore: FirebaseFirestore.Firestore = getAdminFirestore()
): Promise<JobDraftUpdateResult> {
    const jobRef = firestore.collection('jobs').doc(jobId);

    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        const current = snapshot.exists ? snapshot.data() : undefined;
        const currentStatus = (current?.status as AgentJobStatus | undefined) ?? null;

        if (isTerminalJobStatus(currentStatus)) {
            return {
                applied: false,
                status: currentStatus,
            };
        }

        const next = updater(current);
        if (!next) {
            return {
                applied: false,
                status: currentStatus,
            };
        }

        transaction.set(jobRef, next, { merge: true });

        const nextStatus = (next.status as AgentJobStatus | undefined) ?? currentStatus ?? 'pending';
        return {
            applied: true,
            status: nextStatus,
        };
    });
}

export async function markJobRunning(
    jobId: string,
    firestore: FirebaseFirestore.Firestore = getAdminFirestore()
): Promise<JobDraftUpdateResult> {
    return updateJobDocumentSafely(jobId, (current) => {
        if (current?.status === 'running') {
            return {
                updatedAt: FieldValue.serverTimestamp(),
            };
        }

        return {
            status: 'running',
            startedAt: current?.startedAt ?? FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
    }, firestore);
}

export async function writeJobDraftContent(
    jobId: string,
    content: string,
    options?: {
        draftState?: AgentJobDraftState;
    },
    firestore: FirebaseFirestore.Firestore = getAdminFirestore()
): Promise<JobDraftUpdateResult> {
    const normalizedContent = sanitizeAgentJobText(content);

    return updateJobDocumentSafely(jobId, () => ({
        status: 'running',
        draftContent: normalizedContent,
        draftState: options?.draftState ?? 'streaming',
        draftUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }), firestore);
}

export async function finalizeJobSuccess(
    jobId: string,
    result: unknown,
    firestore: FirebaseFirestore.Firestore = getAdminFirestore()
): Promise<JobDraftUpdateResult> {
    const content = typeof result === 'object' && result && 'content' in (result as Record<string, unknown>)
        ? String((result as Record<string, unknown>).content ?? '')
        : '';
    const normalizedContent = sanitizeAgentJobText(content);

    const jobRef = firestore.collection('jobs').doc(jobId);

    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        const current = snapshot.exists ? snapshot.data() : undefined;
        const currentStatus = (current?.status as AgentJobStatus | undefined) ?? null;

        if (currentStatus === 'cancelled') {
            return {
                applied: false,
                status: currentStatus,
            };
        }

        transaction.set(jobRef, {
            status: 'completed',
            result,
            draftContent: normalizedContent,
            draftState: 'ready',
            draftUpdatedAt: FieldValue.serverTimestamp(),
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            error: FieldValue.delete(),
        }, { merge: true });

        return {
            applied: true,
            status: 'completed',
        };
    });
}

export async function finalizeJobFailure(
    jobId: string,
    error: string,
    firestore: FirebaseFirestore.Firestore = getAdminFirestore()
): Promise<JobDraftUpdateResult> {
    const jobRef = firestore.collection('jobs').doc(jobId);

    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        const current = snapshot.exists ? snapshot.data() : undefined;
        const currentStatus = (current?.status as AgentJobStatus | undefined) ?? null;

        if (currentStatus === 'cancelled') {
            return {
                applied: false,
                status: currentStatus,
            };
        }

        transaction.set(jobRef, {
            status: 'failed',
            error,
            draftState: 'ready',
            failedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            applied: true,
            status: 'failed',
        };
    });
}

export async function cancelJob(
    jobId: string,
    reason = 'Cancelled by user',
    firestore: FirebaseFirestore.Firestore = getAdminFirestore()
): Promise<{ applied: boolean; status: AgentJobStatus | null }> {
    const jobRef = firestore.collection('jobs').doc(jobId);

    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        const current = snapshot.exists ? snapshot.data() : undefined;
        const currentStatus = (current?.status as AgentJobStatus | undefined) ?? null;

        if (currentStatus === 'completed' || currentStatus === 'failed') {
            return {
                applied: false,
                status: currentStatus,
            };
        }

        transaction.set(jobRef, {
            status: 'cancelled',
            error: reason,
            cancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            applied: true,
            status: 'cancelled',
        };
    });
}

export class JobDraftPublisher {
    private readonly jobId: string;
    private readonly firestore: FirebaseFirestore.Firestore;
    private readonly minFlushIntervalMs: number;
    private readonly minCharDelta: number;
    private lastFlushedAt = 0;
    private lastFlushedContent = '';
    private pendingContent: string | null = null;
    private pendingDraftState: AgentJobDraftState = 'streaming';
    private drainPromise: Promise<void> | null = null;
    private closed = false;

    constructor(
        jobId: string | undefined,
        options?: {
            firestore?: FirebaseFirestore.Firestore;
            minFlushIntervalMs?: number;
            minCharDelta?: number;
        }
    ) {
        this.jobId = jobId ?? '';
        this.firestore = options?.firestore ?? getAdminFirestore();
        this.minFlushIntervalMs = options?.minFlushIntervalMs ?? JOB_DRAFT_MIN_FLUSH_INTERVAL_MS;
        this.minCharDelta = options?.minCharDelta ?? JOB_DRAFT_MIN_CHAR_DELTA;
    }

    private ensureDrainScheduled(): void {
        if (this.closed || this.drainPromise) {
            return;
        }

        this.drainPromise = this.drainQueue().finally(() => {
            this.drainPromise = null;
            if (this.pendingContent && !this.closed) {
                this.ensureDrainScheduled();
            }
        });
    }

    private async drainQueue(): Promise<void> {
        while (this.pendingContent && !this.closed) {
            const nextContent = this.pendingContent;
            const nextDraftState = this.pendingDraftState;

            this.pendingContent = null;

            const result = await writeJobDraftContent(
                this.jobId,
                nextContent,
                { draftState: nextDraftState },
                this.firestore
            );

            if (!result.applied && isTerminalJobStatus(result.status)) {
                this.closed = true;
                this.pendingContent = null;
                return;
            }

            this.lastFlushedContent = nextContent;
            this.lastFlushedAt = Date.now();
        }
    }

    async push(content: string, options?: { force?: boolean; draftState?: AgentJobDraftState }): Promise<void> {
        if (!this.jobId || this.closed) {
            return;
        }

        const normalizedContent = sanitizeAgentJobText(content);
        if (!normalizedContent || normalizedContent === this.lastFlushedContent || normalizedContent === this.pendingContent) {
            return;
        }

        const elapsedMs = Date.now() - this.lastFlushedAt;
        const charDelta = Math.abs(normalizedContent.length - this.lastFlushedContent.length);

        if (!options?.force && charDelta < this.minCharDelta && elapsedMs < this.minFlushIntervalMs) {
            return;
        }

        this.pendingContent = normalizedContent;
        this.pendingDraftState = options?.draftState ?? 'streaming';
        this.ensureDrainScheduled();
    }

    async flush(content: string, draftState: AgentJobDraftState = 'ready'): Promise<void> {
        await this.push(content, { force: true, draftState });

        while (this.drainPromise) {
            await this.drainPromise;
        }
    }

    close(): void {
        this.closed = true;
        this.pendingContent = null;
    }
}
