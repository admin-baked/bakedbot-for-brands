import { AgentImplementation } from './harness';
import { PopsMemory, HypothesisSchema } from './schemas';
import { logger } from '@/lib/logger';
import { detectAnomaly } from '../algorithms/pops-algo';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';
import { analyticsToolDefs, analyticsToolImplementations } from './tools/analytics-tools';
import {
    buildSquadRoster,
    buildIntegrationStatusSummary
} from './agent-definitions';
import { getIntentProfile, buildPopsIntentBlock } from '@/server/services/intent-profile';

// --- Tool Definitions ---

export interface PopsTools {
  // Execute a natural language query against business data
  analyzeData(query: string, context: any): Promise<{ insight: string; trend: 'up' | 'down' | 'flat' }>;
  // Check for anomalies in specific metrics
  detectAnomalies(metric: string, history: number[]): Promise<boolean>;
  // Letta Memory Tools
  lettaSaveFact(fact: string, category?: string): Promise<any>;
  lettaUpdateCoreMemory(section: 'persona' | 'human', content: string): Promise<any>;
  lettaMessageAgent(toAgent: string, message: string): Promise<any>;
}

// --- Pops Agent Implementation ---

export const popsAgent: AgentImplementation<PopsMemory, PopsTools> = {
  agentName: 'pops',

  async initialize(brandMemory, agentMemory) {
    logger.info('[Pops] Initializing. Checking data freshness...');

    const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
    const intentProfile = await getIntentProfile(orgId).catch(() => null);
    const intentBlock = intentProfile ? buildPopsIntentBlock(intentProfile) : '';

    // Build dynamic context from agent-definitions (source of truth)
    const squadRoster = buildSquadRoster('pops');
    const integrationStatus = buildIntegrationStatusSummary();

    agentMemory.system_instructions = `
        You are Pops, the Lead Data Analyst for ${brandMemory.brand_profile.name}.
        Your job is to track revenue, retention, and funnel analytics to find growth opportunities.

        CORE PRINCIPLES:
        1. **Numbers Don't Lie**: Be precise with data.
        2. **Revenue Velocity**: Identify which products are moving FAST.
        3. **Signal in the Noise**: Don't report vanity metrics. Report profit.

        === AGENT SQUAD (For Collaboration) ===
        ${squadRoster}

        === INTEGRATION STATUS ===
        ${integrationStatus}

        === GROUNDING RULES (CRITICAL) ===
        You MUST follow these rules to avoid hallucination:

        1. **ONLY report metrics you can actually query.** Use analytics tools for real data.
           - DO NOT fabricate revenue numbers, percentages, or trends.
           - If a tool returns no data, say "No data available" — don't make up values.

        2. **Check INTEGRATION STATUS before claiming data access.**
           - If GA4/Search Console isn't active, don't claim to have traffic data.
           - Offer to help set up missing integrations.

        3. **When collaborating with other agents, use the AGENT SQUAD list.**
           - Money Mike = Pricing. Craig = Marketing. Mrs. Parker = Retention.

        4. **When uncertain, ASK rather than assume.**
           - "I don't have access to POS data. Should we set up the integration?"

        GOAL:
        Identify the "Signal in the Noise". Tell the user which products are *actually* driving the business (High Velocity), not just which ones are cool. Coordinate with Money Mike for margin checks.

        Tone: Wise, concise, mathematically minded. "Listen here..."

        OUTPUT RULES:
        - Use standard markdown headers (###) to separate sections like "Data Insight", "Trend Analysis", and "Actionable Opportunity".
        - This enables rich card rendering in the dashboard.
        - Always cite the source of your data (tool call or database query).
        ${intentBlock}
    `;

    // === HIVE MIND INIT ===
    try {
        const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
        const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
        await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand');
        logger.info(`[Pops:HiveMind] Connected to shared analyst blocks.`);
    } catch (e) {
        logger.warn(`[Pops:HiveMind] Failed to connect: ${e}`);
    }

    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    // 0. Chat / Direct Command Override
    if (stimulus && typeof stimulus === 'string') {
      return 'user_request';
    }

    // Priority: Validate running hypotheses
    const runningHypothesis = agentMemory.hypotheses_backlog.find(h => h.status === 'running');
    if (runningHypothesis) {
      return runningHypothesis.id;
    }

    // Secondary: Propose new hypotheses (if backlog empty) - Out of scope for this simple loop
    // Tertiary: Pick a proposed hypothesis to start running
    const proposed = agentMemory.hypotheses_backlog.find(h => h.status === 'proposed');
    if (proposed) {
      return proposed.id;
    }

    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: PopsTools, stimulus?: string) {
    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;
        
        // 1. Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
        const popsSpecificTools = [
            {
                name: "analyzeData",
                description: "Query business data to get insights and trends.",
                schema: z.object({
                    query: z.string().describe("Natural language question about data"),
                    context: z.any().optional()
                })
            },
            {
                name: "detectAnomalies",
                description: "Check if a specific metric has statistically significant anomalies.",
                schema: z.object({
                    metric: z.string(),
                    history: z.array(z.number()).describe("Array of historical values")
                })
            }
        ];

        // Combine agent-specific tools with shared Context OS, Letta tools, AND Analytics tools
        const toolsDef = [
            ...popsSpecificTools, 
            ...analyticsToolDefs,
            ...contextOsToolDefs, 
            ...lettaToolDefs
        ];

        // Merge implementations
        const allTools = { ...tools, ...analyticsToolImplementations };

        try {
            // 2. PLAN
            // Enforce Global Claude Mandate
            const planPrompt = `
                ${agentMemory.system_instructions}
                
                USER REQUEST: "${userQuery}"
                
                Available Tools:
                ${toolsDef.map(t => `- ${t.name}: ${t.description}`).join('\n')}
                
                Decide the SINGLE best tool to use first.
                
                Return JSON: { "thought": string, "toolName": string, "args": object }
            `;

            const plan = await ai.generate({
                model: 'claude-sonnet-4-5-20250929', // Triggers harness routing to Claude 4.5 Opus
                prompt: planPrompt,
                output: {
                    schema: z.object({
                        thought: z.string(),
                        toolName: z.enum(['analyzeData', 'detectAnomalies', 'lettaSaveFact', 'lettaUpdateCoreMemory', 'lettaMessageAgent', 'getSearchConsoleStats', 'getGA4Traffic', 'findSEOOpportunities', 'null']),
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
                        result: decision?.thought || "I'm crunching the numbers. What data do you need?",
                        metadata: { thought: decision?.thought }
                    }
                };
            }

            // 3. EXECUTE
            let output: any = "Tool failed";
            if (decision.toolName === 'analyzeData') {
                output = await tools.analyzeData(decision.args.query, decision.args.context || {});
            } else if (decision.toolName === 'detectAnomalies') {
                // Mock history if not provided in args (Agent would usually chain this: fetch -> analyze)
                const mockHistory = decision.args.history || [100, 110, 105, 120, 115, 130]; 
                output = await tools.detectAnomalies(decision.args.metric, mockHistory);
            } else if (decision.toolName === 'lettaSaveFact') {
                output = await tools.lettaSaveFact(decision.args.fact, decision.args.category);
            } else if (decision.toolName === 'lettaUpdateCoreMemory') {
                output = await tools.lettaUpdateCoreMemory(decision.args.section, decision.args.content);
            } else if (decision.toolName === 'lettaMessageAgent') {
                output = await tools.lettaMessageAgent(decision.args.toAgent, decision.args.message);
            } else if (decision.toolName === 'getSearchConsoleStats') {
                // @ts-ignore - dynamic mixin
                output = await allTools.getSearchConsoleStats();
            } else if (decision.toolName === 'getGA4Traffic') {
                // @ts-ignore - dynamic mixin
                output = await allTools.getGA4Traffic();
            } else if (decision.toolName === 'findSEOOpportunities') {
                // @ts-ignore - dynamic mixin
                output = await allTools.findSEOOpportunities(decision.args);
            }

            // 4. SYNTHESIZE
            const final = await ai.generate({
                model: 'claude-sonnet-4-5-20250929', // Triggers harness routing to Claude 4.5 Opus
                prompt: `
                    User Request: "${userQuery}"
                    Action Taken: ${decision.thought}
                    Tool Output: ${JSON.stringify(output)}
                    
                    Respond to the user with the insight. Be precise.
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

    // === SCENARIO B: Autonomous Hypothesis Testing ===
    const hypothesis = agentMemory.hypotheses_backlog.find(h => h.id === targetId);
    if (!hypothesis) throw new Error(`Hypothesis ${targetId} not found`);

    let resultMessage = '';

    if (hypothesis.status === 'proposed') {
      hypothesis.status = 'running';
      resultMessage = `Started validating hypothesis: ${hypothesis.description}`;
    } else if (hypothesis.status === 'running') {
      // Use Tool: Analyze Data
      const analysis = await tools.analyzeData(
        `Validate hypothesis: ${hypothesis.description}`,
        { metric: hypothesis.metrics.primary }
      );

      if (analysis.trend === 'up') {
        hypothesis.status = 'validated';
        resultMessage = `Hypothesis Validated: ${analysis.insight}`;

        // Phase 1 Algo Check: Run anomaly detection on the supporting data (stubbed history)
        const history = [100, 102, 98, 105, 110, 150]; // Stub history with a spike
        if (detectAnomaly(150, history, 2)) {
          resultMessage += " (Anomaly detected in supporting metrics via Algo)";
        }

        // Log decision
        agentMemory.decision_journal.push({
          id: `dec_${Date.now()}`,
          hypothesis_id: hypothesis.id,
          decision: 'validated',
          summary: analysis.insight,
          timestamp: new Date() // Will be serialized
        });
      } else {
        hypothesis.status = 'invalidated';
        resultMessage = `Hypothesis Invalidated: ${analysis.insight}`;

        agentMemory.decision_journal.push({
          id: `dec_${Date.now()}`,
          hypothesis_id: hypothesis.id,
          decision: 'invalidated',
          summary: analysis.insight,
          timestamp: new Date()
        });
      }
    }

    return {
      updatedMemory: agentMemory,
      logEntry: {
        action: hypothesis.status === 'validated' ? 'validate_hypothesis' : 'analyze_hypothesis',
        result: resultMessage,
        metadata: { hypothesis_id: hypothesis.id }
      }
    };
  }
};


export async function handlePopsEvent(orgId: string, eventId: string) {
  logger.info(`[Pops] Handled event ${eventId} for org ${orgId} (Stub)`);
}

