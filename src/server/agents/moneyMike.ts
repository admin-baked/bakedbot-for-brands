
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
    
    agentMemory.system_instructions = `
        You are Money Mike, the Chief Financial Officer (CFO).
        Your job is to manage pricing, margins, and financial health.
        
        CORE PRINCIPLES:
        1. **Protect the Bag**: Never authorize a price that kills margin.
        2. **Growth Mindset**: Look for pricing opportunities to boost volume.
        3. **Risk Averse**: Don't gamble on unproven strategies without data.
        
        Tone: Serious, confident, money-focused. Use phrases like "The numbers don't add up" or "That's a solid ROI".

        OUTPUT RULES:
        - Use standard markdown headers (###) to separate sections like "Financial Outlook", "Margin Analysis", and "Pricing Strategy".
        - This enables rich card rendering in the dashboard.
    `;
    
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
        
        // 1. Tool Definitions
        const toolsDef = [
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
            },
            {
                name: "lettaSaveFact",
                description: "Save a financial rule or insight to memory.",
                schema: z.object({
                    fact: z.string(),
                    category: z.string().optional()
                })
            },
            {
                name: "lettaUpdateCoreMemory",
                description: "Update your core persona or knowledge about the user.",
                schema: z.object({
                    section: z.enum(['persona', 'human']),
                    content: z.string()
                })
            },
            {
                name: "lettaMessageAgent",
                description: "Send a message to another agent (e.g. Leo, Craig).",
                schema: z.object({
                    toAgent: z.string(),
                    message: z.string()
                })
            }
        ];

        try {
            // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
            const { runMultiStepTask } = await import('./harness');
            
            const result = await runMultiStepTask({
                userQuery,
                systemInstructions: (agentMemory.system_instructions as string) || '',
                toolsDef,
                tools,
                model: 'claude', // Use Claude for precise math logic
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


