/**
 * GreenLedger Escrow — CDP per-pair wallet management.
 *
 * Each (brandOrgId, dispensaryOrgId) pair gets a dedicated CDP wallet
 * on Base mainnet. Coinbase server signer manages the private key.
 * BakedBot stores only walletId + address in Firestore (on the advance doc).
 *
 * Funds flow:
 *   deposit:    dispensary sends USDC to escrowWalletAddress (external)
 *   settlement: escrow → brand wallet (discounted amount, minus 2% BakedBot fee)
 *   refund:     escrow → dispensary's x402 wallet (full remaining balance)
 */

import { Wallet } from '@coinbase/coinbase-sdk';
import { Coinbase } from '@coinbase/coinbase-sdk';
import { logger } from '@/lib/logger';
import { ensureCoinbaseInitialized } from './cdp-wallets';

const NETWORK_ID = Coinbase.networks.BaseMainnet;
const USDC_ASSET = Coinbase.assets.Usdc;

// ============================================================================
// Wallet creation
// ============================================================================

/**
 * Create a new CDP escrow wallet for a brand × dispensary pair.
 * Returns walletId + walletAddress to be stored on the advance doc.
 */
export async function createEscrowWallet(
  brandOrgId: string,
  dispensaryOrgId: string,
): Promise<{ walletId: string; walletAddress: string }> {
  ensureCoinbaseInitialized();

  logger.info(`[GreenLedger] Creating escrow wallet for ${brandOrgId}→${dispensaryOrgId}`);

  const wallet = await Wallet.create({ networkId: NETWORK_ID });
  const defaultAddress = await wallet.getDefaultAddress();
  const walletAddress = defaultAddress.getId() as string;
  const walletId = wallet.getId() as string;

  logger.info(`[GreenLedger] Escrow wallet created: ${walletAddress}`);

  return { walletId, walletAddress };
}

// ============================================================================
// Balance query
// ============================================================================

/**
 * Query on-chain USDC balance for an escrow wallet.
 * Returns 0 on any error — callers should treat 0 as "unknown / not yet funded".
 */
export async function getEscrowBalance(walletId: string): Promise<number> {
  ensureCoinbaseInitialized();

  try {
    const wallet = await Wallet.fetch(walletId);
    const balance = await wallet.getBalance(USDC_ASSET);
    return Number(balance.toString());
  } catch (err) {
    logger.error(`[GreenLedger] Failed to get escrow balance for ${walletId}: ${String(err)}`);
    return 0;
  }
}

// ============================================================================
// Settlement release — escrow → brand wallet
// ============================================================================

/**
 * Release USDC from escrow to brand wallet on order settlement.
 *
 * Math (caller pre-computes, we just execute):
 *   escrowDeductionUsd = wholesale × (1 - discountBps/10000)
 *   brandAmountUsd     = escrowDeductionUsd - bakedBotFeeUsd
 *   bakedBotFeeUsd     = wholesale × 0.02
 *
 * We send brandAmountUsd to brandWallet and bakedBotFeeUsd to BakedBot wallet.
 * Returns txHashes for both transfers.
 */
export async function releaseFromEscrow(params: {
  walletId: string;
  brandWalletAddress: string;
  bakedBotWalletAddress: string;
  brandAmountUsd: number;
  bakedBotFeeUsd: number;
}): Promise<{
  success: boolean;
  brandTxHash?: string;
  bakedBotTxHash?: string;
  error?: string;
}> {
  ensureCoinbaseInitialized();

  const { walletId, brandWalletAddress, bakedBotWalletAddress, brandAmountUsd, bakedBotFeeUsd } =
    params;

  try {
    const wallet = await Wallet.fetch(walletId);

    // Send to brand first
    const brandTransfer = await wallet.createTransfer({
      amount: brandAmountUsd,
      assetId: USDC_ASSET,
      destination: brandWalletAddress,
    });
    await brandTransfer.wait({ timeoutSeconds: 60, intervalSeconds: 2 });
    const brandTxHash = brandTransfer.getTransactionHash() ?? undefined;

    logger.info(`[GreenLedger] Released $${brandAmountUsd} to brand ${brandWalletAddress} (tx: ${brandTxHash})`);

    // Send BakedBot fee
    let bakedBotTxHash: string | undefined;
    if (bakedBotFeeUsd > 0.001) {
      const feeTransfer = await wallet.createTransfer({
        amount: bakedBotFeeUsd,
        assetId: USDC_ASSET,
        destination: bakedBotWalletAddress,
      });
      await feeTransfer.wait({ timeoutSeconds: 60, intervalSeconds: 2 });
      bakedBotTxHash = feeTransfer.getTransactionHash() ?? undefined;
    }

    return { success: true, brandTxHash, bakedBotTxHash };
  } catch (err) {
    const msg = String(err);
    logger.error(`[GreenLedger] Release failed from escrow ${walletId}: ${msg}`);
    return { success: false, error: msg };
  }
}

// ============================================================================
// Refund — escrow → dispensary wallet
// ============================================================================

/**
 * Return all remaining USDC from escrow back to the dispensary's wallet.
 * Used for manual refund requests and auto-refund after partner relationship ends.
 */
export async function refundEscrow(params: {
  walletId: string;
  dispensaryWalletAddress: string;
}): Promise<{
  success: boolean;
  txHash?: string;
  amountRefundedUsd: number;
  error?: string;
}> {
  ensureCoinbaseInitialized();

  const { walletId, dispensaryWalletAddress } = params;

  try {
    const wallet = await Wallet.fetch(walletId);
    const balance = await wallet.getBalance(USDC_ASSET);
    const amountRefundedUsd = Number(balance.toString());

    if (amountRefundedUsd < 0.01) {
      return { success: true, amountRefundedUsd: 0 };
    }

    const transfer = await wallet.createTransfer({
      amount: amountRefundedUsd,
      assetId: USDC_ASSET,
      destination: dispensaryWalletAddress,
    });
    await transfer.wait({ timeoutSeconds: 60, intervalSeconds: 2 });
    const txHash = transfer.getTransactionHash() ?? undefined;

    logger.info(
      `[GreenLedger] Refunded $${amountRefundedUsd} from escrow ${walletId} → ${dispensaryWalletAddress} (tx: ${txHash})`,
    );

    return { success: true, txHash, amountRefundedUsd };
  } catch (err) {
    const msg = String(err);
    logger.error(`[GreenLedger] Refund failed for escrow ${walletId}: ${msg}`);
    return { success: false, amountRefundedUsd: 0, error: msg };
  }
}
