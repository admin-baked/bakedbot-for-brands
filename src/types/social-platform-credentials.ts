/**
 * Social Platform Credentials Types
 *
 * Defines types for OAuth connections and platform credentials
 * used for social media posting integration.
 */

import type { SocialPlatform } from './creative-content';

/**
 * Platform connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'expired' | 'error';

/**
 * Encrypted token structure
 */
export interface EncryptedToken {
    /** AES-256-GCM encrypted data */
    encryptedData: string;
    /** Initialization vector */
    iv: string;
    /** Authentication tag */
    authTag: string;
}

/**
 * Platform credentials stored in Firestore
 */
export interface PlatformCredentials {
    /** Social platform identifier */
    platform: SocialPlatform;

    /** Platform-specific account ID */
    accountId: string;

    /** Display name (e.g., "@brandname") */
    accountName: string;

    /** Account avatar URL */
    avatarUrl?: string;

    /** Encrypted access token */
    encryptedToken: EncryptedToken;

    /** Encrypted refresh token (if applicable) */
    encryptedRefreshToken?: EncryptedToken;

    /** Access token expiration timestamp */
    tokenExpiresAt?: number;

    /** OAuth scopes granted */
    scopes: string[];

    /** User who connected the account */
    connectedBy: string;

    /** Connection timestamp */
    connectedAt: number;

    /** Last token refresh timestamp */
    lastRefreshedAt?: number;

    /** Connection status */
    status: 'active' | 'expired' | 'revoked';
}

/**
 * Platform connection info (UI)
 */
export interface PlatformConnection {
    platform: SocialPlatform;
    status: ConnectionStatus;
    accountName?: string;
    accountId?: string;
    avatarUrl?: string;
    connectedAt?: number;
    expiresAt?: number;
    scopes: string[];
}

/**
 * OAuth state token
 */
export interface OAuthState {
    tenantId: string;
    userId: string;
    platform: SocialPlatform;
    nonce: string;
    timestamp: number;
}

/**
 * Publishing result from platform adapter
 */
export interface PublishResult {
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
}

/**
 * Platform posting requirements
 */
export interface PlatformRequirements {
    maxCaptionLength: number;
    maxHashtags: number;
    supportedMediaTypes: ('image' | 'video' | 'carousel')[];
    aspectRatios: string[];
    maxImageSize: number; // bytes
    maxVideoSize: number; // bytes
    maxVideoDuration: number; // seconds
}

/**
 * Refreshed credentials result
 */
export interface RefreshedCredentials {
    encryptedToken: EncryptedToken;
    tokenExpiresAt: number;
    encryptedRefreshToken?: EncryptedToken;
}

/**
 * Platform-specific error
 */
export class PlatformAPIError extends Error {
    constructor(
        public platform: SocialPlatform,
        public code: string,
        message: string,
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'PlatformAPIError';
    }
}
