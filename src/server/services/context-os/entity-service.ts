/**
 * Context OS - Entity Service
 * 
 * CRUD operations for ContextEntity - the nodes in the Context Graph.
 * Entities represent business objects (products, brands, customers, etc.)
 * that can be connected via relationships.
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ContextEntity } from './types';

const COLLECTION_NAME = 'context_os_entities';

/**
 * Get Firestore instance with lazy initialization
 */
function getDb() {
  return getFirestore();
}

/**
 * Filter options for querying entities
 */
export interface EntityFilter {
  type?: ContextEntity['type'];
  name?: string;
  nameContains?: string;
  limit?: number;
}

/**
 * Create or upsert an entity
 * If entity with same type+name exists, updates it instead
 */
export async function createEntity(
  entity: Omit<ContextEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb();
  
  // Check for existing entity with same type+name (deduplication)
  const existing = await findEntities({ type: entity.type, name: entity.name, limit: 1 });
  
  if (existing.length > 0) {
    // Update existing entity
    await updateEntity(existing[0].id, { attributes: entity.attributes });
    console.log(`[Context OS] Updated existing entity: ${existing[0].id}`);
    return existing[0].id;
  }
  
  // Create new entity
  const docRef = db.collection(COLLECTION_NAME).doc();
  const now = new Date();
  
  const newEntity: ContextEntity = {
    ...entity,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  
  await docRef.set({
    ...newEntity,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
    // Flattened fields for querying
    _type: entity.type,
    _name: entity.name.toLowerCase(), // lowercase for case-insensitive search
  });
  
  console.log(`[Context OS] Created entity: ${newEntity.id} (${entity.type}: ${entity.name})`);
  
  return newEntity.id;
}

/**
 * Get an entity by ID
 */
export async function getEntityById(id: string): Promise<ContextEntity | null> {
  const db = getDb();
  
  const doc = await db.collection(COLLECTION_NAME).doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return docToEntity(doc);
}

/**
 * Find entities matching filter criteria
 */
export async function findEntities(filter: EntityFilter): Promise<ContextEntity[]> {
  const db = getDb();
  
  let query = db.collection(COLLECTION_NAME).orderBy('updatedAt', 'desc');
  
  if (filter.type) {
    query = query.where('_type', '==', filter.type);
  }
  
  if (filter.name) {
    query = query.where('_name', '==', filter.name.toLowerCase());
  }
  
  const limit = filter.limit || 50;
  query = query.limit(limit);
  
  const snapshot = await query.get();
  
  let results = snapshot.docs.map(docToEntity);
  
  // Post-filter for nameContains (Firestore doesn't support LIKE queries)
  if (filter.nameContains) {
    const search = filter.nameContains.toLowerCase();
    results = results.filter(e => e.name.toLowerCase().includes(search));
  }
  
  return results;
}

/**
 * Update an entity's attributes
 */
export async function updateEntity(
  id: string,
  updates: Partial<Pick<ContextEntity, 'name' | 'attributes'>>
): Promise<void> {
  const db = getDb();
  
  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now(),
  };
  
  if (updates.name) {
    updateData.name = updates.name;
    updateData._name = updates.name.toLowerCase();
  }
  
  if (updates.attributes) {
    // Merge attributes instead of replacing
    updateData.attributes = updates.attributes;
  }
  
  await db.collection(COLLECTION_NAME).doc(id).update(updateData);
  
  console.log(`[Context OS] Updated entity: ${id}`);
}

/**
 * Delete an entity (and optionally its relationships)
 */
export async function deleteEntity(id: string, deleteRelationships: boolean = true): Promise<void> {
  const db = getDb();
  
  if (deleteRelationships) {
    // Delete all relationships involving this entity
    const { deleteRelationshipsForEntity } = await import('./relationship-service');
    await deleteRelationshipsForEntity(id);
  }
  
  await db.collection(COLLECTION_NAME).doc(id).delete();
  
  console.log(`[Context OS] Deleted entity: ${id}`);
}

/**
 * Get or create an entity (upsert with lookup)
 * Useful for auto-extraction where we want to reuse existing entities
 */
export async function getOrCreateEntity(
  type: ContextEntity['type'],
  name: string,
  attributes: Record<string, any> = {}
): Promise<ContextEntity> {
  const existing = await findEntities({ type, name, limit: 1 });
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const id = await createEntity({ type, name, attributes });
  return (await getEntityById(id))!;
}

/**
 * Convert Firestore doc to ContextEntity
 */
function docToEntity(doc: FirebaseFirestore.DocumentSnapshot): ContextEntity {
  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type,
    name: data.name,
    attributes: data.attributes || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * EntityService convenience export
 */
export const EntityService = {
  createEntity,
  getEntityById,
  findEntities,
  updateEntity,
  deleteEntity,
  getOrCreateEntity,
};
