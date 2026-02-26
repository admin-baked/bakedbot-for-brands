/**
 * x402 Resource Server Singleton
 *
 * Shared x402ResourceServer instance configured for Base mainnet.
 * Used by withX402() wrappers to gate agentic API routes with USDC payments.
 *
 * BakedBot's wallet address is the payTo address for all protected routes.
 * External AI agents / third-party integrations pay per-call in USDC.
 */

import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import type { RouteConfig } from '@x402/core/server';

const COINBASE_FACILITATOR_URL = 'https://facilitator.x402.org';

// Base mainnet chain ID in CAIP-2 format
export const BASE_MAINNET_NETWORK = 'eip155:8453' as const;

// ============================================================================
// Singleton
// ============================================================================

let _resourceServer: x402ResourceServer | null = null;

/**
 * Get the shared x402ResourceServer singleton (lazy init).
 * Returns null if X402_BAKEDBOT_WALLET_ADDRESS is not configured.
 */
export function getX402ResourceServer(): x402ResourceServer | null {
  if (_resourceServer) return _resourceServer;

  const walletAddress = process.env.X402_BAKEDBOT_WALLET_ADDRESS;
  if (!walletAddress) {
    return null;
  }

  const facilitatorClient = new HTTPFacilitatorClient({ url: COINBASE_FACILITATOR_URL });

  _resourceServer = new x402ResourceServer(facilitatorClient).register(
    BASE_MAINNET_NETWORK,
    new ExactEvmScheme(),
  );

  return _resourceServer;
}

// ============================================================================
// Route config builder
// ============================================================================

/**
 * Build an x402 RouteConfig for a given USD price.
 * Used with withX402() to gate external agentic API access.
 */
export function buildX402RouteConfig(priceUsd: number, description: string): RouteConfig {
  const payTo = process.env.X402_BAKEDBOT_WALLET_ADDRESS;
  if (!payTo) {
    throw new Error('[x402] X402_BAKEDBOT_WALLET_ADDRESS not configured');
  }

  return {
    accepts: {
      scheme: 'exact' as const,
      price: `$${priceUsd.toFixed(4)}`,
      network: BASE_MAINNET_NETWORK,
      payTo,
    },
    description,
  };
}
