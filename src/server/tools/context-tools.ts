/**
 * Context OS - Agent Tools
 * 
 * Tools that allow agents to interact with the Context Graph.
 * - Ask why past decisions were made
 * - Log important business decisions
 * - Query the decision history
 */

import { z } from 'zod';
import { tool } from 'genkit';
import { DecisionLogService } from '../services/context-os';

/**
 * Ask the Context Graph why a specific decision was made
 */
export const contextAskWhy = tool({
  name: 'context_ask_why',
  description: 'Ask the Context Graph why a specific decision was made in the past. Use this to understand historical reasoning.',
  inputSchema: z.object({
    question: z.string().describe('E.g., "Why did we discount Sour Diesel last week?" or "What was the reasoning for the compliance rejection?"')
  }),
  outputSchema: z.string(),
}, async ({ question }) => {
  try {
    // Phase 2: Use semantic search with embeddings
    const { QueryEngine } = await import('../services/context-os/query-engine');
    
    const results = await QueryEngine.semanticSearchDecisions(question, 5, 0.3);
    
    if (results.length === 0) {
      // Fallback to recent decisions if no semantic matches
      const recentDecisions = await DecisionLogService.queryDecisions({ limit: 5 });
      
      if (recentDecisions.length === 0) {
        return "No decision history found. The Context Graph is still learning from agent actions.";
      }
      
      return `No decisions matched your question semantically. Here are the most recent decisions:\n\n${
        recentDecisions.slice(0, 3).map(d => 
          `• [${d.agentId}] ${d.task.substring(0, 100)}... → ${d.outcome}`
        ).join('\n')
      }`;
    }
    
    const summary = results.map(({ decision: d, similarity }) => 
      `**Decision by ${d.agentId}** (${d.timestamp.toLocaleDateString()}) [${Math.round(similarity * 100)}% match]:\n` +
      `- Task: ${d.task.substring(0, 150)}${d.task.length > 150 ? '...' : ''}\n` +
      `- Reasoning: ${d.reasoning}\n` +
      `- Outcome: ${d.outcome}` +
      (d.evaluators?.length ? `\n- Verified by: ${d.evaluators.map(e => e.evaluatorName).join(', ')}` : '')
    ).join('\n\n---\n\n');
    
    return `Found ${results.length} relevant decisions:\n\n${summary}`;
    
  } catch (error: any) {
    return `Error querying Context Graph: ${error.message}`;
  }
});

/**
 * Log a business decision explicitly
 */
export const contextLogDecision = tool({
  name: 'context_log_decision',
  description: 'Log an important business decision with its reasoning. Use this to record strategic choices, policy changes, or significant actions.',
  inputSchema: z.object({
    decision: z.string().describe('What was decided (e.g., "Approved 20% discount for VIP customers")'),
    reasoning: z.string().describe('Why this decision was made (e.g., "Competitive pressure from nearby dispensary")'),
    category: z.enum(['pricing', 'marketing', 'compliance', 'operations', 'strategy', 'other']).describe('Category of the decision')
  }),
  outputSchema: z.string(),
}, async ({ decision, reasoning, category }) => {
  try {
    // Get current context from global (set by agent runner)
    const context = (global as any).currentAgentContext || {};
    
    const decisionId = await DecisionLogService.logDecision({
      agentId: context.agentId || 'unknown',
      task: decision,
      inputs: { category, triggeredBy: 'explicit_log' },
      reasoning,
      outcome: 'approved',
      metadata: {
        brandId: context.brandId,
        userId: context.userId,
        sessionId: context.sessionId,
      },
    });
    
    return `Decision logged to Context Graph (ID: ${decisionId}). This reasoning will be searchable for future queries.`;
    
  } catch (error: any) {
    return `Error logging decision: ${error.message}`;
  }
});

/**
 * Get recent decisions by a specific agent
 */
export const contextGetAgentHistory = tool({
  name: 'context_get_agent_history',
  description: 'Get the recent decision history for a specific agent. Useful for understanding patterns or reviewing past actions.',
  inputSchema: z.object({
    agentId: z.string().describe('The agent ID (e.g., "craig", "deebo", "money_mike")'),
    limit: z.number().optional().describe('Maximum number of decisions to return (default: 5)')
  }),
  outputSchema: z.string(),
}, async ({ agentId, limit = 5 }) => {
  try {
    const decisions = await DecisionLogService.getRecentAgentDecisions(agentId, limit);
    
    if (decisions.length === 0) {
      return `No decision history found for agent "${agentId}".`;
    }
    
    const summary = decisions.map(d => 
      `[${d.timestamp.toLocaleDateString()}] ${d.outcome.toUpperCase()}: ${d.task.substring(0, 100)}${d.task.length > 100 ? '...' : ''}`
    ).join('\n');
    
    return `Recent decisions by ${agentId}:\n\n${summary}`;
    
  } catch (error: any) {
    return `Error retrieving agent history: ${error.message}`;
  }
});

/**
 * All Context OS tools for agent registration
 */
export const contextOsTools = [
  contextAskWhy,
  contextLogDecision,
  contextGetAgentHistory,
];
