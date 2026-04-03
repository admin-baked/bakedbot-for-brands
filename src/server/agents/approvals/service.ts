
import { createServerClient } from '@/firebase/server-client';
import { ApprovalRequest } from '@/types/agent-toolkit';
import { v4 as uuidv4 } from 'uuid';

export async function createApprovalRequest(
    tenantId: string,
    toolName: string,
    inputs: any,
    actorId: string,
    actorRole: any
): Promise<ApprovalRequest> {
    const { firestore } = await createServerClient();
    const id = uuidv4();

    const request: ApprovalRequest = {
        id,
        tenantId,
        createdAt: Date.now(),
        status: 'pending',
        toolName,
        requestedBy: {
            userId: actorId,
            role: actorRole
        },
        type: mapToolToApprovalType(toolName),
        description: `Request to execute ${toolName}`,
        payloadRef: `tenants/${tenantId}/approvals/${id}/payload`, // Logical ref
        // In a real system, we might store the full payload in a sub-collection or Storage if large
    };

    // Store the request + inputs
    const batch = firestore.batch();
    const reqRef = firestore.doc(`tenants/${tenantId}/approvals/${id}`);
    batch.set(reqRef, request);

    // Store the actual inputs safely
    const payloadRef = reqRef.collection('payload').doc('data');
    batch.set(payloadRef, { inputs });

    await batch.commit();
    return request;
}

export async function getApprovalRequest(
    tenantId: string,
    approvalId: string
): Promise<ApprovalRequest | null> {
    if (!tenantId || !approvalId) {
        return null;
    }

    const { firestore } = await createServerClient();
    const doc = await firestore.doc(`tenants/${tenantId}/approvals/${approvalId}`).get();
    return doc.exists ? (doc.data() as ApprovalRequest) : null;
}

function mapToolToApprovalType(toolName: string): ApprovalRequest['type'] {
    if (toolName.includes('marketing')) return 'send_email'; // or 'send_sms'
    if (toolName.includes('publish')) return 'publish_page';
    return 'update_catalog'; // default fallback
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function checkIdempotency(key: string): Promise<any | null> {
    if (!key) return null;
    const { firestore } = await createServerClient();
    const doc = await firestore.doc(`system/tools/idempotency/${key}`).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    // Treat expired records as cache misses
    if (data.expiresAt && data.expiresAt < Date.now()) return null;
    return data;
}

export async function saveIdempotency(key: string, result: any) {
    if (!key) return;
    const { firestore } = await createServerClient();
    await firestore.doc(`system/tools/idempotency/${key}`).set({
        result,
        timestamp: Date.now(),
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
    });
}
