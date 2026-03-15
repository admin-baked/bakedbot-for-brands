/**
 * Google Wallet Loyalty Card Service
 *
 * Creates and updates Google Wallet Loyalty Classes (per org) and
 * Loyalty Objects (per customer). Returns a signed JWT "Save to Google Wallet" URL.
 *
 * Required secrets (all optional — gracefully stubs when absent):
 *   GOOGLE_WALLET_ISSUER_ID                From Google Pay & Wallet Console
 *   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL    Service account email
 *   GOOGLE_WALLET_SERVICE_ACCOUNT_KEY      Service account private key JSON, base64 encoded
 *
 * Setup steps (once credentials are available):
 *   1. Google Pay & Wallet Console → Loyalty → Create Issuer account
 *   2. Create service account in GCP → grant "Google Wallet Object Issuer" role
 *   3. base64-encode service account JSON key → store in Secret Manager
 */

import { logger } from '@/lib/logger';
import type { WalletPassData } from './types';

const GOOGLE_WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1';

// ==========================================
// Config check
// ==========================================

export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY &&
    !process.env.GOOGLE_WALLET_ISSUER_ID.startsWith('PLACEHOLDER')
  );
}

// ==========================================
// Auth
// ==========================================

async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library');
  const keyJson = Buffer.from(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY!, 'base64').toString(
    'utf-8'
  );
  const key = JSON.parse(keyJson);

  const auth = new GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error('Failed to get Google Wallet access token');
  return tokenResponse.token;
}

async function walletRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${GOOGLE_WALLET_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok && res.status !== 409) {
    // 409 = already exists — treat as success for idempotent creates
    const text = await res.text();
    throw new Error(`Google Wallet API ${method} ${path} failed: ${res.status} ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

// ==========================================
// Loyalty Class (per org — one class, many objects)
// ==========================================

/**
 * Get or create the Loyalty Class for an org.
 * Idempotent — safe to call on every pass generation.
 * Returns the class ID.
 */
export async function getOrCreateLoyaltyClass(
  orgId: string,
  brandName: string,
  brandColor: string,
  logoUrl: string,
  mascotUrl: string
): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google Wallet credentials not configured');

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  // Class ID must be unique per issuer; use org slug
  const classId = `${issuerId}.loyalty_${orgId.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  const classBody = {
    id: classId,
    issuerName: brandName,
    programName: `${brandName} Loyalty`,
    programLogo: {
      sourceUri: { uri: logoUrl },
      contentDescription: { defaultValue: { language: 'en-US', value: `${brandName} Logo` } },
    },
    heroImage: {
      sourceUri: { uri: mascotUrl },
      contentDescription: { defaultValue: { language: 'en-US', value: 'BakedBot Smokey Mascot' } },
    },
    hexBackgroundColor: brandColor,
    reviewStatus: 'UNDER_REVIEW',
    localizedIssuerName: {
      defaultValue: { language: 'en-US', value: brandName },
    },
    localizedProgramName: {
      defaultValue: { language: 'en-US', value: `${brandName} Loyalty` },
    },
    pointsType: {
      label: 'POINTS',
    },
    rewardsTier: 'GOLD',
  };

  try {
    // Try to create; 409 = already exists, which is fine
    await walletRequest('POST', '/loyaltyClass', classBody);
    logger.info('[GoogleWallet] Loyalty class created/confirmed', { classId, orgId });
  } catch (err) {
    // Log but don't fail — class may already exist in a state we can't update
    logger.warn('[GoogleWallet] Loyalty class create/update issue', {
      classId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return classId;
}

// ==========================================
// Loyalty Object (per customer)
// ==========================================

/**
 * Get or create a Loyalty Object for a specific customer.
 * Returns the object ID (stored as CustomerProfile.walletGoogleObjectId).
 */
export async function getOrCreateLoyaltyObject(data: WalletPassData): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google Wallet credentials not configured');

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classId = `${issuerId}.loyalty_${data.orgId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const objectId = `${issuerId}.loyalty_${data.orgId}_${data.customerId}`;

  const objectBody = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    loyaltyPoints: {
      balance: {
        string: data.points.toLocaleString(),
      },
      label: 'Points',
    },
    accountName: data.customerName,
    accountId: data.loyaltyId,
    // Tier shown as reward tier label
    linkedOfferIds: [],
    secondaryLoyaltyPoints: {
      balance: { string: data.tier.toUpperCase() },
      label: 'Tier',
    },
    barcode: {
      type: 'QR_CODE',
      value: data.loyaltyId,
      alternateText: `ID: ${data.loyaltyId}`,
    },
    // Powered-by attribution
    textModulesData: [
      {
        id: 'powered_by',
        header: 'Managed by',
        body: 'BakedBot AI — Cannabis Commerce OS',
      },
    ],
  };

  try {
    await walletRequest('POST', '/loyaltyObject', objectBody);
    logger.info('[GoogleWallet] Loyalty object created', { objectId, customerId: data.customerId });
  } catch (err) {
    // Object already exists — try to update points instead
    logger.debug('[GoogleWallet] Object exists, updating', { objectId });
    await updateLoyaltyObject(objectId, data.points, data.tier);
  }

  return objectId;
}

/**
 * Update points and tier on an existing Google Wallet Loyalty Object.
 * Called after each loyalty sync.
 */
export async function updateLoyaltyObject(
  objectId: string,
  points: number,
  tier: string
): Promise<boolean> {
  if (!isGoogleConfigured()) return false;

  try {
    await walletRequest('PATCH', `/loyaltyObject/${encodeURIComponent(objectId)}`, {
      loyaltyPoints: {
        balance: { string: points.toLocaleString() },
        label: 'Points',
      },
      secondaryLoyaltyPoints: {
        balance: { string: tier.toUpperCase() },
        label: 'Tier',
      },
    });

    logger.info('[GoogleWallet] Loyalty object updated', { objectId, points, tier });
    return true;
  } catch (err) {
    logger.error('[GoogleWallet] Failed to update loyalty object', {
      objectId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ==========================================
// Save URL (JWT)
// ==========================================

/**
 * Generate a "Save to Google Wallet" URL for a customer.
 * The URL embeds a signed JWT containing the loyalty class + object.
 */
export async function generateSaveUrl(data: WalletPassData): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google Wallet credentials not configured');

  const { createSign } = await import('crypto');

  const keyJson = Buffer.from(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY!, 'base64').toString(
    'utf-8'
  );
  const key = JSON.parse(keyJson);

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classId = `${issuerId}.loyalty_${data.orgId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const objectId = await getOrCreateLoyaltyObject(data);

  // Build "Save to Google Wallet" JWT per Google Wallet spec (RS256)
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: key.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [{ id: objectId, classId }],
    },
  };

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(key.private_key, 'base64url');
  const token = `${signingInput}.${signature}`;

  const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

  logger.info('[GoogleWallet] Save URL generated', {
    customerId: data.customerId,
    objectId,
  });

  return saveUrl;
}
