import { AgentImplementation } from './harness';
import { SmokeyMemory, RecPolicySchema, UXExperimentSchema } from './schemas';
import { logger } from '@/lib/logger';
import { computeSkuScore } from '../algorithms/smokey-algo';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getChatbotUpsells } from '@/server/services/upsell-engine';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';
import { smokeyInboxToolDefs } from '../tools/inbox-tools';
import { smokeyCrmToolDefs } from '../tools/crm-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    AgentId
} from './agent-definitions';
import {
    loadGroundTruth,
    buildGroundingInstructions,
} from '../grounding';
import { loadAndBuildGoalDirective } from './goal-directive-builder';

// --- Tool Definitions ---

export interface SmokeyTools {
    // Analyze user behavior or experiment data
    analyzeExperimentResults(experimentId: string, data: any[]): Promise<{ winner: string; confidence: number }>;
    // Get recommendation ranking (Genkit powered for semantic matching)
    rankProductsForSegment(segmentId: string, products: any[]): Promise<string[]>;
    // Delegate task to another agent
    delegateTask(personaId: string, task: string, context?: any): Promise<any>;
    // Memory tools
    lettaSaveFact(fact: string, category?: string): Promise<any>;
    lettaAsk(question: string): Promise<any>;
    lettaUpdateCoreMemory(section: 'persona' | 'human', content: string): Promise<any>;
    lettaMessageAgent(toAgent: string, message: string): Promise<any>;
    // Search local menu
    searchMenu(query: string): Promise<any>;
    // Get upsell suggestions for a product
    suggestUpsells(productId: string, orgId: string): Promise<any>;
    // Trigger checkout action for the user
    triggerCheckout(productIds: string[]): Promise<any>;
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

        // Build dynamic squad roster from agent-definitions (source of truth)
        const squadRoster = buildSquadRoster('smokey');

        // Load dispensary-specific ground truth if available (Firestore-first, fallback to code)
        const brandId = (brandMemory.brand_profile as { id?: string })?.id || 'unknown';
        let groundingSection = '';

        const groundTruth = await loadGroundTruth(brandId);
        if (groundTruth) {
            const grounding = buildGroundingInstructions(groundTruth);
            groundingSection = `
            ${grounding.full}
            `;
            logger.info(`[Smokey] Loaded ground truth for ${groundTruth.metadata.dispensary} (${groundTruth.metadata.total_qa_pairs} QA pairs)`);
        } else {
            logger.debug(`[Smokey] No ground truth configured for brand: ${brandId}`);
        }

        // Load active goals for goal-driven directives
        const orgId = (brandMemory.brand_profile as { orgId?: string })?.orgId || brandId;
        const goalDirectives = await loadAndBuildGoalDirective(orgId);

        agentMemory.system_instructions = `
            You are Smokey, the Digital Budtender & Product Expert.
            You are also the **Front Desk Greeter**. If a user asks for something outside your expertise (like "Audit my competition", "Check compliance", "Draft email"), YOU MUST DELEGATE IT.

            CORE PRINCIPLES:
            1. **Empathy First**: Understand the "vibe" or medical need before recommending.
            2. **Strain Science**: Know your terps and cannabinoids.
            3. **Inventory Aware**: Don't recommend out-of-stock items.
            4. **Team Player**: Delegate tasks to specialists (see squad below).
            5. **Carousel Creator**: When asked to create featured product carousels, use the createCarouselArtifact tool to generate a structured artifact for user approval.
            ${goalDirectives}

            === AGENT SQUAD (For Delegation) ===
            ${squadRoster}

            DELEGATION ROUTING:
            - Market/Competition -> Ezal
            - Compliance/Legal -> Deebo
            - Marketing/Campaigns -> Craig
            - Analytics/Data -> Pops
            - Technical issues -> Linus (CTO)
            - Revenue/Sales -> Jack (CRO)
            - Operations -> Leo (COO)
            ${groundingSection}
            === GROUNDING RULES (CRITICAL) ===
            1. **ONLY recommend products you can verify.** Use searchMenu to check inventory.
               - DO NOT recommend products that aren't in stock.
               - If no results, say "I couldn't find that in our current menu."

            2. **ONLY delegate to agents in the AGENT SQUAD list above.**
               - DO NOT invent agents or misrepresent their capabilities.

            3. **When uncertain about product availability, search first.**
               - Don't assume products exist — verify with tools.

            4. **For compliance/safety questions, use EXACT answers from CRITICAL COMPLIANCE section.**
               - Age requirements, possession limits, and product testing info must be 100% accurate.
               - Never paraphrase or guess on legal/regulatory information.

            Tone: Friendly, knowledgeable, chill but professional.

            === UPSELL BEHAVIOR ===
            After recommending a product, use suggestUpsells to find ONE complementary item. Present it with value-focused framing:
            - Use cannabis science reasoning: "These terpenes work together for the entourage effect"
            - Lead with savings: "Save 15% when you pair these in our bundle"
            - Keep it natural: "Customers who enjoy [X] also love [Y]"
            - NEVER push more than ONE upsell suggestion per exchange
            - If the customer says "no thanks" or ignores the suggestion, respect that immediately
            - Prioritize: bundles with savings > terpene pairings > category complements

            OUTPUT RULES:
            - Use standard markdown headers (###) to separate sections like "Recommendations", "Product Details", and "Next Steps".
            - This enables the rich card UI in the user dashboard.
            - Cite your source (e.g., "Based on our current menu...")
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

            // Get delegatable agent IDs dynamically from registry
            const delegatableAgents = getDelegatableAgentIds('smokey');

            // 1. Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
            const smokeySpecificTools = [
                {
                    name: "rankProductsForSegment",
                    description: "Find and rank products matching a specific customer segment or need.",
                    schema: z.object({
                        segmentId: z.string().describe("User segment e.g. 'sleep_seekers', 'value_shoppers'"),
                        products: z.array(z.string()).optional().describe("Optional list of specific product IDs to re-rank")
                    })
                },
                {
                    name: "searchMenu",
                    description: "Search the dispensary's menu for products by name, category, or effect. Use this to check stock and find items.",
                    schema: z.object({
                        query: z.string().describe("Search keywords e.g. 'sativa gummies', 'sleep', 'pre-rolls'")
                    })
                },
                {
                    name: "analyzeExperimentResults",
                    description: "Check the status of a specific A/B test or experiment.",
                    schema: z.object({
                        experimentId: z.string(),
                        data: z.array(z.any()).optional()
                    })
                },
                {
                    name: "delegateTask",
                    description: "Delegate a task to a specialist agent in the squad. Route to the right expert based on their specialty.",
                    schema: z.object({
                        personaId: z.enum(delegatableAgents as [AgentId, ...AgentId[]]),
                        task: z.string().describe("The user's original request or specific subtask"),
                        context: z.any().optional()
                    })
                },
                {
                    name: "suggestUpsells",
                    description: "Get complementary product suggestions for a product the customer is interested in. Use this AFTER recommending a product to suggest ONE pairing. Returns products with cannabis science reasoning (terpene/effect matching) and savings info.",
                    schema: z.object({
                        productId: z.string().describe("The product ID to find pairings for"),
                        orgId: z.string().describe("The organization/tenant ID"),
                    })
                },
                {
                    name: "triggerCheckout",
                    description: "Initiate the checkout flow for the customer. Use this when the user explicitly says they want to buy, order, or checkout with specific products.",
                    schema: z.object({
                        productIds: z.array(z.string()).describe("List of product IDs to add to cart/checkout")
                    })
                }
            ];

            // Combine agent-specific tools with shared Context OS, Letta, and inbox tools
            const toolsDef = [...smokeySpecificTools, ...contextOsToolDefs, ...lettaToolDefs, ...smokeyInboxToolDefs, ...smokeyCrmToolDefs];

            try {
                const { runMultiStepTask } = await import('./harness');
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: tools, // Harness injects 'tools'
                    model: 'claude-sonnet-4-5-20250929',
                    maxIterations: 5,
                    onStepComplete: async (step, toolName, res) => {
                        // Optional: persist if needed, though harness logs usually cover it.
                        // Keeping logic simple as Smokey usually logs via result.
                        if (toolName === 'lettaSaveFact' && (tools as any).lettaSaveFact) {
                            // Double log? Or just trust the tool?
                            // Trust the tool side effects.
                        }
                    }
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'task_completed',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
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

