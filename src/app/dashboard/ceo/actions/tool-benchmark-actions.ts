'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';

import { buildAgentToolBenchmarkReport, type AgentTelemetryLike, type AgentToolBenchmarkReport } from './tool-benchmark-report';
export type { AgentToolBenchmarkReport } from './tool-benchmark-report';

export async function runAgentToolBenchmarkAction(input?: {
    days?: number;
    maxEvents?: number;
    topTools?: number;
}): Promise<AgentToolBenchmarkReport> {
    await requireUser(['super_user']);

    const days = Math.max(1, Math.min(input?.days ?? 30, 365));
    const maxEvents = Math.max(100, Math.min(input?.maxEvents ?? 2000, 10_000));
    const topTools = Math.max(3, Math.min(input?.topTools ?? 10, 30));

    const db = getAdminFirestore();
    const snapshot = await db
        .collection('agent_telemetry')
        .orderBy('timestamp', 'desc')
        .limit(maxEvents)
        .get();

    const events: AgentTelemetryLike[] = snapshot.docs.map((doc) => {
        const data = doc.data() as AgentTelemetryLike;
        return {
            ...data,
            timestamp: data.timestamp,
        };
    });

    return buildAgentToolBenchmarkReport(events, days, topTools);
}
