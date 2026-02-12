'use server';

/**
 * Upsell Server Actions
 *
 * Server-side actions for fetching upsell suggestions.
 * Called from client components (product detail modal, cart, checkout).
 */

import {
  getProductUpsells as engineProductUpsells,
  getCartUpsells as engineCartUpsells,
  getCheckoutUpsells as engineCheckoutUpsells,
} from '@/server/services/upsell-engine';
import type { UpsellResult } from '@/types/upsell';

/**
 * Get upsell suggestions for a product detail modal.
 * Returns 3 complementary products with pairing reasons.
 */
export async function fetchProductUpsells(
  productId: string,
  orgId: string
): Promise<UpsellResult> {
  if (!productId || !orgId) {
    return { suggestions: [], placement: 'product_detail', generatedAt: Date.now() };
  }

  return engineProductUpsells(productId, orgId, { maxResults: 3 });
}

/**
 * Get upsell suggestions for the cart sidebar.
 * Returns 2 products that complement the current cart.
 */
export async function fetchCartUpsells(
  cartItemIds: string[],
  orgId: string
): Promise<UpsellResult> {
  if (!cartItemIds.length || !orgId) {
    return { suggestions: [], placement: 'cart', generatedAt: Date.now() };
  }

  return engineCartUpsells(cartItemIds, orgId, { maxResults: 2 });
}

/**
 * Get upsell suggestions for the checkout page.
 * Returns 2 high-margin last-chance deals.
 */
export async function fetchCheckoutUpsells(
  cartItemIds: string[],
  orgId: string
): Promise<UpsellResult> {
  if (!cartItemIds.length || !orgId) {
    return { suggestions: [], placement: 'checkout', generatedAt: Date.now() };
  }

  return engineCheckoutUpsells(cartItemIds, orgId, { maxResults: 2 });
}
