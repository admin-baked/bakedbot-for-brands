'use server';

/**
 * x402 Server Actions
 *
 * Dashboard actions for USDC billing settings:
 * - Get wallet info + balance
 * - Get funding instructions (QR code + address)
 * - Get usage history
 * - Refresh on-chain balance
 */

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  getFundingInstructions,
  getUsageHistory,
  refreshBalance,
  getWalletInfo,
} from '@/server/services/x402-billing';
import type { X402Wallet, X402Usage } from '@/types/x402';

// ============================================================================
// Wallet
// ============================================================================

/**
 * Get or create the USDC wallet for the current user's org.
 */
export async function getX402WalletAction(): Promise<{
  success: boolean;
  data?: X402Wallet;
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary', 'brand']);
    const orgId = (user as any).currentOrgId || (user as any).orgId || (user as any).brandId || (user as any).locationId;

    if (!orgId) {
      return { success: false, error: 'No org ID found for user' };
    }

    const wallet = await getWalletInfo(orgId);
    return { success: true, data: wallet };
  } catch (err) {
    logger.error(`[x402-actions] getX402WalletAction failed: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Refresh the on-chain USDC balance for the current user's org wallet.
 */
export async function refreshX402BalanceAction(): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary', 'brand']);
    const orgId = (user as any).currentOrgId || (user as any).orgId || (user as any).brandId || (user as any).locationId;

    if (!orgId) {
      return { success: false, error: 'No org ID found for user' };
    }

    const balance = await refreshBalance(orgId);
    return { success: true, balance };
  } catch (err) {
    logger.error(`[x402-actions] refreshX402BalanceAction failed: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Funding
// ============================================================================

/**
 * Get funding instructions (wallet address + QR code) for depositing USDC.
 */
export async function fundX402WalletAction(): Promise<{
  success: boolean;
  data?: { walletAddress: string; qrCodeDataUrl: string; usdcBalanceUsd: number };
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary', 'brand']);
    const orgId = (user as any).currentOrgId || (user as any).orgId || (user as any).brandId || (user as any).locationId;

    if (!orgId) {
      return { success: false, error: 'No org ID found for user' };
    }

    const instructions = await getFundingInstructions(orgId);
    return { success: true, data: instructions };
  } catch (err) {
    logger.error(`[x402-actions] fundX402WalletAction failed: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Usage history
// ============================================================================

/**
 * Get USDC usage history for the current user's org.
 */
export async function getX402UsageAction(limit = 50): Promise<{
  success: boolean;
  data?: X402Usage[];
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary', 'brand']);
    const orgId = (user as any).currentOrgId || (user as any).orgId || (user as any).brandId || (user as any).locationId;

    if (!orgId) {
      return { success: false, error: 'No org ID found for user' };
    }

    const usage = await getUsageHistory(orgId, limit);
    return { success: true, data: usage };
  } catch (err) {
    logger.error(`[x402-actions] getX402UsageAction failed: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}
