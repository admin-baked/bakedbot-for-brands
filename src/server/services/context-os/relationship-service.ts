/**
 * Context OS - Relationship Service
 * 
 * CRUD operations for ContextRelationship - the edges in the Context Graph.
 * Relationships connect entities and capture how they influence each other.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ContextRelationship } from './types';

const COLLECTION_NAME = 'context_os_relationships';

/**
 * Get Firestore instance with lazy initialization
 */
function getDb() {
  return getFirestore();
}

/**
 * Filter options for querying relationships
 */
export interface RelationshipFilter {
  sourceId?: string;
  targetId?: string;
  type?: ContextRelationship['type'];
  minWeight?: number;
  limit?: number;
}

/**
 * Create a relationship between two entities
 * Supports weighted edges for ranking in traversals
 */
export async function createRelationship(
  relationship: Omit<ContextRelationship, 'id' | 'createdAt'>
): Promise<string> {
  const db = getDb();
  
  // Check for existing relationship (prevent duplicates)
  const existing = await findRelationships({
    sourceId: relationship.sourceId,
    targetId: relationship.targetId,
    type: relationship.type,
    limit: 1,
  });
  
  if (existing.length > 0) {
    // Update weight if relationship exists (strengthens connection)
    const newWeight = Math.min(1, existing[0].weight + 0.1);
    await updateRelationshipWeight(existing[0].id, newWeight);
    console.log(`[Context OS] Strengthened relationship: ${existing[0].id} (weight: ${newWeight})`);
    return existing[0].id;
  }
  
  const docRef = db.collection(COLLECTION_NAME).doc();
  const now = new Date();
  
  const newRel: ContextRelationship = {
    ...relationship,
    id: docRef.id,
    createdAt: now,
  };
  
  await docRef.set({
    ...newRel,
    createdAt: Timestamp.fromDate(now),
    // Flattened fields for querying
    _sourceId: relationship.sourceId,
    _targetId: relationship.targetId,
    _type: relationship.type,
    _weight: relationship.weight,
  });
  
  console.log(`[Context OS] Created relationship: ${newRel.id} (${relationship.sourceId} -[${relationship.type}]-> ${relationship.targetId})`);
  
  return newRel.id;
}

/**
 * Get a relationship by ID
 */
export async function getRelationship(id: string): Promise<ContextRelationship | null> {
  const db = getDb();
  
  const doc = await db.collection(COLLECTION_NAME).doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return docToRelationship(doc);
}

/**
 * Find relationships matching filter criteria
 */
export async function findRelationships(filter: RelationshipFilter): Promise<ContextRelationship[]> {
  const db = getDb();
  
  let query = db.collection(COLLECTION_NAME).orderBy('createdAt', 'desc');
  
  if (filter.sourceId) {
    query = query.where('_sourceId', '==', filter.sourceId);
  }
  
  if (filter.targetId) {
    query = query.where('_targetId', '==', filter.targetId);
  }
  
  if (filter.type) {
    query = query.where('_type', '==', filter.type);
  }
  
  if (filter.minWeight !== undefined) {
    query = query.where('_weight', '>=', filter.minWeight);
  }
  
  const limit = filter.limit || 50;
  query = query.limit(limit);
  
  const snapshot = await query.get();
  
  return snapshot.docs.map(docToRelationship);
}

/**
 * Get all relationships for an entity (both directions)
 */
export async function getEntityRelationships(entityId: string): Promise<{
  outgoing: ContextRelationship[];
  incoming: ContextRelationship[];
}> {
  const [outgoing, incoming] = await Promise.all([
    findRelationships({ sourceId: entityId }),
    findRelationships({ targetId: entityId }),
  ]);
  
  return { outgoing, incoming };
}

/**
 * Update a relationship's weight
 */
export async function updateRelationshipWeight(id: string, weight: number): Promise<void> {
  const db = getDb();
  
  await db.collection(COLLECTION_NAME).doc(id).update({
    weight: Math.max(0, Math.min(1, weight)), // Clamp to [0, 1]
    _weight: Math.max(0, Math.min(1, weight)),
  });
}

/**
 * Delete a relationship
 */
export async function deleteRelationship(id: string): Promise<void> {
  const db = getDb();
  
  await db.collection(COLLECTION_NAME).doc(id).delete();
  
  console.log(`[Context OS] Deleted relationship: ${id}`);
}

/**
 * Delete all relationships involving an entity
 * Called when deleting an entity
 */
export async function deleteRelationshipsForEntity(entityId: string): Promise<number> {
  const db = getDb();
  
  const { outgoing, incoming } = await getEntityRelationships(entityId);
  const allRels = [...outgoing, ...incoming];
  
  const batch = db.batch();
  allRels.forEach(rel => {
    batch.delete(db.collection(COLLECTION_NAME).doc(rel.id));
  });
  
  await batch.commit();
  
  console.log(`[Context OS] Deleted ${allRels.length} relationships for entity: ${entityId}`);
  
  return allRels.length;
}

/**
 * Create a relationship and link to decision trace
 */
export async function createRelationshipFromDecision(
  sourceId: string,
  targetId: string,
  type: ContextRelationship['type'],
  decisionTraceId: string,
  weight: number = 0.5
): Promise<string> {
  return createRelationship({
    sourceId,
    targetId,
    type,
    weight,
    decisionTraceId,
  });
}

/**
 * Convert Firestore doc to ContextRelationship
 */
function docToRelationship(doc: FirebaseFirestore.DocumentSnapshot): ContextRelationship {
  const data = doc.data()!;
  return {
    id: doc.id,
    sourceId: data.sourceId,
    targetId: data.targetId,
    type: data.type,
    weight: data.weight,
    decisionTraceId: data.decisionTraceId,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * RelationshipService convenience export
 */
export const RelationshipService = {
  createRelationship,
  getRelationship,
  findRelationships,
  getEntityRelationships,
  updateRelationshipWeight,
  deleteRelationship,
  deleteRelationshipsForEntity,
  createRelationshipFromDecision,
};
