'use server';

/**
 * Compliance Discovery Actions
 * For managing discovered compliance data pending review
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';

// Types
export interface ComplianceDiscovery {
    id: string;
    title: string;
    content: string;
    summary: string;
    source: string;
    sourceUrl: string;
    state: string;
    status: 'pending' | 'approved' | 'rejected';
    discoveredAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    agentId: string;
    knowledgeBaseId?: string; // Once approved
}

/**
 * Queue a discovered compliance item for review
 */
export async function queueComplianceDiscovery(data: {
    title: string;
    content: string;
    summary: string;
    source: string;
    sourceUrl: string;
    state: string;
}): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
        const { firestore } = await createServerClient();
        
        const collRef = firestore.collection('compliance_discoveries');
        const docRef = collRef.doc();
        
        await docRef.set({
            id: docRef.id,
            ...data,
            status: 'pending',
            agentId: 'deebo',
            discoveredAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('[ComplianceDiscovery] Queue failed:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Get pending compliance discoveries
 */
export async function getPendingDiscoveries(): Promise<ComplianceDiscovery[]> {
    try {
        const { firestore } = await createServerClient();
        await requireUser();
        
        const snap = await firestore
            .collection('compliance_discoveries')
            .where('status', '==', 'pending')
            .orderBy('discoveredAt', 'desc')
            .limit(50)
            .get();
        
        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                discoveredAt: data.discoveredAt?.toDate() || new Date(),
                reviewedAt: data.reviewedAt?.toDate(),
            } as ComplianceDiscovery;
        });
    } catch (error) {
        console.error('[ComplianceDiscovery] Get pending failed:', error);
        return [];
    }
}

/**
 * Approve a discovery and add to knowledge base
 */
export async function approveDiscovery(
    discoveryId: string,
    knowledgeBaseId: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();
        
        const discoveryRef = firestore.collection('compliance_discoveries').doc(discoveryId);
        const snap = await discoveryRef.get();
        
        if (!snap.exists) {
            return { success: false, message: 'Discovery not found' };
        }
        
        const discovery = snap.data() as ComplianceDiscovery;
        
        // Import the addDocumentAction
        const { addDocumentAction } = await import('@/server/actions/knowledge-base');
        
        // Add to knowledge base
        const addResult = await addDocumentAction({
            knowledgeBaseId,
            title: discovery.title,
            content: discovery.content,
            type: 'text',
            source: 'scrape', // Use 'scrape' as it matches allowed types and semantic meaning
            sourceUrl: discovery.sourceUrl,
        });
        
        if (!addResult.success) {
            return { success: false, message: addResult.message };
        }
        
        // Update discovery status
        await discoveryRef.update({
            status: 'approved',
            reviewedAt: FieldValue.serverTimestamp(),
            reviewedBy: user.uid,
            knowledgeBaseId,
        });
        
        return { success: true };
    } catch (error: any) {
        console.error('[ComplianceDiscovery] Approve failed:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Reject a discovery
 */
export async function rejectDiscovery(
    discoveryId: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();
        
        await firestore.collection('compliance_discoveries').doc(discoveryId).update({
            status: 'rejected',
            reviewedAt: FieldValue.serverTimestamp(),
            reviewedBy: user.uid,
        });
        
        return { success: true };
    } catch (error: any) {
        console.error('[ComplianceDiscovery] Reject failed:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Search for compliance data using Deebo (web search)
 */
export async function searchComplianceData(query: string, state?: string): Promise<{
    success: boolean;
    results?: Array<{
        title: string;
        snippet: string;
        url: string;
        source: string;
    }>;
    message?: string;
}> {
    try {
        await requireUser();
        
        // Use existing searchWeb tool
        const searchQuery = state 
            ? `${state} cannabis compliance regulations ${query}`
            : `cannabis compliance regulations ${query}`;
        
        const { searchWeb } = await import('@/server/tools/web-search');
        const searchResponse = await searchWeb(searchQuery, 10);
        
        if (!searchResponse.success) {
             return { success: false, message: searchResponse.error };
        }

        return {
            success: true,
            results: searchResponse.results.map(r => ({
                title: r.title,
                snippet: r.snippet,
                url: r.link,
                source: new URL(r.link).hostname,
            })),
        };
    } catch (error: any) {
        console.error('[ComplianceDiscovery] Search failed:', error);
        return { success: false, message: error.message };
    }
}
