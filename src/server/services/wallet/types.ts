/**
 * Wallet Pass Types
 * Shared types for Apple Wallet and Google Wallet pass generation.
 */

export interface WalletPassData {
  customerId: string;
  orgId: string;
  customerName: string;
  points: number;
  tier: string;
  /** Barcode value — BakedBot's internal customerId (not Alpine IQ) */
  loyaltyId: string;
  brandName: string;
  brandColor: string;       // hex e.g. '#2E7D32'
  logoUrl: string;          // absolute URL to brand logo
  mascotUrl: string;        // absolute URL to Smokey mascot
  serialNumber: string;     // UUID, stored on CustomerProfile.walletPassSerial
  expiresAt?: Date;
}

export interface AppleDeviceRegistration {
  deviceLibraryId: string;
  pushToken: string;
  registeredAt: Date;
}

export interface WalletUpdateResult {
  success: boolean;
  pushSent: number;         // # APNs pushes dispatched
  googleUpdated: boolean;
  error?: string;
}

/** Returned by the /api/wallet/pass endpoint when credentials are absent */
export const WALLET_NOT_CONFIGURED = 'WALLET_NOT_CONFIGURED' as const;
