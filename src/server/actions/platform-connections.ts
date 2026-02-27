'use server';

/**
 * Platform Connections Server Actions
 *
 * Handles OAuth connections to social media platforms,
 * secure credential storage, and connection management.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  exchangeCodeForToken,
  refreshAccessToken,
  revokeAccessToken,
  calculateTokenExpiration,
  isTokenExpired,
  generateAuthUrl,
  generateOAuthState,
} from '@/lib/integrations/oauth-handler';
import type {
  IntegratedPlatform,
  PlatformConnection,
  ConnectPlatformRequest,
  DisconnectPlatformRequest,
  PlatformConnectionStatusResponse,
  OAuthUrlResponse,
} from '@/types/platform-integrations';

function isSuperRole(role: unknown): boolean {
  return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const token = user as {
    currentOrgId?: string;
    orgId?: string;
    brandId?: string;
    tenantId?: string;
    organizationId?: string;
  };
  return (
    token.currentOrgId ||
    token.orgId ||
    token.brandId ||
    token.tenantId ||
    token.organizationId ||
    null
  );
}

async function assertTenantAccess(tenantId: string): Promise<void> {
  const user = await requireUser();
  const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
  if (isSuperRole(role)) return;

  const actorOrgId = getActorOrgId(user);
  if (!actorOrgId || actorOrgId !== tenantId) {
    throw new Error('Unauthorized');
  }
}

/**
 * Simple encryption for access tokens
 * TODO: Replace with proper encryption using Firebase App Check or KMS
 */
function encryptToken(token: string): string {
  // For now, just base64 encode
  // In production, use proper encryption
  return Buffer.from(token).toString('base64');
}

function decryptToken(encryptedToken: string): string {
  // For now, just base64 decode
  // In production, use proper decryption
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

/**
 * Generate OAuth authorization URL
 */
export async function getOAuthUrl(
  platform: IntegratedPlatform,
  tenantId: string
): Promise<{ success: boolean; authUrl?: string; state?: string; error?: string }> {
  try {
    await assertTenantAccess(tenantId);

    // Generate secure state
    const state = generateOAuthState();

    // Store state in Firestore for verification (expires in 10 minutes)
    const db = getAdminFirestore();
    await db.collection('oauth_states').doc(state).set({
      platform,
      tenantId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Generate authorization URL
    const { authUrl } = generateAuthUrl(platform, state);

    logger.info('Generated OAuth URL', { platform, tenantId });

    return {
      success: true,
      authUrl,
      state,
    };
  } catch (error) {
    logger.error('Failed to generate OAuth URL', { error, platform, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate authorization URL',
    };
  }
}

/**
 * Connect a social media platform
 */
export async function connectPlatform(
  request: ConnectPlatformRequest
): Promise<{ success: boolean; error?: string; connectionId?: string }> {
  const { platform, tenantId, authCode, state } = request;

  try {
    await assertTenantAccess(tenantId);

    const db = getAdminFirestore();

    // Verify state parameter
    if (state) {
      const stateDoc = await db.collection('oauth_states').doc(state).get();
      if (!stateDoc.exists) {
        throw new Error('Invalid or expired authorization state');
      }

      const stateData = stateDoc.data();
      if (stateData?.tenantId !== tenantId || stateData?.platform !== platform) {
        throw new Error('State parameter mismatch');
      }

      // Delete used state
      await stateDoc.ref.delete();
    }

    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(platform, authCode);

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : undefined;

    // Calculate expiration
    const expiresAt = calculateTokenExpiration(tokenData.expiresIn);

    // Fetch account info from platform
    const metadata = await fetchAccountMetadata(platform, tokenData.accessToken);

    // Create or update connection document
    const connectionRef = db.collection('platform_connections').doc();
    const connection: PlatformConnection = {
      id: connectionRef.id,
      tenantId,
      platform,
      status: 'connected',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      connectedAt: Date.now(),
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await connectionRef.set(connection);

    logger.info('Platform connected successfully', {
      platform,
      tenantId,
      connectionId: connection.id,
    });

    return {
      success: true,
      connectionId: connection.id,
    };
  } catch (error) {
    logger.error('Failed to connect platform', { error, platform, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect platform',
    };
  }
}

/**
 * Disconnect a social media platform
 */
export async function disconnectPlatform(
  request: DisconnectPlatformRequest
): Promise<{ success: boolean; error?: string }> {
  const { platform, tenantId } = request;

  try {
    await assertTenantAccess(tenantId);

    const db = getAdminFirestore();

    // Find existing connection
    const snapshot = await db
      .collection('platform_connections')
      .where('tenantId', '==', tenantId)
      .where('platform', '==', platform)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('No connection found for this platform');
    }

    const connectionDoc = snapshot.docs[0];
    const connection = connectionDoc.data() as PlatformConnection;

    // Decrypt access token and revoke it
    const accessToken = decryptToken(connection.accessToken);
    await revokeAccessToken(platform, accessToken);

    // Delete connection document
    await connectionDoc.ref.delete();

    logger.info('Platform disconnected successfully', { platform, tenantId });

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Failed to disconnect platform', { error, platform, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect platform',
    };
  }
}

/**
 * Get platform connection status
 */
export async function getPlatformConnectionStatus(
  tenantId: string,
  platform: IntegratedPlatform
): Promise<{ success: boolean; status?: PlatformConnectionStatusResponse; error?: string }> {
  try {
    await assertTenantAccess(tenantId);

    const db = getAdminFirestore();

    // Find existing connection
    const snapshot = await db
      .collection('platform_connections')
      .where('tenantId', '==', tenantId)
      .where('platform', '==', platform)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        success: true,
        status: {
          platform,
          status: 'disconnected',
        },
      };
    }

    const connection = snapshot.docs[0].data() as PlatformConnection;

    // Check if token is expired
    const expired = isTokenExpired(connection.expiresAt);

    const daysUntilExpiration = Math.floor(
      (connection.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      success: true,
      status: {
        platform,
        status: expired ? 'error' : connection.status,
        accountInfo: connection.metadata
          ? {
              id: connection.metadata.accountId || connection.metadata.openId || connection.metadata.organizationUrn || '',
              name: connection.metadata.accountName || connection.metadata.displayName || connection.metadata.organizationName || '',
              type: connection.metadata.accountType,
            }
          : undefined,
        lastSyncedAt: connection.lastSyncedAt,
        error: expired ? 'Token expired. Please reconnect.' : connection.error,
        expiresAt: connection.expiresAt,
        daysUntilExpiration: expired ? 0 : daysUntilExpiration,
      },
    };
  } catch (error) {
    logger.error('Failed to get platform status', { error, platform, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get connection status',
    };
  }
}

/**
 * Refresh platform connection token
 */
export async function refreshPlatformToken(
  tenantId: string,
  platform: IntegratedPlatform
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertTenantAccess(tenantId);

    const db = getAdminFirestore();

    // Find existing connection
    const snapshot = await db
      .collection('platform_connections')
      .where('tenantId', '==', tenantId)
      .where('platform', '==', platform)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('No connection found for this platform');
    }

    const connectionDoc = snapshot.docs[0];
    const connection = connectionDoc.data() as PlatformConnection;

    if (!connection.refreshToken) {
      throw new Error('No refresh token available. User must re-authorize.');
    }

    // Decrypt refresh token
    const refreshToken = decryptToken(connection.refreshToken);

    // Refresh access token
    const tokenData = await refreshAccessToken(platform, refreshToken);

    // Encrypt new tokens
    const encryptedAccessToken = encryptToken(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : connection.refreshToken;

    // Update connection
    await connectionDoc.ref.update({
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: calculateTokenExpiration(tokenData.expiresIn),
      status: 'connected',
      error: null,
      updatedAt: Date.now(),
    });

    logger.info('Token refreshed successfully', { platform, tenantId });

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Failed to refresh token', { error, platform, tenantId });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Update connection status to error
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('platform_connections')
      .where('tenantId', '==', tenantId)
      .where('platform', '==', platform)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        status: 'error',
        error: 'Token refresh failed. Please reconnect.',
        updatedAt: Date.now(),
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh token',
    };
  }
}

/**
 * Fetch account metadata from platform
 */
async function fetchAccountMetadata(
  platform: IntegratedPlatform,
  accessToken: string
): Promise<PlatformConnection['metadata']> {
  try {
    switch (platform) {
      case 'meta': {
        // Fetch Facebook Page or Instagram Business Account info
        const response = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
        );
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          const account = data.data[0];
          return {
            accountId: account.id,
            accountName: account.name,
            accountType: 'page',
          };
        }
        break;
      }

      case 'tiktok': {
        // Fetch TikTok user info
        const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (data.data) {
          return {
            openId: data.data.open_id,
            displayName: data.data.display_name,
          };
        }
        break;
      }

      case 'linkedin': {
        // Fetch LinkedIn organization info
        const response = await fetch('https://api.linkedin.com/v2/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (data.id) {
          return {
            organizationUrn: data.id,
            organizationName: data.localizedFirstName + ' ' + data.localizedLastName,
          };
        }
        break;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch account metadata', { error, platform });
  }

  return undefined;
}

/**
 * Get decrypted access token for a platform (internal use only)
 */
export async function getDecryptedAccessToken(
  tenantId: string,
  platform: IntegratedPlatform
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    await assertTenantAccess(tenantId);

    const db = getAdminFirestore();

    // Find existing connection
    const snapshot = await db
      .collection('platform_connections')
      .where('tenantId', '==', tenantId)
      .where('platform', '==', platform)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('No connection found for this platform');
    }

    const connection = snapshot.docs[0].data() as PlatformConnection;

    // Check if token is expired and refresh if needed
    if (isTokenExpired(connection.expiresAt)) {
      const refreshResult = await refreshPlatformToken(tenantId, platform);
      if (!refreshResult.success) {
        throw new Error('Token expired and refresh failed');
      }

      // Re-fetch connection after refresh
      const updatedSnapshot = await db
        .collection('platform_connections')
        .where('tenantId', '==', tenantId)
        .where('platform', '==', platform)
        .limit(1)
        .get();

      if (!updatedSnapshot.empty) {
        const updatedConnection = updatedSnapshot.docs[0].data() as PlatformConnection;
        return {
          success: true,
          accessToken: decryptToken(updatedConnection.accessToken),
        };
      }
    }

    // Decrypt and return access token
    return {
      success: true,
      accessToken: decryptToken(connection.accessToken),
    };
  } catch (error) {
    logger.error('Failed to get decrypted access token', { error, platform, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get access token',
    };
  }
}
