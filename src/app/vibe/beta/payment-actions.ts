'use server';

/**
 * Vibe Payment Actions
 *
 * Handles payment processing for full-stack conversions.
 * Supports Authorize.net, Stripe, and Square CBD.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { getAcceptJsConfig } from '@/server/services/authorize-net';
import {
  processUnifiedPayment,
  getAvailableProviders,
  createStripePaymentIntent,
  type PaymentProvider,
} from '@/server/services/payment-processor';

interface ProcessConversionPaymentRequest {
  projectId: string;
  userId: string;
  customerEmail: string;
  amount: number;
  provider: PaymentProvider;

  // Provider-specific data
  authorizeNetData?: {
    opaqueDataDescriptor: string;
    opaqueDataValue: string;
  };
  stripeData?: {
    paymentMethodId: string;
  };
  squareData?: {
    sourceId: string;
    locationId?: string;
  };
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Process payment for full-stack conversion
 */
export async function processConversionPayment(
  request: ProcessConversionPaymentRequest
): Promise<PaymentResponse> {
  try {
    logger.info('[VIBE-PAYMENT] Processing conversion payment', {
      projectId: request.projectId,
      userId: request.userId,
      amount: request.amount,
      provider: request.provider,
    });

    // Process payment with unified processor
    const paymentResult = await processUnifiedPayment({
      provider: request.provider,
      amount: request.amount,
      customerEmail: request.customerEmail,
      description: `Vibe IDE Full-Stack Conversion - Project ${request.projectId}`,
      invoiceNumber: `VIBE-${request.projectId}-${Date.now()}`,
      authorizeNetData: request.authorizeNetData,
      stripeData: request.stripeData,
      squareData: request.squareData,
    });

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error || 'Payment failed',
      };
    }

    // Save transaction to database
    const db = getAdminFirestore();
    await db.collection('vibe_transactions').add({
      projectId: request.projectId,
      userId: request.userId,
      transactionId: paymentResult.transactionId,
      amount: request.amount,
      provider: request.provider,
      status: 'completed',
      type: 'full_stack_conversion',
      createdAt: new Date().toISOString(),
    });

    logger.info('[VIBE-PAYMENT] Payment successful', {
      transactionId: paymentResult.transactionId,
      provider: request.provider,
    });

    return {
      success: true,
      transactionId: paymentResult.transactionId,
    };
  } catch (error) {
    logger.error('[VIBE-PAYMENT] Payment processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Payment processing failed',
    };
  }
}

/**
 * Get Accept.js configuration for frontend
 */
export async function getPaymentConfig(): Promise<{
  apiLoginID: string;
  clientKey: string;
  isProduction: boolean;
}> {
  return getAcceptJsConfig();
}

/**
 * Get available payment providers
 */
export async function getPaymentProviders(isCannabisProduct: boolean = false) {
  return getAvailableProviders(isCannabisProduct);
}

/**
 * Create Stripe payment intent (for Stripe Elements)
 */
export async function createPaymentIntent(
  amount: number,
  customerEmail: string,
  projectId: string
) {
  return createStripePaymentIntent(
    amount,
    customerEmail,
    `Vibe IDE Full-Stack Conversion - Project ${projectId}`
  );
}

/**
 * Verify payment before allowing conversion
 */
export async function verifyPaymentForConversion(
  projectId: string,
  userId: string
): Promise<{ verified: boolean; transactionId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Check for successful payment
    const paymentQuery = await db
      .collection('vibe_transactions')
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .where('type', '==', 'full_stack_conversion')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      return {
        verified: false,
        error: 'No payment found for this conversion',
      };
    }

    const payment = paymentQuery.docs[0].data();

    return {
      verified: true,
      transactionId: payment.transactionId,
    };
  } catch (error) {
    logger.error('[VIBE-PAYMENT] Payment verification failed', { error });
    return {
      verified: false,
      error: 'Failed to verify payment',
    };
  }
}
