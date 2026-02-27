/**
 * GreenLedger — BakedBot's on-chain financial layer for cannabis commerce.
 *
 * GreenLedger Advance: brands offer early-pay discounts to dispensaries in
 * exchange for upfront USDC deposits. Per-pair CDP escrow wallets hold funds
 * until order settlement, at which point the discounted amount releases to
 * the brand and BakedBot takes its 2% settlement fee.
 *
 * Collections:
 *   greenledger_offers/{offerId}        — brand-published discount offers
 *   greenledger_advances/{advanceId}    — per-pair (brand × dispensary) advance
 *   greenledger_transactions/{txId}     — immutable audit trail
 */

import type { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Offer Tiers
// ============================================================================

export interface OfferTier {
  id: string;
  /** Minimum USDC deposit to qualify for this tier */
  minDepositUsd: number;
  /** Discount in basis points — 700 = 7%, 1000 = 10% */
  discountBps: number;
  /** Days the discount is valid after activation — undefined = indefinite */
  durationDays?: number;
}

// ============================================================================
// GreenLedger Offer (published by a brand org)
// ============================================================================

export type OfferEligibility = 'all' | 'partners_only' | 'specific';
export type OfferStatus = 'draft' | 'active' | 'paused' | 'expired';

export interface GreenLedgerOffer {
  id: string;
  brandOrgId: string;

  /** Denormalized for marketplace display */
  brandName: string;
  brandLogoUrl?: string;
  brandPrimaryColor?: string;

  /** Pitch text shown in the dispensary marketplace */
  description: string;

  /** 1–3 tiers; dispensary picks one when funding */
  tiers: OfferTier[];

  /** Who can see and fund this offer */
  eligibility: OfferEligibility;
  /** Only used when eligibility === 'specific' */
  eligibleOrgIds?: string[];

  /** Optional cap on total USDC committed across all dispensaries */
  maxCommitmentsUsd?: number;
  /** Running total of committed USDC (sum of all active advance deposits) */
  currentCommitmentsUsd: number;

  status: OfferStatus;
  expiresAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// GreenLedger Advance (one per brand × dispensary pair)
// ============================================================================

export type AdvanceStatus =
  | 'pending_deposit'     // escrow wallet created, waiting for USDC
  | 'active'              // funded — discount applies to all settlements
  | 'depleted'            // balance reached $0
  | 'refund_requested'    // dispensary manually requested refund
  | 'auto_refund_pending' // brand removed from vendor list (30-day grace)
  | 'refunded'            // USDC returned to dispensary GreenLedger wallet
  | 'expired';            // offer expired before advance depleted

export interface GreenLedgerAdvance {
  id: string;
  brandOrgId: string;
  dispensaryOrgId: string;
  offerId: string;
  tierId: string;

  /** CDP wallet ID for the per-pair escrow (server signer managed) */
  escrowWalletId: string;
  /** Base mainnet USDC address for this escrow */
  escrowWalletAddress: string;

  // --- Financial state ---
  totalDepositedUsd: number;
  remainingBalanceUsd: number;
  /** Cumulative discount value received by dispensary */
  totalSavedUsd: number;
  /** Discount rate frozen at enrollment time (copied from tier) */
  discountBps: number;

  // --- Lifecycle ---
  status: AdvanceStatus;
  activatedAt?: Timestamp;
  expiresAt?: Timestamp;
  /** Set when partner relationship ends — auto-refund triggers after this */
  autoRefundAt?: Timestamp;
  refundRequestedAt?: Timestamp;
  refundedAt?: Timestamp;
  refundTxHash?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// GreenLedger Transaction (immutable audit trail)
// ============================================================================

export type TransactionType =
  | 'deposit'               // dispensary funded escrow
  | 'settlement_deduction'  // escrow paid out on order settlement
  | 'refund'                // manual refund
  | 'auto_refund';          // automatic refund after partner relationship ends

export interface GreenLedgerTransaction {
  id: string;
  advanceId: string;
  brandOrgId: string;
  dispensaryOrgId: string;

  type: TransactionType;
  /** USDC amount moved */
  amountUsd: number;
  /** Discount amount saved by dispensary (settlement_deduction only) */
  discountAppliedUsd?: number;
  /** Linked order ID (settlement_deduction only) */
  orderId?: string;
  /** On-chain transaction hash */
  txHash?: string;

  createdAt: Timestamp;
}

// ============================================================================
// Discount calculation result (used in settlement hook)
// ============================================================================

export interface AdvanceDiscountResult {
  advanceId: string;
  discountBps: number;
  discountUsd: number;
  /** Amount that will be deducted from the escrow balance */
  escrowDeductionUsd: number;
}

// ============================================================================
// UI / composite types
// ============================================================================

export interface AdvanceWithBrand extends GreenLedgerAdvance {
  brandName: string;
  brandLogoUrl?: string;
  brandPrimaryColor?: string;
  /** Estimated days before advance depletes at current order velocity */
  estimatedDaysRemaining?: number;
}

export interface MarketplaceOffer extends GreenLedgerOffer {
  /** True if dispensary already carries this brand (via vendor_brands) */
  isExistingPartner: boolean;
  /** If dispensary already has an active advance with this brand */
  existingAdvance?: GreenLedgerAdvance;
  /** Estimated annual savings based on this dispensary's order velocity */
  estimatedAnnualSavingsUsd?: number;
}

// ============================================================================
// Action input types
// ============================================================================

export interface CreateOfferInput {
  description: string;
  tiers: Omit<OfferTier, 'id'>[];
  eligibility: OfferEligibility;
  eligibleOrgIds?: string[];
  maxCommitmentsUsd?: number;
  /** ISO date string, optional */
  expiresAt?: string;
}

export interface InitiateAdvanceInput {
  offerId: string;
  tierId: string;
}

// ============================================================================
// Dashboard summary types
// ============================================================================

export interface BrandGreenLedgerSummary {
  totalCommittedUsd: number;
  activeAdvancesCount: number;
  paidOutThisMonthUsd: number;
  avgDepositUsd: number;
  /** How many days faster the brand gets paid vs net-30 average */
  cashFlowImprovementDays: number;
}

export interface DispensaryGreenLedgerSummary {
  totalCommittedUsd: number;
  activeAdvancesCount: number;
  savedThisMonthUsd: number;
  savedAllTimeUsd: number;
  avgDiscountPct: number;
}
