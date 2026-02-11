/**
 * Unified Payment Processor
 *
 * Multi-provider payment abstraction supporting:
 * - Authorize.net (default)
 * - Stripe (standard payments)
 * - Square CBD (cannabis-specific)
 */

import Stripe from 'stripe';
import { processPayment as processAuthorizeNetPayment } from './authorize-net';
import { logger } from '@/lib/logger';

// Square SDK placeholder - actual implementation would use square package
const squareClient: any = {
  paymentsApi: {
    createPayment: async (_request: any) => {
      throw new Error('Square SDK not fully implemented');
    },
  },
  refundsApi: {
    refundPayment: async (_request: any) => {
      throw new Error('Square SDK not fully implemented');
    },
  },
};

function getStripeClient(): Stripe | null {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    return null;
  }

  return new Stripe(apiKey, {
    apiVersion: '2026-01-28.clover',
  });
}

export type PaymentProvider = 'authorize_net' | 'stripe' | 'square';

export interface UnifiedPaymentRequest {
  provider: PaymentProvider;
  amount: number;
  customerEmail: string;
  description: string;
  invoiceNumber?: string;

  // Provider-specific token data
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

export interface UnifiedPaymentResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  provider: PaymentProvider;
  error?: string;
  errorCode?: string;
}

export interface ProviderInfo {
  id: PaymentProvider;
  name: string;
  description: string;
  supportsCannabis: boolean;
  available: boolean;
}

/**
 * Process payment with specified provider
 */
export async function processUnifiedPayment(
  request: UnifiedPaymentRequest
): Promise<UnifiedPaymentResult> {
  try {
    logger.info('[PAYMENT-PROCESSOR] Processing payment', {
      provider: request.provider,
      amount: request.amount,
    });

    switch (request.provider) {
      case 'authorize_net':
        return await processWithAuthorizeNet(request);
      case 'stripe':
        return await processWithStripe(request);
      case 'square':
        return await processWithSquare(request);
      default:
        return {
          success: false,
          provider: request.provider,
          error: 'Invalid payment provider',
        };
    }
  } catch (error) {
    logger.error('[PAYMENT-PROCESSOR] Payment failed', {
      provider: request.provider,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      provider: request.provider,
      error: 'Payment processing failed',
    };
  }
}

/**
 * Process with Authorize.net
 */
async function processWithAuthorizeNet(
  request: UnifiedPaymentRequest
): Promise<UnifiedPaymentResult> {
  if (!request.authorizeNetData) {
    return {
      success: false,
      provider: 'authorize_net',
      error: 'Missing Authorize.net payment data',
    };
  }

  const result = await processAuthorizeNetPayment({
    amount: request.amount,
    opaqueDataDescriptor: request.authorizeNetData.opaqueDataDescriptor,
    opaqueDataValue: request.authorizeNetData.opaqueDataValue,
    customerEmail: request.customerEmail,
    description: request.description,
    invoiceNumber: request.invoiceNumber,
  });

  return {
    ...result,
    provider: 'authorize_net',
  };
}

/**
 * Process with Stripe
 */
async function processWithStripe(
  request: UnifiedPaymentRequest
): Promise<UnifiedPaymentResult> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return {
        success: false,
        provider: 'stripe',
        error: 'Stripe is not configured',
      };
    }

    if (!request.stripeData?.paymentMethodId) {
      return {
        success: false,
        provider: 'stripe',
        error: 'Missing Stripe payment method',
      };
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: request.stripeData.paymentMethodId,
      confirm: true,
      description: request.description,
      receipt_email: request.customerEmail,
      metadata: {
        invoiceNumber: request.invoiceNumber || '',
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vibe-studio`,
    });

    if (paymentIntent.status === 'succeeded') {
      logger.info('[STRIPE] Payment successful', {
        paymentIntentId: paymentIntent.id,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        amount: request.amount,
        provider: 'stripe',
      };
    } else {
      return {
        success: false,
        provider: 'stripe',
        error: `Payment ${paymentIntent.status}`,
      };
    }
  } catch (error) {
    logger.error('[STRIPE] Payment failed', { error });

    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        provider: 'stripe',
        error: error.message,
        errorCode: error.code,
      };
    }

    return {
      success: false,
      provider: 'stripe',
      error: 'Payment processing failed',
    };
  }
}

/**
 * Process with Square
 * TODO: Implement full Square SDK integration
 */
async function processWithSquare(
  request: UnifiedPaymentRequest
): Promise<UnifiedPaymentResult> {
  try {
    if (!request.squareData?.sourceId) {
      return {
        success: false,
        provider: 'square',
        error: 'Missing Square payment source',
      };
    }

    // TODO: Replace with actual Square SDK call
    // For now, return placeholder response
    logger.warn('[SQUARE] Square SDK not fully implemented - returning mock response');

    return {
      success: false,
      provider: 'square',
      error: 'Square SDK integration pending',
    };
  } catch (error: any) {
    logger.error('[SQUARE] Payment failed', { error });

    return {
      success: false,
      provider: 'square',
      error: 'Payment processing failed',
    };
  }
}

/**
 * Get available payment providers
 */
export function getAvailableProviders(isCannabisProduct: boolean = false): ProviderInfo[] {
  const hasAuthNet =
    !!(
      process.env.AUTHNET_API_LOGIN_ID &&
      process.env.AUTHNET_TRANSACTION_KEY &&
      process.env.NEXT_PUBLIC_AUTHNET_CLIENT_KEY
    ) ||
    !!(
      process.env.AUTHORIZENET_API_LOGIN_ID &&
      process.env.AUTHORIZENET_TRANSACTION_KEY &&
      process.env.AUTHORIZENET_CLIENT_KEY
    );

  const providers: ProviderInfo[] = [
    {
      id: 'authorize_net',
      name: 'Authorize.net',
      description: 'Credit/debit cards via Authorize.net',
      supportsCannabis: true,
      available: hasAuthNet,
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Credit/debit cards via Stripe',
      supportsCannabis: false, // Stripe doesn't allow cannabis
      available: !!process.env.STRIPE_SECRET_KEY,
    },
    {
      id: 'square',
      name: 'Square CBD',
      description: 'Cannabis-friendly payment processing',
      supportsCannabis: true,
      available: !!process.env.SQUARE_ACCESS_TOKEN,
    },
  ];

  // Filter by cannabis support if needed
  if (isCannabisProduct) {
    return providers.filter((p) => p.supportsCannabis);
  }

  return providers;
}

/**
 * Get provider info
 */
export function getProviderInfo(provider: PaymentProvider): ProviderInfo | null {
  const providers = getAvailableProviders();
  return providers.find((p) => p.id === provider) || null;
}

/**
 * Create Stripe PaymentIntent for frontend
 */
export async function createStripePaymentIntent(
  amount: number,
  customerEmail: string,
  description: string
): Promise<{ clientSecret: string; error?: string }> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return {
        clientSecret: '',
        error: 'Stripe is not configured',
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail,
      description,
    });

    return {
      clientSecret: paymentIntent.client_secret || '',
    };
  } catch (error) {
    logger.error('[STRIPE] Failed to create payment intent', { error });
    return {
      clientSecret: '',
      error: 'Failed to initialize payment',
    };
  }
}

/**
 * Refund a payment
 */
export async function refundUnifiedPayment(
  provider: PaymentProvider,
  transactionId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'authorize_net':
        // Use existing refund function
        const { refundTransaction } = await import('./authorize-net');
        const result = await refundTransaction(transactionId, amount, '0000'); // Last 4 digits placeholder
        return { success: result.success, error: result.error };

      case 'stripe':
        const stripe = getStripeClient();
        if (!stripe) {
          return { success: false, error: 'Stripe is not configured' };
        }
        const refund = await stripe.refunds.create({
          payment_intent: transactionId,
          amount: Math.round(amount * 100),
        });
        return { success: refund.status === 'succeeded' };

      case 'square':
        // TODO: Implement Square refund when SDK is integrated
        logger.warn('[SQUARE] Square SDK not fully implemented');
        return { success: false, error: 'Square SDK integration pending' };

      default:
        return { success: false, error: 'Invalid provider' };
    }
  } catch (error) {
    logger.error('[PAYMENT-PROCESSOR] Refund failed', { error });
    return { success: false, error: 'Refund failed' };
  }
}
