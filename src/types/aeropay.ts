/**
 * Aeropay Type Definitions
 *
 * Types for Aeropay payment integration including user management,
 * bank accounts, transactions, and webhook events.
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Firestore Document Types
// ============================================================================

/**
 * Aeropay User Document (Firestore: aeropay_users/{userId})
 *
 * Maps BakedBot user IDs to Aeropay user IDs and stores linked bank accounts.
 * Document ID is the BakedBot userId (Firebase Auth UID).
 */
export interface AeropayUserDoc {
  /** BakedBot user ID (Firebase Auth UID) */
  userId: string;

  /** Aeropay's user ID */
  aeropayUserId: string;

  /** User email address */
  email: string;

  /** User first name */
  firstName: string;

  /** User last name */
  lastName: string;

  /** User phone number (optional) */
  phoneNumber?: string;

  /** Linked bank accounts */
  bankAccounts: AeropayBankAccount[];

  /** Default bank account ID for transactions */
  defaultBankAccountId?: string;

  /** User status in Aeropay system */
  status: 'active' | 'suspended';

  /** When the Aeropay user was created */
  createdAt: Timestamp;

  /** Last updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Aeropay Bank Account (Embedded in AeropayUserDoc)
 */
export interface AeropayBankAccount {
  /** Aeropay bank account ID */
  id: string;

  /** Bank name (e.g., "Wells Fargo") */
  bankName: string;

  /** Account type */
  accountType: 'checking' | 'savings';

  /** Last 4 digits of account number */
  last4: string;

  /** Account status */
  status: 'active' | 'suspended';

  /** Whether this is the default account for transactions */
  isDefault: boolean;

  /** When the bank account was linked */
  linkedAt: Timestamp;
}

/**
 * Aeropay Transaction Document (Firestore: aeropay_transactions/{transactionId})
 *
 * Audit trail for all Aeropay transactions.
 * Document ID is the Aeropay transactionId.
 */
export interface AeropayTransactionDoc {
  /** Aeropay transaction ID */
  transactionId: string;

  /** BakedBot order ID */
  orderId: string;

  /** BakedBot user ID (Firebase Auth UID) */
  userId: string;

  /** Aeropay user ID */
  aeropayUserId: string;

  /** Aeropay bank account ID used for payment */
  bankAccountId: string;

  /** Aeropay merchant ID */
  merchantId: string;

  /** Transaction amount in cents */
  amount: number;

  /** Transaction fee in cents (default: 50) */
  fee: number;

  /** Transaction status */
  status: 'pending' | 'completed' | 'declined' | 'voided' | 'refunded';

  /** Merchant order ID (same as orderId) */
  merchantOrderId: string;

  /** Transaction description */
  description?: string;

  /** When the transaction was created */
  createdAt: Timestamp;

  /** Last updated timestamp */
  updatedAt: Timestamp;

  /** When the transaction completed (if completed) */
  completedAt?: Timestamp;

  /** Webhook events received for this transaction (append-only log) */
  webhookEvents: AeropayWebhookEvent[];
}

// ============================================================================
// Webhook Event Types
// ============================================================================

/**
 * Aeropay Webhook Event
 *
 * Based on Aeropay webhook documentation:
 * https://dev.aero.inc/docs/webhooks-1
 */
export interface AeropayWebhookEvent {
  /** Webhook event type */
  topic:
    | 'transaction_completed'
    | 'transaction_declined'
    | 'transaction_voided'
    | 'transaction_refunded'
    | 'preauthorized_transaction_created'
    | 'user_suspended'
    | 'user_active'
    | 'merchant_reputation_updated';

  /** Event data (varies by topic) */
  data: AeropayWebhookData;

  /** Event timestamp (ISO 8601 format) */
  date: string;
}

/**
 * Aeropay Webhook Data (union type based on topic)
 */
export type AeropayWebhookData =
  | AeropayTransactionWebhookData
  | AeropayUserWebhookData
  | AeropayMerchantWebhookData;

/**
 * Transaction Webhook Data
 * (transaction_completed, transaction_declined, transaction_voided, transaction_refunded)
 */
export interface AeropayTransactionWebhookData {
  transactionId: string;
  userId: string;
  merchantId: string;
  amount: string; // Dollar amount as string (e.g., "100.50")
  status: 'completed' | 'declined' | 'voided' | 'refunded';
  merchantOrderId?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

/**
 * User Webhook Data
 * (user_suspended, user_active)
 */
export interface AeropayUserWebhookData {
  userId: string;
  status: 'suspended' | 'active';
  reason?: string;
  updatedAt: string;
}

/**
 * Merchant Reputation Webhook Data
 * (merchant_reputation_updated)
 */
export interface AeropayMerchantWebhookData {
  merchantId: string;
  reputationScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  updatedAt: string;
}

// ============================================================================
// Order Integration Types
// ============================================================================

/**
 * Aeropay fields for OrderDoc
 * (to be added to src/types/orders.ts)
 */
export interface OrderAeropayData {
  /** Aeropay transaction ID */
  transactionId: string;

  /** Aeropay user ID */
  userId: string;

  /** Aeropay bank account ID */
  bankAccountId: string;

  /** Transaction status */
  status: 'pending' | 'completed' | 'declined' | 'voided' | 'refunded';

  /** Transaction amount in cents (includes fee) */
  amount: number;

  /** Transaction fee in cents */
  fee: number;

  /** When the payment was authorized */
  authorizedAt?: string;

  /** When the payment completed */
  completedAt?: string;

  /** Merchant order ID */
  merchantOrderId?: string;
}

// ============================================================================
// Location Payment Configuration Types
// ============================================================================

/**
 * Aeropay configuration for Location
 * (to be added to src/types/location.ts)
 */
export interface LocationAeropayConfig {
  /** Whether Aeropay is enabled for this location */
  enabled: boolean;

  /** Aeropay merchant ID for this location */
  merchantId: string;

  /** Environment (sandbox or production) */
  environment: 'sandbox' | 'production';
}

/**
 * Payment configuration for Location
 * (to be added to src/types/location.ts)
 */
export interface PaymentConfig {
  /** Enabled payment methods */
  enabledMethods: Array<'dispensary_direct' | 'cannpay' | 'credit_card' | 'aeropay'>;

  /** Default payment method (optional - user must select if not set) */
  defaultMethod?: 'dispensary_direct' | 'cannpay' | 'credit_card' | 'aeropay';

  /** Aeropay configuration */
  aeropay?: LocationAeropayConfig;

  /** CannPay configuration */
  cannpay?: {
    enabled: boolean;
    integratorId: string;
    environment: 'sandbox' | 'live';
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to authorize Aeropay payment
 * (POST /api/checkout/aeropay/authorize)
 */
export interface AuthorizeAeropayRequest {
  orderId: string;
  amount: number; // in cents
  organizationId?: string;
  bankAccountId?: string; // Optional: use specific bank account
}

/**
 * Response from authorize endpoint - requires bank linking
 */
export interface AuthorizeAeropayResponseBankLink {
  requiresBankLink: true;
  aerosyncUrl: string;
  linkToken: string;
  aeropayUserId: string;
}

/**
 * Response from authorize endpoint - bank already linked
 */
export interface AuthorizeAeropayResponseTransaction {
  requiresBankLink: false;
  transactionId: string;
  status: 'pending';
  totalAmount: number; // amount + fee
  transactionFee: number;
}

/**
 * Union type for authorize response
 */
export type AuthorizeAeropayResponse =
  | AuthorizeAeropayResponseBankLink
  | AuthorizeAeropayResponseTransaction;

/**
 * Request to link bank account
 * (POST /api/checkout/aeropay/link-bank)
 */
export interface LinkBankAccountRequest {
  userId: string; // BakedBot user ID
  aeropayUserId: string;
  aggregatorAccountId: string;
}

/**
 * Response from link bank account
 */
export interface LinkBankAccountResponse {
  success: boolean;
  bankAccountId: string;
  bankAccount: AeropayBankAccount;
}

/**
 * Request to get transaction status
 * (POST /api/checkout/aeropay/status)
 */
export interface GetTransactionStatusRequest {
  transactionId: string;
}

/**
 * Response from transaction status endpoint
 */
export interface GetTransactionStatusResponse {
  transactionId: string;
  status: 'pending' | 'completed' | 'declined' | 'voided' | 'refunded';
  amount: number;
  updatedAt: string;
}
