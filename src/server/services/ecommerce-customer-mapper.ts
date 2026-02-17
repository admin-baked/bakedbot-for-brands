/**
 * Ecommerce Customer Mapper
 *
 * Links ecommerce customers to BakedBot by:
 * - Email (primary)
 * - Platform ID (secondary, if email not available)
 * - Creates minimal customer records for new customers
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export interface ResolvedCustomer {
  bakedBotCustomerId: string | null;
  isNew: boolean;
}

export async function resolveEcommerceCustomer(
  orgId: string,
  email: string,
  platformCustomerId?: string
): Promise<ResolvedCustomer> {
  try {
    const { firestore } = await createServerClient();

    const normalizedEmail = email.toLowerCase().trim();

    // Look up by email
    const customerSnap = await firestore
      .collection('customers')
      .where('orgId', '==', orgId)
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!customerSnap.empty) {
      const customerId = customerSnap.docs[0].id;
      logger.debug('[EcommerceMapper] Customer found by email', {
        orgId,
        customerId,
        email: normalizedEmail,
      });
      return { bakedBotCustomerId: customerId, isNew: false };
    }

    // Not found → create minimal record
    const newCustomerRef = await firestore.collection('customers').add({
      orgId,
      email: normalizedEmail,
      source: 'ecommerce',
      ecommerceIds: platformCustomerId ? { external: platformCustomerId } : {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('[EcommerceMapper] New customer created', {
      orgId,
      customerId: newCustomerRef.id,
      email: normalizedEmail,
    });

    return { bakedBotCustomerId: newCustomerRef.id, isNew: true };
  } catch (err) {
    logger.error('[EcommerceMapper] Error resolving customer', {
      orgId,
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return { bakedBotCustomerId: null, isNew: false };
  }
}

export async function resolveEcommerceCustomerByPlatformId(
  orgId: string,
  platformId: string,
  platform: string = 'shopify'
): Promise<ResolvedCustomer> {
  try {
    const { firestore } = await createServerClient();

    // Query by ecommerce ID
    const customerSnap = await firestore
      .collection('customers')
      .where('orgId', '==', orgId)
      .where(`ecommerceIds.${platform}`, '==', platformId)
      .limit(1)
      .get();

    if (!customerSnap.empty) {
      const customerId = customerSnap.docs[0].id;
      logger.debug('[EcommerceMapper] Customer found by platform ID', {
        orgId,
        customerId,
        platform,
        platformId,
      });
      return { bakedBotCustomerId: customerId, isNew: false };
    }

    logger.debug('[EcommerceMapper] No customer found by platform ID', {
      orgId,
      platform,
      platformId,
    });

    return { bakedBotCustomerId: null, isNew: false };
  } catch (err) {
    logger.error('[EcommerceMapper] Error resolving by platform ID', {
      orgId,
      platform,
      platformId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { bakedBotCustomerId: null, isNew: false };
  }
}
