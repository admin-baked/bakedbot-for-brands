import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';

export type AgentJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentJobDraftState = 'idle' | 'streaming' | 'ready';

export const JOB_DRAFT_MAX_CHARS = 50_000;
export const JOB_DRAFT_MIN_FLUSH_INTERVAL_MS = 350;
export const JOB_DRAFT_MIN_CHAR_DELTA = 80;

export interface JobDraftUpdateResult {
    applied: boolean;
    status: AgentJobStatus | null;
}

function normalizeDraftContent(content: string): string {
    if (content.length <= JOB_DRAFT_MAX_CHARS) {
        return content;
    }

    return `${content.slice(0, JOB_DRAFT_MAX_CHARS)}... [truncated]`;
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
    const normalizedContent = normalizeDraftContent(content);

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
    const normalizedContent = normalizeDraftContent(content);

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

    async push(content: string, options?: { force?: boolean; draftState?: AgentJobDraftState }): Promise<void> {
        if (!this.jobId || this.closed) {
            return;
        }

        const normalizedContent = normalizeDraftContent(content);
        if (!normalizedContent || normalizedContent === this.lastFlushedContent) {
            return;
        }

        const elapsedMs = Date.now() - this.lastFlushedAt;
        const charDelta = Math.abs(normalizedContent.length - this.lastFlushedContent.length);

        if (!options?.force && charDelta < this.minCharDelta && elapsedMs < this.minFlushIntervalMs) {
            return;
        }

        const result = await writeJobDraftContent(
            this.jobId,
            normalizedContent,
            { draftState: options?.draftState },
            this.firestore
        );

        if (!result.applied && isTerminalJobStatus(result.status)) {
            this.closed = true;
            return;
        }

        this.lastFlushedContent = normalizedContent;
        this.lastFlushedAt = Date.now();
    }

    async flush(content: string, draftState: AgentJobDraftState = 'ready'): Promise<void> {
        await this.push(content, { force: true, draftState });
    }

    close(): void {
        this.closed = true;
    }
}
