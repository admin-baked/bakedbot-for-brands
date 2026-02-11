/**
 * CannPay RemotePay Integration Client
 *
 * Based on CannPay RemotePay Integration Developer Guide v1.4.0-dev
 *
 * @see docs/CanPay RemotePay Integration - Developers Guide 1.4.0-dev (2).pdf
 *
 * AI-THREAD: [Dev1-Claude @ 2025-11-30] P0-PAY-CANNPAY-INTEGRATION
 * Created CanPay API client library for payment authorization, transaction details, and reversals.
 * Implements HMAC-SHA256 signature generation for API requests.
 * Supports both sandbox and live environments.
 * Transaction fee (50 cents) added via deliveryFee parameter.
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface CannPayConfig {
  appKey: string;
  apiSecret: string;
  integratorId: string;
  internalVersion: string;
  environment: 'sandbox' | 'live';
}

export interface AuthorizePaymentRequest {
  /** Total payment amount in cents (e.g., 10000 = $100.00) */
  amount: number;

  /** Platform transaction fee in cents (e.g., 50 = $0.50) */
  deliveryFee?: number;

  /** Internal order ID for tracking */
  merchantOrderId?: string;

  /** JSON string with additional data (orderId, organizationId, etc.) */
  passthrough?: string;

  /** Whether to return consumer-given tip amount */
  returnConsumerGivenTipAmount?: boolean;

  /** Split funding merchant ID (if applicable) */
  splitFundingMerchantId?: string;
}

export interface AuthorizePaymentResponse {
  /** Intent ID for widget initialization */
  intent_id: string;

  /** Widget URL (sandbox or live) */
  widget_url: string;

  /** Expiration timestamp */
  expires_at?: string;
}

export interface CannPayTransaction {
  intentId: string;
  canpayTransactionNumber?: string;
  status: 'Success' | 'Settled' | 'Failed' | 'Voided' | 'Pending';
  amount: number;
  tipAmount?: number;
  deliveryFee?: number;
  transactionTime?: string;
  merchantOrderId?: string;
  passthrough?: string;
}

export interface TransactionReversalRequest {
  intentId: string;
  reason?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const SANDBOX_BASE_URL = 'https://sandbox-api.canpayapp.com';
const LIVE_BASE_URL = 'https://api.canpayapp.com';

const SANDBOX_WIDGET_URL = 'https://sandbox-widget.canpayapp.com';
const LIVE_WIDGET_URL = 'https://widget.canpayapp.com';

/**
 * Get CannPay configuration from environment variables
 */
function getCannPayConfig(): CannPayConfig {
  const appKey = process.env.CANPAY_APP_KEY;
  const apiSecret = process.env.CANPAY_API_SECRET;
  const integratorId = process.env.CANPAY_INTEGRATOR_ID;
  const internalVersion = process.env.CANPAY_INTERNAL_VERSION || '1.4.0';
  const environmentValue = (process.env.CANPAY_ENVIRONMENT || process.env.CANPAY_MODE || 'sandbox').toLowerCase();
  const environment: 'sandbox' | 'live' =
    environmentValue === 'live' || environmentValue === 'production'
      ? 'live'
      : 'sandbox';

  if (!appKey) {
    throw new Error('[P0-PAY-CANNPAY] CANPAY_APP_KEY environment variable is required');
  }
  if (!apiSecret) {
    throw new Error('[P0-PAY-CANNPAY] CANPAY_API_SECRET environment variable is required');
  }
  if (!integratorId) {
    throw new Error('[P0-PAY-CANNPAY] CANPAY_INTEGRATOR_ID environment variable is required');
  }

  return {
    appKey,
    apiSecret,
    integratorId,
    internalVersion,
    environment,
  };
}

/**
 * Get base URL based on environment
 */
function getBaseUrl(environment: 'sandbox' | 'live'): string {
  return environment === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;
}

/**
 * Get widget URL based on environment
 */
function getWidgetUrl(environment: 'sandbox' | 'live'): string {
  return environment === 'live' ? LIVE_WIDGET_URL : SANDBOX_WIDGET_URL;
}

// ============================================================================
// HMAC Signature Generation
// ============================================================================

/**
 * Generate HMAC-SHA256 signature for API requests
 *
 * Per CannPay spec: HMAC-SHA256(api_secret, request_body_json)
 */
function generateSignature(apiSecret: string, payload: string): string {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('hex');
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Authorize a CannPay payment and get intent_id for widget
 *
 * POST /integrator/authorize
 *
 * @example
 * const result = await authorizePayment({
 *   amount: 10000, // $100.00
 *   deliveryFee: 50, // $0.50 platform fee
 *   merchantOrderId: 'order_123',
 *   passthrough: JSON.stringify({ orderId: 'abc', organizationId: 'xyz' })
 * });
 * // Returns: { intent_id: '...', widget_url: 'https://...' }
 */
export async function authorizePayment(
  request: AuthorizePaymentRequest
): Promise<AuthorizePaymentResponse> {
  const config = getCannPayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const widgetUrl = getWidgetUrl(config.environment);

  // Build request payload
  const payload = {
    app_key: config.appKey,
    integrator_id: config.integratorId,
    canpay_internal_version: config.internalVersion,
    amount: request.amount,
    ...(request.deliveryFee !== undefined && { delivery_fee: request.deliveryFee }),
    ...(request.merchantOrderId && { merchant_order_id: request.merchantOrderId }),
    ...(request.passthrough && { passthrough: request.passthrough }),
    ...(request.returnConsumerGivenTipAmount !== undefined && {
      return_consumer_given_tip_amount: request.returnConsumerGivenTipAmount,
    }),
    ...(request.splitFundingMerchantId && {
      split_funding_merchant_id: request.splitFundingMerchantId,
    }),
  };

  const payloadJson = JSON.stringify(payload);
  const signature = generateSignature(config.apiSecret, payloadJson);

  // Make API request
  const response = await fetch(`${baseUrl}/integrator/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CannPay-Signature': signature,
    },
    body: payloadJson,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[P0-PAY-CANNPAY] CannPay authorize failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  return {
    intent_id: data.intent_id,
    widget_url: widgetUrl,
    expires_at: data.expires_at,
  };
}

/**
 * Get transaction details by intent ID
 *
 * POST /integrator/transactiondetails
 */
export async function getTransactionDetails(
  intentId: string
): Promise<CannPayTransaction> {
  const config = getCannPayConfig();
  const baseUrl = getBaseUrl(config.environment);

  const payload = {
    app_key: config.appKey,
    integrator_id: config.integratorId,
    intent_id: intentId,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = generateSignature(config.apiSecret, payloadJson);

  const response = await fetch(`${baseUrl}/integrator/transactiondetails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CannPay-Signature': signature,
    },
    body: payloadJson,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[P0-PAY-CANNPAY] CannPay transactiondetails failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  return {
    intentId: data.intent_id,
    canpayTransactionNumber: data.canpay_transaction_number,
    status: data.status,
    amount: data.amount,
    tipAmount: data.tip_amount,
    deliveryFee: data.delivery_fee,
    transactionTime: data.transaction_time,
    merchantOrderId: data.merchant_order_id,
    passthrough: data.passthrough,
  };
}

/**
 * Reverse (refund) a CannPay transaction
 *
 * POST /integrator/transactionreversal
 */
export async function reverseTransaction(
  request: TransactionReversalRequest
): Promise<void> {
  const config = getCannPayConfig();
  const baseUrl = getBaseUrl(config.environment);

  const payload = {
    app_key: config.appKey,
    integrator_id: config.integratorId,
    intent_id: request.intentId,
    ...(request.reason && { reason: request.reason }),
  };

  const payloadJson = JSON.stringify(payload);
  const signature = generateSignature(config.apiSecret, payloadJson);

  const response = await fetch(`${baseUrl}/integrator/transactionreversal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CannPay-Signature': signature,
    },
    body: payloadJson,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[P0-PAY-CANNPAY] CannPay transactionreversal failed (${response.status}): ${errorText}`
    );
  }
}

// ============================================================================
// Constants for use in other files
// ============================================================================

export const CANNPAY_TRANSACTION_FEE_CENTS = 50; // $0.50 platform transaction fee
