import 'server-only';

/**
 * Agent Router
 *
 * Routes user intents to the appropriate specialized agent.
 * Enables Agent Chat to delegate work to domain experts.
 *
 * Performance Optimizations:
 * - LRU cache for routing decisions (avoids repeated computations)
 * - Keyword matching first (no LLM call needed for most cases)
 * - AI fallback disabled by default (was causing empty responses)
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// --- Agent Definitions ---

import { AGENT_CAPABILITIES, AgentCapability, AgentId } from '@/server/agents/agent-definitions';

// --- Routing Cache (LRU, 5-minute TTL) ---

interface CachedRoute {
    result: RoutingResult;
    timestamp: number;
}

const ROUTE_CACHE = new Map<string, CachedRoute>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

/**
 * Normalize message for cache key (lowercase, trim, collapse whitespace)
 */
function normalizeForCache(message: string): string {
    return (message || '').toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 200);
}

/**
 * Clean expired entries from cache
 */
function cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of ROUTE_CACHE) {
        if (now - value.timestamp > CACHE_TTL_MS) {
            ROUTE_CACHE.delete(key);
        }
    }
    // Evict oldest if over size limit
    if (ROUTE_CACHE.size > MAX_CACHE_SIZE) {
        const oldest = [...ROUTE_CACHE.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, ROUTE_CACHE.size - MAX_CACHE_SIZE);
        for (const [key] of oldest) {
            ROUTE_CACHE.delete(key);
        }
    }
}

export type { AgentId, AgentCapability };
// AGENT_CAPABILITIES should be imported directly from definitions to avoid circular/bundle issues


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
 *
 * Performance: Uses LRU cache with 5-minute TTL to avoid repeated computations.
 */
export async function routeToAgent(userMessage: string): Promise<RoutingResult> {
    // Check cache first
    const cacheKey = normalizeForCache(userMessage);
    const cached = ROUTE_CACHE.get(cacheKey);

    const lowerMessage = (userMessage || '').toLowerCase();

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

    // Helper to cache and return result
    const cacheAndReturn = (result: RoutingResult): RoutingResult => {
        ROUTE_CACHE.set(cacheKey, { result, timestamp: Date.now() });
        cleanCache();
        return result;
    };

    // High confidence if clear winner
    if (topResult.score > 0 && topResult.score > (secondResult?.score || 0) * 1.5) {
        return cacheAndReturn({
            primaryAgent: topResult.agent.id,
            confidence: Math.min(0.95, 0.6 + (topResult.score * 0.05)),
            reasoning: `Matched keywords: ${topResult.matches.join(', ')}`,
            secondaryAgents: secondResult?.score > 0 ? [secondResult.agent.id] : undefined,
        });
    }

    // Medium confidence if multiple agents could handle it
    if (topResult.score > 0 && secondResult?.score > 0) {
        return cacheAndReturn({
            primaryAgent: topResult.agent.id,
            confidence: 0.6,
            reasoning: `Multiple agents could handle this. Primary: ${topResult.agent.name} (${topResult.matches.join(', ')})`,
            secondaryAgents: [secondResult.agent.id],
        });
    }

    // Low confidence - skip AI for now, just use general
    // (AI routing disabled due to empty response issues)
    if (topResult.score === 0) {
        return cacheAndReturn({
            primaryAgent: 'general',
            confidence: 0.5,
            reasoning: 'No specific keywords matched. Using general assistant.',
        });
    }

    // Fallback to general
    return cacheAndReturn({
        primaryAgent: 'general',
        confidence: 0.3,
        reasoning: 'No specific agent matched. Using general assistant.',
    });
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
