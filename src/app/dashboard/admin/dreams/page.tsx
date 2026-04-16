/**
 * Admin — Agent Dream Sessions
 *
 * Shows recent dream sessions from all agents. Protected by AdminLayout → requireSuperUser().
 * Data: Firestore dream_sessions collection, ordered by startedAt desc.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { DreamSessionsTable } from './sessions-table';

export const dynamic = 'force-dynamic';

interface RawHypothesis {
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
    hypotheses: RawHypothesis[];
    introspection: {
        toolFailures: number;
        deadEndLoops: number;
        negativeFeedback: number;
        qaBenchmarkFailures: number;
        pendingDeltas: number;
        capabilityUtilization: number;
    };
}

async function fetchSessions(limit = 100): Promise<DreamSessionRow[]> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('dream_sessions')
            .orderBy('startedAt', 'desc')
            .limit(limit)
            .get();

        return snap.docs.map(doc => {
            const d = doc.data();
            const hypotheses: RawHypothesis[] = Array.isArray(d.hypotheses) ? d.hypotheses : [];
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

export default async function DreamSessionsPage() {
    const sessions = await fetchSessions();

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">Agent Dream Sessions</h1>
                <p className="text-muted-foreground mt-1">
                    Nightly self-improvement loop — each agent introspects, hypothesizes, and tests improvements.
                    Confirmed findings are routed to Linus + Martez for review.
                </p>
            </div>

            <DreamSessionsTable sessions={sessions} />
        </div>
    );
}
