/**
 * CDP Wallet Management — Coinbase Developer Platform
 *
 * Creates and manages server-side USDC wallets (Base mainnet) per org.
 * BakedBot controls these wallets — orgs deposit USDC to their assigned address.
 *
 * Wallet data (seed) is managed by Coinbase CDP server signer — BakedBot
 * only stores walletId + address in Firestore. No private keys on our servers.
 */

import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import type { X402Wallet } from '@/types/x402';

// ============================================================================
// SDK initialization (lazy singleton)
// ============================================================================

let _coinbaseInitialized = false;

export function ensureCoinbaseInitialized(): void {
  if (_coinbaseInitialized) return;

  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!apiKeyName || !privateKey) {
    throw new Error('[CDP] Missing CDP_API_KEY_NAME or CDP_API_KEY_PRIVATE_KEY env vars');
  }

  // CDP uses server signer — no seed/private key stored locally
  Coinbase.configure({
    apiKeyName,
    privateKey: privateKey.replace(/\\n/g, '\n'), // handle escaped newlines in env var
    useServerSigner: true,
  });

  _coinbaseInitialized = true;
  logger.info('[CDP] Coinbase SDK initialized (server signer mode)');
}

// ============================================================================
// Network config
// ============================================================================

const NETWORK_ID = Coinbase.networks.BaseMainnet; // 'base-mainnet'
const USDC_ASSET = Coinbase.assets.Usdc;

// ============================================================================
// Firestore collection
// ============================================================================

function walletsCollection() {
  return getAdminFirestore().collection('x402_wallets');
}

// ============================================================================
// Core wallet operations
// ============================================================================

/**
 * Get an existing org wallet from Firestore (does NOT create).
 */
export async function getOrgWallet(orgId: string): Promise<X402Wallet | null> {
  try {
    const doc = await walletsCollection().doc(orgId).get();
    if (!doc.exists) return null;
    return doc.data() as X402Wallet;
  } catch (err) {
    logger.error(`[CDP] Failed to get wallet for org ${orgId}: ${String(err)}`);
    return null;
  }
}

/**
 * Create a new CDP wallet for an org and persist to Firestore.
 * CDP server signer manages the seed — we store only walletId + address.
 */
export async function createOrgWallet(orgId: string): Promise<X402Wallet> {
  ensureCoinbaseInitialized();

  logger.info(`[CDP] Creating wallet for org: ${orgId}`);

  const wallet = await Wallet.create({ networkId: NETWORK_ID });
  const defaultAddress = await wallet.getDefaultAddress();
  const walletAddress = defaultAddress.getId() as string;
  const walletId = wallet.getId() as string;

  const now = FieldValue.serverTimestamp();
  const walletDoc: Omit<X402Wallet, 'balanceUpdatedAt' | 'createdAt' | 'updatedAt'> & {
    balanceUpdatedAt: unknown;
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    orgId,
    walletId,
    walletAddress,
    usdcBalanceUsd: 0,
    totalSpentUsd: 0,
    totalDepositedUsd: 0,
    balanceUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await walletsCollection().doc(orgId).set(walletDoc);

  logger.info(`[CDP] Wallet created for org ${orgId}: ${walletAddress}`);

  // Return with dates approximated (FieldValue resolves async)
  return {
    ...walletDoc,
    usdcBalanceUsd: 0,
    totalSpentUsd: 0,
    totalDepositedUsd: 0,
    balanceUpdatedAt: null as unknown as import('firebase-admin/firestore').Timestamp,
    createdAt: null as unknown as import('firebase-admin/firestore').Timestamp,
    updatedAt: null as unknown as import('firebase-admin/firestore').Timestamp,
  };
}

/**
 * Get or create a CDP wallet for an org.
 * Safe to call multiple times — idempotent.
 */
export async function getOrCreateOrgWallet(orgId: string): Promise<X402Wallet> {
  const existing = await getOrgWallet(orgId);
  if (existing) return existing;
  return createOrgWallet(orgId);
}

/**
 * Re-load a CDP wallet from Firestore walletId for signing operations.
 * Required before calling createTransfer.
 */
async function loadWallet(orgId: string): Promise<Wallet> {
  ensureCoinbaseInitialized();

  const walletMeta = await getOrgWallet(orgId);
  if (!walletMeta) {
    throw new Error(`[CDP] No wallet found for org ${orgId}`);
  }

  // With server signer, Wallet.fetch re-loads from CDP and is ready to sign
  return Wallet.fetch(walletMeta.walletId);
}

/**
 * Query on-chain USDC balance for an org's wallet and update Firestore.
 */
export async function refreshWalletBalance(orgId: string): Promise<number> {
  ensureCoinbaseInitialized();

  try {
    const wallet = await loadWallet(orgId);
    const balance = await wallet.getBalance(USDC_ASSET);
    const balanceUsd = Number(balance.toString());

    await walletsCollection().doc(orgId).update({
      usdcBalanceUsd: balanceUsd,
      balanceUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`[CDP] Balance refreshed for org ${orgId}: $${balanceUsd} USDC`);
    return balanceUsd;
  } catch (err) {
    logger.error(`[CDP] Failed to refresh balance for org ${orgId}: ${String(err)}`);
    return 0;
  }
}

/**
 * Send USDC from an org's CDP wallet to any destination address.
 * Returns the transaction hash on success.
 */
export async function sendUSDC(params: {
  fromOrgId: string;
  toAddress: string;
  amountUsd: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  ensureCoinbaseInitialized();

  const { fromOrgId, toAddress, amountUsd } = params;

  try {
    const wallet = await loadWallet(fromOrgId);

    logger.info(`[CDP] Sending $${amountUsd} USDC from org ${fromOrgId} to ${toAddress}`);

    const transfer = await wallet.createTransfer({
      amount: amountUsd,
      assetId: USDC_ASSET,
      destination: toAddress,
    });

    // Wait for transfer to land on-chain (up to 60s)
    await transfer.wait({ timeoutSeconds: 60, intervalSeconds: 2 });

    const txHash = transfer.getTransactionHash() ?? undefined;

    logger.info(`[CDP] Transfer complete: $${amountUsd} → ${toAddress} (tx: ${txHash})`);

    return { success: true, txHash };
  } catch (err) {
    const msg = String(err);
    logger.error(`[CDP] Transfer failed from org ${fromOrgId}: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send USDC from BakedBot's main wallet to a destination.
 * Used for settlement fee collection — BakedBot receives its 2% cut here.
 * The main wallet address is configured via X402_BAKEDBOT_WALLET_ADDRESS env var.
 */
export function getBakedBotWalletAddress(): string {
  const addr = process.env.X402_BAKEDBOT_WALLET_ADDRESS;
  if (!addr) throw new Error('[CDP] X402_BAKEDBOT_WALLET_ADDRESS not configured');
  return addr;
}

/**
 * Credit Firestore USDC balance for an org (after deposit detected on-chain).
 */
export async function creditOrgBalance(orgId: string, amountUsd: number): Promise<void> {
  await walletsCollection().doc(orgId).update({
    usdcBalanceUsd: FieldValue.increment(amountUsd),
    totalDepositedUsd: FieldValue.increment(amountUsd),
    balanceUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Deduct from Firestore USDC balance for an org (per-call billing).
 * Does NOT trigger an on-chain transaction — runs as internal credit.
 */
export async function deductOrgBalance(orgId: string, amountUsd: number): Promise<void> {
  await walletsCollection().doc(orgId).update({
    usdcBalanceUsd: FieldValue.increment(-amountUsd),
    totalSpentUsd: FieldValue.increment(amountUsd),
    balanceUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
