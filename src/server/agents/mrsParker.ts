// src/server/agents/mrsParker.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";
import { deeboCheckMessage } from "./deebo";
import { blackleafService } from "@/lib/notifications/blackleaf-service";
import { logger } from '@/lib/logger';
import { AgentImplementation } from './harness';
import { MrsParkerMemory } from './schemas';
import { deebo } from './deebo';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// ... (Existing Event Handling Code remains unchanged, replacing AgentImplementation)

// --- Tool Definitions ---

export interface MrsParkerTools {
  // Predict churn risk for a segment (Genkit analysis of frequency)
  predictChurnRisk(segmentId: string): Promise<{ riskLevel: 'high' | 'medium' | 'low'; atRiskCount: number }>;
  // Generate a loyalty campaign concept
  generateLoyaltyCampaign(segmentId: string, goal: string): Promise<{ subject: string; body: string }>;
}

// --- Mrs. Parker Agent Implementation (Harness) ---

export const mrsParkerAgent: AgentImplementation<MrsParkerMemory, MrsParkerTools> = {
  agentName: 'mrs_parker',

  async initialize(brandMemory, agentMemory) {
    logger.info('[MrsParker] Initializing. Syncing segments...');
    
    agentMemory.system_instructions = `
        You are Mrs. Parker, the Hostess & Loyalty Manager.
        Your job is to make every customer feel like a VIP and bring them back.
        
        CORE PRINCIPLES:
        1. **Southern Hospitality**: Warm, welcoming, and personal.
        2. **Churn Prevention**: Notice when people stop visiting.
        3. **Surprise & Delight**: Reward loyalty generously (but sustainably).
        
        Tone: Maternal, warm, caring ("Sugar", "Honey", "Dear").
    `;
    
    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    if (stimulus && typeof stimulus === 'string') return 'user_request';

    const runningJourney = agentMemory.journeys.find(j => j.status === 'running');
    if (runningJourney) return `journey:${runningJourney.id}`;
    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: MrsParkerTools, stimulus?: string) {
    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;
        
        // 1. Tool Definitions
        const toolsDef = [
            {
                name: "predictChurnRisk",
                description: "Analyze a customer segment to see who is likely to leave.",
                schema: z.object({
                    segmentId: z.string().describe("e.g. 'vip', 'new_customers'")
                })
            },
            {
                name: "generateLoyaltyCampaign",
                description: "Draft a message to win back customers or reward them.",
                schema: z.object({
                    segmentId: z.string(),
                    goal: z.string().describe("e.g. 'Winback', 'Birthday'")
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
                
                Return JSON: { "thought": string, "toolName": string, "args": object }
            `;

            const plan = await ai.generate({
                prompt: planPrompt,
                output: {
                    schema: z.object({
                        thought: z.string(),
                        toolName: z.enum(['predictChurnRisk', 'generateLoyaltyCampaign', 'null']),
                        args: z.record(z.any())
                    })
                }
            });

            const decision = plan.output;

            if (!decision || decision.toolName === 'null') {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'chat_response',
                        result: decision?.thought || "I'm listening, sugar. How can I treat your customers right?",
                        metadata: { thought: decision?.thought }
                    }
                };
            }

            // 3. EXECUTE
            let output: any = "Tool failed";
            if (decision.toolName === 'predictChurnRisk') {
                output = await tools.predictChurnRisk(decision.args.segmentId || 'all');
            } else if (decision.toolName === 'generateLoyaltyCampaign') {
                output = await tools.generateLoyaltyCampaign(decision.args.segmentId || 'all', decision.args.goal || 'Retention');
            }

            // 4. SYNTHESIZE
            const final = await ai.generate({
                prompt: `
                    User Request: "${userQuery}"
                    Action Taken: ${decision.thought}
                    Tool Output: ${JSON.stringify(output)}
                    
                    Respond to the user with warmth and hospitality.
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

    // === SCENARIO B: Autonomous Journeys ===
    if (targetId.startsWith('journey:')) {

      const journeyId = targetId.split(':')[1];
      const journey = agentMemory.journeys.find(j => j.id === journeyId);
      if (!journey) throw new Error(`Journey ${journeyId} not found`);

      // Use Tool: Predict Churn (Context aware step)
      const churnRisk = await tools.predictChurnRisk('vip_segment');

      let resultMessage = `Processed step 1 for journey ${journeyId}. Churn Risk for VIPs: ${churnRisk.riskLevel}.`;

      if (churnRisk.riskLevel === 'high') {
        // Use Tool: Generate Winback Campaign
        const campaign = await tools.generateLoyaltyCampaign('vip_segment', 'Retain High Value Customers');
        resultMessage += ` Generated Winback Campaign: "${campaign.subject}".`;
      }

      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'process_journey_step',
          result: resultMessage,
          metadata: { journey_id: journey.id, step: 1, churn_risk: churnRisk.riskLevel }
        }
      };
    }
    throw new Error(`Unknown target ${targetId}`);
  }
};


