/**
 * Context OS - Agent Tools
 * 
 * Tools that allow agents to interact with the Context Graph.
 * - Ask why past decisions were made
 * - Log important business decisions
 * - Query the decision history
 * - Create and link entities (Phase 3)
 * - Traverse the knowledge graph (Phase 3)
 */

import { z } from 'zod';
import { tool } from 'genkit';
import { DecisionLogService, EntityService, RelationshipService, GraphQuery } from '../services/context-os';

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

// ==========================================
// Phase 3: GraphRAG Tools
// ==========================================

/**
 * Create or update an entity in the Context Graph
 */
export const contextCreateEntity = tool({
  name: 'context_create_entity',
  description: 'Create or update a business entity in the Context Graph. Entities can be products, brands, customers, campaigns, competitors, or regulations.',
  inputSchema: z.object({
    type: z.enum(['product', 'brand', 'customer', 'campaign', 'competitor', 'regulation']).describe('Type of entity'),
    name: z.string().describe('Name of the entity (e.g., "Sour Diesel", "40 Tons", "VIP Customer Program")'),
    attributes: z.record(z.any()).optional().describe('Additional attributes for the entity')
  }),
  outputSchema: z.string(),
}, async ({ type, name, attributes = {} }) => {
  try {
    const entity = await EntityService.getOrCreateEntity(type, name, attributes);
    
    return `Entity created/updated in Context Graph:\n` +
      `- ID: ${entity.id}\n` +
      `- Type: ${entity.type}\n` +
      `- Name: ${entity.name}\n` +
      `This entity can now be linked to other entities and queried.`;
    
  } catch (error: any) {
    return `Error creating entity: ${error.message}`;
  }
});

/**
 * Create a relationship between two entities
 */
export const contextLinkEntities = tool({
  name: 'context_link_entities',
  description: 'Create a relationship between two entities in the Context Graph. This builds the knowledge graph.',
  inputSchema: z.object({
    sourceType: z.enum(['product', 'brand', 'customer', 'campaign', 'competitor', 'regulation', 'agent']).describe('Type of source entity'),
    sourceName: z.string().describe('Name of source entity'),
    relationship: z.enum(['influences', 'triggers', 'depends_on', 'competes_with', 'regulates', 'decided_by']).describe('Type of relationship'),
    targetType: z.enum(['product', 'brand', 'customer', 'campaign', 'competitor', 'regulation', 'agent']).describe('Type of target entity'),
    targetName: z.string().describe('Name of target entity'),
    weight: z.number().optional().describe('Strength of relationship 0-1 (default: 0.5)')
  }),
  outputSchema: z.string(),
}, async ({ sourceType, sourceName, relationship, targetType, targetName, weight = 0.5 }) => {
  try {
    // Get or create both entities
    const source = await EntityService.getOrCreateEntity(sourceType, sourceName);
    const target = await EntityService.getOrCreateEntity(targetType, targetName);
    
    // Create relationship
    const relId = await RelationshipService.createRelationship({
      sourceId: source.id,
      targetId: target.id,
      type: relationship,
      weight: weight,
    });
    
    return `Relationship created in Context Graph:\n` +
      `- ${source.name} (${source.type}) -[${relationship}]-> ${target.name} (${target.type})\n` +
      `- Weight: ${weight}\n` +
      `- Relationship ID: ${relId}`;
    
  } catch (error: any) {
    return `Error linking entities: ${error.message}`;
  }
});

/**
 * Find entities related to a given entity
 */
export const contextFindRelated = tool({
  name: 'context_find_related',
  description: 'Find entities related to a given entity by traversing the Context Graph. Useful for understanding connections.',
  inputSchema: z.object({
    entityType: z.enum(['product', 'brand', 'customer', 'campaign', 'competitor', 'regulation', 'agent']).describe('Type of entity to search from'),
    entityName: z.string().describe('Name of the entity'),
    maxDepth: z.number().optional().describe('How many hops to traverse (default: 2)'),
    minWeight: z.number().optional().describe('Minimum relationship weight to follow (default: 0.3)')
  }),
  outputSchema: z.string(),
}, async ({ entityType, entityName, maxDepth = 2, minWeight = 0.3 }) => {
  try {
    // Find the entity
    const entities = await EntityService.findEntities({ type: entityType, name: entityName, limit: 1 });
    
    if (entities.length === 0) {
      return `Entity "${entityName}" (${entityType}) not found in Context Graph.`;
    }
    
    const entity = entities[0];
    
    // Find related entities
    const related = await GraphQuery.findRelatedEntities(entity.id, maxDepth, minWeight);
    
    if (related.length === 0) {
      return `No related entities found for "${entityName}" within ${maxDepth} hops.`;
    }
    
    const summary = related.map((r: { entity: { name: string; type: string }; relationship: { type: string }; depth: number; weight: number }) => 
      `• ${r.entity.name} (${r.entity.type}) - ${r.relationship.type} [depth: ${r.depth}, weight: ${(r.weight * 100).toFixed(0)}%]`
    ).join('\n');
    
    return `Found ${related.length} entities related to "${entityName}":\n\n${summary}`;
    
  } catch (error: any) {
    return `Error finding related entities: ${error.message}`;
  }
});

/**
 * All Context OS tools for agent registration
 */
export const contextOsTools = [
  // Phase 1-2: Decision tools
  contextAskWhy,
  contextLogDecision,
  contextGetAgentHistory,
  // Phase 3: Graph tools
  contextCreateEntity,
  contextLinkEntities,
  contextFindRelated,
];
