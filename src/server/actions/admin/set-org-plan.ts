'use server';

import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export type PlanId =
    | 'free'
    | 'access_intel'
    | 'access_retention'
    | 'access_complete'
    | 'operator_core'
    | 'operator_growth'
    | 'enterprise';

export interface SetOrgPlanResult {
    success: boolean;
    error?: string;
}

export async function setOrgPlan(orgId: string, planId: PlanId): Promise<SetOrgPlanResult> {
    await requireSuperUser();

    const db = getAdminFirestore();
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) {
        return { success: false, error: `Org not found: ${orgId}` };
    }

    try {
        await orgRef.update({
            planId,
            'billing.subscriptionStatus': 'active',
            'billing.planActivatedAt': new Date(),
            'billing.manuallyInvoiced': true,
            updatedAt: new Date(),
        });

        logger.info('[SetOrgPlan] Plan updated', { orgId, planId });
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[SetOrgPlan] Failed', { orgId, planId, error: msg });
        return { success: false, error: msg };
    }
}
