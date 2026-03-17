'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { ClaimOpportunity, FFFClaimRecommendedType } from '@/types/fff-audit';

export interface CreateClaimOpportunityRequest {
    source: 'fff_audit' | 'claim_page' | 'homepage';
    sourceDetail?: 'free_audit_unlock' | 'direct_claim' | 'hero_search';

    auditReportId?: string;
    emailLeadId?: string;

    claimant: {
        email: string;
        firstName?: string;
        phone?: string;
        businessType: 'dispensary' | 'brand';
        websiteUrl?: string;
        companyName?: string;
    };

    opportunityType: FFFClaimRecommendedType;

    market: {
        zip?: string;
        city?: string;
        state?: string;
        regionKey?: string;
    };

    auditSnapshot?: {
        totalScore?: number;
        findability?: number;
        topLeakBuckets?: string[];
        roiAnnualImpact?: number;
    };
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

        // Dedupe: open/reserved/submitted claim for same email + market key
        const marketKey = request.market.zip ?? request.market.city ?? request.market.regionKey;
        if (marketKey && request.claimant.email) {
            const existingQuery = await db
                .collection('claim_opportunities')
                .where('claimant.email', '==', request.claimant.email)
                .where('status', 'in', ['initiated', 'reserved', 'submitted', 'claimed'])
                .limit(20)
                .get();

            // Find one matching the same market
            const match = existingQuery.docs.find((doc) => {
                const m = doc.get('market') as ClaimOpportunity['market'] | undefined;
                return (
                    (request.market.zip && m?.zip === request.market.zip) ||
                    (request.market.city && m?.city === request.market.city) ||
                    (request.market.regionKey && m?.regionKey === request.market.regionKey)
                );
            });

            if (match) {
                return {
                    success: true,
                    opportunityId: match.id,
                    status: match.get('status') as ClaimOpportunity['status'],
                };
            }
        }

        // Create new opportunity
        const opportunityData: Omit<ClaimOpportunity, 'id'> = {
            source: request.source,
            sourceDetail: request.sourceDetail,
            auditReportId: request.auditReportId,
            emailLeadId: request.emailLeadId,
            claimant: {
                email: request.claimant.email,
                firstName: request.claimant.firstName,
                phone: request.claimant.phone,
                businessType: request.claimant.businessType,
                websiteUrl: request.claimant.websiteUrl,
                companyName: request.claimant.companyName,
            },
            opportunityType: request.opportunityType,
            market: request.market,
            status: 'initiated',
            auditSnapshot: request.auditSnapshot,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('claim_opportunities').add(opportunityData);

        // Update linked audit report with click intent
        if (request.auditReportId) {
            await db.collection('fff_audit_reports').doc(request.auditReportId).update({
                'claimIntent.clicked': true,
                'claimIntent.clickedAt': now,
                'claimIntent.opportunityType': request.opportunityType,
                'claimIntent.zip': request.market.zip,
                'claimIntent.state': request.market.state,
                updatedAt: now,
            });
        }

        // Upgrade email lead to sql
        if (request.emailLeadId) {
            const leadDoc = await db.collection('email_leads').doc(request.emailLeadId).get();
            const existingTags = (leadDoc.data()?.tags as string[]) || [];
            const mergedTags = [...new Set([...existingTags, 'claim-clicked'])];

            await db.collection('email_leads').doc(request.emailLeadId).update({
                tags: mergedTags,
                fffLeadStatus: 'sql',
                claimOpportunityId: docRef.id,
                lastUpdated: now,
            });
        }

        logger.info('[ClaimOpportunity] Created', {
            opportunityId: docRef.id,
            email: request.claimant.email,
            market: marketKey,
            opportunityType: request.opportunityType,
            score: request.auditSnapshot?.totalScore,
        });

        return { success: true, opportunityId: docRef.id, status: 'initiated' };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[ClaimOpportunity] Error creating opportunity', { error: err.message });
        return { success: false, error: err.message || 'Failed to create claim opportunity' };
    }
}
