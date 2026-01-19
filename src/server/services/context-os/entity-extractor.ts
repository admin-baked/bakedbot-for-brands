/**
 * Context OS - Entity Extractor
 * 
 * Auto-extracts entities from decision traces.
 * Uses caching to avoid redundant extraction.
 */

import { DecisionTrace, ContextEntity } from './types';
import { EntityService } from './entity-service';
import { RelationshipService } from './relationship-service';

// Simple in-memory cache to avoid re-extracting from same decision
const extractionCache = new Map<string, string[]>();

/**
 * Entity extraction patterns for different agent contexts
 */
const EXTRACTION_PATTERNS: Record<string, { 
  type: ContextEntity['type']; 
  keywords: string[];
}[]> = {
  // Product-related patterns
  product: [
    { type: 'product', keywords: ['product', 'strain', 'sku', 'item', 'flower', 'edible', 'vape'] },
  ],
  // Brand-related patterns
  brand: [
    { type: 'brand', keywords: ['brand', 'manufacturer', 'vendor', 'supplier'] },
  ],
  // Customer-related patterns
  customer: [
    { type: 'customer', keywords: ['customer', 'user', 'client', 'member', 'vip'] },
  ],
  // Campaign-related patterns
  campaign: [
    { type: 'campaign', keywords: ['campaign', 'promotion', 'discount', 'deal', 'email', 'sms'] },
  ],
  // Competitor-related patterns
  competitor: [
    { type: 'competitor', keywords: ['competitor', 'rival', 'competing', 'nearby dispensary'] },
  ],
};

/**
 * Extract entities from a decision trace
 * Returns entity IDs that were created/found
 */
export async function extractEntitiesFromDecision(
  decision: DecisionTrace
): Promise<string[]> {
  // Check cache first
  if (extractionCache.has(decision.id)) {
    return extractionCache.get(decision.id)!;
  }
  
  const entityIds: string[] = [];
  const searchText = `${decision.task} ${decision.reasoning} ${JSON.stringify(decision.inputs)}`.toLowerCase();
  
  // Always create agent entity
  const agentEntity = await EntityService.getOrCreateEntity('agent', decision.agentId, {
    lastActive: decision.timestamp,
    decisionCount: 1,
  });
  entityIds.push(agentEntity.id);
  
  // Extract based on patterns
  for (const [category, patterns] of Object.entries(EXTRACTION_PATTERNS)) {
    for (const pattern of patterns) {
      const hasKeyword = pattern.keywords.some(kw => searchText.includes(kw));
      
      if (hasKeyword) {
        // Try to extract entity names from inputs
        const names = extractEntityNames(decision.inputs, pattern.type);
        
        for (const name of names) {
          const entity = await EntityService.getOrCreateEntity(pattern.type, name, {
            discoveredFrom: decision.id,
            agentId: decision.agentId,
          });
          entityIds.push(entity.id);
          
          // Create relationship: Agent -> decided_by -> Entity
          await RelationshipService.createRelationshipFromDecision(
            agentEntity.id,
            entity.id,
            'decided_by',
            decision.id,
            0.5
          );
        }
      }
    }
  }
  
  // Cache the result
  extractionCache.set(decision.id, entityIds);
  
  // Limit cache size
  if (extractionCache.size > 1000) {
    const firstKey = extractionCache.keys().next().value;
    if (firstKey) extractionCache.delete(firstKey);
  }
  
  if (entityIds.length > 1) {
    console.log(`[Context OS] Extracted ${entityIds.length} entities from decision: ${decision.id}`);
  }
  
  return entityIds;
}

/**
 * Extract entity names from decision inputs
 */
function extractEntityNames(inputs: Record<string, any>, type: ContextEntity['type']): string[] {
  const names: string[] = [];
  
  // Look for common field patterns
  const fieldMappings: Record<ContextEntity['type'], string[]> = {
    product: ['productName', 'product_name', 'productId', 'sku', 'strain', 'itemName'],
    brand: ['brandName', 'brand_name', 'brandId', 'brand', 'manufacturer'],
    customer: ['customerName', 'customer_name', 'customerId', 'userId', 'email'],
    campaign: ['campaignName', 'campaign_name', 'campaignId', 'subject', 'promotionName'],
    competitor: ['competitorName', 'competitor', 'rivalName'],
    regulation: ['regulation', 'rule', 'compliance'],
    agent: ['agentId', 'agent'],
  };
  
  const fields = fieldMappings[type] || [];
  
  for (const field of fields) {
    if (inputs[field] && typeof inputs[field] === 'string') {
      names.push(inputs[field]);
    }
  }
  
  // Check nested objects
  for (const value of Object.values(inputs)) {
    if (value && typeof value === 'object') {
      for (const field of fields) {
        if (value[field] && typeof value[field] === 'string') {
          names.push(value[field]);
        }
      }
    }
  }
  
  return [...new Set(names)]; // Deduplicate
}

/**
 * Clear the extraction cache (for testing)
 */
export function clearExtractionCache(): void {
  extractionCache.clear();
}

/**
 * EntityExtractor convenience export
 */
export const EntityExtractor = {
  extractEntitiesFromDecision,
  clearExtractionCache,
};
