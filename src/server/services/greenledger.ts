/**
 * GreenLedger Service — core business logic for GreenLedger Advance.
 *
 * Manages the full lifecycle:
 *   1. Brand creates / publishes offers
 *   2. Dispensary browses marketplace → initiates advance (creates escrow)
 *   3. Dispensary deposits USDC → advance activates
 *   4. Order settles → discount applied, escrow deducted
 *   5. Partner relationship ends → auto-refund or manual refund
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { createEscrowWallet, getEscrowBalance, refundEscrow } from '@/lib/x402/greenledger-escrow';
import { getOrgWallet } from '@/lib/x402/cdp-wallets';
import type {
  GreenLedgerOffer,
  GreenLedgerAdvance,
  GreenLedgerTransaction,
  AdvanceDiscountResult,
  BrandGreenLedgerSummary,
  DispensaryGreenLedgerSummary,
  MarketplaceOffer,
  AdvanceWithBrand,
  CreateOfferInput,
  OfferTier,
} from '@/types/greenledger';

const db = () => getAdminFirestore();

// ============================================================================
// Collection helpers
// ============================================================================

const offersCol = () => db().collection('greenledger_offers');
const advancesCol = () => db().collection('greenledger_advances');
const txCol = () => db().collection('greenledger_transactions');

function normalizeDescription(description: string): string {
  const normalized = description.trim();
  if (!normalized) throw new Error('Offer description is required');
  return normalized;
}

function normalizeEligibleOrgIds(eligibleOrgIds: string[] | undefined): string[] | undefined {
  if (eligibleOrgIds === undefined) return undefined;
  const normalized = Array.from(
    new Set(
      eligibleOrgIds
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
  return normalized;
}

function normalizePositiveUsd(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return roundUsd(numeric);
}

function normalizeOfferTiers(tiers: CreateOfferInput['tiers']): Omit<OfferTier, 'id'>[] {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw new Error('Offer must include at least one tier');
  }

  return tiers.map((tier, index) => {
    const minDepositUsd = Number(tier?.minDepositUsd);
    if (!Number.isFinite(minDepositUsd) || minDepositUsd <= 0) {
      throw new Error(`Tier ${index + 1}: minDepositUsd must be a positive number`);
    }

    const discountBps = Number(tier?.discountBps);
    if (!Number.isFinite(discountBps) || discountBps <= 0 || discountBps > 10000) {
      throw new Error(`Tier ${index + 1}: discountBps must be between 1 and 10000`);
    }

    const normalized: Omit<OfferTier, 'id'> = {
      minDepositUsd: roundUsd(minDepositUsd),
      discountBps: Math.round(discountBps),
    };

    if (tier?.durationDays !== undefined) {
      const durationDays = Number(tier.durationDays);
      if (!Number.isFinite(durationDays) || durationDays <= 0) {
        throw new Error(`Tier ${index + 1}: durationDays must be a positive number when provided`);
      }
      normalized.durationDays = Math.floor(durationDays);
    }

    return normalized;
  });
}

function normalizeExpiresAt(expiresAt: string | undefined): Date | undefined {
  if (expiresAt === undefined) return undefined;
  if (expiresAt.trim().length === 0) {
    throw new Error('expiresAt must be a valid ISO date string');
  }
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('expiresAt must be a valid ISO date string');
  }
  return parsed;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function isOfferExpired(offer: GreenLedgerOffer): boolean {
  if (!offer.expiresAt) return false;
  const expiresAt = (offer.expiresAt as unknown as { toDate?: () => Date }).toDate?.();
  return expiresAt instanceof Date ? expiresAt.getTime() < Date.now() : false;
}

async function isExistingVendorPartner(
  dispensaryOrgId: string,
  brandOrgId: string,
): Promise<boolean> {
  const partnerSnap = await db()
    .collection('tenants')
    .doc(dispensaryOrgId)
    .collection('vendor_brands')
    .where('brandOrgId', '==', brandOrgId)
    .limit(1)
    .get();

  return !partnerSnap.empty;
}

// ============================================================================
// Brand: offer management
// ============================================================================

export async function createOffer(
  brandOrgId: string,
  brandName: string,
  input: CreateOfferInput,
  brandLogoUrl?: string,
  brandPrimaryColor?: string,
): Promise<GreenLedgerOffer> {
  const description = normalizeDescription(input.description);
  const tiersInput = normalizeOfferTiers(input.tiers);
  const eligibleOrgIds = normalizeEligibleOrgIds(input.eligibleOrgIds);
  if (input.eligibility === 'specific' && (!eligibleOrgIds || eligibleOrgIds.length === 0)) {
    throw new Error('eligibleOrgIds is required when eligibility is specific');
  }
  const maxCommitmentsUsd = normalizePositiveUsd(input.maxCommitmentsUsd, 'maxCommitmentsUsd');
  const expiresAt = normalizeExpiresAt(input.expiresAt);

  const offerId = nanoid();
  const tiers: OfferTier[] = tiersInput.map((t) => ({ ...t, id: nanoid() }));

  const now = FieldValue.serverTimestamp();
  const doc: Omit<GreenLedgerOffer, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    id: offerId,
    brandOrgId,
    brandName,
    brandLogoUrl,
    brandPrimaryColor,
    description,
    tiers,
    eligibility: input.eligibility,
    eligibleOrgIds,
    maxCommitmentsUsd,
    currentCommitmentsUsd: 0,
    status: 'draft',
    expiresAt: expiresAt
      ? Timestamp.fromDate(expiresAt)
      : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await offersCol().doc(offerId).set(doc);
  logger.info(`[GreenLedger] Offer ${offerId} created for brand ${brandOrgId}`);

  return { ...doc, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as GreenLedgerOffer;
}

export async function updateOffer(
  offerId: string,
  brandOrgId: string,
  updates: Partial<CreateOfferInput>,
): Promise<void> {
  const ref = offersCol().doc(offerId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.brandOrgId !== brandOrgId) {
    throw new Error('Offer not found or access denied');
  }
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (updates.description !== undefined) patch.description = normalizeDescription(updates.description);
  if (updates.eligibility !== undefined) patch.eligibility = updates.eligibility;
  if (updates.eligibleOrgIds !== undefined) {
    patch.eligibleOrgIds = normalizeEligibleOrgIds(updates.eligibleOrgIds);
  }
  if (
    updates.eligibility === 'specific'
    && (!Array.isArray(patch.eligibleOrgIds) || patch.eligibleOrgIds.length === 0)
  ) {
    throw new Error('eligibleOrgIds is required when eligibility is specific');
  }
  if (updates.maxCommitmentsUsd !== undefined) {
    patch.maxCommitmentsUsd = normalizePositiveUsd(updates.maxCommitmentsUsd, 'maxCommitmentsUsd');
  }
  if (updates.expiresAt !== undefined) {
    patch.expiresAt = Timestamp.fromDate(normalizeExpiresAt(updates.expiresAt)!);
  }
  if (updates.tiers !== undefined) {
    patch.tiers = normalizeOfferTiers(updates.tiers).map((t) => ({ ...t, id: nanoid() }));
  }
  await ref.update(patch);
}

export async function publishOffer(offerId: string, brandOrgId: string): Promise<void> {
  const ref = offersCol().doc(offerId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.brandOrgId !== brandOrgId) {
    throw new Error('Offer not found or access denied');
  }
  await ref.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
  logger.info(`[GreenLedger] Offer ${offerId} published`);
}

export async function pauseOffer(offerId: string, brandOrgId: string): Promise<void> {
  const ref = offersCol().doc(offerId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.brandOrgId !== brandOrgId) {
    throw new Error('Offer not found or access denied');
  }
  await ref.update({ status: 'paused', updatedAt: FieldValue.serverTimestamp() });
}

export async function getBrandOffers(brandOrgId: string): Promise<GreenLedgerOffer[]> {
  const snap = await offersCol()
    .where('brandOrgId', '==', brandOrgId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => d.data() as GreenLedgerOffer);
}

export async function getBrandAdvances(brandOrgId: string): Promise<GreenLedgerAdvance[]> {
  const snap = await advancesCol()
    .where('brandOrgId', '==', brandOrgId)
    .where('status', 'in', ['active', 'pending_deposit', 'auto_refund_pending', 'refund_requested'])
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => d.data() as GreenLedgerAdvance);
}

export async function getBrandGreenLedgerSummary(
  brandOrgId: string,
): Promise<BrandGreenLedgerSummary> {
  const advances = await getBrandAdvances(brandOrgId);
  const activeAdvances = advances.filter((a) => a.status === 'active');

  // Paid out this month — query transactions
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const txSnap = await txCol()
    .where('brandOrgId', '==', brandOrgId)
    .where('type', '==', 'settlement_deduction')
    .where('createdAt', '>=', Timestamp.fromDate(monthStart))
    .get();
  const paidOutThisMonthUsd = txSnap.docs.reduce(
    (sum, d) => sum + ((d.data() as GreenLedgerTransaction).amountUsd ?? 0),
    0,
  );

  const totalCommittedUsd = activeAdvances.reduce((s, a) => s + a.remainingBalanceUsd, 0);
  const avgDepositUsd =
    activeAdvances.length > 0 ? totalCommittedUsd / activeAdvances.length : 0;

  return {
    totalCommittedUsd,
    activeAdvancesCount: activeAdvances.length,
    paidOutThisMonthUsd,
    avgDepositUsd,
    cashFlowImprovementDays: 28, // avg net-30 → immediate; can be made dynamic
  };
}

// ============================================================================
// Dispensary: marketplace + advance management
// ============================================================================

/**
 * Returns marketplace offers visible to a dispensary, merged with their
 * existing vendor_brands to flag existing partners.
 */
export async function getMarketplaceOffers(dispensaryOrgId: string): Promise<MarketplaceOffer[]> {
  // Load active offers (public + partners_only)
  const snap = await offersCol().where('status', '==', 'active').get();
  const allOffers = snap.docs.map((d) => d.data() as GreenLedgerOffer);

  // Load vendor brands to identify existing partners with brandOrgId set
  const vbSnap = await db()
    .collection('tenants')
    .doc(dispensaryOrgId)
    .collection('vendor_brands')
    .where('brandOrgId', '!=', null)
    .get();
  const partnerOrgIds = new Set(vbSnap.docs.map((d) => d.data().brandOrgId as string));

  // Load existing advances for this dispensary
  const advSnap = await advancesCol()
    .where('dispensaryOrgId', '==', dispensaryOrgId)
    .where('status', 'in', ['active', 'pending_deposit'])
    .get();
  const existingAdvances = new Map<string, GreenLedgerAdvance>();
  for (const d of advSnap.docs) {
    const adv = d.data() as GreenLedgerAdvance;
    existingAdvances.set(adv.brandOrgId, adv);
  }

  const results: MarketplaceOffer[] = [];

  for (const offer of allOffers) {
    const isPartner = partnerOrgIds.has(offer.brandOrgId);

    // Respect eligibility filter
    if (offer.eligibility === 'specific') {
      if (!(offer.eligibleOrgIds ?? []).includes(dispensaryOrgId)) continue;
    }
    // partners_only: only show if they carry this brand
    if (offer.eligibility === 'partners_only' && !isPartner) continue;

    // Check cap
    if (
      offer.maxCommitmentsUsd !== undefined &&
      offer.currentCommitmentsUsd >= offer.maxCommitmentsUsd
    ) {
      continue;
    }

    const existing = existingAdvances.get(offer.brandOrgId);

    results.push({
      ...offer,
      isExistingPartner: isPartner,
      existingAdvance: existing,
      estimatedAnnualSavingsUsd: undefined, // populated client-side from order velocity
    });
  }

  // Sort: existing partners first, then by discount (best tier max discountBps)
  results.sort((a, b) => {
    if (a.isExistingPartner && !b.isExistingPartner) return -1;
    if (!a.isExistingPartner && b.isExistingPartner) return 1;
    const maxA = Math.max(...a.tiers.map((t) => t.discountBps));
    const maxB = Math.max(...b.tiers.map((t) => t.discountBps));
    return maxB - maxA;
  });

  return results;
}

/**
 * Initiate an advance: create CDP escrow wallet, write pending_deposit doc.
 * Dispensary then sends USDC to the returned escrowWalletAddress.
 */
export async function initiateAdvance(
  dispensaryOrgId: string,
  offerId: string,
  tierId: string,
): Promise<GreenLedgerAdvance> {
  // Load offer
  const offerSnap = await offersCol().doc(offerId).get();
  if (!offerSnap.exists) throw new Error('Offer not found');
  const offer = offerSnap.data() as GreenLedgerOffer;

  if (offer.status !== 'active') throw new Error('Offer is not currently active');
  if (isOfferExpired(offer)) throw new Error('Offer has expired');

  const tier = offer.tiers.find((t) => t.id === tierId);
  if (!tier) throw new Error('Tier not found on offer');

  if (offer.eligibility === 'specific') {
    const allowList = offer.eligibleOrgIds ?? [];
    if (!allowList.includes(dispensaryOrgId)) {
      throw new Error('Offer is not available for this dispensary');
    }
  }

  if (offer.eligibility === 'partners_only') {
    const isPartner = await isExistingVendorPartner(dispensaryOrgId, offer.brandOrgId);
    if (!isPartner) {
      throw new Error('Offer is only available to existing brand partners');
    }
  }

  if (
    offer.maxCommitmentsUsd !== undefined
    && roundUsd(offer.currentCommitmentsUsd) >= roundUsd(offer.maxCommitmentsUsd)
  ) {
    throw new Error('Offer commitment cap reached');
  }

  // Check if advance already exists for this pair
  const existingSnap = await advancesCol()
    .where('brandOrgId', '==', offer.brandOrgId)
    .where('dispensaryOrgId', '==', dispensaryOrgId)
    .where('status', 'in', ['active', 'pending_deposit'])
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as GreenLedgerAdvance;
  }

  // Create CDP escrow wallet
  const { walletId, walletAddress } = await createEscrowWallet(
    offer.brandOrgId,
    dispensaryOrgId,
  );

  const advanceId = nanoid();
  const now = FieldValue.serverTimestamp();

  const expiresAt =
    tier.durationDays !== undefined
      ? Timestamp.fromDate(
          new Date(Date.now() + tier.durationDays * 24 * 60 * 60 * 1000),
        )
      : undefined;

  const doc: Omit<GreenLedgerAdvance, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    id: advanceId,
    brandOrgId: offer.brandOrgId,
    dispensaryOrgId,
    offerId,
    tierId,
    escrowWalletId: walletId,
    escrowWalletAddress: walletAddress,
    totalDepositedUsd: 0,
    remainingBalanceUsd: 0,
    totalSavedUsd: 0,
    discountBps: tier.discountBps,
    status: 'pending_deposit',
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  await advancesCol().doc(advanceId).set(doc);

  logger.info(
    `[GreenLedger] Advance ${advanceId} initiated: ${offer.brandOrgId}→${dispensaryOrgId} (escrow: ${walletAddress})`,
  );

  return { ...doc, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as GreenLedgerAdvance;
}

/**
 * Poll the escrow wallet balance to detect a deposit.
 * If balance >= minDepositUsd for the tier, activate the advance.
 * Returns true if newly activated.
 */
export async function checkAndActivateAdvance(
  advanceId: string,
  expectedDispensaryOrgId?: string,
): Promise<boolean> {
  const ref = advancesCol().doc(advanceId);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const advance = snap.data() as GreenLedgerAdvance;
  if (
    expectedDispensaryOrgId
    && advance.dispensaryOrgId !== expectedDispensaryOrgId
  ) {
    throw new Error('Access denied');
  }
  if (advance.status !== 'pending_deposit') return false;

  // Get the minimum deposit for this tier
  const offerSnap = await offersCol().doc(advance.offerId).get();
  if (!offerSnap.exists) {
    throw new Error('Offer not found');
  }
  const offer = offerSnap.data() as GreenLedgerOffer;
  if (offer.status !== 'active') {
    throw new Error('Offer is not currently active');
  }
  if (isOfferExpired(offer)) {
    throw new Error('Offer has expired');
  }
  const tier = offer.tiers.find((t) => t.id === advance.tierId);
  if (!tier) {
    throw new Error('Tier no longer available on offer');
  }
  const minDeposit = tier.minDepositUsd;

  // Check on-chain balance
  const balance = roundUsd(await getEscrowBalance(advance.escrowWalletId));
  if (balance < minDeposit) return false;

  const activated = await db().runTransaction(async (tx) => {
    const txAdvanceSnap = await tx.get(ref);
    if (!txAdvanceSnap.exists) return false;

    const txAdvance = txAdvanceSnap.data() as GreenLedgerAdvance;
    if (
      expectedDispensaryOrgId
      && txAdvance.dispensaryOrgId !== expectedDispensaryOrgId
    ) {
      throw new Error('Access denied');
    }
    if (txAdvance.status !== 'pending_deposit') return false;

    const offerRef = offersCol().doc(txAdvance.offerId);
    const txOfferSnap = await tx.get(offerRef);
    if (!txOfferSnap.exists) throw new Error('Offer not found');

    const txOffer = txOfferSnap.data() as GreenLedgerOffer;
    if (txOffer.status !== 'active' || isOfferExpired(txOffer)) {
      return false;
    }
    const txTier = txOffer.tiers.find((t) => t.id === txAdvance.tierId);
    if (!txTier) {
      return false;
    }
    const txMinDeposit = txTier.minDepositUsd;
    if (balance < txMinDeposit) return false;

    const currentCommitments = roundUsd(Number(txOffer.currentCommitmentsUsd ?? 0));
    if (
      txOffer.maxCommitmentsUsd !== undefined
      && roundUsd(currentCommitments + balance) > roundUsd(txOffer.maxCommitmentsUsd)
    ) {
      throw new Error('Offer commitment cap reached');
    }

    tx.update(ref, {
      status: 'active',
      totalDepositedUsd: balance,
      remainingBalanceUsd: balance,
      activatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(offerRef, {
      currentCommitmentsUsd: roundUsd(currentCommitments + balance),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const txId = nanoid();
    tx.set(txCol().doc(txId), {
      id: txId,
      advanceId,
      brandOrgId: txAdvance.brandOrgId,
      dispensaryOrgId: txAdvance.dispensaryOrgId,
      type: 'deposit',
      amountUsd: balance,
      createdAt: FieldValue.serverTimestamp(),
    });

    return true;
  });

  if (activated) {
    logger.info(`[GreenLedger] Advance ${advanceId} activated with $${balance} USDC`);
  }

  return activated;
}

export async function getMyAdvances(dispensaryOrgId: string): Promise<AdvanceWithBrand[]> {
  const snap = await advancesCol()
    .where('dispensaryOrgId', '==', dispensaryOrgId)
    .where('status', 'in', ['active', 'pending_deposit', 'auto_refund_pending', 'refund_requested'])
    .orderBy('createdAt', 'desc')
    .get();

  const advances = snap.docs.map((d) => d.data() as GreenLedgerAdvance);

  // Enrich with brand info from offers
  const offerIds = [...new Set(advances.map((a) => a.offerId))];
  const offerDocs = await Promise.all(offerIds.map((id) => offersCol().doc(id).get()));
  const offerMap = new Map<string, GreenLedgerOffer>();
  for (const d of offerDocs) {
    if (d.exists) offerMap.set(d.id, d.data() as GreenLedgerOffer);
  }

  return advances.map((adv) => {
    const offer = offerMap.get(adv.offerId);
    return {
      ...adv,
      brandName: offer?.brandName ?? 'Unknown Brand',
      brandLogoUrl: offer?.brandLogoUrl,
      brandPrimaryColor: offer?.brandPrimaryColor,
    };
  });
}

export async function getDispensaryGreenLedgerSummary(
  dispensaryOrgId: string,
): Promise<DispensaryGreenLedgerSummary> {
  const advances = await getMyAdvances(dispensaryOrgId);
  const activeAdvances = advances.filter((a) => a.status === 'active');

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const txSnap = await txCol()
    .where('dispensaryOrgId', '==', dispensaryOrgId)
    .where('type', '==', 'settlement_deduction')
    .where('createdAt', '>=', Timestamp.fromDate(monthStart))
    .get();
  const savedThisMonthUsd = txSnap.docs.reduce(
    (sum, d) => sum + ((d.data() as GreenLedgerTransaction).discountAppliedUsd ?? 0),
    0,
  );
  const savedAllTimeUsd = activeAdvances.reduce((s, a) => s + a.totalSavedUsd, 0);
  const avgDiscountPct =
    activeAdvances.length > 0
      ? activeAdvances.reduce((s, a) => s + a.discountBps, 0) / activeAdvances.length / 100
      : 0;

  return {
    totalCommittedUsd: activeAdvances.reduce((s, a) => s + a.remainingBalanceUsd, 0),
    activeAdvancesCount: activeAdvances.length,
    savedThisMonthUsd,
    savedAllTimeUsd,
    avgDiscountPct,
  };
}

// ============================================================================
// Refund management
// ============================================================================

export async function requestRefund(advanceId: string, dispensaryOrgId: string): Promise<void> {
  const ref = advancesCol().doc(advanceId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Advance not found');
  const advance = snap.data() as GreenLedgerAdvance;
  if (advance.dispensaryOrgId !== dispensaryOrgId) throw new Error('Access denied');
  if (!['active', 'auto_refund_pending'].includes(advance.status)) {
    throw new Error('Advance is not in a refundable state');
  }
  await ref.update({
    status: 'refund_requested',
    refundRequestedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info(`[GreenLedger] Refund requested for advance ${advanceId}`);
}

/**
 * Mark an advance for auto-refund (30-day grace) when vendor brand relationship ends.
 * Called from vendor_brands delete/unlink action.
 */
export async function scheduleAutoRefund(
  brandOrgId: string,
  dispensaryOrgId: string,
): Promise<void> {
  const snap = await advancesCol()
    .where('brandOrgId', '==', brandOrgId)
    .where('dispensaryOrgId', '==', dispensaryOrgId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snap.empty) return;

  const autoRefundAt = Timestamp.fromDate(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  await snap.docs[0].ref.update({
    status: 'auto_refund_pending',
    autoRefundAt,
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info(
    `[GreenLedger] Auto-refund scheduled for ${brandOrgId}→${dispensaryOrgId} at ${autoRefundAt.toDate().toISOString()}`,
  );
}

/**
 * Execute a refund — sends USDC back to dispensary's x402 wallet.
 * Called from a manual trigger or the daily auto-refund cron.
 */
export async function processRefund(advanceId: string): Promise<{
  success: boolean;
  txHash?: string;
  amountRefundedUsd: number;
}> {
  const ref = advancesCol().doc(advanceId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, amountRefundedUsd: 0 };
  const advance = snap.data() as GreenLedgerAdvance;
  if (!['refund_requested', 'auto_refund_pending', 'active'].includes(advance.status)) {
    logger.warn(
      `[GreenLedger] Refusing refund for advance ${advanceId} in status ${advance.status}`,
    );
    return { success: false, amountRefundedUsd: 0 };
  }

  // Get dispensary's x402 wallet for the refund destination
  const dispensaryWallet = await getOrgWallet(advance.dispensaryOrgId);
  if (!dispensaryWallet) {
    logger.error(`[GreenLedger] No x402 wallet for dispensary ${advance.dispensaryOrgId}`);
    return { success: false, amountRefundedUsd: 0 };
  }

  const result = await refundEscrow({
    walletId: advance.escrowWalletId,
    dispensaryWalletAddress: dispensaryWallet.walletAddress,
  });

  if (result.success) {
    await ref.update({
      status: 'refunded',
      remainingBalanceUsd: 0,
      refundedAt: FieldValue.serverTimestamp(),
      refundTxHash: result.txHash,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (result.amountRefundedUsd > 0) {
      await txCol().doc(nanoid()).set({
        id: nanoid(),
        advanceId,
        brandOrgId: advance.brandOrgId,
        dispensaryOrgId: advance.dispensaryOrgId,
        type: 'refund',
        amountUsd: result.amountRefundedUsd,
        txHash: result.txHash,
        createdAt: FieldValue.serverTimestamp(),
      });

      const offerRef = offersCol().doc(advance.offerId);
      await db().runTransaction(async (tx) => {
        const offerSnap = await tx.get(offerRef);
        if (!offerSnap.exists) return;
        const currentCommitments = roundUsd(Number(offerSnap.data()?.currentCommitmentsUsd ?? 0));
        tx.update(offerRef, {
          currentCommitmentsUsd: Math.max(0, roundUsd(currentCommitments - result.amountRefundedUsd)),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    }

    logger.info(`[GreenLedger] Advance ${advanceId} refunded: $${result.amountRefundedUsd}`);
  }

  return result;
}

// ============================================================================
// Settlement hook — called from brand-settlement.ts
// ============================================================================

/**
 * Calculate discount for a brand settlement and deduct from the advance balance.
 * Returns null if no active advance exists for this pair.
 *
 * Math:
 *   discountUsd      = wholesaleUsd × (discountBps / 10000)
 *   escrowDeduction  = wholesaleUsd - discountUsd
 *   (brand receives escrowDeduction - bakedBotFee, calculated by caller)
 */
export async function applyAdvanceToSettlement(
  dispensaryOrgId: string,
  brandOrgId: string,
  wholesaleUsd: number,
  orderId: string,
): Promise<AdvanceDiscountResult | null> {
  const roundedWholesaleUsd = roundUsd(wholesaleUsd);
  if (!Number.isFinite(roundedWholesaleUsd) || roundedWholesaleUsd <= 0) {
    return null;
  }

  const snap = await advancesCol()
    .where('brandOrgId', '==', brandOrgId)
    .where('dispensaryOrgId', '==', dispensaryOrgId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const ref = snap.docs[0].ref;
  const result = await db().runTransaction(async (tx) => {
    const advanceSnap = await tx.get(ref);
    if (!advanceSnap.exists) return null;

    const advance = advanceSnap.data() as GreenLedgerAdvance;
    if (advance.status !== 'active') return null;

    const discountUsd = roundUsd(roundedWholesaleUsd * (advance.discountBps / 10000));
    const escrowDeductionUsd = roundUsd(roundedWholesaleUsd - discountUsd);
    if (escrowDeductionUsd <= 0) return null;

    if (roundUsd(advance.remainingBalanceUsd) < escrowDeductionUsd) {
      return null;
    }

    const newBalance = Math.max(0, roundUsd(advance.remainingBalanceUsd - escrowDeductionUsd));
    tx.update(ref, {
      remainingBalanceUsd: newBalance,
      totalSavedUsd: FieldValue.increment(discountUsd),
      status: newBalance < 0.01 ? 'depleted' : advance.status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const offerRef = offersCol().doc(advance.offerId);
    const offerSnap = await tx.get(offerRef);
    if (offerSnap.exists) {
      const currentCommitments = roundUsd(Number(offerSnap.data()?.currentCommitmentsUsd ?? 0));
      tx.update(offerRef, {
        currentCommitmentsUsd: Math.max(0, roundUsd(currentCommitments - escrowDeductionUsd)),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const settlementTxId = nanoid();
    tx.set(txCol().doc(settlementTxId), {
      id: settlementTxId,
      advanceId: advance.id,
      brandOrgId,
      dispensaryOrgId,
      type: 'settlement_deduction',
      amountUsd: escrowDeductionUsd,
      discountAppliedUsd: discountUsd,
      orderId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      advanceId: advance.id,
      discountBps: advance.discountBps,
      discountUsd,
      escrowDeductionUsd,
    } as AdvanceDiscountResult;
  });

  if (result) {
    logger.info(
      `[GreenLedger] Applied advance ${result.advanceId} to order ${orderId}: discount ${result.discountUsd.toFixed(2)}, escrow deduction ${result.escrowDeductionUsd.toFixed(2)}`,
    );
  }

  return result;
}

// ============================================================================
// Cron: process due auto-refunds
// ============================================================================

export async function processAutoRefunds(): Promise<{ processed: number; failed: number }> {
  const now = Timestamp.now();
  const snap = await advancesCol()
    .where('status', '==', 'auto_refund_pending')
    .where('autoRefundAt', '<=', now)
    .get();

  let processed = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const result = await processRefund(doc.id);
    if (result.success) processed++;
    else failed++;
  }

  logger.info(`[GreenLedger] Auto-refund cron: ${processed} processed, ${failed} failed`);
  return { processed, failed };
}

