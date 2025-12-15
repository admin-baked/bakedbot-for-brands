
import { createServerClient } from '@/firebase/server-client';
import { Trace, AgentId, WorkOrder } from '@/types/intuition-os';
import { logger } from '@/lib/logger'; // Assuming this exists from smokey.ts review

export class DomainMemory {
    private agentId: AgentId;

    constructor(agentId: AgentId) {
        this.agentId = agentId;
    }

    /**
     * Saves a trace of a completed WorkOrder.
     * This forms the "episodic memory" of the agent.
     */
    async saveTrace(trace: Trace): Promise<void> {
        const { firestore } = await createServerClient();

        try {
            await firestore.collection('agent_traces').doc(trace.id).set({
                ...trace,
                agentId: this.agentId,
                _indexedAt: new Date() // For future vector indexing
            });

            // Should valid logger use:
            logger.info(`[DomainMemory:${this.agentId}] Saved trace ${trace.id}`);
        } catch (error) {
            console.error(`[DomainMemory] Failed to save trace`, error);
        }
    }

    /**
     * Retrieves recent traces similar to the current goal.
     * System 1 Heuristic: "Have I done this before recently?"
     */
    async findSimilarTraces(workOrder: WorkOrder): Promise<Trace[]> {
        const { firestore } = await createServerClient();

        // V1: Simple recent lookback for same goal string
        // V2: Vector search on 'goal' embedding

        try {
            const snapshot = await firestore.collection('agent_traces')
                .where('agentId', '==', this.agentId)
                // In a real app we'd query by embeddings. 
                // For now, let's just get the last 5 successful traces and filtering in memory or standard "exact match" on goal if possible?
                // Exact match on 'workOrderId' won't work for *new* orders.
                // We'll rely on memory or goal string if we indexed it.
                .orderBy('completedAt', 'desc')
                .limit(10)
                .get();

            const traces = snapshot.docs.map(doc => doc.data() as Trace);

            // Simple in-memory filter for V1 similarity (e.g. goal starts with same verb)
            // This mimics a "fuzzy" lookup
            return traces.filter(t => {
                // We'd need to fetch the original WO to compare goals, or store goal on trace. 
                // Let's assume we update Trace schema to include goal snapshot or we pass it.
                // For this V1 implementation, we just return recent traces for context.
                return true;
            });

        } catch (error) {
            console.error(`[DomainMemory] Failed to fetch traces`, error);
            return [];
        }
    }

    /**
     * Updates feedback for a trace (Reinforcement Learning signal).
     */
    async recordFeedback(traceId: string, score: number): Promise<void> {
        const { firestore } = await createServerClient();

        await firestore.collection('agent_traces').doc(traceId).update({
            feedbackScore: score, // We'd need to add this to Trace type or separate collection
            updatedAt: new Date()
        });
    }
}
