'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { ClaimOpportunity } from '@/types/fff-audit';

export interface CreateClaimOpportunityRequest {
    emailLeadId: string;
    auditReportId: string;
    email: string;
    firstName?: string;
    businessType: 'dispensary' | 'brand';
    state: string;
    websiteUrl: string;
    zipCode: string;
    score: number;
}

export interface CreateClaimOpportunityResponse {
    success: boolean;
    opportunityId?: string;
    status?: ClaimOpportunity['status'];
    error?: string;
}

export async function createClaimOpportunity(
    request: CreateClaimOpportunityRequest,
): Promise<CreateClaimOpportunityResponse> {
    try {
        const db = getAdminFirestore();
        const now = Date.now();

        // Dedupe: existing open/reserved/claimed request for same email + zip
        const existing = await db
            .collection('claim_opportunities')
            .where('email', '==', request.email)
            .where('zipCode', '==', request.zipCode)
            .where('status', 'in', ['open', 'reserved', 'claimed'])
            .limit(1)
            .get();

        if (!existing.empty) {
            const doc = existing.docs[0];
            return {
                success: true,
                opportunityId: doc.id,
                status: doc.get('status') as ClaimOpportunity['status'],
            };
        }

        // Create new opportunity
        const opportunityData: Omit<ClaimOpportunity, 'id'> = {
            emailLeadId: request.emailLeadId,
            auditReportId: request.auditReportId,
            email: request.email,
            firstName: request.firstName,
            businessType: request.businessType,
            state: request.state,
            websiteUrl: request.websiteUrl,
            zipCode: request.zipCode,
            status: 'open',
            score: request.score,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('claim_opportunities').add(opportunityData);

        // Mark audit report with claim intent
        await db.collection('fff_audit_reports').doc(request.auditReportId).update({
            claimIntent: 'interested',
            claimOpportunityId: docRef.id,
        });

        // Upgrade lead to sql
        await db.collection('email_leads').doc(request.emailLeadId).update({
            fffLeadStatus: 'sql',
            claimOpportunityId: docRef.id,
            lastUpdated: now,
        });

        logger.info('[ClaimOpportunity] Created', {
            opportunityId: docRef.id,
            email: request.email,
            zipCode: request.zipCode,
            score: request.score,
        });

        return { success: true, opportunityId: docRef.id, status: 'open' };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[ClaimOpportunity] Error creating opportunity', { error: err.message });
        return { success: false, error: err.message || 'Failed to create claim opportunity' };
    }
}
