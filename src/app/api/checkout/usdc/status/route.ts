/**
 * GET /api/checkout/usdc/status?orderId=xxx
 *
 * Polls on-chain USDC balance to confirm payment for a checkout order.
 *
 * Strategy:
 * 1. Resolve the order + bound x402 deposit intent
 * 2. Refresh the org wallet balance on-chain via CDP SDK
 * 3. Compute available delta from this intent baseline minus already-confirmed intents
 * 4. Confirm only if available delta meets this intent's expected amount
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

    const intentId = typeof usdcData.intentId === 'string' ? usdcData.intentId.trim() : '';
    if (!intentId || !DOCUMENT_ID_REGEX.test(intentId)) {
      logger.warn(`[USDC status] Missing/invalid intentId for order ${orderId}`);
      return NextResponse.json({ status: 'pending' });
    }

    const intentRef = db.collection('x402_deposits').doc(intentId);
    const intentSnap = await intentRef.get();
    if (!intentSnap.exists) {
      logger.warn(`[USDC status] Intent ${intentId} not found for order ${orderId}`);
      return NextResponse.json({ status: 'pending' });
    }

    const intentData = intentSnap.data() || {};
    const intentOrderId = typeof intentData.orderId === 'string' ? intentData.orderId : null;
    const intentOrgId = typeof intentData.orgId === 'string' ? intentData.orgId : null;
    const intentWalletAddress =
      typeof intentData.walletAddress === 'string' ? intentData.walletAddress : null;
    const intentAmountUsdc = Number(intentData.amountUsdc);
    const intentStatus = typeof intentData.status === 'string' ? intentData.status : 'pending';

    if (intentOrderId && intentOrderId !== orderId) {
      logger.error(`[USDC status] Intent ${intentId} order mismatch: ${intentOrderId} != ${orderId}`);
      return NextResponse.json({ error: 'USDC intent/order mismatch' }, { status: 409 });
    }

    if (intentOrgId && intentOrgId !== orgId) {
      logger.error(`[USDC status] Intent ${intentId} org mismatch: ${intentOrgId} != ${orgId}`);
      return NextResponse.json({ error: 'USDC intent/org mismatch' }, { status: 409 });
    }

    if (intentWalletAddress && intentWalletAddress !== usdcData.paymentAddress) {
      logger.error(
        `[USDC status] Intent ${intentId} wallet mismatch: ${intentWalletAddress} != ${usdcData.paymentAddress}`,
      );
      return NextResponse.json({ error: 'USDC intent/wallet mismatch' }, { status: 409 });
    }

    if (Number.isFinite(intentAmountUsdc) && Math.abs(intentAmountUsdc - expectedAmount) > 0.01) {
      logger.error(
        `[USDC status] Intent ${intentId} amount mismatch: ${intentAmountUsdc} != ${expectedAmount}`,
      );
      return NextResponse.json({ error: 'USDC intent/amount mismatch' }, { status: 409 });
    }

    if (intentStatus === 'confirmed') {
      if (orderData.paymentStatus !== 'paid') {
        const recoveredAmount = Number(
          intentData.confirmedAmountUsdc ?? intentData.amountUsdc ?? expectedAmount,
        );
        const recoveredConfirmedAt = asDate(intentData.confirmedAt)?.toISOString() ?? new Date().toISOString();

        await db.collection('orders').doc(orderId).update({
          paymentStatus: 'paid',
          'usdc.confirmedAt': recoveredConfirmedAt,
          'usdc.receivedAmountUsdc': Number(
            Number.isFinite(recoveredAmount) ? recoveredAmount.toFixed(6) : expectedAmount.toFixed(6),
          ),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return NextResponse.json({ status: 'confirmed' });
    }

    if (intentStatus === 'expired') {
      return NextResponse.json({ status: 'expired' });
    }

    // Get current wallet to check baseline
    const walletBefore = await getOrgWallet(orgId);
    if (!walletBefore) {
      return NextResponse.json({ status: 'pending' });
    }

    // Refresh on-chain balance
    const newBalance = await refreshWalletBalance(orgId);
    const fallbackBaseline = Number(walletBefore.usdcBalanceUsd || 0);
    const baselineAtIntent = Number(
      intentData.balanceAtIntentUsdc ?? usdcData.balanceAtIntentUsdc ?? fallbackBaseline,
    );

    const intentCreatedAt = asDate(intentData.createdAt) || asDate(orderData.createdAt);

    logger.info(
      `[USDC status] Order ${orderId}: baseline $${baselineAtIntent}, now $${newBalance}, expected $${expectedAmount}`,
    );

    // Calculate available balance delta for this specific intent.
    const received = newBalance - baselineAtIntent;
    const confirmedIntentsSnap = await db
      .collection('x402_deposits')
      .where('orgId', '==', orgId)
      .where('walletAddress', '==', usdcData.paymentAddress)
      .where('status', '==', 'confirmed')
      .get();

    let consumedByOtherConfirmedIntents = 0;
    for (const confirmedDoc of confirmedIntentsSnap.docs) {
      if (confirmedDoc.id === intentId) continue;
      const confirmedData = confirmedDoc.data() || {};
      const confirmedAt = asDate(confirmedData.confirmedAt);

      // Ignore confirmations that happened before this intent started.
      if (intentCreatedAt && confirmedAt && confirmedAt.getTime() < intentCreatedAt.getTime()) {
        continue;
      }

      const consumedAmount = Number(
        confirmedData.confirmedAmountUsdc ?? confirmedData.amountUsdc ?? 0,
      );
      if (Number.isFinite(consumedAmount) && consumedAmount > 0) {
        consumedByOtherConfirmedIntents += consumedAmount;
      }
    }

    const availableForThisIntent = received - consumedByOtherConfirmedIntents;

    if (availableForThisIntent >= expectedAmount - 0.01) {
      // Payment confirmed: update order and deposit intent.
      const batch = db.batch();
      const confirmedAmount = Number(expectedAmount.toFixed(6));

      batch.update(db.collection('orders').doc(orderId), {
        paymentStatus: 'paid',
        'usdc.confirmedAt': new Date().toISOString(),
        'usdc.receivedAmountUsdc': confirmedAmount,
        'usdc.observedWalletBalanceUsdc': Number(newBalance.toFixed(6)),
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.update(intentRef, {
        status: 'confirmed',
        confirmedAt: FieldValue.serverTimestamp(),
        confirmedAmountUsdc: confirmedAmount,
        observedWalletBalanceUsdc: Number(newBalance.toFixed(6)),
      });

      await batch.commit();

      logger.info(
        `[USDC checkout] Payment confirmed for order ${orderId}: available $${availableForThisIntent}, expected $${expectedAmount}`,
      );
      return NextResponse.json({ status: 'confirmed' });
    }

    const expiresAt =
      asDate(intentData.expiresAt) ||
      asDate(usdcData.expiresAt) ||
      (() => {
        const createdAt = asDate(orderData.createdAt);
        if (!createdAt) return null;
        return new Date(createdAt.getTime() + 30 * 60_000);
      })();

    if (expiresAt && Date.now() > expiresAt.getTime()) {
      if (intentStatus === 'pending') {
        await intentRef.set(
          {
            status: 'expired',
            expiredAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
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
