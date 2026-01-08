/**
 * Context OS - Semantic Query Engine
 * 
 * Uses vector embeddings to find semantically similar decisions.
 * This enables natural language questions like "Why did we discount products?"
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DecisionTrace } from './types';

const COLLECTION_NAME = 'context_os_decisions';
const EMBEDDING_DIMENSION = 768; // text-embedding-004 produces 768-dim vectors

/**
 * Get Firestore instance
 */
function getDb() {
  return getFirestore();
}

/**
 * Generate embedding for text using Google's text-embedding-004
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { generateEmbedding: genEmbed } = await import('@/ai/utils/generate-embedding');
    return await genEmbed(text);
  } catch (error) {
    console.error('[Context OS] Failed to generate embedding:', error);
    // Return zero vector as fallback (will match nothing in similarity search)
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create searchable text from a decision trace
 */
function createSearchableText(decision: DecisionTrace): string {
  const parts = [
    decision.task,
    decision.reasoning,
    decision.agentId,
    decision.outcome,
    decision.originalPrompt || '',
  ];
  
  if (decision.evaluators?.length) {
    parts.push(decision.evaluators.map(e => e.evaluatorName).join(' '));
  }
  
  return parts.filter(Boolean).join(' ');
}

/**
 * Semantic search for decisions matching a natural language query
 */
export async function semanticSearchDecisions(
  query: string,
  limit: number = 5,
  minSimilarity: number = 0.5
): Promise<{ decision: DecisionTrace; similarity: number }[]> {
  const db = getDb();
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // For now, fetch recent decisions and compute similarity in-memory
  // Future: Use Firestore's native vector search when available
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .orderBy('timestamp', 'desc')
    .limit(100) // Fetch more to find best matches
    .get();
  
  if (snapshot.empty) {
    return [];
  }
  
  // Calculate similarity scores
  const scored = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const decision: DecisionTrace = {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as DecisionTrace;
      
      // Get or generate embedding for this decision
      let decisionEmbedding: number[];
      if (data._embedding && Array.isArray(data._embedding)) {
        decisionEmbedding = data._embedding;
      } else {
        // Generate embedding on-the-fly (and optionally store it)
        const searchText = createSearchableText(decision);
        decisionEmbedding = await generateEmbedding(searchText);
      }
      
      const similarity = cosineSimilarity(queryEmbedding, decisionEmbedding);
      
      return { decision, similarity };
    })
  );
  
  // Sort by similarity and filter by threshold
  return scored
    .filter(s => s.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Generate and store embedding for a new decision
 */
export async function storeDecisionEmbedding(
  decisionId: string,
  decision: DecisionTrace
): Promise<void> {
  const db = getDb();
  
  try {
    const searchText = createSearchableText(decision);
    const embedding = await generateEmbedding(searchText);
    
    await db.collection(COLLECTION_NAME).doc(decisionId).update({
      _embedding: embedding,
      _embeddingUpdatedAt: Timestamp.now(),
    });
    
    console.log(`[Context OS] Stored embedding for decision ${decisionId}`);
  } catch (error) {
    console.error(`[Context OS] Failed to store embedding:`, error);
    // Non-critical, don't throw
  }
}

/**
 * Batch update embeddings for existing decisions (migration tool)
 */
export async function backfillEmbeddings(limit: number = 50): Promise<number> {
  const db = getDb();
  
  // Find decisions without embeddings
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('_embedding', '==', null)
    .limit(limit)
    .get();
  
  let updated = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const decision: DecisionTrace = {
      ...data,
      id: doc.id,
      timestamp: data.timestamp?.toDate() || new Date(),
    } as DecisionTrace;
    
    await storeDecisionEmbedding(doc.id, decision);
    updated++;
  }
  
  console.log(`[Context OS] Backfilled embeddings for ${updated} decisions`);
  return updated;
}

/**
 * Query Engine export
 */
export const QueryEngine = {
  semanticSearchDecisions,
  storeDecisionEmbedding,
  backfillEmbeddings,
  generateEmbedding,
  cosineSimilarity,
};
