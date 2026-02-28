/**
 * GET /api/checkout/usdc/status?orderId=xxx
 *
 * Polls on-chain USDC balance to confirm payment for a checkout order.
 *
 * Strategy:
 * 1. Get the pending payment intent from Firestore
 * 2. Refresh the dispensary wallet balance on-chain via CDP SDK
 * 3. If balance delta from intent baseline >= expected amount, mark paid
 * 4. Return status: 'pending' | 'confirmed' | 'expired'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { refreshWalletBalance, getOrgWallet } from '@/lib/x402/cdp-wallets';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { z } from 'zod';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const usdcStatusQuerySchema = z.object({
  orderId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid orderId'),
});

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any)?.toDate === 'function') {
    const converted = (value as any).toDate();
    return converted instanceof Date ? converted : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { orderId } = usdcStatusQuerySchema.parse({
      orderId: searchParams.get('orderId') ?? undefined,
    });

    const db = getAdminFirestore();

    // Get the order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    const orderEmail = typeof orderData?.customer?.email === 'string' ? orderData.customer.email.toLowerCase() : '';
    const userEmail = typeof user.email === 'string' ? user.email.toLowerCase() : '';
    const isOwner =
      orderData?.userId === user.uid ||
      orderData?.customerId === user.uid ||
      (!!userEmail && orderEmail === userEmail);

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: order access denied' }, { status: 403 });
    }

    // Already confirmed
    if (orderData.paymentStatus === 'paid') {
      return NextResponse.json({ status: 'confirmed' });
    }

    // Check if this order has a USDC payment intent
    const usdcData = orderData.usdc;
    if (!usdcData?.paymentAddress || !usdcData?.amountUsdc) {
      return NextResponse.json({ status: 'pending' });
    }

    const orgId = orderData?.orgId || orderData?.organizationId || orderData?.brandId;
    if (!orgId || !DOCUMENT_ID_REGEX.test(orgId)) {
      return NextResponse.json({ error: 'Order organization is invalid' }, { status: 400 });
    }

    const expectedAmount = Number(usdcData.amountUsdc);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid expected USDC amount' }, { status: 400 });
    }

    // Get current wallet to check baseline
    const walletBefore = await getOrgWallet(orgId);
    if (!walletBefore) {
      return NextResponse.json({ status: 'pending' });
    }

    // Refresh on-chain balance
    const newBalance = await refreshWalletBalance(orgId);
    const fallbackBaseline = Number(walletBefore.usdcBalanceUsd || 0);
    const baselineAtIntent = Number(usdcData.balanceAtIntentUsdc ?? fallbackBaseline);

    logger.info(
      `[USDC status] Order ${orderId}: baseline $${baselineAtIntent}, now $${newBalance}, expected $${expectedAmount}`,
    );

    // Check if the balance increased by at least the expected amount.
    const received = newBalance - baselineAtIntent;

    if (received >= expectedAmount - 0.01) {
      // Payment confirmed: update order and deposit intent.
      const batch = db.batch();

      batch.update(db.collection('orders').doc(orderId), {
        paymentStatus: 'paid',
        'usdc.confirmedAt': new Date().toISOString(),
        'usdc.receivedAmountUsdc': Number(received.toFixed(6)),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (usdcData.intentId) {
        batch.update(db.collection('x402_deposits').doc(usdcData.intentId), {
          status: 'confirmed',
          confirmedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      logger.info(`[USDC checkout] Payment confirmed for order ${orderId}: received $${received}`);
      return NextResponse.json({ status: 'confirmed' });
    }

    const expiresAt =
      asDate(usdcData.expiresAt) ||
      (() => {
        const createdAt = asDate(orderData.createdAt);
        if (!createdAt) return null;
        return new Date(createdAt.getTime() + 30 * 60_000);
      })();

    if (expiresAt && Date.now() > expiresAt.getTime()) {
      return NextResponse.json({ status: 'expired' });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Invalid request query' }, { status: 400 });
    }
    logger.error(`[USDC status] Status check failed: ${String(err)}`);
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}
