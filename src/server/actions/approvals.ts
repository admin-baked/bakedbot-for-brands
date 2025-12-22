
'use server';

import { createServerClient } from '@/firebase/server-client';
import { ApprovalRequest } from '@/types/agent-toolkit';
import { requireUser } from '@/server/auth/auth';

export async function getPendingApprovals(tenantId: string): Promise<ApprovalRequest[]> {
    const { firestore } = await createServerClient();

    // In production, we'd query by status='pending'
    const snapshot = await firestore
        .collection(`tenants/${tenantId}/approvals`)
        .where('status', '==', 'pending')
        .get();

    return snapshot.docs.map(doc => doc.data() as ApprovalRequest);
}

export async function approveRequest(tenantId: string, requestId: string, approved: boolean): Promise<void> {
    const userId = await requireUser();
    const { firestore } = await createServerClient();

    const ref = firestore.doc(`tenants/${tenantId}/approvals/${requestId}`);
    const doc = await ref.get();

    if (!doc.exists) throw new Error('Request not found');

    await ref.update({
        status: approved ? 'approved' : 'rejected',
        approverId: userId,
        approvedAt: Date.now()
    });

    // In a real system, we'd trigger the original action here or emit an event
    if (approved) {
        // TODO: Resume/Execute the payload
        // For Phase 3, we just mark it as approved. 
        // The user would re-run the agent command, and we'd need a check in the Router to see if it's approved.
        // OR, the router checks "is there an approved request for this idempotency key/hash?"
    }
}
