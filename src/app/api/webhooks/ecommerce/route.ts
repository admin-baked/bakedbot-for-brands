/**
 * Generic Ecommerce Webhook Handler
 *
 * Receives events from multiple ecommerce platforms:
 * - Shopify (X-Shopify-Hmac-SHA256)
 * - WooCommerce (X-WC-Webhook-Signature)
 * - Custom platforms (X-BakedBot-Signature)
 *
 * Normalizes platform-specific payloads to BakedBot event schema
 * and dispatches to playbook system
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { logger } from '@/lib/logger';
import { dispatchPlaybookEvent } from '@/server/services/playbook-event-dispatcher';
import { resolveEcommerceCustomer } from '@/server/services/ecommerce-customer-mapper';

export const maxDuration = 30;

interface NormalizedEvent {
  platform: 'shopify' | 'woocommerce' | 'custom';
  event: string;
  orderId?: string;
  customerId?: string;
  customerEmail: string;
  orderTotal?: number;
  lineItems?: Array<{ productId: string; name: string; qty: number; price: number }>;
}

/**
 * Verify Shopify webhook signature
 */
function verifyShopifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.SHOPIFY_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  return signature === expectedSignature;
}

/**
 * Verify WooCommerce webhook signature
 */
function verifyWooCommerceSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.WOOCOMMERCE_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.WOOCOMMERCE_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  return signature === expectedSignature;
}

/**
 * Verify custom BakedBot webhook signature
 */
function verifyBakedBotSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.ECOMMERCE_WEBHOOK_SECRET) {
    return false;
  }

  const normalizedSignature = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedSignature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.ECOMMERCE_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')
    .toLowerCase();

  if (expectedSignature.length !== normalizedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(normalizedSignature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
}

/**
 * Normalize Shopify payload to BakedBot schema
 */
function normalizeShopifyEvent(payload: any): NormalizedEvent {
  const topic = payload.topic || 'orders/create';
  let event = 'order.created';

  if (topic.includes('order/fulfilled')) {
    event = 'order.completed';
  } else if (topic.includes('order/cancelled')) {
    event = 'order.cancelled';
  } else if (topic.includes('checkout/create')) {
    event = 'checkout.started';
  } else if (topic.includes('checkout/update')) {
    event = 'checkout.completed';
  } else if (topic.includes('cart/create')) {
    event = 'cart.created';
  } else if (topic.includes('customer/create')) {
    event = 'customer.created';
  }

  return {
    platform: 'shopify',
    event,
    orderId: payload.id?.toString(),
    customerId: payload.customer?.id?.toString(),
    customerEmail: payload.customer?.email || payload.email || '',
    orderTotal: payload.total_price ? parseFloat(payload.total_price) : undefined,
    lineItems: payload.line_items?.map((item: any) => ({
      productId: item.product_id?.toString(),
      name: item.title,
      qty: item.quantity,
      price: parseFloat(item.price),
    })),
  };
}

/**
 * Normalize WooCommerce payload to BakedBot schema
 */
function normalizeWooCommerceEvent(payload: any): NormalizedEvent {
  const action = payload.action || 'created';
  let event = 'order.created';

  if (action === 'updated') {
    event = 'order.updated';
  } else if (action === 'completed') {
    event = 'order.completed';
  } else if (action === 'cancelled') {
    event = 'order.cancelled';
  }

  return {
    platform: 'woocommerce',
    event,
    orderId: payload.id?.toString(),
    customerId: payload.customer_id?.toString(),
    customerEmail: payload.billing?.email || payload.customer_email || '',
    orderTotal: payload.total ? parseFloat(payload.total) : undefined,
    lineItems: payload.line_items?.map((item: any) => ({
      productId: item.product_id?.toString(),
      name: item.name,
      qty: item.quantity,
      price: parseFloat(item.price),
    })),
  };
}

/**
 * Handle webhook POST request
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const shopifySignature = request.headers.get('x-shopify-hmac-sha256');
    const wooSignature = request.headers.get('x-wc-webhook-signature');
    const bakedBotSignature = request.headers.get('x-bakedbot-signature');
    const topic = request.headers.get('x-shopify-topic');

    let platform: 'shopify' | 'woocommerce' | 'custom' | null = null;
    let normalizedEvent: NormalizedEvent | null = null;

    // Detect and verify platform
    if (shopifySignature && topic) {
      if (!verifyShopifySignature(rawBody, shopifySignature)) {
        logger.warn('[ECOMMERCE] Invalid Shopify webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      const payload = JSON.parse(rawBody);
      normalizedEvent = normalizeShopifyEvent(payload);
      platform = 'shopify';
    } else if (wooSignature) {
      if (!verifyWooCommerceSignature(rawBody, wooSignature)) {
        logger.warn('[ECOMMERCE] Invalid WooCommerce webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      const payload = JSON.parse(rawBody);
      normalizedEvent = normalizeWooCommerceEvent(payload);
      platform = 'woocommerce';
    } else if (bakedBotSignature) {
      if (!verifyBakedBotSignature(rawBody, bakedBotSignature)) {
        logger.warn('[ECOMMERCE] Invalid BakedBot webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      const payload = JSON.parse(rawBody);
      normalizedEvent = payload;
      platform = 'custom';
    } else {
      logger.warn('[ECOMMERCE] No valid webhook signature found');
      return NextResponse.json({ error: 'No valid signature' }, { status: 401 });
    }

    if (!normalizedEvent || !normalizedEvent.customerEmail) {
      logger.warn('[ECOMMERCE] Invalid webhook payload: missing customer email');
      return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
    }

    // Get orgId from query parameter (caller must provide this)
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      logger.warn('[ECOMMERCE] Missing orgId in query parameter');
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    logger.info('[ECOMMERCE] Received webhook', {
      platform,
      event: normalizedEvent.event,
      customerEmail: normalizedEvent.customerEmail,
      orgId,
    });

    // Resolve/create customer
    const { bakedBotCustomerId } = await resolveEcommerceCustomer(
      orgId,
      normalizedEvent.customerEmail,
      normalizedEvent.customerId
    );

    // Dispatch to playbook system (fire-and-forget)
    dispatchPlaybookEvent(orgId, normalizedEvent.event, {
      ...normalizedEvent,
      customerId: bakedBotCustomerId || normalizedEvent.customerId,
    }).catch((err) =>
      logger.error('[EventDispatcher] Failed to dispatch ecommerce event', {
        event: normalizedEvent.event,
        platform,
        orgId,
        error: err,
      })
    );

    return NextResponse.json({
      success: true,
      received: true,
      platform,
      event: normalizedEvent.event,
    });
  } catch (error: any) {
    logger.error('[ECOMMERCE] Webhook processing failed', {
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
