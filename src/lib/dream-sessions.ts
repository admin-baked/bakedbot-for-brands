/**
 * Shared dream session data helpers.
 * Used by /dashboard/admin/dreams and /dashboard/agents (Dreams tab).
 */

import { getAdminFirestore } from '@/firebase/admin';

export interface DreamHypothesisRow {
    id: string;
    area: string;
    hypothesis: string;
    expectedOutcome: string;
    testPlan: string;
    testResult?: 'confirmed' | 'rejected' | 'inconclusive';
    testEvidence?: string;
}

export interface DreamSessionRow {
    id: string;
    agentId: string;
    agentName: string;
    startedAt: string;
    completedAt?: string;
    model: string;
    confirmed: number;
    rejected: number;
    inconclusive: number;
    needsReview: boolean;
    report: string;
    hypotheses: DreamHypothesisRow[];
    introspection: {
        toolFailures: number;
        deadEndLoops: number;
        negativeFeedback: number;
        qaBenchmarkFailures: number;
        pendingDeltas: number;
        capabilityUtilization: number;
    };
}

export async function fetchDreamSessions(limit = 100): Promise<DreamSessionRow[]> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('dream_sessions')
            .orderBy('startedAt', 'desc')
            .limit(limit)
            .get();

        return snap.docs.map(doc => {
            const d = doc.data();
            const hypotheses: DreamHypothesisRow[] = Array.isArray(d.hypotheses) ? d.hypotheses : [];
            return {
                id: doc.id,
                agentId: String(d.agentId || ''),
                agentName: String(d.agentName || d.agentId || 'Unknown'),
                startedAt: String(d.startedAt || ''),
                completedAt: d.completedAt ? String(d.completedAt) : undefined,
                model: String(d.model || 'glm'),
                confirmed: hypotheses.filter(h => h.testResult === 'confirmed').length,
                rejected: hypotheses.filter(h => h.testResult === 'rejected').length,
                inconclusive: hypotheses.filter(h => h.testResult === 'inconclusive').length,
                needsReview: hypotheses.some(h => h.testResult === 'confirmed')
                    || Number(d.introspection?.negativeFeedback) > 0
                    || Number(d.introspection?.qaBenchmarkFailures) > 0
                    || Number(d.introspection?.deadEndLoops) > 0
                    || Number(d.introspection?.toolFailures) > 0,
                report: String(d.report || ''),
                hypotheses,
                introspection: {
                    toolFailures: Number(d.introspection?.toolFailures || 0),
                    deadEndLoops: Number(d.introspection?.deadEndLoops || 0),
                    negativeFeedback: Number(d.introspection?.negativeFeedback || 0),
                    qaBenchmarkFailures: Number(d.introspection?.qaBenchmarkFailures || 0),
                    pendingDeltas: Number(d.introspection?.pendingDeltas || 0),
                    capabilityUtilization: Number(d.introspection?.capabilityUtilization || 0),
                },
            };
        });
    } catch {
        return [];
    }
}
