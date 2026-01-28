/**
 * OAuth Handler
 *
 * Universal OAuth 2.0 flow handler for social media platform integrations.
 * Supports Meta (Facebook/Instagram), TikTok, and LinkedIn.
 */

import { randomBytes } from 'crypto';
import type {
  IntegratedPlatform,
  OAuthUrlResponse,
  OAuthCallbackParams,
} from '@/types/platform-integrations';

/**
 * OAuth configuration for each platform
 */
interface PlatformOAuthConfig {
  /** OAuth authorization endpoint */
  authUrl: string;

  /** OAuth token endpoint */
  tokenUrl: string;

  /** Required scopes */
  scopes: string[];

  /** Client ID (from environment) */
  clientId: string;

  /** Client secret (from environment) */
  clientSecret: string;

  /** Redirect URI */
  redirectUri: string;
}

/**
 * Get OAuth configuration for a platform
 */
function getPlatformConfig(platform: IntegratedPlatform): PlatformOAuthConfig {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/oauth/callback/${platform}`;

  switch (platform) {
    case 'meta':
      return {
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        scopes: [
          'instagram_basic',
          'instagram_manage_insights',
          'pages_read_engagement',
          'pages_show_list',
        ],
        clientId: process.env.META_APP_ID || '',
        clientSecret: process.env.META_APP_SECRET || '',
        redirectUri,
      };

    case 'tiktok':
      return {
        authUrl: 'https://www.tiktok.com/v2/auth/authorize',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        scopes: ['user.info.basic', 'video.list', 'video.insights'],
        clientId: process.env.TIKTOK_CLIENT_KEY || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        redirectUri,
      };

    case 'linkedin':
      return {
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        scopes: [
          'r_organization_social',
          'rw_organization_admin',
          'r_basicprofile',
          'r_organization_followers',
        ],
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri,
      };

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Generate a secure random state parameter for CSRF protection
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(
  platform: IntegratedPlatform,
  state: string
): OAuthUrlResponse {
  const config = getPlatformConfig(platform);

  // Validate configuration
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Missing OAuth credentials for platform: ${platform}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    response_type: 'code',
  });

  // Platform-specific parameters
  if (platform === 'tiktok') {
    params.set('response_type', 'code');
  }

  if (platform === 'linkedin') {
    params.set('response_type', 'code');
  }

  const authUrl = `${config.authUrl}?${params.toString()}`;

  return {
    authUrl,
    state,
  };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  platform: IntegratedPlatform,
  authCode: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}> {
  const config = getPlatformConfig(platform);

  // Build token request parameters
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: authCode,
    redirect_uri: config.redirectUri,
  });

  // Platform-specific parameters
  if (platform === 'meta') {
    params.set('grant_type', 'authorization_code');
  }

  if (platform === 'tiktok') {
    params.set('grant_type', 'authorization_code');
  }

  if (platform === 'linkedin') {
    params.set('grant_type', 'authorization_code');
  }

  // Exchange code for token
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  // Normalize response across platforms
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
    tokenType: data.token_type || 'Bearer',
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  platform: IntegratedPlatform,
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const config = getPlatformConfig(platform);

  // TikTok doesn't support refresh tokens
  if (platform === 'tiktok') {
    throw new Error('TikTok does not support token refresh. User must re-authorize.');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Revoke an access token (logout/disconnect)
 */
export async function revokeAccessToken(
  platform: IntegratedPlatform,
  accessToken: string
): Promise<void> {
  switch (platform) {
    case 'meta': {
      // Meta token revocation
      const url = `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`;
      await fetch(url, { method: 'DELETE' });
      break;
    }

    case 'tiktok': {
      // TikTok token revocation
      const config = getPlatformConfig(platform);
      const params = new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        token: accessToken,
      });
      await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      break;
    }

    case 'linkedin': {
      // LinkedIn token revocation
      const config = getPlatformConfig(platform);
      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token: accessToken,
      });
      await fetch('https://www.linkedin.com/oauth/v2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      break;
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(
  receivedState: string,
  expectedState: string
): boolean {
  return receivedState === expectedState;
}

/**
 * Calculate token expiration timestamp
 */
export function calculateTokenExpiration(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

/**
 * Check if token is expired or will expire soon
 */
export function isTokenExpired(expiresAt: number, bufferMinutes = 5): boolean {
  const bufferMs = bufferMinutes * 60 * 1000;
  return Date.now() + bufferMs >= expiresAt;
}
