import { AgentImplementation } from './harness';
import { SmokeyMemory, RecPolicySchema, UXExperimentSchema } from './schemas';
import { logger } from '@/lib/logger';

// Smokey: The AI Budtender & Headless Menu Agent
export const smokeyAgent: AgentImplementation<SmokeyMemory> = {
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

    async orient(brandMemory, agentMemory) {
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

    async act(brandMemory, agentMemory, targetId) {
        let resultMessage = '';

        // Check if target is Experiment
        const exp = agentMemory.ux_experiments.find(e => e.id === targetId);
        if (exp) {
            if (exp.status === 'queued') {
                exp.status = 'running';
                resultMessage = 'Launched UX Experiment.';
            } else if (exp.status === 'running') {
                // Analyze results (Stub)
                // Find best variant
                let bestVariant = exp.variants[0];
                for (const v of exp.variants) {
                    if (v.add_to_cart_rate > bestVariant.add_to_cart_rate) {
                        bestVariant = v;
                    }
                }

                // Declare winner if significance met (Stub logic)
                const improvement = bestVariant.add_to_cart_rate - 0.10; // baseline
                if (improvement > 0.05) {
                    exp.status = 'completed';
                    exp.winner = bestVariant.name;
                    resultMessage = `Concluded Experiment. Winner: ${bestVariant.name} (+${(improvement * 100).toFixed(1)}%).`;
                } else {
                    // Continue running
                    resultMessage = `Monitoring Experiment. Leader: ${bestVariant.name}.`;
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
            // Simulate evaluating a policy
            // e.g. checking if customer satisfaction is high

            // Stub: Mark as passing after "analysis"
            policy.status = 'passing';
            resultMessage = 'Validated experimental policy. Promoted to passing.';

            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'validate_policy',
                    result: resultMessage,
                    metadata: { policy_id: policy.id }
                }
            };
        }

        throw new Error(`Target ${targetId} not found in memory`);
    }
};
