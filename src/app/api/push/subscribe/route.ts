/**
 * POST /api/push/subscribe
 * Save a Web Push subscription for a loyalty customer.
 * Body: { customerId, orgId, subscription: PushSubscription }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { customerId, orgId, subscription } = await request.json();

    if (!customerId || !orgId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const col = db.collection('customers');
    const [compound, bare] = await Promise.all([
      col.doc(`${orgId}_${customerId}`).get(),
      col.doc(customerId).get(),
    ]);
    const docRef = (compound.exists ? compound : bare).ref;

    await docRef.set(
      {
        pushSubscription: subscription,
        pushSubscribedAt: new Date(),
      },
      { merge: true }
    );

    logger.info('[Push] Subscription saved', { customerId, orgId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Push] Subscribe failed', { error: String(error) });
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
