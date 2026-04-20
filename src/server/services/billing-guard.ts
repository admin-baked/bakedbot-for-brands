
import { createServerClient } from '@/firebase/server-client';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { Tenant } from '@/types/tenant';

export interface ServiceStatus {
  active: boolean;
  paused: boolean;
  status: string;
  reason?: string;
  gracePeriodRemainingDays?: number;
}

const GRACE_PERIOD_DAYS = 3;

/**
 * Centralized service to check if a tenant's subscription is in good standing.
 * Bypasses checks for Super Admins.
 */
export async function getTenantServiceStatus(orgId: string, userRole?: string): Promise<ServiceStatus> {
  // 1. Super Admin Bypass
  if (userRole === 'super_admin' || userRole === 'super_user') {
    return { active: true, paused: false, status: 'active', reason: 'super_admin_bypass' };
  }

  try {
    const { firestore } = await createServerClient();
    const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
    
    if (!tenantDoc.exists) {
      return { active: false, paused: true, status: 'unknown', reason: 'tenant_not_found' };
    }

    const data = tenantDoc.data() as Tenant;
    const { subscriptionStatus, delinquencyAt, isManualSuspended } = data;

    // 2. Manual Suspension Check
    if (isManualSuspended) {
      return { active: false, paused: true, status: 'suspended', reason: 'manual_suspension' };
    }

    // 3. Status-based logic
    switch (subscriptionStatus) {
      case 'active':
      case 'trial':
        return { active: true, paused: false, status: subscriptionStatus };

      case 'past_due': {
        if (!delinquencyAt) {
           return { active: true, paused: false, status: 'past_due', gracePeriodRemainingDays: GRACE_PERIOD_DAYS };
        }

        const delinquencyDate = delinquencyAt instanceof Timestamp ? delinquencyAt.toDate() : new Date(delinquencyAt as any);
        const diffMs = Date.now() - delinquencyDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays <= GRACE_PERIOD_DAYS) {
          return { 
            active: true, 
            paused: false, 
            status: 'past_due', 
            gracePeriodRemainingDays: Math.max(0, Math.ceil(GRACE_PERIOD_DAYS - diffDays)) 
          };
        }

        return { active: false, paused: true, status: 'suspended', reason: 'grace_period_expired' };
      }

      case 'suspended':
      case 'trial_expired':
      case 'canceled':
      default:
        return { active: false, paused: true, status: subscriptionStatus || 'none', reason: 'subscription_inactive' };
    }
  } catch (error: any) {
    logger.error('[BillingGuard] Failed to fetch tenant status', { orgId, error: error.message });
    // Default to active to avoid breaking things on transient DB errors, but log loudly
    return { active: true, paused: false, status: 'error_fallback' };
  }
}

/**
 * Checks if a tenant should be transitioned from past_due to suspended.
 * Intended for use in a cron job or scheduled task.
 */
export async function transitionDelinquentTenants(): Promise<{ processed: number; errors: number }> {
  try {
    const { firestore } = await createServerClient();
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    
    const delinquentSnap = await firestore.collection('tenants')
      .where('subscriptionStatus', '==', 'past_due')
      .where('delinquencyAt', '<=', Timestamp.fromDate(threeDaysAgo))
      .get();

    if (delinquentSnap.empty) {
      return { processed: 0, errors: 0 };
    }

    const batch = firestore.batch();
    delinquentSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        subscriptionStatus: 'suspended',
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    logger.info(`[BillingGuard] Transitioned ${delinquentSnap.size} tenants to suspended status.`);
    return { processed: delinquentSnap.size, errors: 0 };
  } catch (error: any) {
    logger.error('[BillingGuard] Transition failed', { error: error.message });
    return { processed: 0, errors: 1 };
  }
}
