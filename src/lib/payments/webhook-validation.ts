/**
 * Payment Webhook Validation Utilities
 * 
 * Secure webhook signature verification for multiple payment gateways.
 * All webhooks require signature verification to prevent spoofing.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  payload?: Record<string, any>;
}

// Stripe verification removed
export function verifyStripeSignature(body: string, signature: string, secret: string) {
    throw new Error('Stripe is no longer supported');
}

/**
 * Verify CannPay webhook signature using SHA256 HMAC
 * 
 * CannPay widget sends: { response: "<JSON>", signature: "<HMAC>" }
 * Signature is HMAC-SHA256(response, CANPAY_API_SECRET) in lowercase hex
 * 
 * @param payload - The raw response string (the value of the 'response' field)
 * @param signature - The signature provided by CannPay (lowercase hex)
 * @param secret - CANPAY_API_SECRET from environment
 * @returns true if signature is valid
 */
export function verifyCannPaySignature(
  payload: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    if (!secret) {
      logger.error('[WEBHOOK_VALIDATION] CannPay secret not configured');
      return { valid: false, error: 'CannPay secret not configured' };
    }

    if (!signature) {
      logger.error('[WEBHOOK_VALIDATION] Missing CannPay signature');
      return { valid: false, error: 'Missing signature' };
    }

    // Compute expected signature
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const computed = hmac.digest('hex').toLowerCase();

    // Validate signature matches
    if (computed.length !== signature.length) {
      logger.warn('[WEBHOOK_VALIDATION] CannPay signature length mismatch', {
        computed: computed.length,
        received: signature.length,
      });
      return { valid: false, error: 'Signature mismatch' };
    }

    // Use constant-time comparison to prevent timing attacks
    try {
      const isValid = timingSafeEqual(
        Buffer.from(computed, 'utf-8'),
        Buffer.from(signature, 'utf-8')
      );

      if (!isValid) {
        logger.warn('[WEBHOOK_VALIDATION] CannPay signature invalid');
        return { valid: false, error: 'Signature verification failed' };
      }

      logger.debug('[WEBHOOK_VALIDATION] CannPay signature verified');
      return { valid: true };
    } catch (err: any) {
      logger.warn('[WEBHOOK_VALIDATION] CannPay signature comparison failed', {
        error: err?.message,
      });
      return { valid: false, error: 'Signature verification failed' };
    }
  } catch (error: any) {
    logger.error('[WEBHOOK_VALIDATION] CannPay verification failed', {
      error: error?.message,
    });
    return { valid: false, error: error?.message };
  }
}

/**
 * Verify Authorize.Net webhook signature using HMAC SHA2 (SHA512 by default)
 * 
 * Authorize.Net sends signature in x-anet-signature header
 * Signature is computed over: ^ + concatenated field values + ^
 * 
 * @param fields - Parsed webhook fields (usually query parameters)
 * @param signature - x-anet-signature header value
 * @param secret - AUTHORIZE_NET_SIGNATURE_KEY from environment
 * @returns true if signature is valid
 */
export function verifyAuthorizeNetSignature(
  fields: Record<string, any>,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    if (!secret) {
      logger.error('[WEBHOOK_VALIDATION] Authorize.Net secret not configured');
      return { valid: false, error: 'Authorize.Net secret not configured' };
    }

    if (!signature) {
      logger.error('[WEBHOOK_VALIDATION] Missing Authorize.Net signature');
      return { valid: false, error: 'Missing signature' };
    }

    // Authorize.Net uses specific field order
    // Per documentation: timestamp + id (in hex format)
    // This is a simplified implementation - consult Authorize.Net docs for exact spec

    logger.warn(
      '[WEBHOOK_VALIDATION] Authorize.Net signature verification not fully implemented. ' +
        'Consult Authorize.Net documentation for exact specification.'
    );

    // TODO: Implement full Authorize.Net signature verification
    // For now, log a warning to ensure this is addressed

    return {
      valid: false,
      error: 'Authorize.Net webhook verification not yet implemented',
    };
  } catch (error: any) {
    logger.error('[WEBHOOK_VALIDATION] Authorize.Net verification failed', {
      error: error?.message,
    });
    return { valid: false, error: error?.message };
  }
}

/**
 * Generic webhook validator - routes to appropriate payment gateway
 * 
 * @param gateway - Payment gateway name (stripe, cannpay, authorize-net)
 * @param body - Raw request body
 * @param signature - Signature header value
 * @param secret - API secret from environment
 * @returns Validation result
 */
export function validateWebhook(
  gateway: 'stripe' | 'cannpay' | 'authorize-net',
  body: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  switch (gateway) {
    // case 'stripe': removed

    case 'cannpay':
      return verifyCannPaySignature(body, signature, secret);

    case 'authorize-net':
      return verifyAuthorizeNetSignature(JSON.parse(body), signature, secret);

    default:
      logger.error('[WEBHOOK_VALIDATION] Unknown gateway', { gateway });
      return { valid: false, error: 'Unknown payment gateway' };
  }
}

/**
 * Security best practices for webhook handling
 * 
 * 1. ✅ Always verify signature (required for all webhooks)
 * 2. ✅ Use constant-time comparison (prevents timing attacks)
 * 3. ✅ Log all signature failures (audit trail)
 * 4. ✅ Never trust client data (signature proves server sent it)
 * 5. ✅ Idempotent processing (retry safely)
 * 6. ✅ Return 200 OK quickly (queue async processing)
 * 7. ✅ Validate event data before updating DB
 * 8. ✅ Store webhook for audit trail
 */

export const WEBHOOK_SECURITY_GUIDELINES = `
WEBHOOK SECURITY CHECKLIST

For each webhook endpoint:

1. Signature Verification
   - [ ] Get signature from header
   - [ ] Get secret from environment variable
   - [ ] Compute expected signature
   - [ ] Use timing-safe comparison
   - [ ] Log all failures

2. Input Validation
   - [ ] Parse JSON safely (try/catch)
   - [ ] Validate required fields
   - [ ] Validate field types
   - [ ] Check for expected event types

3. Database Updates
   - [ ] Verify record exists before update
   - [ ] Check current state before changing
   - [ ] Use transactions if needed
   - [ ] Log all changes

4. Error Handling
   - [ ] Return 200 OK on success
   - [ ] Return 400 for bad signature
   - [ ] Return 500 for server errors
   - [ ] Never expose internal errors
   - [ ] Queue failed webhooks for retry

5. Audit Trail
   - [ ] Log webhook received
   - [ ] Log verification result
   - [ ] Log all updates made
   - [ ] Store raw webhook (for disputes)

6. Testing
   - [ ] Test with valid signature
   - [ ] Test with invalid signature
   - [ ] Test with missing fields
   - [ ] Test retry handling
   - [ ] Test in production sandbox
`;
