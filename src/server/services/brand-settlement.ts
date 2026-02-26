/**
 * Brand Settlement Service
 *
 * When a dispensary fulfills an order containing a brand's products,
 * this service automatically routes USDC to the brand's wallet and
 * takes BakedBot's 2% settlement fee.
 *
 * Called non-blocking from fulfillOrder() via setImmediate().
 * Never throws — logs errors and continues.
 *
 * Revenue split:
 *   wholesale = item.wholesale ?? item.price * 0.55 (fallback: 55% of retail)
 *   brandRevenue = wholesale * qty
 *   bakedBotFee = brandRevenue * 0.02 (2%)
 *   brandReceives = brandRevenue - bakedBotFee
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendUSDC, getBakedBotWalletAddress, getOrgWallet } from '@/lib/x402/cdp-wallets';
import { FieldValue } from 'firebase-admin/firestore';
import {
  X402_SETTLEMENT_FEE_BPS,
  X402_WHOLESALE_FALLBACK_PCT,
} from '@/types/x402';
import type { BrandSettlement } from '@/types/x402';

// ============================================================================
// Types
// ============================================================================

interface OrderItem {
  productId?: string;
  name?: string;
  qty: number;
  price: number;
  category?: string;
  brandId?: string;
  brandOrgId?: string;
  wholesale?: number;
  settlementEligible?: boolean;
}

interface BrandGroup {
  brandOrgId: string;
  items: OrderItem[];
}

interface SplitCalc {
  brandRevenue: number;
  bakedBotFeeUsd: number;
  brandReceivesUsd: number;
}

// ============================================================================
// Settlement service
// ============================================================================

export class BrandSettlementService {
  /**
   * Settle an order: group items by brand, calculate splits, send USDC.
   * Non-blocking — called from setImmediate in fulfillOrder().
   */
  async settleOrder(orderId: string, dispensaryOrgId: string): Promise<void> {
    logger.info(`[settlement] Starting settlement for order ${orderId}, dispensary ${dispensaryOrgId}`);

    try {
      const db = getAdminFirestore();
      const orderDoc = await db.collection('orders').doc(orderId).get();

      if (!orderDoc.exists) {
        logger.warn(`[settlement] Order ${orderId} not found — skipping`);
        return;
      }

      const orderData = orderDoc.data()!;
      const items: OrderItem[] = orderData.items ?? [];

      // Only settle eligible items with a brandOrgId
      const eligibleItems = items.filter((item) => item.settlementEligible && item.brandOrgId);

      if (eligibleItems.length === 0) {
        logger.info(`[settlement] No settlement-eligible items in order ${orderId}`);
        return;
      }

      // Check dispensary has a USDC wallet
      const dispensaryWallet = await getOrgWallet(dispensaryOrgId);
      if (!dispensaryWallet) {
        logger.warn(`[settlement] Dispensary ${dispensaryOrgId} has no USDC wallet — skipping settlement`);
        return;
      }

      // Group items by brand
      const brandGroups = this.groupItemsByBrand(eligibleItems);

      // Settle each brand group
      for (const group of brandGroups) {
        await this.settleBrandGroup(group, dispensaryOrgId, dispensaryWallet.walletAddress, orderId);
      }

      logger.info(`[settlement] Settlement complete for order ${orderId}: ${brandGroups.length} brands settled`);
    } catch (err) {
      logger.error(`[settlement] Settlement failed for order ${orderId}: ${String(err)}`);
    }
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private groupItemsByBrand(items: OrderItem[]): BrandGroup[] {
    const groups = new Map<string, OrderItem[]>();

    for (const item of items) {
      if (!item.brandOrgId) continue;
      const existing = groups.get(item.brandOrgId) ?? [];
      existing.push(item);
      groups.set(item.brandOrgId, existing);
    }

    return Array.from(groups.entries()).map(([brandOrgId, groupItems]) => ({
      brandOrgId,
      items: groupItems,
    }));
  }

  private calculateSplit(items: OrderItem[]): SplitCalc {
    let brandRevenue = 0;

    for (const item of items) {
      const wholesale =
        item.wholesale ?? item.price * X402_WHOLESALE_FALLBACK_PCT;
      brandRevenue += wholesale * item.qty;
    }

    const feeBps = Number(process.env.X402_SETTLEMENT_FEE_BPS ?? X402_SETTLEMENT_FEE_BPS);
    const bakedBotFeeUsd = brandRevenue * (feeBps / 10_000);
    const brandReceivesUsd = brandRevenue - bakedBotFeeUsd;

    return { brandRevenue, bakedBotFeeUsd, brandReceivesUsd };
  }

  private async settleBrandGroup(
    group: BrandGroup,
    dispensaryOrgId: string,
    dispensaryWalletAddress: string,
    orderId: string,
  ): Promise<void> {
    const { brandOrgId, items } = group;
    const db = getAdminFirestore();

    // Look up brand's settlement wallet address
    const brandWalletDoc = await db.collection('x402_wallets').doc(brandOrgId).get();
    if (!brandWalletDoc.exists) {
      logger.warn(`[settlement] Brand ${brandOrgId} has no USDC wallet — skipping`);

      await db.collection('brand_settlements').add({
        orderId,
        dispensaryOrgId,
        brandOrgId,
        orderTotal: 0,
        brandRevenue: 0,
        bakedBotFeeUsd: 0,
        brandReceivesUsd: 0,
        dispensaryWalletAddress,
        brandWalletAddress: '',
        status: 'skipped',
        skipReason: 'no_wallet',
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const brandWalletData = brandWalletDoc.data()!;
    const brandWalletAddress: string = brandWalletData.walletAddress;

    // Calculate split
    const orderTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const { brandRevenue, bakedBotFeeUsd, brandReceivesUsd } = this.calculateSplit(items);

    logger.info(
      `[settlement] Brand ${brandOrgId}: revenue $${brandRevenue.toFixed(4)}, fee $${bakedBotFeeUsd.toFixed(4)}, net $${brandReceivesUsd.toFixed(4)}`,
    );

    // Skip if too small to settle (< $0.01)
    if (brandReceivesUsd < 0.01) {
      logger.info(`[settlement] Brand ${brandOrgId} amount too small ($${brandReceivesUsd}) — skipping`);

      await db.collection('brand_settlements').add({
        orderId,
        dispensaryOrgId,
        brandOrgId,
        orderTotal,
        brandRevenue,
        bakedBotFeeUsd,
        brandReceivesUsd,
        dispensaryWalletAddress,
        brandWalletAddress,
        status: 'skipped',
        skipReason: 'amount_too_small',
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // Create settlement record (pending)
    const settlementRef = await db.collection('brand_settlements').add({
      orderId,
      dispensaryOrgId,
      brandOrgId,
      orderTotal,
      brandRevenue,
      bakedBotFeeUsd,
      brandReceivesUsd,
      dispensaryWalletAddress,
      brandWalletAddress,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    try {
      // Transfer brand's share from dispensary wallet → brand wallet
      const brandTransfer = await sendUSDC({
        fromOrgId: dispensaryOrgId,
        toAddress: brandWalletAddress,
        amountUsd: brandReceivesUsd,
      });

      if (!brandTransfer.success) {
        throw new Error(brandTransfer.error ?? 'CDP transfer failed');
      }

      // Transfer BakedBot's fee from dispensary wallet → BakedBot wallet
      let feeTxHash: string | undefined;
      if (bakedBotFeeUsd >= 0.01) {
        const bakedBotAddress = getBakedBotWalletAddress();
        const feeTransfer = await sendUSDC({
          fromOrgId: dispensaryOrgId,
          toAddress: bakedBotAddress,
          amountUsd: bakedBotFeeUsd,
        });

        if (feeTransfer.success) {
          feeTxHash = feeTransfer.txHash;
        } else {
          logger.warn(`[settlement] BakedBot fee transfer failed (non-fatal): ${feeTransfer.error}`);
        }
      }

      // Mark settled
      await settlementRef.update({
        status: 'settled',
        txHash: brandTransfer.txHash,
        feeTxHash: feeTxHash ?? null,
        settledAt: FieldValue.serverTimestamp(),
      });

      logger.info(
        `[settlement] ✅ Settled brand ${brandOrgId}: $${brandReceivesUsd.toFixed(4)} → ${brandWalletAddress} (tx: ${brandTransfer.txHash})`,
      );
    } catch (err) {
      logger.error(`[settlement] Transfer failed for brand ${brandOrgId}: ${String(err)}`);

      await settlementRef.update({
        status: 'failed',
        failureReason: String(err),
      });
    }
  }

  /**
   * Get settlement history for an org (as dispensary or brand).
   */
  async getSettlementHistory(orgId: string, role: 'dispensary' | 'brand' = 'dispensary'): Promise<BrandSettlement[]> {
    try {
      const db = getAdminFirestore();
      const field = role === 'brand' ? 'brandOrgId' : 'dispensaryOrgId';

      const snap = await db
        .collection('brand_settlements')
        .where(field, '==', orgId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BrandSettlement);
    } catch (err) {
      logger.error(`[settlement] Failed to get history for org ${orgId}: ${String(err)}`);
      return [];
    }
  }
}
