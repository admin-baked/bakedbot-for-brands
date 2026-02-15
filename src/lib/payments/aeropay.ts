/**
 * Aeropay Payment Integration Client
 *
 * Based on Aeropay API Documentation (https://dev.aero.inc/docs)
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created Aeropay API client library for OAuth authentication, user management,
 * bank account linking via Aerosync, and transaction processing.
 * Supports both sandbox and production environments.
 * Transaction fee (50 cents) added to maintain parity with CannPay.
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface AeropayConfig {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  webhookSecret?: string;
}

export interface OAuthTokenRequest {
  scope: 'merchant' | 'userForMerchant';
  userId?: string; // Required for userForMerchant scope
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number; // seconds until expiration
  scope: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface AeropayUser {
  userId: string; // Aeropay's user ID
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AggregatorCredentialsRequest {
  userId: string;
}

export interface AggregatorCredentialsResponse {
  aggregatorUrl: string; // Aerosync widget URL
  linkToken: string;
  expiresAt: string;
}

export interface LinkBankAccountRequest {
  userId: string;
  aggregatorAccountId: string; // From Aerosync widget callback
}

export interface BankAccount {
  id: string; // Aeropay bank account ID
  bankName: string;
  accountType: 'checking' | 'savings';
  last4: string;
  status: 'active' | 'suspended';
  isDefault: boolean;
}

export interface LinkBankAccountResponse {
  bankAccountId: string;
  bankAccount: BankAccount;
  userId: string;
}

export interface CreateTransactionRequest {
  userId: string;
  bankAccountId: string;
  amount: number; // in cents (e.g., 10000 = $100.00)
  merchantId: string;
  merchantOrderId: string; // BakedBot order ID
  description?: string;
}

export interface AeropayTransaction {
  transactionId: string;
  userId: string;
  merchantId: string;
  amount: number; // in cents
  status: 'pending' | 'completed' | 'declined' | 'voided' | 'refunded';
  merchantOrderId: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface VoidTransactionRequest {
  transactionId: string;
  reason?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const SANDBOX_BASE_URL = 'https://api.sandbox-pay.aero.inc';
const PRODUCTION_BASE_URL = 'https://api.aeropay.com';

const API_VERSION = '2023-06-05';

/**
 * In-memory OAuth token cache
 * Format: { [scope-userId]: { token, expiresAt } }
 */
const tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

/**
 * Get Aeropay configuration from environment variables
 */
function getAeropayConfig(): AeropayConfig {
  const clientId = process.env.AEROPAY_CLIENT_ID;
  const clientSecret = process.env.AEROPAY_CLIENT_SECRET;
  const merchantId = process.env.AEROPAY_MERCHANT_ID;
  const webhookSecret = process.env.AEROPAY_WEBHOOK_SECRET;
  const environmentValue = (process.env.AEROPAY_ENVIRONMENT || 'sandbox').toLowerCase();
  const environment: 'sandbox' | 'production' =
    environmentValue === 'production' ? 'production' : 'sandbox';

  if (!clientId) {
    throw new Error('[AEROPAY] AEROPAY_CLIENT_ID environment variable is required');
  }
  if (!clientSecret) {
    throw new Error('[AEROPAY] AEROPAY_CLIENT_SECRET environment variable is required');
  }
  if (!merchantId) {
    throw new Error('[AEROPAY] AEROPAY_MERCHANT_ID environment variable is required');
  }

  return {
    clientId,
    clientSecret,
    merchantId,
    environment,
    webhookSecret,
  };
}

/**
 * Get base URL based on environment
 */
function getBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

/**
 * Generate cache key for token storage
 */
function getTokenCacheKey(scope: string, userId?: string): string {
  return userId ? `${scope}-${userId}` : scope;
}

// ============================================================================
// OAuth Token Management
// ============================================================================

/**
 * Get OAuth access token with specified scope
 * Uses in-memory cache to avoid unnecessary API calls
 *
 * POST /token
 *
 * @example
 * const token = await getOAuthToken({ scope: 'merchant' });
 * // Returns: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 */
export async function getOAuthToken(request: OAuthTokenRequest): Promise<string> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const cacheKey = getTokenCacheKey(request.scope, request.userId);

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug('[AEROPAY] Using cached OAuth token', { scope: request.scope });
    return cached.token;
  }

  // Prepare request payload
  const payload: any = {
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: request.scope,
  };

  // Add userId for userForMerchant scope
  if (request.scope === 'userForMerchant') {
    if (!request.userId) {
      throw new Error('[AEROPAY] userId is required for userForMerchant scope');
    }
    payload.user_id = request.userId;
  }

  const response = await fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] OAuth token request failed', {
      status: response.status,
      error: errorText,
      scope: request.scope,
    });
    throw new Error(`[AEROPAY] OAuth token request failed (${response.status}): ${errorText}`);
  }

  const data: OAuthTokenResponse = await response.json();

  // Cache token (expires 30 seconds before actual expiration for safety)
  const expiresAt = Date.now() + (data.expires_in - 30) * 1000;
  tokenCache.set(cacheKey, { token: data.access_token, expiresAt });

  logger.info('[AEROPAY] OAuth token obtained', {
    scope: request.scope,
    expiresIn: data.expires_in,
  });

  return data.access_token;
}

/**
 * Clear token cache (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
  logger.debug('[AEROPAY] Token cache cleared');
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Create Aeropay user associated with merchant
 *
 * POST /user
 *
 * @example
 * const user = await createAeropayUser({
 *   email: 'customer@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * // Returns: { userId: 'usr_123...', email: '...', ... }
 */
export async function createAeropayUser(request: CreateUserRequest): Promise<AeropayUser> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'merchant' });

  const payload = {
    email: request.email,
    firstName: request.firstName,
    lastName: request.lastName,
    ...(request.phoneNumber && { phoneNumber: request.phoneNumber }),
    merchantId: config.merchantId,
  };

  const response = await fetch(`${baseUrl}/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Create user failed', {
      status: response.status,
      error: errorText,
      email: request.email,
    });
    throw new Error(`[AEROPAY] Create user failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  logger.info('[AEROPAY] User created successfully', {
    userId: data.userId,
    email: request.email,
  });

  return {
    userId: data.userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    status: data.status || 'active',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * Get user details
 *
 * GET /user
 */
export async function getAeropayUser(userId: string): Promise<AeropayUser> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'userForMerchant', userId });

  const response = await fetch(`${baseUrl}/user?userId=${userId}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Get user failed', {
      status: response.status,
      error: errorText,
      userId,
    });
    throw new Error(`[AEROPAY] Get user failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    userId: data.userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    status: data.status,
    createdAt: data.createdAt,
  };
}

// ============================================================================
// Bank Account Linking (Aerosync Integration)
// ============================================================================

/**
 * Get aggregator credentials for bank linking via Aerosync widget
 *
 * GET /aggregatorCredentials
 *
 * @example
 * const { aggregatorUrl, linkToken } = await getAggregatorCredentials({ userId: 'usr_123' });
 * // Display aggregatorUrl in iframe for customer to link bank account
 */
export async function getAggregatorCredentials(
  request: AggregatorCredentialsRequest
): Promise<AggregatorCredentialsResponse> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'userForMerchant', userId: request.userId });

  const response = await fetch(`${baseUrl}/aggregatorCredentials?userId=${request.userId}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Get aggregator credentials failed', {
      status: response.status,
      error: errorText,
      userId: request.userId,
    });
    throw new Error(
      `[AEROPAY] Get aggregator credentials failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  logger.info('[AEROPAY] Aggregator credentials obtained', {
    userId: request.userId,
    expiresAt: data.expiresAt,
  });

  return {
    aggregatorUrl: data.aggregatorUrl,
    linkToken: data.linkToken,
    expiresAt: data.expiresAt,
  };
}

/**
 * Link bank account after Aerosync widget completion
 *
 * POST /linkAccountFromAggregator
 *
 * @example
 * const result = await linkBankAccount({
 *   userId: 'usr_123',
 *   aggregatorAccountId: 'acct_456' // From Aerosync widget callback
 * });
 * // Returns: { bankAccountId: 'ba_789', bankAccount: { ... } }
 */
export async function linkBankAccount(
  request: LinkBankAccountRequest
): Promise<LinkBankAccountResponse> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'userForMerchant', userId: request.userId });

  const payload = {
    userId: request.userId,
    aggregatorAccountId: request.aggregatorAccountId,
    aggregator: 'aerosync', // Aeropay's default aggregator
  };

  const response = await fetch(`${baseUrl}/linkAccountFromAggregator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Link bank account failed', {
      status: response.status,
      error: errorText,
      userId: request.userId,
    });
    throw new Error(`[AEROPAY] Link bank account failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  logger.info('[AEROPAY] Bank account linked successfully', {
    userId: request.userId,
    bankAccountId: data.bankAccountId,
  });

  return {
    bankAccountId: data.bankAccountId,
    userId: data.userId,
    bankAccount: {
      id: data.bankAccountId,
      bankName: data.bankName || 'Unknown Bank',
      accountType: data.accountType || 'checking',
      last4: data.last4 || '****',
      status: data.status || 'active',
      isDefault: data.isDefault !== undefined ? data.isDefault : true,
    },
  };
}

// ============================================================================
// Transaction Processing
// ============================================================================

/**
 * Create Aeropay transaction (payment from user to merchant)
 *
 * POST /transaction
 *
 * @example
 * const transaction = await createTransaction({
 *   userId: 'usr_123',
 *   bankAccountId: 'ba_789',
 *   amount: 10050, // $100.50 (includes $0.50 fee)
 *   merchantId: 'merchant_456',
 *   merchantOrderId: 'order_abc123',
 *   description: 'Cannabis order #123'
 * });
 * // Returns: { transactionId: 'txn_xyz', status: 'pending', ... }
 */
export async function createTransaction(
  request: CreateTransactionRequest
): Promise<AeropayTransaction> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'userForMerchant', userId: request.userId });

  // Generate UUID for transaction (required by Aeropay)
  const uuid = crypto.randomUUID();

  const payload = {
    merchantId: request.merchantId,
    amount: (request.amount / 100).toFixed(2), // Convert cents to dollars with 2 decimals
    uuid,
    description: request.description || `Order ${request.merchantOrderId}`,
    merchantOrderId: request.merchantOrderId,
    bankAccountId: request.bankAccountId,
  };

  const response = await fetch(`${baseUrl}/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Create transaction failed', {
      status: response.status,
      error: errorText,
      merchantOrderId: request.merchantOrderId,
      amount: request.amount,
    });
    throw new Error(`[AEROPAY] Create transaction failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  logger.info('[AEROPAY] Transaction created successfully', {
    transactionId: data.transactionId,
    merchantOrderId: request.merchantOrderId,
    amount: request.amount,
    status: data.status,
  });

  return {
    transactionId: data.transactionId,
    userId: request.userId,
    merchantId: request.merchantId,
    amount: request.amount,
    status: data.status || 'pending',
    merchantOrderId: request.merchantOrderId,
    description: request.description,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt,
    completedAt: data.completedAt,
  };
}

/**
 * Get transaction details
 *
 * GET /transaction
 */
export async function getTransactionDetails(transactionId: string): Promise<AeropayTransaction> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'merchant' });

  const response = await fetch(`${baseUrl}/transaction?transactionId=${transactionId}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Get transaction details failed', {
      status: response.status,
      error: errorText,
      transactionId,
    });
    throw new Error(
      `[AEROPAY] Get transaction details failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  return {
    transactionId: data.transactionId,
    userId: data.userId,
    merchantId: data.merchantId,
    amount: Math.round(parseFloat(data.amount) * 100), // Convert dollars to cents
    status: data.status,
    merchantOrderId: data.merchantOrderId,
    description: data.description,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt,
  };
}

/**
 * Void (reverse/refund) an Aeropay transaction
 *
 * GET /reverseTransaction
 */
export async function voidTransaction(request: VoidTransactionRequest): Promise<void> {
  const config = getAeropayConfig();
  const baseUrl = getBaseUrl(config.environment);
  const token = await getOAuthToken({ scope: 'merchant' });

  const url = new URL(`${baseUrl}/reverseTransaction`);
  url.searchParams.append('transactionId', request.transactionId);
  if (request.reason) {
    url.searchParams.append('reason', request.reason);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-AP-Version': API_VERSION,
      'authorizationToken': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AEROPAY] Void transaction failed', {
      status: response.status,
      error: errorText,
      transactionId: request.transactionId,
    });
    throw new Error(`[AEROPAY] Void transaction failed (${response.status}): ${errorText}`);
  }

  logger.info('[AEROPAY] Transaction voided successfully', {
    transactionId: request.transactionId,
    reason: request.reason,
  });
}

// ============================================================================
// Constants for use in other files
// ============================================================================

export const AEROPAY_TRANSACTION_FEE_CENTS = 50; // $0.50 platform transaction fee (matches CannPay)
