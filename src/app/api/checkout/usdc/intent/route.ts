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
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { z } from 'zod';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const usdcIntentSchema = z.object({
  orderId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid orderId'),
  orgId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid orgId').optional(),
}).strict();

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

function isClosedPaymentStatus(status: unknown): boolean {
  return status === 'paid' || status === 'refunded' || status === 'voided';
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, orgId: requestedOrgId } = usdcIntentSchema.parse(await req.json());

    const db = getAdminFirestore();

    // Verify order exists and get total
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

    if (isClosedPaymentStatus(orderData.paymentStatus)) {
      return NextResponse.json({ error: 'Order has already been paid or closed' }, { status: 409 });
    }

    const orderOrgId = orderData?.orgId || orderData?.organizationId || orderData?.brandId;
    if (!orderOrgId || !DOCUMENT_ID_REGEX.test(orderOrgId)) {
      return NextResponse.json({ error: 'Order organization is invalid' }, { status: 400 });
    }

    if (requestedOrgId && requestedOrgId !== orderOrgId) {
      return NextResponse.json({ error: 'Organization mismatch for order' }, { status: 403 });
    }

    const amountUsdc = orderData.totals?.total ?? orderData.total ?? 0;

    if (amountUsdc <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    // Reuse active intent for idempotency to avoid intent spam/rebinding.
    const existingUsdc = orderData?.usdc;
    const existingIntentId = typeof existingUsdc?.intentId === 'string' ? existingUsdc.intentId : null;
    const existingPaymentAddress =
      typeof existingUsdc?.paymentAddress === 'string' ? existingUsdc.paymentAddress : null;
    const existingAmountUsdc = Number(existingUsdc?.amountUsdc);
    const existingExpiresAt = asDate(existingUsdc?.expiresAt);

    if (
      existingIntentId &&
      DOCUMENT_ID_REGEX.test(existingIntentId) &&
      existingPaymentAddress &&
      Number.isFinite(existingAmountUsdc) &&
      Math.abs(existingAmountUsdc - amountUsdc) < 0.01 &&
      existingExpiresAt &&
      existingExpiresAt.getTime() > Date.now()
    ) {
      const existingIntentSnap = await db.collection('x402_deposits').doc(existingIntentId).get();
      if (existingIntentSnap.exists) {
        const existingIntentData = existingIntentSnap.data() || {};
        const existingIntentStatus = typeof existingIntentData.status === 'string' ? existingIntentData.status : 'pending';
        const existingIntentOrderId =
          typeof existingIntentData.orderId === 'string' ? existingIntentData.orderId : null;
        const existingIntentOrgId =
          typeof existingIntentData.orgId === 'string' ? existingIntentData.orgId : null;
        const existingIntentWallet =
          typeof existingIntentData.walletAddress === 'string' ? existingIntentData.walletAddress : null;

        if (
          existingIntentStatus === 'pending' &&
          existingIntentOrderId === orderId &&
          existingIntentOrgId === orderOrgId &&
          existingIntentWallet === existingPaymentAddress
        ) {
          const qrPayload = `ethereum:${existingPaymentAddress}@8453/transfer?value=${Math.round(amountUsdc * 1e6)}`;
          const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 2 });

          return NextResponse.json({
            walletAddress: existingPaymentAddress,
            amountUsdc,
            qrCodeDataUrl,
            expiresAt: existingExpiresAt.toISOString(),
            intentId: existingIntentId,
            reused: true,
          });
        }
      }
    }

    // Get or create dispensary's USDC wallet
    const wallet = await getOrCreateOrgWallet(orderOrgId);
    const balanceAtIntentUsdc = Number(wallet.usdcBalanceUsd || 0);

    // QR code: EIP-681 with USDC amount hint
    const qrPayload = `ethereum:${wallet.walletAddress}@8453/transfer?value=${Math.round(amountUsdc * 1e6)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 2 });

    const expiresAt = new Date(Date.now() + USDC_CHECKOUT_EXPIRY_MINUTES * 60 * 1000);

    // Record payment intent in Firestore
    const intentRef = db.collection('x402_deposits').doc();
    await intentRef.set({
      orderId,
      orgId: orderOrgId,
      walletAddress: wallet.walletAddress,
      amountUsdc,
      balanceAtIntentUsdc,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
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
        balanceAtIntentUsdc,
        expiresAt: expiresAt.toISOString(),
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
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Invalid request payload' }, { status: 400 });
    }
    logger.error(`[USDC checkout] Intent creation failed: ${String(err)}`);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
