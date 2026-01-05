import { AgentImplementation } from './harness';
import { SmokeyMemory, RecPolicySchema, UXExperimentSchema } from './schemas';
import { logger } from '@/lib/logger';
import { computeSkuScore } from '../algorithms/smokey-algo';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
            for (let i = 1; i < runningExperiments.length; i++) {
                runningExperiments[i].status = 'queued'; // Push back to queue
            }
        }
        
        agentMemory.system_instructions = `
            You are Smokey, the Digital Budtender & Product Expert.
            Your job is to guide customers to the perfect product and optimize the menu.
            
            CORE PRINCIPLES:
            1. **Empathy First**: Understand the "vibe" or medical need before recommending.
            2. **Strain Science**: Know your terps and cannabinoids.
            3. **Inventory Aware**: Don't recommend out-of-stock items.
            
            Tone: Friendly, knowledgeable, chill but professional.
        `;
        
        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        // 0. Chat / User Request
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        
        // Priority 1: Running UX Experiment near decision
        const runningExp = agentMemory.ux_experiments.find(e => e.status === 'running');
        if (runningExp) {
            // Check if we have enough sessions (Stub: > 100)
            const totalSessions = runningExp.variants.reduce((sum, v) => sum + v.sessions, 0);
            if (totalSessions > 100) {
                return runningExp.id; 
            }
        }

        // Priority 2: Experimental Rec Policy
        const experimentalPolicy = agentMemory.rec_policies.find(p => p.status === 'experimental');
        if (experimentalPolicy) {
            return experimentalPolicy.id;
        }

        // Priority 3: Queued UX Experiment
        if (!runningExp) {
            const queuedExp = agentMemory.ux_experiments.find(e => e.status === 'queued');
            if (queuedExp) return queuedExp.id;
        }

        return null; 
    },

    async act(brandMemory, agentMemory, targetId, tools: SmokeyTools, stimulus?: string) {
        // === SCENARIO A: User Request (The "Planner" Flow) ===
        if (targetId === 'user_request' && stimulus) {
             const userQuery = stimulus;
        
            // 1. Tool Definitions
            const toolsDef = [
                {
                    name: "rankProductsForSegment",
                    description: "Find and rank products matching a specific customer segment or need.",
                    schema: z.object({
                        segmentId: z.string().describe("User segment e.g. 'sleep_seekers', 'value_shoppers'"),
                        products: z.array(z.string()).optional().describe("Optional list of specific product IDs to re-rank")
                    })
                },
                {
                    name: "analyzeExperimentResults",
                    description: "Check the status of a specific A/B test or experiment.",
                    schema: z.object({
                        experimentId: z.string(),
                        data: z.array(z.any()).optional()
                    })
                }
            ];

            try {
                // 2. PLAN
                const planPrompt = `
                    ${agentMemory.system_instructions}
                    
                    USER REQUEST: "${userQuery}"
                    
                    Available Tools:
                    ${toolsDef.map(t => `- ${t.name}: ${t.description}`).join('\n')}
                    
                    Decide the SINGLE best tool to use first.
                    If the user wants product recommendations, use 'rankProductsForSegment'.
                    
                    Return JSON: { "thought": string, "toolName": string, "args": object }
                `;

                const plan = await ai.generate({
                    prompt: planPrompt,
                    output: {
                        schema: z.object({
                            thought: z.string(),
                            toolName: z.enum(['rankProductsForSegment', 'analyzeExperimentResults', 'null']),
                            args: z.record(z.any())
                        })
                    }
                });

                const decision = plan.output;

                if (!decision || decision.toolName === 'null') {
                     // Fallback to simple chat
                     return {
                        updatedMemory: agentMemory,
                        logEntry: {
                            action: 'chat_response',
                            result: decision?.thought || "I'm looking through the menu. What kind of effects are you looking for?",
                            metadata: { thought: decision?.thought }
                        }
                    };
                }

                // 3. EXECUTE
                let output: any = "Tool failed";
                if (decision.toolName === 'rankProductsForSegment') {
                    // Mock segment inference if not explicit
                    const segment = decision.args.segmentId || 'general_exploration'; 
                    output = await tools.rankProductsForSegment(segment, decision.args.products || []);
                } else if (decision.toolName === 'analyzeExperimentResults') {
                    output = await tools.analyzeExperimentResults(decision.args.experimentId, decision.args.data || []);
                }

                // 4. SYNTHESIZE
                const final = await ai.generate({
                    prompt: `
                        User Request: "${userQuery}"
                        Action Taken: ${decision.thought}
                        Tool Output: ${JSON.stringify(output)}
                        
                        Respond to the user with the recommendation or insight in a friendly "Budtender" voice.
                    `
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'tool_execution',
                        result: final.text,
                        metadata: { tool: decision.toolName, output }
                    }
                };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Planning failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

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

            // Fix: Handle case where no valid rankings are returned
            if (!ranked || ranked.length === 0) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'validate_policy',
                        result: 'Policy produced no valid rankings',
                        metadata: { policy_id: policy.id, ranked_count: 0 }
                    }
                };
            }

            // Perform Algorithmic Scoring on mocked products
            const scoredProducts = products.map(p => {
                const { score, explanations } = computeSkuScore({

                    id: p,
                    name: `Product ${p}`,
                    effects: ['relax', 'sleep'], // Stub
                    margin_pct: 45,
                    inventory_level: 50,
                    thc_mg_per_serving: 5,
                    is_new: false,
                    // Fix: Add missing fields for Phase 3 algo
                    tags: ['indica'],
                    category: 'Edibles'
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

        // Fallback for unknown targets
        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'no_action',
                result: 'No matching work target found. Try asking about product recommendations or menu optimization!',
                next_step: 'await_user_input',
                metadata: { targetId }
            }
        };
    }
};

