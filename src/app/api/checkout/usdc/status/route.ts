/**
 * GET /api/checkout/usdc/status?orderId=xxx
 *
 * Polls on-chain USDC balance to confirm payment for a checkout order.
 *
 * Strategy:
 * 1. Get the pending payment intent from Firestore
 * 2. Refresh the dispensary wallet balance on-chain via CDP SDK
 * 3. If balance >= expected amount, mark order as paid
 * 4. Return status: 'pending' | 'confirmed' | 'expired'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { refreshWalletBalance, getOrgWallet } from '@/lib/x402/cdp-wallets';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get the order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // Already confirmed
    if (orderData.paymentStatus === 'paid') {
      return NextResponse.json({ status: 'confirmed' });
    }

    // Check if this order has a USDC payment intent
    const usdcData = orderData.usdc;
    if (!usdcData?.paymentAddress || !usdcData?.amountUsdc) {
      return NextResponse.json({ status: 'pending' });
    }

    const { orgId } = orderData;
    const expectedAmount: number = usdcData.amountUsdc;

    // Get current wallet to check pre-refresh baseline
    const walletBefore = await getOrgWallet(orgId);
    if (!walletBefore) {
      return NextResponse.json({ status: 'pending' });
    }

    // Refresh on-chain balance
    const newBalance = await refreshWalletBalance(orgId);
    const previousBalance = walletBefore.usdcBalanceUsd;

    logger.info(`[USDC status] Order ${orderId}: prev $${previousBalance}, now $${newBalance}, expected $${expectedAmount}`);

    // Check if the balance increased by at least the expected amount
    // Using a small tolerance (0.01 USDC) for floating point
    const received = newBalance - previousBalance;

    if (received >= expectedAmount - 0.01) {
      // Payment confirmed — update order
      const batch = db.batch();

      batch.update(db.collection('orders').doc(orderId), {
        paymentStatus: 'paid',
        'usdc.confirmedAt': new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Mark the deposit intent as confirmed
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

    // Check expiry (30 minutes)
    const createdAt = orderData.createdAt?.toDate?.()?.getTime() ?? Date.now();
    const ageMinutes = (Date.now() - createdAt) / 60_000;
    if (ageMinutes > 30) {
      return NextResponse.json({ status: 'expired' });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (err) {
    logger.error(`[USDC status] Status check failed: ${String(err)}`);
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}
