
import { useState, useEffect } from 'react';
import { db } from '@/firebase/client';
import { doc, collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import type { AgentJobDraftState, AgentJobStatus } from '@/types/agent-job';

export interface Thought {
    id: string;
    title: string;
    detail?: string;
    timestamp: Timestamp;
    order: number;
    metadata?: any;
    agentId?: string;
    agentName?: string;
    durationMs?: number;
}

export interface AgentJob {
    id: string;
    status: AgentJobStatus;
    result?: any;
    userId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    error?: string;
    draftContent?: string;
    draftState?: AgentJobDraftState;
    draftUpdatedAt?: Timestamp;
}

const JOB_TIMEOUT_MS = 120_000; // 2 minutes — Cloud Tasks + LLM max expected duration

export function useJobPoller(jobId: string | undefined) {
    const [job, setJob] = useState<AgentJob | null>(null);
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!jobId) {
            setJob(null);
            setThoughts([]);
            setError(null);
            return;
        }

        // Timeout: if job hasn't completed within JOB_TIMEOUT_MS, synthesize a failed state
        // so the conversation shows an error instead of spinning forever.
        const timeoutId = window.setTimeout(() => {
            setJob((current) => {
                if (current && (current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled')) {
                    return current; // Already terminal — leave it alone
                }
                return {
                    id: jobId,
                    status: 'failed' as AgentJobStatus,
                    error: 'The request timed out. The agent took longer than 2 minutes. Please try again.',
                    userId: current?.userId ?? '',
                    createdAt: current?.createdAt ?? Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };
            });
        }, JOB_TIMEOUT_MS);

        // 1. Subscribe to Job Status
        const jobRef = doc(db, 'jobs', jobId);
        const unsubJob = onSnapshot(jobRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setJob({
                    id: snap.id,
                    status: data.status,
                    result: data.result,
                    userId: data.userId,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    error: data.error,
                    draftContent: data.draftContent,
                    draftState: data.draftState,
                    draftUpdatedAt: data.draftUpdatedAt,
                });
            }
        }, (err) => {
            console.error('Job polling error:', err);
            setError(err.message);
        });

        // 2. Subscribe to Thoughts
        const thoughtsRef = collection(db, 'jobs', jobId, 'thoughts');
        const q = query(thoughtsRef, orderBy('order', 'asc'));

        const unsubThoughts = onSnapshot(q, (snap) => {
            const items = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Thought[];
            setThoughts(items);
        }, (err) => {
            console.warn('Thoughts polling warning:', err);
        });

        return () => {
            window.clearTimeout(timeoutId);
            unsubJob();
            unsubThoughts();
        };
    }, [jobId]);

    const isRunning = job?.status === 'running' || job?.status === 'pending' || (!job && !!jobId);

    return {
        job,
        thoughts,
        error,
        isRunning,
        isComplete: job?.status === 'completed' || job?.status === 'failed' || job?.status === 'cancelled'
    };
}
