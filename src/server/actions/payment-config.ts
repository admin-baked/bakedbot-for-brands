/**
 * Payment Configuration Server Actions
 *
 * Server actions for managing payment processor configuration.
 * Allows enabling/disabling payment methods and updating processor settings.
 *
 * AI-THREAD: [Claude @ 2026-02-15] PAYMENT-APP-STORE-INTEGRATION
 * Created server actions for payment configuration management.
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface PaymentConfig {
  enabledMethods: string[];
  defaultMethod?: string;
  cannpay?: {
    enabled: boolean;
    integratorId: string;
    environment: 'sandbox' | 'live';
  };
  aeropay?: {
    enabled: boolean;
    merchantId: string;
    environment: 'sandbox' | 'production';
  };
  creditCard?: {
    enabled: boolean;
    provider: 'authorize_net';
  };
}

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdatePaymentMethodSchema = z.object({
  locationId: z.string(),
  method: z.enum(['cannpay', 'aeropay', 'credit_card', 'dispensary_direct', 'usdc']),
  enabled: z.boolean(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get payment configuration for a location
 */
export async function getPaymentConfig(locationId: string): Promise<{
  success: boolean;
  data?: PaymentConfig;
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary', 'brand']);
    const { firestore } = await createServerClient();

    const locationDoc = await firestore.collection('locations').doc(locationId).get();

    if (!locationDoc.exists) {
      return { success: false, error: 'Location not found' };
    }

    const locationData = locationDoc.data();
    const paymentConfig = locationData?.paymentConfig || {
      enabledMethods: ['dispensary_direct'],
    };

    return { success: true, data: paymentConfig };
  } catch (error: any) {
    logger.error('[PAYMENT_CONFIG] Failed to get payment config', { error: error.message, locationId });
    return { success: false, error: error.message };
  }
}

/**
 * Update payment method enabled status
 */
export async function updatePaymentMethod(input: z.infer<typeof UpdatePaymentMethodSchema>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary']);
    const validated = UpdatePaymentMethodSchema.parse(input);
    const { firestore } = await createServerClient();

    const locationRef = firestore.collection('locations').doc(validated.locationId);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return { success: false, error: 'Location not found' };
    }

    const locationData = locationDoc.data();
    const paymentConfig: PaymentConfig = locationData?.paymentConfig || {
      enabledMethods: ['dispensary_direct'],
    };

    // Update the specific payment method configuration
    switch (validated.method) {
      case 'cannpay':
        if (!paymentConfig.cannpay) {
          paymentConfig.cannpay = {
            enabled: validated.enabled,
            integratorId: process.env.CANPAY_INTEGRATOR_ID || '',
            environment: 'sandbox',
          };
        } else {
          paymentConfig.cannpay.enabled = validated.enabled;
        }
        break;

      case 'aeropay':
        if (!paymentConfig.aeropay) {
          paymentConfig.aeropay = {
            enabled: validated.enabled,
            merchantId: process.env.AEROPAY_MERCHANT_ID || '',
            environment: 'sandbox',
          };
        } else {
          paymentConfig.aeropay.enabled = validated.enabled;
        }
        break;

      case 'credit_card':
        if (!paymentConfig.creditCard) {
          paymentConfig.creditCard = {
            enabled: validated.enabled,
            provider: 'authorize_net',
          };
        } else {
          paymentConfig.creditCard.enabled = validated.enabled;
        }
        break;

      case 'dispensary_direct':
        // Dispensary direct is always enabled, but we can update the enabledMethods array
        break;

      case 'usdc':
        // USDC enabled via x402 wallet provisioning — no extra config needed
        break;
    }

    // Update enabledMethods array
    const methodName = validated.method;
    if (validated.enabled) {
      if (!paymentConfig.enabledMethods.includes(methodName)) {
        paymentConfig.enabledMethods.push(methodName);
      }
    } else {
      paymentConfig.enabledMethods = paymentConfig.enabledMethods.filter((m) => m !== methodName);
    }

    // Ensure dispensary_direct is always in enabledMethods
    if (!paymentConfig.enabledMethods.includes('dispensary_direct')) {
      paymentConfig.enabledMethods.push('dispensary_direct');
    }

    // Update Firestore
    await locationRef.update({
      paymentConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });

    logger.info('[PAYMENT_CONFIG] Payment method updated', {
      locationId: validated.locationId,
      method: validated.method,
      enabled: validated.enabled,
      userId: user.uid,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('[PAYMENT_CONFIG] Failed to update payment method', {
      error: error.message,
      input,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Get location ID for current user
 */
export async function getCurrentUserLocationId(): Promise<{
  success: boolean;
  locationId?: string;
  error?: string;
}> {
  try {
    const user = await requireUser(['super_user', 'dispensary', 'brand']);
    const { firestore } = await createServerClient();

    // Try direct locationId from user claims
    if (user.locationId) {
      return { success: true, locationId: user.locationId };
    }

    // Try orgId or currentOrgId
    const orgId = (user as any).orgId || (user as any).currentOrgId;
    if (orgId) {
      const locSnap = await firestore
        .collection('locations')
        .where('orgId', '==', orgId)
        .limit(1)
        .get();

      if (!locSnap.empty) {
        return { success: true, locationId: locSnap.docs[0].id };
      }
    }

    // Fallback: check user document
    const userDoc = await firestore.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    const profileOrgId = userData?.orgId || userData?.currentOrgId || userData?.dispensaryId;

    if (profileOrgId) {
      const locSnap = await firestore
        .collection('locations')
        .where('orgId', '==', profileOrgId)
        .limit(1)
        .get();

      if (!locSnap.empty) {
        return { success: true, locationId: locSnap.docs[0].id };
      }
    }

    return { success: false, error: 'No location found for user' };
  } catch (error: any) {
    logger.error('[PAYMENT_CONFIG] Failed to get location ID', { error: error.message });
    return { success: false, error: error.message };
  }
}
