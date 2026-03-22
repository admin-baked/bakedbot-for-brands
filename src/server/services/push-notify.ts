/**
 * Web Push notification sender.
 * Used by loyalty sync to notify customers of point updates.
 */
import webpush from 'web-push';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:jack@bakedbot.ai';
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send a push notification to a customer if they have a subscription.
 * Fire-and-forget — never throws.
 */
export async function notifyCustomer(
  customerId: string,
  orgId: string,
  payload: PushPayload
): Promise<void> {
  try {
    ensureConfigured();
    if (!configured) return;

    const db = getAdminFirestore();
    const col = db.collection('customers');
    const [compound, bare] = await Promise.all([
      col.doc(`${orgId}_${customerId}`).get(),
      col.doc(customerId).get(),
    ]);
    const doc = compound.exists ? compound : bare;
    if (!doc.exists) return;

    const sub = doc.data()?.pushSubscription;
    if (!sub?.endpoint) return;

    await webpush.sendNotification(sub, JSON.stringify(payload));
    logger.info('[Push] Notification sent', { customerId, orgId, title: payload.title });
  } catch (error) {
    // Subscription expired — clean it up
    const errMsg = String(error);
    if (errMsg.includes('410') || errMsg.includes('404')) {
      try {
        const db = getAdminFirestore();
        const col = db.collection('customers');
        const [c, b] = await Promise.all([col.doc(`${orgId}_${customerId}`).get(), col.doc(customerId).get()]);
        const ref = c.exists ? c.ref : b.ref;
        await ref.set({ pushSubscription: null }, { merge: true });
      } catch {
        // best effort
      }
    }
    logger.warn('[Push] Notification failed', { customerId, orgId, error: errMsg });
  }
}

/**
 * Notify customer that their points were updated.
 */
export async function notifyPointsUpdate(
  customerId: string,
  orgId: string,
  points: number,
  brandName: string,
  brandSlug: string
): Promise<void> {
  await notifyCustomer(customerId, orgId, {
    title: `${brandName} Rewards`,
    body: `Your points balance updated to ${points.toLocaleString()} pts`,
    url: `/${brandSlug}/rewards`,
    icon: '/icon-192.png',
  });
}
