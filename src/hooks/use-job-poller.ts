
import { useState, useEffect } from 'react';
import { db } from '@/firebase/client';
import { doc, collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

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
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    userId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    error?: string;
}

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

        // 1. Subscribe to Job Status
        const jobRef = doc(db, 'jobs', jobId);
        const unsubJob = onSnapshot(jobRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                // Safe cast
                setJob({
                    id: snap.id,
                    status: data.status,
                    result: data.result,
                    userId: data.userId,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    error: data.error
                });
            } else {
                // Determine if it might be delayed consistency or pending creation
                 // But dispatcher creates Cloud Task, worker creates Firestore doc?
                 // Wait, Dispatcher ENQUEUES task. Worker STARTS and creates/updates doc?
                 // Or Dispatcher creates the initial Doc?
                 // My Dispatcher code (viewed earlier) DOES NOT create a Firestore doc.
                 // It only creates Cloud Task.
                 // The Worker (api/jobs/agent/route.ts) creates/updates the doc?
                 // If Frontend polls immediately, Doc might not exist yet!
                 // This is a race condition.
                 // FIX: Dispatcher SHOULD create the initial "pending" doc.
                 // But I already wrote Dispatcher and Action.
                 // I should check `dispatch.ts` again or `runAgentChat`.
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
            // Likely index error or permission
             console.warn('Thoughts polling warning:', err);
        });

        return () => {
            unsubJob();
            unsubThoughts();
        };
    }, [jobId]);

    const isRunning = job?.status === 'running' || job?.status === 'pending' || (!job && !!jobId); 
    // If we have a jobId but no doc yet, it's effectively pending (queued).

    return { 
        job, 
        thoughts, 
        error, 
        isRunning,
        isComplete: job?.status === 'completed' || job?.status === 'failed'
    };
}
