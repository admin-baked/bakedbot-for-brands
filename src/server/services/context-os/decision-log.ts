/**
 * Context OS - Decision Log Service
 * 
 * Persists and queries decision traces in Firestore.
 * The foundation of the "Why" layer.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { DecisionTrace, DecisionFilter, EvaluatorResult } from './types';

const COLLECTION_NAME = 'context_os_decisions';

/**
 * Get Firestore instance with lazy initialization
 */
function getDb() {
  return getAdminFirestore();
}

/**
 * Log a decision trace to Firestore
 */
export async function logDecision(decision: Omit<DecisionTrace, 'id' | 'timestamp'>): Promise<string> {
  const db = getDb();
  
  const docRef = db.collection(COLLECTION_NAME).doc();
  
  const trace: DecisionTrace = {
    ...decision,
    id: docRef.id,
    timestamp: new Date(),
  };
  
  await docRef.set({
    ...trace,
    timestamp: Timestamp.fromDate(trace.timestamp),
    // Flatten metadata for easier querying
    _agentId: trace.agentId,
    _brandId: trace.metadata.brandId || null,
    _userId: trace.metadata.userId || null,
    _outcome: trace.outcome,
  });
  
  console.log(`[Context OS] Logged decision: ${trace.id} by ${trace.agentId}`);
  
  return trace.id;
}

/**
 * Query decision traces with filters
 */
export async function queryDecisions(filters: DecisionFilter): Promise<DecisionTrace[]> {
  const db = getDb();
  
  let query = db.collection(COLLECTION_NAME).orderBy('timestamp', 'desc');
  
  if (filters.agentId) {
    query = query.where('_agentId', '==', filters.agentId);
  }
  
  if (filters.brandId) {
    query = query.where('_brandId', '==', filters.brandId);
  }
  
  if (filters.userId) {
    query = query.where('_userId', '==', filters.userId);
  }
  
  if (filters.outcome) {
    query = query.where('_outcome', '==', filters.outcome);
  }
  
  if (filters.startDate) {
    query = query.where('timestamp', '>=', Timestamp.fromDate(filters.startDate));
  }
  
  if (filters.endDate) {
    query = query.where('timestamp', '<=', Timestamp.fromDate(filters.endDate));
  }
  
  const limit = filters.limit || 50;
  query = query.limit(limit);
  
  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      timestamp: data.timestamp?.toDate() || new Date(),
    } as DecisionTrace;
  });
}

/**
 * Get a single decision by ID
 */
export async function getDecisionById(id: string): Promise<DecisionTrace | null> {
  const db = getDb();
  
  const doc = await db.collection(COLLECTION_NAME).doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    timestamp: data.timestamp?.toDate() || new Date(),
  } as DecisionTrace;
}

/**
 * Get recent decisions for an agent (for context in future decisions)
 */
export async function getRecentAgentDecisions(
  agentId: string, 
  limit: number = 5
): Promise<DecisionTrace[]> {
  return queryDecisions({
    agentId,
    limit,
  });
}

/**
 * Link two decisions together (for decision chains)
 */
export async function linkDecisions(sourceId: string, targetId: string): Promise<void> {
  const db = getDb();
  
  await db.collection(COLLECTION_NAME).doc(sourceId).update({
    linkedDecisions: FieldValue.arrayUnion(targetId),
  });
  
  console.log(`[Context OS] Linked decision ${sourceId} -> ${targetId}`);
}

/**
 * Get the decision chain (all linked decisions)
 */
export async function getDecisionChain(startId: string): Promise<DecisionTrace[]> {
  const chain: DecisionTrace[] = [];
  const visited = new Set<string>();
  
  async function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    
    const decision = await getDecisionById(id);
    if (!decision) return;
    
    chain.push(decision);
    
    if (decision.linkedDecisions) {
      for (const linkedId of decision.linkedDecisions) {
        await traverse(linkedId);
      }
    }
  }
  
  await traverse(startId);
  
  return chain;
}

/**
 * Create a decision trace from Gauntlet verification results
 */
export function createDecisionFromGauntlet(
  agentId: string,
  task: string,
  content: any,
  evaluatorResults: EvaluatorResult[],
  passed: boolean,
  metadata: DecisionTrace['metadata'] = {}
): Omit<DecisionTrace, 'id' | 'timestamp'> {
  return {
    agentId,
    task,
    inputs: { contentPreview: typeof content === 'string' ? content.substring(0, 500) : JSON.stringify(content).substring(0, 500) },
    reasoning: passed 
      ? 'Passed all verification checks' 
      : `Failed verification: ${evaluatorResults.filter(e => !e.passed).map(e => e.evaluatorName).join(', ')}`,
    outcome: passed ? 'approved' : 'rejected',
    evaluators: evaluatorResults,
    output: content,
    metadata,
  };
}

// Export a convenience object
export const DecisionLogService = {
  logDecision,
  queryDecisions,
  getDecisionById,
  getRecentAgentDecisions,
  linkDecisions,
  getDecisionChain,
  createDecisionFromGauntlet,
};
