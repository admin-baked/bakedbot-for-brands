/**
 * Context OS - Graph Query Engine
 * 
 * Traversal and query operations for the Context Graph.
 * Enables finding related entities, decision history, and paths between nodes.
 */

import { ContextEntity, ContextRelationship, DecisionTrace } from './types';
import { EntityService } from './entity-service';
import { RelationshipService } from './relationship-service';
import { DecisionLogService } from './decision-log';

/**
 * Result of a graph traversal
 */
export interface TraversalResult {
  entity: ContextEntity;
  relationship: ContextRelationship;
  depth: number;
  weight: number;
}

/**
 * Full context for an entity
 */
export interface EntityContext {
  entity: ContextEntity;
  relationships: {
    outgoing: ContextRelationship[];
    incoming: ContextRelationship[];
  };
  relatedEntities: ContextEntity[];
  decisions: DecisionTrace[];
}

/**
 * Find entities related to a given entity via BFS traversal
 * Respects relationship weights for ranking
 */
export async function findRelatedEntities(
  entityId: string,
  maxDepth: number = 2,
  minWeight: number = 0.3
): Promise<TraversalResult[]> {
  const visited = new Set<string>();
  const results: TraversalResult[] = [];
  
  // BFS queue: [entityId, depth, accumulatedWeight]
  const queue: [string, number, number][] = [[entityId, 0, 1.0]];
  visited.add(entityId);
  
  while (queue.length > 0) {
    const [currentId, depth, accWeight] = queue.shift()!;
    
    if (depth >= maxDepth) continue;
    
    // Get relationships for current entity
    const { outgoing, incoming } = await RelationshipService.getEntityRelationships(currentId);
    
    // Process outgoing relationships
    for (const rel of outgoing) {
      const newWeight = accWeight * rel.weight;
      
      if (newWeight < minWeight) continue;
      if (visited.has(rel.targetId)) continue;
      
      visited.add(rel.targetId);
      
      const entity = await EntityService.getEntityById(rel.targetId);
      if (entity) {
        results.push({
          entity,
          relationship: rel,
          depth: depth + 1,
          weight: newWeight,
        });
        
        queue.push([rel.targetId, depth + 1, newWeight]);
      }
    }
    
    // Process incoming relationships (reverse traversal)
    for (const rel of incoming) {
      const newWeight = accWeight * rel.weight;
      
      if (newWeight < minWeight) continue;
      if (visited.has(rel.sourceId)) continue;
      
      visited.add(rel.sourceId);
      
      const entity = await EntityService.getEntityById(rel.sourceId);
      if (entity) {
        results.push({
          entity,
          relationship: rel,
          depth: depth + 1,
          weight: newWeight,
        });
        
        queue.push([rel.sourceId, depth + 1, newWeight]);
      }
    }
  }
  
  // Sort by weight (descending) then depth (ascending)
  return results.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.depth - b.depth;
  });
}

/**
 * Get all decisions that involved a specific entity
 */
export async function getEntityDecisionHistory(
  entityId: string,
  limit: number = 20
): Promise<DecisionTrace[]> {
  // Find relationships that link to decisions
  const { outgoing, incoming } = await RelationshipService.getEntityRelationships(entityId);
  
  const decisionIds = new Set<string>();
  
  [...outgoing, ...incoming].forEach(rel => {
    if (rel.decisionTraceId) {
      decisionIds.add(rel.decisionTraceId);
    }
  });
  
  // Fetch decisions
  const decisions: DecisionTrace[] = [];
  
  for (const id of Array.from(decisionIds).slice(0, limit)) {
    const decision = await DecisionLogService.getDecisionById(id);
    if (decision) {
      decisions.push(decision);
    }
  }
  
  // Sort by timestamp (newest first)
  return decisions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Find the shortest path between two entities
 * Returns null if no path exists
 */
export async function findShortestPath(
  sourceId: string,
  targetId: string,
  maxDepth: number = 5
): Promise<{ path: ContextEntity[]; relationships: ContextRelationship[] } | null> {
  if (sourceId === targetId) {
    const entity = await EntityService.getEntityById(sourceId);
    return entity ? { path: [entity], relationships: [] } : null;
  }
  
  // BFS to find shortest path
  const visited = new Map<string, { parent: string | null; relationship: ContextRelationship | null }>();
  const queue: string[] = [sourceId];
  visited.set(sourceId, { parent: null, relationship: null });
  
  let found = false;
  
  while (queue.length > 0 && !found) {
    const currentId = queue.shift()!;
    const currentDepth = getPathLength(visited, currentId);
    
    if (currentDepth >= maxDepth) continue;
    
    const { outgoing, incoming } = await RelationshipService.getEntityRelationships(currentId);
    const allRels = [...outgoing, ...incoming];
    
    for (const rel of allRels) {
      const neighborId = rel.sourceId === currentId ? rel.targetId : rel.sourceId;
      
      if (visited.has(neighborId)) continue;
      
      visited.set(neighborId, { parent: currentId, relationship: rel });
      
      if (neighborId === targetId) {
        found = true;
        break;
      }
      
      queue.push(neighborId);
    }
  }
  
  if (!found) return null;
  
  // Reconstruct path
  const path: ContextEntity[] = [];
  const relationships: ContextRelationship[] = [];
  
  let currentId: string | null = targetId;
  
  while (currentId) {
    const entity = await EntityService.getEntityById(currentId);
    if (entity) path.unshift(entity);
    
    const node = visited.get(currentId);
    if (node?.relationship) {
      relationships.unshift(node.relationship);
    }
    
    currentId = node?.parent || null;
  }
  
  return { path, relationships };
}

/**
 * Get full context for an entity
 */
export async function getEntityContext(entityId: string): Promise<EntityContext | null> {
  const entity = await EntityService.getEntityById(entityId);
  if (!entity) return null;
  
  const relationships = await RelationshipService.getEntityRelationships(entityId);
  
  // Get related entities (1 hop)
  const relatedResults = await findRelatedEntities(entityId, 1, 0.1);
  const relatedEntities = relatedResults.map(r => r.entity);
  
  // Get decisions
  const decisions = await getEntityDecisionHistory(entityId, 10);
  
  return {
    entity,
    relationships,
    relatedEntities,
    decisions,
  };
}

/**
 * Helper: Get path length from visited map
 */
function getPathLength(
  visited: Map<string, { parent: string | null; relationship: ContextRelationship | null }>,
  entityId: string
): number {
  let length = 0;
  let current: string | null = entityId;
  
  while (current && visited.get(current)?.parent) {
    length++;
    current = visited.get(current)!.parent;
  }
  
  return length;
}

/**
 * GraphQuery convenience export
 */
export const GraphQuery = {
  findRelatedEntities,
  getEntityDecisionHistory,
  findShortestPath,
  getEntityContext,
};
