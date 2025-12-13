/**
 * Agent Router
 * 
 * Routes user intents to the appropriate specialized agent.
 * Enables Agent Chat to delegate work to domain experts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// --- Agent Definitions ---

export type AgentId = 'craig' | 'pops' | 'ezal' | 'smokey' | 'money_mike' | 'mrs_parker' | 'general' | 'tasklet';

export interface AgentCapability {
    id: AgentId;
    name: string;
    specialty: string;
    keywords: string[];
    description: string;
}

export const AGENT_CAPABILITIES: AgentCapability[] = [
    {
        id: 'craig',
        name: 'Craig',
        specialty: 'Content & Campaigns',
        keywords: ['sms', 'email', 'copy', 'campaign', 'message', 'content', 'write', 'draft', 'newsletter', 'promotional'],
        description: 'Generates marketing copy, SMS campaigns, and email content with compliance checking.'
    },
    {
        id: 'pops',
        name: 'Pops',
        specialty: 'Analytics & Strategy',
        keywords: ['report', 'analytics', 'data', 'metrics', 'kpi', 'trend', 'analyze', 'insight', 'hypothesis', 'performance', 'revenue', 'sales'],
        description: 'Analyzes business data, validates hypotheses, and provides strategic insights.'
    },
    {
        id: 'ezal',
        name: 'Ezal',
        specialty: 'Research & Intelligence',
        keywords: ['competitor', 'research', 'scrape', 'pricing', 'market', 'intelligence', 'spy', 'compare', 'aiq', 'dutchie'],
        description: 'Researches competitors, scrapes pricing data, and provides market intelligence.'
    },
    {
        id: 'smokey',
        name: 'Smokey',
        specialty: 'Products & Recommendations',
        keywords: ['product', 'recommend', 'menu', 'strain', 'indica', 'sativa', 'effect', 'thc', 'cbd', 'inventory'],
        description: 'Manages product recommendations, menu optimization, and experiment analysis.'
    },
    {
        id: 'money_mike',
        name: 'Money Mike',
        specialty: 'Pricing & Revenue',
        keywords: ['price', 'pricing', 'discount', 'margin', 'revenue', 'forecast', 'profit', 'deal', 'promotion'],
        description: 'Optimizes pricing strategies, forecasts revenue impact, and validates margins.'
    },
    {
        id: 'mrs_parker',
        name: 'Mrs. Parker',
        specialty: 'Customer Journeys',
        keywords: ['customer', 'loyalty', 'churn', 'segment', 'journey', 'retention', 'engagement', 'welcome', 'at-risk'],
        description: 'Manages customer segments, predicts churn, and orchestrates loyalty programs.'
    },
];

// --- Intent Detection ---

export interface RoutingResult {
    primaryAgent: AgentId;
    confidence: number;
    reasoning: string;
    secondaryAgents?: AgentId[];
    suggestedAction?: string;
}

/**
 * Detects intent from user message and routes to appropriate agent.
 * Uses keyword matching first, then AI fallback for ambiguous cases.
 */
export async function routeToAgent(userMessage: string): Promise<RoutingResult> {
    const lowerMessage = userMessage.toLowerCase();

    // Score each agent based on keyword matches
    const scores: { agent: AgentCapability; score: number; matches: string[] }[] = [];

    for (const agent of AGENT_CAPABILITIES) {
        let score = 0;
        const matches: string[] = [];

        for (const keyword of agent.keywords) {
            if (lowerMessage.includes(keyword)) {
                score += keyword.length; // Longer keywords = stronger signal
                matches.push(keyword);
            }
        }

        scores.push({ agent, score, matches });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const topResult = scores[0];
    const secondResult = scores[1];

    // High confidence if clear winner
    if (topResult.score > 0 && topResult.score > (secondResult?.score || 0) * 1.5) {
        return {
            primaryAgent: topResult.agent.id,
            confidence: Math.min(0.95, 0.6 + (topResult.score * 0.05)),
            reasoning: `Matched keywords: ${topResult.matches.join(', ')}`,
            secondaryAgents: secondResult?.score > 0 ? [secondResult.agent.id] : undefined,
        };
    }

    // Medium confidence if multiple agents could handle it
    if (topResult.score > 0 && secondResult?.score > 0) {
        return {
            primaryAgent: topResult.agent.id,
            confidence: 0.6,
            reasoning: `Multiple agents could handle this. Primary: ${topResult.agent.name} (${topResult.matches.join(', ')})`,
            secondaryAgents: [secondResult.agent.id],
        };
    }

    // Low confidence - skip AI for now, just use general
    // (AI routing disabled due to empty response issues)
    if (topResult.score === 0) {
        return {
            primaryAgent: 'general',
            confidence: 0.5,
            reasoning: 'No specific keywords matched. Using general assistant.',
        };
    }

    // Fallback to general
    return {
        primaryAgent: 'general',
        confidence: 0.3,
        reasoning: 'No specific agent matched. Using general assistant.',
    };
}

/**
 * Uses AI to detect intent when keyword matching is inconclusive.
 */
async function detectIntentWithAI(userMessage: string): Promise<RoutingResult> {
    const agentDescriptions = AGENT_CAPABILITIES
        .map(a => `- ${a.id}: ${a.specialty} - ${a.description}`)
        .join('\n');

    try {
        const response = await ai.generate({
            prompt: `You are an intent router. Given the user's message, determine which agent should handle it.

Available Agents:
${agentDescriptions}
- general: For greetings, general questions, or unclear intents.

User Message: "${userMessage}"

Respond with JSON only:
{
  "agent": "agent_id",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`,
        });

        if (!response.text) {
            throw new Error('Empty response from AI');
        }

        const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(text);

        return {
            primaryAgent: parsed.agent as AgentId,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
        };
    } catch (error) {
        // Log but don't fail - return fallback
        logger.warn('AI intent detection failed, using fallback', { error: String(error) });
        return {
            primaryAgent: 'general',
            confidence: 0.5,
            reasoning: 'AI routing unavailable, defaulting to general assistant.',
        };
    }
}

// --- Agent Execution ---

export interface AgentExecutionResult {
    agentId: AgentId;
    response: string;
    toolsUsed: string[];
    artifacts?: any[];
    executionTimeMs: number;
}

/**
 * Executes the appropriate agent based on routing result.
 * For now, delegates to the existing agent tools in actions.ts
 */
export async function executeAgent(
    agentId: AgentId,
    userMessage: string,
    context?: { brandId?: string; userId?: string }
): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];

    // For now, return a structured response indicating which agent would handle it
    // Full implementation would integrate with the actual agent harness
    const agentConfig = AGENT_CAPABILITIES.find(a => a.id === agentId);

    return {
        agentId,
        response: `[${agentConfig?.name || 'General'}] would handle this: "${userMessage}"`,
        toolsUsed,
        executionTimeMs: Date.now() - startTime,
    };
}

/**
 * Main entry point: Route and execute in one call
 */
export async function routeAndExecute(
    userMessage: string,
    context?: { brandId?: string; userId?: string }
): Promise<{
    routing: RoutingResult;
    execution: AgentExecutionResult;
}> {
    const routing = await routeToAgent(userMessage);
    const execution = await executeAgent(routing.primaryAgent, userMessage, context);

    logger.info('Agent routing complete', {
        message: userMessage.substring(0, 50),
        agent: routing.primaryAgent,
        confidence: routing.confidence,
    });

    return { routing, execution };
}
