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

function extractAuthorizeNetSignature(signatureHeader: string): string {
  const trimmed = signatureHeader.trim();
  const match = trimmed.match(/^sha512=(.+)$/i);
  return (match ? match[1] : trimmed).trim();
}

function getAuthorizeNetSignatureKeyBuffer(secret: string): Buffer {
  const normalized = secret.trim();
  const isHex = /^[0-9a-f]+$/i.test(normalized) && normalized.length % 2 === 0;
  return isHex ? Buffer.from(normalized, 'hex') : Buffer.from(normalized, 'utf8');
}

/**
 * Verify Authorize.Net webhook signature using HMAC SHA512 over raw request body.
 *
 * @param payload - Raw request body string
 * @param signature - x-anet-signature header value
 * @param secret - AUTHNET_SIGNATURE_KEY / AUTHORIZE_NET_SIGNATURE_KEY
 */
export function verifyAuthorizeNetSignature(
  payload: string,
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

    const signatureValue = extractAuthorizeNetSignature(signature).toLowerCase();

    if (!/^[0-9a-f]{128}$/i.test(signatureValue)) {
      logger.warn('[WEBHOOK_VALIDATION] Invalid Authorize.Net signature format');
      return { valid: false, error: 'Invalid signature format' };
    }

    const keyBuffer = getAuthorizeNetSignatureKeyBuffer(secret);
    const computed = createHmac('sha512', keyBuffer).update(payload).digest('hex').toLowerCase();

    if (computed.length !== signatureValue.length) {
      logger.warn('[WEBHOOK_VALIDATION] Authorize.Net signature length mismatch', {
        computed: computed.length,
        received: signatureValue.length,
      });
      return { valid: false, error: 'Signature mismatch' };
    }

    const isValid = timingSafeEqual(
      Buffer.from(computed, 'utf8'),
      Buffer.from(signatureValue, 'utf8')
    );

    if (!isValid) {
      logger.warn('[WEBHOOK_VALIDATION] Authorize.Net signature invalid');
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
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
      return verifyAuthorizeNetSignature(body, signature, secret);

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
