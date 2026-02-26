/**
 * POST /api/checkout/usdc/intent
 *
 * Creates a USDC payment intent for a customer checkout.
 * Returns the dispensary's wallet address + QR code for payment.
 *
 * Flow:
 * 1. Customer selects "Pay with USDC" at checkout
 * 2. Frontend calls this endpoint with orderId + orgId
 * 3. We return the dispensary's USDC wallet address + QR + expiry
 * 4. Customer pays from any wallet (Coinbase, MetaMask, etc.)
 * 5. Frontend polls /api/checkout/usdc/status to confirm
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { getOrCreateOrgWallet } from '@/lib/x402/cdp-wallets';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import QRCode from 'qrcode';
import { USDC_CHECKOUT_EXPIRY_MINUTES } from '@/types/x402';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orgId } = body as { orderId: string; orgId: string };

    if (!orderId || !orgId) {
      return NextResponse.json({ error: 'orderId and orgId are required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Verify order exists and get total
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    const amountUsdc = orderData.totals?.total ?? orderData.total ?? 0;

    if (amountUsdc <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    // Get or create dispensary's USDC wallet
    const wallet = await getOrCreateOrgWallet(orgId);

    // QR code: EIP-681 with USDC amount hint
    const qrPayload = `ethereum:${wallet.walletAddress}@8453/transfer?value=${Math.round(amountUsdc * 1e6)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 2 });

    const expiresAt = new Date(Date.now() + USDC_CHECKOUT_EXPIRY_MINUTES * 60 * 1000);

    // Record payment intent in Firestore
    const intentRef = db.collection('x402_deposits').doc();
    await intentRef.set({
      orderId,
      orgId,
      walletAddress: wallet.walletAddress,
      amountUsdc,
      status: 'pending',
      expiresAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Also update the order with pending USDC payment info
    await db.collection('orders').doc(orderId).update({
      paymentMethod: 'usdc',
      paymentStatus: 'pending',
      paymentProvider: 'x402',
      usdc: {
        paymentAddress: wallet.walletAddress,
        amountUsdc,
        intentId: intentRef.id,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`[USDC checkout] Intent created for order ${orderId}: $${amountUsdc} to ${wallet.walletAddress}`);

    return NextResponse.json({
      walletAddress: wallet.walletAddress,
      amountUsdc,
      qrCodeDataUrl,
      expiresAt: expiresAt.toISOString(),
      intentId: intentRef.id,
    });
  } catch (err) {
    logger.error(`[USDC checkout] Intent creation failed: ${String(err)}`);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
