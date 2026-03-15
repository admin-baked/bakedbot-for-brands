/**
 * Wallet Updater
 *
 * Called after every loyalty sync to push live point updates to
 * the customer's Apple Wallet pass and/or Google Wallet card.
 *
 * This is the hook that makes BakedBot's wallet cards self-updating —
 * no customer action required after a sync.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CustomerProfile } from '@/types/customers';
import type { WalletUpdateResult, AppleDeviceRegistration } from './types';
import { isAppleConfigured, pushAppleUpdate } from './apple-wallet';
import { isGoogleConfigured, updateLoyaltyObject } from './google-wallet';

/**
 * Trigger wallet updates for a customer after their points change.
 * Fire-and-forget safe — never throws.
 */
export async function triggerWalletUpdate(
  customerId: string,
  orgId: string
): Promise<WalletUpdateResult> {
  const result: WalletUpdateResult = {
    success: false,
    pushSent: 0,
    googleUpdated: false,
  };

  try {
    const firestore = getAdminFirestore();
    const docId = `${orgId}_${customerId}`;
    const doc = await firestore.collection('customers').doc(docId).get();

    if (!doc.exists) {
      logger.warn('[WalletUpdater] Customer not found', { customerId, orgId });
      return result;
    }

    const profile = doc.data() as CustomerProfile;

    // Nothing to update if customer hasn't saved any wallet pass
    const hasApple =
      !!profile.walletPassSerial && (profile.appleDeviceRegistrations?.length ?? 0) > 0;
    const hasGoogle = !!profile.walletGoogleObjectId;

    if (!hasApple && !hasGoogle) {
      result.success = true; // No-op is a success
      return result;
    }

    const points = profile.points ?? 0;
    const tier = profile.tier ?? 'Bronze';

    // Apple: send APNs push to all registered devices
    if (hasApple && isAppleConfigured()) {
      const registrations = (profile.appleDeviceRegistrations ?? []) as AppleDeviceRegistration[];
      result.pushSent = await pushAppleUpdate(registrations, profile.walletPassSerial!);
    }

    // Google: PATCH the loyalty object directly with new points/tier
    if (hasGoogle && isGoogleConfigured()) {
      result.googleUpdated = await updateLoyaltyObject(
        profile.walletGoogleObjectId!,
        points,
        tier
      );
    }

    // Stamp walletPassUpdatedAt on the customer profile
    if (result.pushSent > 0 || result.googleUpdated) {
      await firestore
        .collection('customers')
        .doc(docId)
        .set({ walletPassUpdatedAt: new Date() }, { merge: true });
    }

    result.success = true;

    logger.info('[WalletUpdater] Update complete', {
      customerId,
      orgId,
      pushSent: result.pushSent,
      googleUpdated: result.googleUpdated,
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    logger.error('[WalletUpdater] Update failed', {
      customerId,
      orgId,
      error: result.error,
    });
  }

  return result;
}
