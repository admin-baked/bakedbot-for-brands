import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// x402 Wallet — CDP-managed per-org USDC wallet on Base
// ============================================================================

export interface X402Wallet {
  orgId: string;
  walletId: string;          // CDP wallet ID (used to re-load wallet for transfers)
  walletAddress: string;     // Ethereum address (Base) — share this for deposits
  usdcBalanceUsd: number;    // Last known Firestore credit balance (NOT on-chain)
  balanceUpdatedAt: Timestamp;
  totalSpentUsd: number;     // Lifetime platform micropayment spend
  totalDepositedUsd: number; // Lifetime USDC deposited
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// x402 Usage — per-call billing record
// ============================================================================

export interface X402Usage {
  id: string;
  orgId: string;
  route: string;             // e.g. '/api/agent/chat'
  agentId?: string;          // which agent was invoked
  amountUsd: number;         // deducted from Firestore balance
  txHash?: string;           // on-chain tx if settlement happened
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Timestamp;
}

// ============================================================================
// x402 Deposit — incoming USDC detected on-chain
// ============================================================================

export interface X402Deposit {
  id: string;
  orgId: string;
  walletAddress: string;
  amountUsd: number;
  txHash: string;
  status: 'pending' | 'credited' | 'failed';
  createdAt: Timestamp;
  creditedAt?: Timestamp;
}

// ============================================================================
// Brand Settlement — dispensary → brand USDC routing on order fulfillment
// ============================================================================

export interface BrandSettlement {
  id: string;
  orderId: string;
  dispensaryOrgId: string;
  brandOrgId: string;
  orderTotal: number;            // full order total (USD)
  brandRevenue: number;          // calculated brand share (wholesale * qty)
  bakedBotFeeUsd: number;        // 2% of brandRevenue
  brandReceivesUsd: number;      // brandRevenue - bakedBotFeeUsd
  dispensaryWalletAddress: string;
  brandWalletAddress: string;
  txHash?: string;               // on-chain transaction hash
  bakedBotTxHash?: string;       // separate tx for BakedBot fee
  status: 'pending' | 'settled' | 'failed' | 'skipped';
  skipReason?: string;           // why settlement was skipped
  itemCount: number;             // number of settlement-eligible items
  createdAt: Timestamp;
  settledAt?: Timestamp;
}

// ============================================================================
// USDC Checkout — customer checkout via USDC QR payment
// ============================================================================

export interface USDCPaymentIntent {
  id: string;                    // orderId
  orgId: string;
  walletAddress: string;         // dispensary wallet to receive USDC
  amountUsdc: number;            // USDC amount (1:1 USD)
  qrCodeDataUrl: string;         // base64 data URL for QR image
  expiresAt: string;             // ISO timestamp (+30 min)
  status: 'pending' | 'confirmed' | 'expired' | 'failed';
  txHash?: string;               // confirmed transaction hash
  createdAt: Timestamp;
}

// ============================================================================
// Route pricing config — used by x402 billing middleware
// ============================================================================

export const X402_ROUTE_PRICING: Record<string, number> = {
  '/api/agent/chat': 0.002,           // $0.002 per agent message
  '/api/jobs/research': 0.25,         // $0.25 per Big Worm deep research task
  '/api/cron/morning-briefing': 0.01, // $0.01 per morning briefing (manual trigger)
  '/api/agent/invoke': 0.005,         // $0.005 per direct agent invocation
};

export const X402_SETTLEMENT_FEE_BPS = 200; // 2% (200 basis points)
export const X402_WHOLESALE_FALLBACK_PCT = 0.55; // 55% of retail if no COGS data
export const USDC_CHECKOUT_EXPIRY_MINUTES = 30;
export const BASE_MAINNET_CHAIN_ID = 'eip155:8453';
export const BASE_SEPOLIA_CHAIN_ID = 'eip155:84532'; // testnet
