import { AgentImplementation } from './harness';
import { SmokeyMemory, RecPolicySchema, UXExperimentSchema } from './schemas';
import { logger } from '@/lib/logger';
import { computeSkuScore } from '../algorithms/smokey-algo';

// --- Tool Definitions ---

export interface SmokeyTools {
    // Analyze user behavior or experiment data
    analyzeExperimentResults(experimentId: string, data: any[]): Promise<{ winner: string; confidence: number }>;
    // Get recommendation ranking (Genkit powered for semantic matching)
    rankProductsForSegment(segmentId: string, products: any[]): Promise<string[]>;
}

// --- Smokey Agent Implementation ---

export const smokeyAgent: AgentImplementation<SmokeyMemory, SmokeyTools> = {
    agentName: 'smokey',

    async initialize(brandMemory, agentMemory) {
        logger.info('[Smokey] Initializing. Checking experiment hygiene...');

        // Sanity Check: Ensure only one UX experiment is running per domain to avoid interference
        const runningExperiments = agentMemory.ux_experiments.filter(e => e.status === 'running');
        if (runningExperiments.length > 1) {
            logger.warn(`[Smokey] Multiple UX experiments running! Pausing all except the first one.`);
            // Logic to pause others...
            for (let i = 1; i < runningExperiments.length; i++) {
                runningExperiments[i].status = 'queued'; // Push back to queue
            }
        }
        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        // 0. Chat Override
        if (stimulus && typeof stimulus === 'string') return 'chat_response';
        // Priority 1: Running UX Experiment near decision
        const runningExp = agentMemory.ux_experiments.find(e => e.status === 'running');
        if (runningExp) {
            // Check if we have enough sessions to make a call (Stub: > 100 sessions)
            const totalSessions = runningExp.variants.reduce((sum, v) => sum + v.sessions, 0);
            if (totalSessions > 100) {
                return runningExp.id; // Target this for decision making
            }
        }

        // Priority 2: Experimental Rec Policy
        const experimentalPolicy = agentMemory.rec_policies.find(p => p.status === 'experimental');
        if (experimentalPolicy) {
            return experimentalPolicy.id;
        }

        // Priority 3: Queued UX Experiment (if no running one)
        if (!runningExp) {
            const queuedExp = agentMemory.ux_experiments.find(e => e.status === 'queued');
            if (queuedExp) return queuedExp.id;
        }

        return null; // Nothing urgent
    },

    async act(brandMemory, agentMemory, targetId, tools: SmokeyTools) {
        let resultMessage = '';

        // Check if target is Experiment
        const exp = agentMemory.ux_experiments.find(e => e.id === targetId);
        if (exp) {
            if (exp.status === 'queued') {
                exp.status = 'running';
                resultMessage = 'Launched UX Experiment.';
            } else if (exp.status === 'running') {
                // Use Tool: Analyze Results
                const analysis = await tools.analyzeExperimentResults(exp.id, exp.variants);

                // Declare winner if confidence met
                if (analysis.confidence > 0.95) {
                    exp.status = 'completed';
                    exp.winner = analysis.winner;
                    resultMessage = `Concluded Experiment. Winner: ${analysis.winner} (Confidence: ${(analysis.confidence * 100).toFixed(1)}%).`;
                } else {
                    // Continue running
                    resultMessage = `Monitoring Experiment. Current Leader: ${analysis.winner} (Confidence: ${(analysis.confidence * 100).toFixed(1)}%).`;
                }
            }

            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: exp.status === 'completed' ? 'conclude_experiment' : 'monitor_experiment',
                    result: resultMessage,
                    metadata: { experiment_id: exp.id, winner: exp.winner }
                }
            };
        }

        // Check if target is Rec Policy
        const policy = agentMemory.rec_policies.find(p => p.id === targetId);
        if (policy) {
            // Use Tool: Rank Products to validate policy effectiveness
            // We mock looking up a segment and finding products for it
            const products = ['prod_1', 'prod_2', 'prod_3']; // Stub list
            const ranked = await tools.rankProductsForSegment('test_segment', products);

            // Perform Algorithmic Scoring on mocked products
            const scoredProducts = products.map(p => {
                const { score, explanations } = computeSkuScore({
                    id: p,
                    name: `Product ${p}`,
                    effects: ['relax', 'sleep'], // Stub
                    margin_pct: 45,
                    inventory_level: 50,
                    thc_mg_per_serving: 5,
                    is_new: false
                }, {
                    user_segments: ['new_consumer'],
                    requested_effects: ['sleep'],
                    tolerance_level: 'low'
                });
                return { id: p, score, explanations };
            }).sort((a, b) => b.score - a.score);

            const best = scoredProducts[0];

            // Stub: validation logic
            if (best.score > 0.5) {
                policy.status = 'passing';
                resultMessage = `Validated experimental policy via Algorithmic Scoring. Best Product: ${best.id} (Score: ${best.score.toFixed(2)}). Reasons: ${best.explanations.join(' ')}`;
            } else {
                resultMessage = 'Policy produced no high-scoring results.';
            }


            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'validate_policy',
                    result: resultMessage,
                    metadata: { policy_id: policy.id, ranked_count: ranked.length }
                }
            };
        }

        throw new Error(`Target ${targetId} not found in memory`);
    }
};

