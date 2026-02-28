'use server';

import { TIERS, type TierId } from '@/config/tiers';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import {
  createCustomerProfile,
  createSubscriptionFromProfile,
  cancelARBSubscription,
  updateARBSubscription,
} from '@/lib/payments/authorize-net';
import { validatePromoCode } from './promos';
import { assignTierPlaybooks } from './playbooks';
import { emitEvent } from '@/server/events/emitter';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

// Input validation schema
const CreateSubscriptionSchema = z.object({
  orgId: z.string().min(1, 'Organization ID required'),
  tierId: z.enum(['pro', 'growth', 'empire'] as const, { message: 'Invalid tier' }),
  opaqueData: z.object({
    dataDescriptor: z.string().trim().min(1).max(120),
    dataValue: z.string().trim().min(1),
  }),
  billTo: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    address: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().regex(/^[A-Za-z]{2}$/, 'State must be a 2-letter code').transform((value) => value.toUpperCase()),
    zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'ZIP must be 5 digits or ZIP+4'),
  }),
  promoCode: z.string().optional(),
});

type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  amount?: number;
  promoApplied?: { code: string; discount: string };
  error?: string;
}

/**
 * Creates a new subscription for an organization.
 *
 * Flow:
 * 1. Authenticate user + verify orgId membership
 * 2. Validate promo code (if provided)
 * 3. Calculate billing amount (apply discount if promo)
 * 4. Create Authorize.net customer profile and subscription
 * 5. Write to Firestore (subscriptions collection + organizations doc)
 * 6. Record promo redemption (if promo used)
 * 7. Initialize usage record
 * 8. Assign tier-based playbooks
 * 9. Emit subscription.created event
 * 10. Return subscriptionId
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<SubscriptionResult> {
  try {
    if (!isCompanyPlanCheckoutEnabled()) {
      return { success: false, error: 'Subscription checkout is currently disabled. Please contact sales.' };
    }

    // 1. Validate input
    const validInput = CreateSubscriptionSchema.parse(input);
    const { orgId, tierId, opaqueData, billTo, promoCode } = validInput;

    // 2. Authenticate + verify org membership
    const user = await requireUser();
    if ((user as any).email_verified === false || (user as any).emailVerified === false) {
      return { success: false, error: 'Email verification is required before starting a paid subscription.' };
    }
    const { firestore } = await createServerClient();

    // Verify user is admin of this org
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return { success: false, error: 'Organization not found' };
    }

    const org = orgDoc.data();
    if (!org || (org.ownerId !== user.uid && org.ownerUid !== user.uid)) {
      return { success: false, error: 'Not authorized to modify this organization' };
    }

    // 3. Get organization email
    const userDoc = await firestore.collection('users').doc(user.uid).get();
    const userEmail = user.email || userDoc.data()?.email;
    if (!userEmail) {
      return { success: false, error: 'User email not found' };
    }

    // 4. Get tier config
    const tierConfig = TIERS[tierId];
    if (!tierConfig) {
      return { success: false, error: 'Invalid tier' };
    }

    let amount = tierConfig.price;
    let promoApplied = null;
    let promoMonthsRemaining = 0;
    let promoType: 'free_months' | 'percent_off' | null = null;

    // 5. Validate and apply promo code
    if (promoCode) {
      const promoValidation = await validatePromoCode(promoCode, tierId, orgId);
      if (!promoValidation.valid) {
        return { success: false, error: promoValidation.error };
      }

      const promo = promoValidation.promo!;

      if (promo.type === 'free_months') {
        // EARLYBIRD50: charge full price on ARB, track months in Firestore
        promoMonthsRemaining = promo.value;
        promoType = 'free_months';
        promoApplied = {
          code: promo.code,
          discount: `${promo.value} months free`,
        };
      } else if (promo.type === 'percent_off') {
        // SOCIALEQUITY: 50% off — apply discount to ARB amount
        const percentOff = promo.value; // e.g., 50
        amount = Math.round((amount * (100 - percentOff)) / 100 * 100) / 100; // cents to dollars
        promoType = 'percent_off';
        promoApplied = {
          code: promo.code,
          discount: `${percentOff}% off`,
        };
      }
    }

    // 6. Create Authorize.net customer profile
    let customerProfileId: string;
    let customerPaymentProfileId: string;

    try {
      const profileResult = await createCustomerProfile(
        orgId,
        userEmail,
        {
          firstName: billTo.firstName,
          lastName: billTo.lastName,
          address: billTo.address,
          city: billTo.city,
          state: billTo.state,
          zip: billTo.zip,
        },
        {
          opaqueData: {
            dataDescriptor: opaqueData.dataDescriptor,
            dataValue: opaqueData.dataValue,
          },
        }
      );

      customerProfileId = profileResult.customerProfileId;
      customerPaymentProfileId = profileResult.customerPaymentProfileId;
    } catch (error: any) {
      logger.error('[subscription] createCustomerProfile failed', {
        orgId,
        error: error.message,
      });
      return { success: false, error: 'Payment profile creation failed' };
    }

    // 7. Create Authorize.net subscription
    let authnetSubscriptionId: string;
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    try {
      const subscriptionResult = await createSubscriptionFromProfile(
        {
          name: `${tierConfig.name} - ${org!.name || 'Subscription'}`,
          amount,
          startDate: new Date().toISOString().split('T')[0],
          intervalMonths: 1,
        },
        customerProfileId,
        customerPaymentProfileId,
        orgId
      );

      authnetSubscriptionId = subscriptionResult.subscriptionId;
    } catch (error: any) {
      logger.error('[subscription] createSubscriptionFromProfile failed', {
        orgId,
        error: error.message,
      });
      return { success: false, error: 'Subscription creation failed' };
    }

    // 8. Write to Firestore — subscriptions collection
    const subscriptionDocId = orgId;
    const now = FieldValue.serverTimestamp();

    const subscriptionData = {
      id: orgId,
      customerId: orgId,
      tierId,
      status: 'active' as const,
      authorizeNetSubscriptionId: authnetSubscriptionId,
      authorizeNetCustomerProfileId: customerProfileId,
      promoCode: promoCode?.toUpperCase() || null,
      promoMonthsRemaining,
      promoType,
      addons: [],
      billingCycleStart: now,
      currentPeriodEnd: Timestamp.fromDate(nextMonthDate),
      createdAt: now,
      updatedAt: now,
      socialEquityVerified: promoCode?.toUpperCase() === 'SOCIALEQUITY',
    };

    await firestore
      .collection('subscriptions')
      .doc(subscriptionDocId)
      .set(subscriptionData, { merge: true });

    // 9. Write to organizations/{orgId}/subscription/current (for org dashboard)
    await firestore
      .collection('organizations')
      .doc(orgId)
      .collection('subscription')
      .doc('current')
      .set(subscriptionData, { merge: true });

    // 10. Record promo redemption
    if (promoCode) {
      await firestore
        .collection('promo_redemptions')
        .add({
          code: promoCode.toUpperCase(),
          customerId: orgId,
          subscriptionId: authnetSubscriptionId,
          tierId,
          promoType,
          value: promoApplied
            ? promoType === 'free_months'
              ? 3
              : 50
            : 0,
          appliedAt: now,
          createdAt: now,
        });
    }

    // 11. Initialize usage record for current month
    const now_date = new Date();
    const period = `${now_date.getFullYear()}-${String(now_date.getMonth() + 1).padStart(
      2,
      '0'
    )}`;

    await firestore
      .collection('usage')
      .doc(`${orgId}-${period}`)
      .set(
        {
          id: `${orgId}-${period}`,
          subscriptionId: authnetSubscriptionId,
          period,
          smsCustomerUsed: 0,
          smsInternalUsed: 0,
          emailsUsed: 0,
          aiSessionsUsed: 0,
          creativeAssetsUsed: 0,
          competitorsTracked: 0,
          zipCodesActive: 0,
          overageCharges: {
            sms: 0,
            email: 0,
            creativeAssets: 0,
            zipCodes: 0,
            competitors: 0,
            total: 0,
          },
          alertSentAt80Percent: false,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

    // 12. Assign tier-based playbooks
    // Map tiers: pro → 'pro', growth → 'pro', empire → 'enterprise'
    const playbookTier =
      tierId === 'pro' || tierId === 'growth' ? 'pro' : 'enterprise';

    try {
      await assignTierPlaybooks(orgId, playbookTier);
    } catch (error: any) {
      logger.warn('[subscription] assignTierPlaybooks failed (non-blocking)', {
        orgId,
        tier: playbookTier,
        error: error.message,
      });
      // Non-blocking — continue
    }

    // 13. Emit subscription.updated event
    try {
      await emitEvent({
        orgId,
        agent: 'money_mike',
        type: 'subscription.updated',
        data: {
          subscriptionId: authnetSubscriptionId,
          tierId,
          amount,
          promoCode: promoCode?.toUpperCase() || null,
        },
      });
    } catch (error: any) {
      logger.warn('[subscription] emitEvent failed (non-blocking)', {
        error: error.message,
      });
    }

    // 14. Write invoice record
    try {
      const now_date = new Date();
      const invoicePeriod = `${now_date.getFullYear()}-${String(now_date.getMonth() + 1).padStart(
        2,
        '0'
      )}`;

      await firestore
        .collection('invoices')
        .doc(orgId)
        .collection('records')
        .add({
          orgId,
          amount,
          description: `${tierConfig.name} Plan — Monthly Subscription`,
          status: 'pending',
          tierId,
          period: invoicePeriod,
          subscriptionId: authnetSubscriptionId,
          createdAt: Date.now(),
        });
    } catch (error: any) {
      logger.warn('[subscription] Failed to write invoice record', {
        error: error.message,
      });
      // Non-blocking
    }

    // 15. Send subscription confirmation email (non-blocking)
    const { notifySubscriptionCreated } = await import(
      '@/server/services/billing-notifications'
    );
    notifySubscriptionCreated(orgId, tierId, amount, promoApplied || undefined).catch(
      (e: any) => {
        logger.warn('[subscription] Email notification failed', {
          error: e.message,
        });
      }
    );

    logger.info('[subscription] Subscription created', {
      orgId,
      tierId,
      subscriptionId: authnetSubscriptionId,
      amount,
      promoCode: promoCode?.toUpperCase() || 'none',
    });

    return {
      success: true,
      subscriptionId: authnetSubscriptionId,
      amount,
      promoApplied: promoApplied || undefined,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      logger.error('[subscription] Validation error', { errors: messages });
      return { success: false, error: messages.join('; ') };
    }

    logger.error('[subscription] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Subscription creation failed' };
  }
}

/**
 * Gets current subscription for an org (for dashboard).
 */
export async function getSubscription(orgId: string) {
  try {
    const { firestore } = await createServerClient();
    const doc = await firestore.collection('subscriptions').doc(orgId).get();
    return doc.exists ? doc.data() : null;
  } catch (error: any) {
    logger.error('[subscription] getSubscription failed', {
      orgId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Gets invoices for an org (last 12 months).
 */
export async function getInvoices(orgId: string) {
  try {
    const { firestore } = await createServerClient();
    const snapshot = await firestore
      .collection('invoices')
      .doc(orgId)
      .collection('records')
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      amount: doc.data().amount,
      description: doc.data().description,
      status: doc.data().status,
      tierId: doc.data().tierId,
      period: doc.data().period,
      createdAt: doc.data().createdAt,
    }));
  } catch (error: any) {
    logger.error('[subscription] getInvoices failed', {
      orgId,
      error: error.message,
    });
    return [];
  }
}

/**
 * Cancels a subscription (soft-delete via status + ARB cancellation at Authorize.net).
 */
export async function cancelSubscription(orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const { firestore } = await createServerClient();

    // Verify ownership
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return { success: false, error: 'Organization not found' };
    }

    const org = orgDoc.data();
    if (!org || (org.ownerId !== user.uid && org.ownerUid !== user.uid)) {
      return { success: false, error: 'Not authorized' };
    }

    // Get current subscription to retrieve ARB subscription ID
    const subscription = await getSubscription(orgId);
    if (!subscription) {
      return { success: false, error: 'No active subscription found' };
    }

    // Update subscription status in Firestore
    await firestore
      .collection('subscriptions')
      .doc(orgId)
      .set(
        {
          status: 'canceled' as const,
          canceledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // Update org subscription doc
    await firestore
      .collection('organizations')
      .doc(orgId)
      .collection('subscription')
      .doc('current')
      .set(
        {
          status: 'canceled' as const,
          canceledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // Cancel ARB subscription at Authorize.net (non-blocking)
    if (subscription.authorizeNetSubscriptionId) {
      try {
        await cancelARBSubscription(subscription.authorizeNetSubscriptionId);
        logger.info('[subscription] ARB subscription canceled at Authorize.net', { orgId });
      } catch (error: any) {
        logger.warn('[subscription] ARB cancel failed (subscription may already be inactive)', {
          orgId,
          error: error.message,
        });
        // Non-blocking — Firestore already updated, don't fail the user
      }
    }

    // Send cancellation notification email (non-blocking)
    const { notifySubscriptionCanceled } = await import(
      '@/server/services/billing-notifications'
    );
    notifySubscriptionCanceled(orgId, subscription.tierId).catch((e: any) => {
      logger.warn('[subscription] Cancellation email notification failed', {
        error: e.message,
      });
    });

    logger.info('[subscription] Subscription canceled', {
      orgId,
      authnetSubscriptionId: subscription.authorizeNetSubscriptionId,
    });
    return { success: true };
  } catch (error: any) {
    logger.error('[subscription] cancelSubscription failed', {
      orgId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Upgrades a subscription to a higher tier.
 *
 * Flow:
 * 1. Authenticate user + verify org ownership
 * 2. Get current subscription (must exist and be active)
 * 3. Validate newTierId is higher than current
 * 4. Calculate new amount (apply percent_off promo if active)
 * 5. Call updateARBSubscription at Authorize.net
 * 6. Update Firestore subscription + org subscription docs
 * 7. Append to upgradeHistory
 * 8. Re-assign tier playbooks
 * 9. Emit subscription.updated event
 * 10. Send notification email
 * 11. Write invoice record
 * Return new amount
 */
export async function upgradeSubscription(
  orgId: string,
  newTierId: TierId
): Promise<{ success: boolean; error?: string; newAmount?: number }> {
  try {
    const user = await requireUser();
    const { firestore } = await createServerClient();

    // 1. Verify ownership
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return { success: false, error: 'Organization not found' };
    }

    const org = orgDoc.data();
    if (!org || (org.ownerId !== user.uid && org.ownerUid !== user.uid)) {
      return { success: false, error: 'Not authorized' };
    }

    // 2. Get current subscription
    const subscription = await getSubscription(orgId);
    if (!subscription) {
      return { success: false, error: 'No active subscription found' };
    }

    if (subscription.status !== 'active') {
      return { success: false, error: 'Subscription must be active to upgrade' };
    }

    const currentTierId = subscription.tierId as TierId;

    // 3. Validate upgrade
    const tierPrices: Record<TierId, number> = {
      scout: 0,
      pro: TIERS.pro.price,
      growth: TIERS.growth.price,
      empire: TIERS.empire.price,
    };

    if (newTierId === currentTierId) {
      return { success: false, error: 'Cannot upgrade to the same tier' };
    }

    if (tierPrices[newTierId] <= tierPrices[currentTierId]) {
      return { success: false, error: 'Downgrades not supported in this version' };
    }

    // 4. Calculate new amount (apply percent_off promo if still active)
    const newTierConfig = TIERS[newTierId];
    let newAmount = newTierConfig.price;
    let promoApplied = null;

    if (
      subscription.promoCode &&
      subscription.promoType === 'percent_off'
    ) {
      // Get original promo value
      const promoSnapshot = await firestore
        .collection('promos')
        .where('code', '==', subscription.promoCode)
        .limit(1)
        .get();

      if (!promoSnapshot.empty) {
        const promoData = promoSnapshot.docs[0].data();
        if (promoData.type === 'percent_off') {
          const percentOff = promoData.value;
          newAmount = Math.round((newAmount * (100 - percentOff)) / 100 * 100) / 100;
          promoApplied = {
            code: subscription.promoCode,
            discount: `${percentOff}% off`,
          };
        }
      }
    }

    // 5. Update ARB subscription at Authorize.net
    if (!subscription.authorizeNetSubscriptionId) {
      return { success: false, error: 'No Authorize.net subscription found' };
    }

    try {
      await updateARBSubscription(subscription.authorizeNetSubscriptionId, newAmount);
      logger.info('[subscription] ARB subscription updated at Authorize.net', { orgId, newAmount });
    } catch (error: any) {
      logger.error('[subscription] ARB update failed', {
        orgId,
        error: error.message,
      });
      return { success: false, error: 'Failed to update payment processor' };
    }

    // 6. Update Firestore — subscriptions collection
    const now = FieldValue.serverTimestamp();
    const upgradeHistory = subscription.upgradeHistory || [];
    upgradeHistory.push({
      fromTier: currentTierId,
      toTier: newTierId,
      fromAmount: subscription.amount || tierPrices[currentTierId],
      toAmount: newAmount,
      upgradedAt: Date.now(),
    });

    const updatedSubscriptionData = {
      tierId: newTierId,
      amount: newAmount,
      upgradeHistory,
      updatedAt: now,
    };

    await firestore
      .collection('subscriptions')
      .doc(orgId)
      .set(updatedSubscriptionData, { merge: true });

    // Update org subscription doc
    await firestore
      .collection('organizations')
      .doc(orgId)
      .collection('subscription')
      .doc('current')
      .set(updatedSubscriptionData, { merge: true });

    // 7. Re-assign tier playbooks
    const playbookTier = newTierId === 'pro' || newTierId === 'growth' ? 'pro' : 'enterprise';
    try {
      await assignTierPlaybooks(orgId, playbookTier);
    } catch (error: any) {
      logger.warn('[subscription] assignTierPlaybooks failed (non-blocking)', {
        orgId,
        tier: playbookTier,
        error: error.message,
      });
    }

    // 8. Emit subscription.updated event
    try {
      await emitEvent({
        orgId,
        agent: 'money_mike',
        type: 'subscription.updated',
        data: {
          subscriptionId: subscription.authorizeNetSubscriptionId,
          fromTier: currentTierId,
          toTier: newTierId,
          newAmount,
        },
      });
    } catch (error: any) {
      logger.warn('[subscription] emitEvent failed (non-blocking)', {
        error: error.message,
      });
    }

    // 9. Send notification email (non-blocking)
    const { notifySubscriptionCreated } = await import(
      '@/server/services/billing-notifications'
    );
    notifySubscriptionCreated(orgId, newTierId, newAmount, promoApplied || undefined).catch(
      (e: any) => {
        logger.warn('[subscription] Upgrade email notification failed', {
          error: e.message,
        });
      }
    );

    // 10. Write invoice record
    const now_date = new Date();
    const period = `${now_date.getFullYear()}-${String(now_date.getMonth() + 1).padStart(2, '0')}`;

    try {
      await firestore
        .collection('invoices')
        .doc(orgId)
        .collection('records')
        .add({
          orgId,
          amount: newAmount,
          description: `Upgrade from ${TIERS[currentTierId].name} to ${newTierConfig.name}`,
          status: 'pending',
          tierId: newTierId,
          period,
          subscriptionId: subscription.authorizeNetSubscriptionId,
          createdAt: Date.now(),
        });
    } catch (error: any) {
      logger.warn('[subscription] Failed to write invoice record', {
        error: error.message,
      });
      // Non-blocking
    }

    logger.info('[subscription] Subscription upgraded', {
      orgId,
      fromTier: currentTierId,
      toTier: newTierId,
      newAmount,
    });

    return { success: true, newAmount };
  } catch (error: any) {
    logger.error('[subscription] upgradeSubscription failed', {
      orgId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}
