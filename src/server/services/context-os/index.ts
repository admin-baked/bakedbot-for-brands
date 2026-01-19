/**
 * Context OS - Service Index
 * 
 * Exports all Context OS services and types.
 */

export * from './types';
export { DecisionLogService } from './decision-log';
export { QueryEngine } from './query-engine';

// Phase 3: GraphRAG
export { EntityService } from './entity-service';
export { RelationshipService } from './relationship-service';
export { EntityExtractor } from './entity-extractor';
export { GraphQuery } from './graph-query';
