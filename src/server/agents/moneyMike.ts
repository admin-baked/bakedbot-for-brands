
// src/server/agents/moneyMike.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";

import { logger } from '@/lib/logger';
import { AgentImplementation } from './harness';
import { MoneyMikeMemory } from './schemas';
import { deebo } from './deebo';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';
import { moneyMikeInboxToolDefs } from '../tools/inbox-tools';
import { profitabilityToolDefs } from '../tools/profitability-tools';
import { moneyMikeCrmToolDefs } from '../tools/crm-tools';
import {
    buildSquadRoster,
    buildIntegrationStatusSummary
} from './agent-definitions';
import { getIntentProfile, buildMoneyMikeIntentBlock } from '@/server/services/intent-profile';

// ... (Existing Event Handling Code remains unchanged, we only replace the AgentImplementation part)

// --- Tool Definitions ---

export interface MoneyMikeTools {
  // Forecast revenue impact of a price change (Genkit analysis)
  forecastRevenueImpact(skuId: string, priceDelta: number): Promise<{ projected_revenue_change: number; confidence: number }>;
  // Validate if a price change violates margin constraints
  validateMargin(skuId: string, newPrice: number, costBasis: number): Promise<{ isValid: boolean; margin: number }>;
  // Letta Memory Tools
  lettaSaveFact(fact: string, category?: string): Promise<any>;
  lettaUpdateCoreMemory(section: 'persona' | 'human', content: string): Promise<any>;
  lettaMessageAgent(toAgent: string, message: string): Promise<any>;
}

// --- Money Mike Agent Implementation (Harness) ---

export const moneyMikeAgent: AgentImplementation<MoneyMikeMemory, MoneyMikeTools> = {
  agentName: 'money_mike',

  async initialize(brandMemory, agentMemory) {
    logger.info('[MoneyMike] Initializing. Reviewing margin floors...');

    const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
    const intentProfile = await getIntentProfile(orgId).catch(() => null);
    const intentBlock = intentProfile ? buildMoneyMikeIntentBlock(intentProfile) : '';

    // Build dynamic context from agent-definitions (source of truth)
    const squadRoster = buildSquadRoster('money_mike');
    const integrationStatus = buildIntegrationStatusSummary();

    agentMemory.system_instructions = `
        You are Money Mike, the Pricing Strategist for ${brandMemory.brand_profile.name}.
        Your job is to manage pricing, margins, and financial health.

        CORE PRINCIPLES:
        1. **Protect the Bag**: Never authorize a price that kills margin.
        2. **Hidden Money**: Find the opportunities others miss (vendor negotiations, subscription upgrades).
        3. **Unit Economics**: Growth is vanity; Profit is sanity.
        4. **Bundle Builder**: When asked to create bundle deals, use the createBundleArtifact tool. Always analyze margins and protect profitability.
        5. **280E Compliance**: Understand that cannabis businesses face 70-90% effective tax rates. Only COGS is deductible.
        6. **Price Compression Awareness**: Use the GTI Rule - if prices drop X%, volume must increase X/(1-X) to maintain revenue.

        === PROFITABILITY TOOLS ===
        You have access to specialized cannabis financial tools:
        - **analyze280ETax**: Calculate 280E tax liability, COGS breakdown, cash vs paper profit
        - **calculateNYCannabsTax**: NY potency tax + 13% sales tax analysis
        - **getProfitabilityMetrics**: Gross margin, benchmarks, category performance
        - **analyzePriceCompression**: GTI Rule analysis for price drop scenarios
        - **analyzeWorkingCapital**: Liquidity, runway, banking fees analysis

        === AGENT SQUAD (For Collaboration) ===
        ${squadRoster}

        === INTEGRATION STATUS ===
        ${integrationStatus}

        === GROUNDING RULES (CRITICAL) ===
        You MUST follow these rules to avoid hallucination:

        1. **ONLY report margins you can actually calculate.** Use tools for real data.
           - DO NOT fabricate cost basis, margin percentages, or revenue numbers.
           - If you don't have cost data, say "I need cost basis to calculate margin."

        2. **Check INTEGRATION STATUS for POS/pricing data access.**
           - If POS isn't integrated, be transparent about data limitations.

        3. **When collaborating with other agents, use the AGENT SQUAD list.**
           - Pops = Analytics. Craig = Marketing. Jack = Revenue.

        4. **When uncertain, ASK rather than assume.**
           - "What's the cost basis for this product?"

        GOAL:
        Find the "hidden money". Coordinate with Pops for velocity data, Craig for promos.

        Tone: Serious, confident, money-focused. "The numbers don't add up."

        OUTPUT RULES:
        - Use standard markdown headers (###) for sections.
        - Always cite the source of your financial data.
        ${intentBlock}
    `;

    // === HIVE MIND INIT ===
    try {
        const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
        const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
        await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand');
        logger.info(`[MoneyMike:HiveMind] Connected to shared finance blocks.`);
    } catch (e) {
        logger.warn(`[MoneyMike:HiveMind] Failed to connect: ${e}`);
    }

    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    if (stimulus && typeof stimulus === 'string') return 'user_request';

    const runningExp = agentMemory.pricing_experiments.find(e => e.status === 'running');
    if (runningExp) return runningExp.id;
    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: MoneyMikeTools, stimulus?: string) {
    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;
        
        // 1. Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
        const moneyMikeSpecificTools = [
            {
                name: "forecastRevenueImpact",
                description: "Predict how a price change will affect revenue.",
                schema: z.object({
                    skuId: z.string().describe("Product ID"),
                    priceDelta: z.number().describe("Change in price (e.g., 5 or -2)")
                })
            },
            {
                name: "validateMargin",
                description: "Check if a price meets margin requirements.",
                schema: z.object({
                    skuId: z.string(),
                    newPrice: z.number(),
                    costBasis: z.number()
                })
            }
        ];

        // Combine agent-specific tools with shared Context OS, Letta, inbox, and profitability tools
        const toolsDef = [...moneyMikeSpecificTools, ...contextOsToolDefs, ...lettaToolDefs, ...moneyMikeInboxToolDefs, ...profitabilityToolDefs, ...moneyMikeCrmToolDefs];

        try {
            // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
            const { runMultiStepTask } = await import('./harness');
            
            const result = await runMultiStepTask({
                userQuery,
                systemInstructions: (agentMemory.system_instructions as string) || '',
                toolsDef,
                tools,
                model: 'claude-sonnet-4-5-20250929', // Triggers harness routing to Claude 4.5 Opus
                maxIterations: 5
            });

            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'financial_task_complete',
                    result: result.finalResult,
                    metadata: { steps: result.steps }
                }
            };

        } catch (e: any) {
             return {
                updatedMemory: agentMemory,
                logEntry: { action: 'error', result: `Money Mike Task failed: ${e.message}`, metadata: { error: e.message } }
            };
        }
    }

    // === SCENARIO B: Autonomous Pricing Experiments ===
    const exp = agentMemory.pricing_experiments.find(e => e.id === targetId);

    if (!exp) throw new Error(`Experiment ${targetId} not found`);

    let resultMessage = '';

    if (exp.status === 'running') {
      // Use Tool: Forecast Impact
      const forecast = await tools.forecastRevenueImpact(exp.sku_ids[0], 5); // +$5 delta forecast

      resultMessage = `Monitoring Pricing Experiment. Forecasted Impact: $${forecast.projected_revenue_change.toFixed(2)} (Confidence: ${(forecast.confidence * 100).toFixed(0)}%).`;

      // Use Tool: Validate Margin (for safety check before concluding)
      const safetyCheck = await tools.validateMargin(exp.sku_ids[0], 55, 30); // Mock: New Price 55, Cost 30

      if (!safetyCheck.isValid) {
        resultMessage += ` WARNING: Margin violation detected (${safetyCheck.margin.toFixed(1)}%). Pausing experiment.`;
        exp.status = 'completed'; // or paused
      } else if (Math.random() > 0.8) {
        exp.status = 'completed';
        resultMessage = 'Experiment Completed. Variant B (+5% price) preserved volume.';
      }
    }

    return {
      updatedMemory: agentMemory,
      logEntry: {
        action: exp.status === 'completed' ? 'conclude_pricing_exp' : 'monitor_pricing_exp',
        result: resultMessage,
        metadata: { experiment_id: exp.id }
      }
    };
  }
};

export async function handleMoneyMikeEvent(orgId: string, eventId: string) {
  logger.info(`[MoneyMike] Handled event ${eventId} for org ${orgId} (Stub)`);
}


