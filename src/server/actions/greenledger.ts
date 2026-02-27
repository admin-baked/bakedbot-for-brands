'use server';

import { requireUser } from '@/server/auth/auth';
import {
  createOffer,
  updateOffer,
  publishOffer,
  pauseOffer,
  getBrandOffers,
  getBrandAdvances,
  getBrandGreenLedgerSummary,
  getMarketplaceOffers,
  initiateAdvance,
  checkAndActivateAdvance,
  getMyAdvances,
  getDispensaryGreenLedgerSummary,
  requestRefund,
  processRefund,
} from '@/server/services/greenledger';
import type { CreateOfferInput, InitiateAdvanceInput } from '@/types/greenledger';
import { getAdminFirestore } from '@/firebase/admin';

// ============================================================================
// Shared: resolve org info
// ============================================================================

async function getOrgName(orgId: string): Promise<{ name: string; logoUrl?: string; primaryColor?: string }> {
  try {
    const db = getAdminFirestore();
    // Try brands collection first
    const brandSnap = await db.collection('brands').where('originalBrandId', '==', orgId).limit(1).get();
    if (!brandSnap.empty) {
      const data = brandSnap.docs[0].data();
      return {
        name: data.name ?? data.brandName ?? orgId,
        logoUrl: data.logoUrl ?? data.visualIdentity?.logoUrl,
        primaryColor: data.primaryColor ?? data.visualIdentity?.colors?.primary,
      };
    }
    // Try organizations collection
    const orgSnap = await db.collection('organizations').doc(orgId).get();
    if (orgSnap.exists) {
      const data = orgSnap.data()!;
      return { name: data.name ?? orgId };
    }
  } catch {
    // Ignore — use orgId as fallback
  }
  return { name: orgId };
}

// ============================================================================
// Brand actions
// ============================================================================

export async function createOfferAction(input: CreateOfferInput): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof createOffer>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const brandInfo = await getOrgName(orgId);
    const offer = await createOffer(
      orgId,
      brandInfo.name,
      input,
      brandInfo.logoUrl,
      brandInfo.primaryColor,
    );
    return { success: true, data: offer };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateOfferAction(
  offerId: string,
  updates: Partial<CreateOfferInput>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    await updateOffer(offerId, orgId, updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function publishOfferAction(offerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    await publishOffer(offerId, orgId);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function pauseOfferAction(offerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    await pauseOffer(offerId, orgId);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getBrandOffersAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getBrandOffers>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const offers = await getBrandOffers(orgId);
    return { success: true, data: offers };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getBrandAdvancesAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getBrandAdvances>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const advances = await getBrandAdvances(orgId);
    return { success: true, data: advances };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getBrandGreenLedgerSummaryAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getBrandGreenLedgerSummary>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['brand_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const summary = await getBrandGreenLedgerSummary(orgId);
    return { success: true, data: summary };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Dispensary actions
// ============================================================================

export async function getMarketplaceOffersAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getMarketplaceOffers>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['dispensary_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const offers = await getMarketplaceOffers(orgId);
    return { success: true, data: offers };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function initiateAdvanceAction(input: InitiateAdvanceInput): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof initiateAdvance>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['dispensary_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const advance = await initiateAdvance(orgId, input.offerId, input.tierId);
    return { success: true, data: advance };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function checkAdvanceDepositAction(advanceId: string): Promise<{
  success: boolean;
  activated?: boolean;
  error?: string;
}> {
  try {
    const user = await requireUser(['dispensary_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const activated = await checkAndActivateAdvance(advanceId, orgId);
    return { success: true, activated };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getMyAdvancesAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getMyAdvances>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['dispensary_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const advances = await getMyAdvances(orgId);
    return { success: true, data: advances };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getDispensaryGreenLedgerSummaryAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getDispensaryGreenLedgerSummary>>;
  error?: string;
}> {
  try {
    const user = await requireUser(['dispensary_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    const summary = await getDispensaryGreenLedgerSummary(orgId);
    return { success: true, data: summary };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function requestRefundAction(advanceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser(['dispensary_admin', 'super_user']);
    const orgId = user.currentOrgId ?? user.orgId;
    if (!orgId) return { success: false, error: 'No org context' };

    await requestRefund(advanceId, orgId);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function processRefundAction(advanceId: string): Promise<{
  success: boolean;
  txHash?: string;
  amountRefundedUsd?: number;
  error?: string;
}> {
  try {
    await requireUser(['super_user']); // Super user only
    const result = await processRefund(advanceId);
    return { success: result.success, txHash: result.txHash, amountRefundedUsd: result.amountRefundedUsd };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
