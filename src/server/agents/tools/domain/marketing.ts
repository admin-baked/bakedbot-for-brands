
import { createServerClient } from '@/firebase/server-client';
import { v4 as uuidv4 } from 'uuid';

export interface CampaignDraft {
    id: string;
    name: string;
    channel: 'email' | 'sms';
    segmentId: string;
    content: string;
    status: 'draft';
    createdAt: number;
}

export interface CustomerSegment {
    id: string;
    name: string;
    criteria: Record<string, any>;
    estimatedCount: number;
}

/**
 * Creates a marketing campaign draft.
 * Does NOT send messages, only creates the draft for approval.
 */
export async function createCampaignDraft(
    tenantId: string,
    params: {
        name: string;
        channel: 'email' | 'sms';
        segmentId: string;
        content: string;
    }
): Promise<CampaignDraft> {
    const { firestore } = await createServerClient();

    // Validate segment exists
    const segmentDoc = await firestore.doc(`tenants/${tenantId}/segments/${params.segmentId}`).get();
    if (!segmentDoc.exists) {
        throw new Error(`Segment '${params.segmentId}' does not exist.`);
    }

    const draft: CampaignDraft = {
        id: uuidv4(),
        name: params.name,
        channel: params.channel,
        segmentId: params.segmentId,
        content: params.content,
        status: 'draft',
        createdAt: Date.now()
    };

    await firestore.collection(`tenants/${tenantId}/campaigns`).doc(draft.id).set(draft);
    return draft;
}

/**
 * Builds or retrieves a customer segment based on criteria.
 */
export async function segmentBuilder(
    tenantId: string,
    params: {
        criteria: {
            minSpends?: number;
            lastVisitDays?: number;
            purchasedCategory?: string;
        }
    }
): Promise<CustomerSegment> {
    const { firestore } = await createServerClient();

    // In a real implementation, this would run a complex BigQuery or defined query 
    // to estimate the count. For now, we mock the estimation.

    const segmentId = uuidv4();
    const segment: CustomerSegment = {
        id: segmentId,
        name: `Auto-Segment: ${new Date().toISOString()}`,
        criteria: params.criteria,
        estimatedCount: Math.floor(Math.random() * 500) + 50 // Mock count
    };

    // Persist the definition so it can be used in campaigns
    await firestore.collection(`tenants/${tenantId}/segments`).doc(segmentId).set(segment);

    return segment;
}
