'use server';

import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Manually toggle a tenant's suspension status.
 * This is an administrative override that sets isManualSuspended.
 */
export async function toggleTenantSuspension(
  orgId: string, 
  suspended: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireSuperUser();
    const db = getAdminFirestore();
    
    logger.info(`[Admin] Attempting to ${suspended ? 'suspend' : 'resume'} org ${orgId}`, {
      adminId: user.uid,
      reason
    });

    const tenantRef = db.collection('tenants').doc(orgId);
    const tenantSnap = await tenantRef.get();

    if (!tenantSnap.exists) {
      return { success: false, error: 'Tenant record not found' };
    }

    await tenantRef.update({
      isManualSuspended: suspended,
      subscriptionStatus: suspended ? 'suspended' : 'active', // Assuming resuming sets back to active
      updatedAt: FieldValue.serverTimestamp(),
      'meta.suspendedBy': user.uid,
      'meta.suspensionReason': reason || null,
      'meta.suspendedAt': suspended ? FieldValue.serverTimestamp() : null
    });

    // Also update organization document for consistency if needed
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (orgSnap.exists) {
      await orgRef.update({
        'billing.subscriptionStatus': suspended ? 'suspended' : 'active',
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error: any) {
    logger.error(`[Admin] Failed to toggle suspension for org ${orgId}`, { error: error.message });
    return { success: false, error: error.message || 'Failed to update suspension status' };
  }
}
