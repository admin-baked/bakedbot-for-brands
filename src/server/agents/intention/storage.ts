
import { getAdminFirestore } from '@/firebase/admin';
import { IntentCommit } from './schema';

/**
 * Persists an IntentCommit to Firestore.
 * Path: tenants/{tenantId}/intents/{intentId}
 */
export async function saveIntentCommit(tenantId: string, commit: IntentCommit): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(`tenants/${tenantId}/intents`).doc(commit.id).set(commit);
}

/**
 * Retrieves an IntentCommit by ID.
 */
export async function getIntentCommit(tenantId: string, intentId: string): Promise<IntentCommit | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(`tenants/${tenantId}/intents`).doc(intentId).get();
    
    if (!doc.exists) return null;
    return doc.data() as IntentCommit;
}

/**
 * Lists recent intents for an agent (for audit/memory).
 */
export async function getAgentRecentIntents(tenantId: string, agentId: string, limit: number = 5): Promise<IntentCommit[]> {
    const db = getAdminFirestore();
    const snapshot = await db.collection(`tenants/${tenantId}/intents`)
        .where('agentId', '==', agentId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
        
    return snapshot.docs.map(d => d.data() as IntentCommit);
}
