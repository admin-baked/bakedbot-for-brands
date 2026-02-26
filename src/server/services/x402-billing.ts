/**
 * x402 Billing Service
 *
 * Manages the USDC credit balance model for BakedBot platform billing.
 * Orgs deposit USDC to their CDP wallet → balance credited in Firestore
 * → deducted per agent API call.
 *
 * This is an internal credit system (Firestore balance tracking), NOT the
 * x402 HTTP handshake protocol. The HTTP handshake is used for external
 * agentic access via withX402() wrappers.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
  getOrgWallet,
  getOrCreateOrgWallet,
  deductOrgBalance,
  refreshWalletBalance,
} from '@/lib/x402/cdp-wallets';
import { X402_ROUTE_PRICING } from '@/types/x402';
import { FieldValue } from 'firebase-admin/firestore';
import QRCode from 'qrcode';
import type { X402Usage, X402Wallet } from '@/types/x402';

// ============================================================================
// Balance checks
// ============================================================================

/**
 * Check if org has sufficient USDC balance for a route call.
 * Returns the balance, required amount, and wallet address.
 */
export async function checkOrgBalance(
  orgId: string,
  routePath: string,
): Promise<{
  hasBalance: boolean;
  balance: number;
  required: number;
  walletAddress?: string;
}> {
  try {
    const wallet = await getOrgWallet(orgId);
    const required = X402_ROUTE_PRICING[routePath] ?? 0.001;

    if (!wallet) {
      return { hasBalance: false, balance: 0, required };
    }

    const hasBalance = wallet.usdcBalanceUsd >= required;
    return {
      hasBalance,
      balance: wallet.usdcBalanceUsd,
      required,
      walletAddress: wallet.walletAddress,
    };
  } catch (err) {
    logger.error(`[x402-billing] Balance check failed for org ${orgId}: ${String(err)}`);
    return { hasBalance: false, balance: 0, required: 0.001 };
  }
}

/**
 * Check if org has an active ARB subscription (bypasses x402 gate).
 */
export async function hasActiveSubscription(orgId: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const tenantDoc = await db.collection('tenants').doc(orgId).get();
    if (!tenantDoc.exists) return false;
    const data = tenantDoc.data();
    // Active subscription = plan exists and not cancelled
    return (
      !!data?.planId && !!data?.subscriptionId && data?.subscriptionStatus !== 'cancelled'
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Usage deduction
// ============================================================================

/**
 * Deduct USDC usage from org balance and record to Firestore.
 */
export async function deductUsage(params: {
  orgId: string;
  route: string;
  agentId?: string;
  amountUsd: number;
}): Promise<{ success: boolean; error?: string }> {
  const { orgId, route, agentId, amountUsd } = params;

  try {
    const db = getAdminFirestore();

    // Deduct from Firestore balance
    await deductOrgBalance(orgId, amountUsd);

    // Record usage
    await db.collection('x402_usage').add({
      orgId,
      route,
      agentId: agentId ?? null,
      amountUsd,
      status: 'confirmed',
      txHash: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info(`[x402-billing] Deducted $${amountUsd} from org ${orgId} for ${route}`);
    return { success: true };
  } catch (err) {
    logger.error(`[x402-billing] Deduction failed for org ${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Usage history
// ============================================================================

/**
 * Get usage history for an org (most recent first).
 */
export async function getUsageHistory(orgId: string, limit = 50): Promise<X402Usage[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('x402_usage')
      .where('orgId', '==', orgId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as X402Usage);
  } catch (err) {
    logger.error(
      `[x402-billing] Failed to get usage history for org ${orgId}: ${String(err)}`,
    );
    return [];
  }
}

// ============================================================================
// Wallet / funding
// ============================================================================

/**
 * Return wallet info + QR code data URL for funding instructions.
 * Creates the wallet if it doesn't exist yet.
 */
export async function getFundingInstructions(orgId: string): Promise<{
  walletAddress: string;
  qrCodeDataUrl: string;
  usdcBalanceUsd: number;
}> {
  const wallet = await getOrCreateOrgWallet(orgId);

  // EIP-681 format: ethereum:<address>@<chainId>
  // Chain 8453 = Base mainnet
  const qrPayload = `ethereum:${wallet.walletAddress}@8453`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 2 });

  return {
    walletAddress: wallet.walletAddress,
    qrCodeDataUrl,
    usdcBalanceUsd: wallet.usdcBalanceUsd,
  };
}

/**
 * Refresh the on-chain USDC balance for an org's wallet.
 */
export async function refreshBalance(orgId: string): Promise<number> {
  return refreshWalletBalance(orgId);
}

/**
 * Get wallet info for an org (creates if missing).
 */
export async function getWalletInfo(orgId: string): Promise<X402Wallet> {
  return getOrCreateOrgWallet(orgId);
}
