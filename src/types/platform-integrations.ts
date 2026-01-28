/**
 * Platform Integration Types
 *
 * Defines types for social media platform OAuth connections,
 * metrics syncing, and API integrations.
 */

/**
 * Supported social platforms for API integration
 */
export type IntegratedPlatform = 'meta' | 'tiktok' | 'linkedin';

/**
 * Platform connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'refreshing';

/**
 * Platform connection credentials and metadata
 * Stored in Firestore with encryption
 */
export interface PlatformConnection {
  /** Unique connection ID */
  id: string;

  /** Tenant/brand ID this connection belongs to */
  tenantId: string;

  /** Platform identifier */
  platform: IntegratedPlatform;

  /** Current connection status */
  status: ConnectionStatus;

  /** OAuth access token (encrypted in Firestore) */
  accessToken: string;

  /** OAuth refresh token if available (encrypted in Firestore) */
  refreshToken?: string;

  /** Token expiration timestamp (ms since epoch) */
  expiresAt: number;

  /** When this connection was established */
  connectedAt: number;

  /** Last successful metrics sync timestamp */
  lastSyncedAt?: number;

  /** Error message if status is 'error' */
  error?: string;

  /** Platform-specific metadata */
  metadata?: {
    /** Meta: Facebook Page ID or Instagram Business Account ID */
    accountId?: string;

    /** Meta: Account name/handle */
    accountName?: string;

    /** Meta: Account type (page, instagram_business) */
    accountType?: string;

    /** TikTok: Open ID */
    openId?: string;

    /** TikTok: Display name */
    displayName?: string;

    /** LinkedIn: Organization URN */
    organizationUrn?: string;

    /** LinkedIn: Organization name */
    organizationName?: string;
  };

  /** Created timestamp */
  createdAt: number;

  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Metrics sync job status
 */
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Background metrics sync job
 */
export interface MetricsSyncJob {
  /** Job ID */
  id: string;

  /** Content item being synced */
  contentId: string;

  /** Tenant ID */
  tenantId: string;

  /** Platform to sync from */
  platform: IntegratedPlatform;

  /** Job status */
  status: SyncJobStatus;

  /** When job started */
  startedAt: number;

  /** When job completed (success or failure) */
  completedAt?: number;

  /** Error message if failed */
  error?: string;

  /** Number of metrics updated */
  metricsUpdated?: number;

  /** Retry count */
  retries: number;

  /** Next retry timestamp if failed */
  nextRetryAt?: number;
}

/**
 * OAuth authorization URL response
 */
export interface OAuthUrlResponse {
  /** Authorization URL to redirect user to */
  authUrl: string;

  /** State parameter for CSRF protection */
  state: string;
}

/**
 * OAuth callback parameters
 */
export interface OAuthCallbackParams {
  /** Authorization code from OAuth provider */
  code: string;

  /** State parameter for verification */
  state: string;

  /** Tenant ID */
  tenantId: string;

  /** Platform identifier */
  platform: IntegratedPlatform;
}

/**
 * Meta Graph API insights response
 */
export interface MetaInsightsResponse {
  data: Array<{
    /** Metric name (e.g., 'impressions', 'reach', 'engagement') */
    name: string;

    /** Time period (e.g., 'lifetime', 'day') */
    period: string;

    /** Metric values */
    values: Array<{
      value: number;
    }>;

    /** Optional title */
    title?: string;

    /** Optional description */
    description?: string;
  }>;

  /** Pagination cursor */
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

/**
 * Meta media object response
 */
export interface MetaMediaResponse {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

/**
 * TikTok analytics response
 */
export interface TikTokInsightsResponse {
  data: {
    /** Video views */
    video_views: number;

    /** Profile views */
    profile_views?: number;

    /** Likes */
    likes: number;

    /** Comments */
    comments: number;

    /** Shares */
    shares: number;

    /** Average watch time (seconds) */
    avg_time_watched?: number;

    /** Total watch time (seconds) */
    total_time_watched?: number;

    /** Reach */
    reach?: number;
  };

  error?: {
    code: string;
    message: string;
  };
}

/**
 * TikTok video info response
 */
export interface TikTokVideoResponse {
  data: {
    videos: Array<{
      id: string;
      create_time: number;
      cover_image_url: string;
      share_url: string;
      video_description: string;
      duration: number;
      height: number;
      width: number;
      title: string;
      embed_html: string;
      embed_link: string;
      like_count: number;
      comment_count: number;
      share_count: number;
      view_count: number;
    }>;
    cursor: number;
    has_more: boolean;
  };

  error?: {
    code: string;
    message: string;
  };
}

/**
 * LinkedIn share statistics response
 */
export interface LinkedInShareStatsResponse {
  elements: Array<{
    /** Share URN */
    share: string;

    /** Total impressions */
    totalShareStatistics: {
      impressionCount?: number;
      clickCount?: number;
      likeCount?: number;
      commentCount?: number;
      shareCount?: number;
      engagement?: number;
      uniqueImpressionsCount?: number;
    };

    /** Organic statistics */
    organizationalEntity?: string;
  }>;

  paging?: {
    count: number;
    start: number;
    links: Array<{
      rel: string;
      href: string;
    }>;
  };
}

/**
 * LinkedIn share response
 */
export interface LinkedInShareResponse {
  id: string;
  text?: {
    text: string;
  };
  created: {
    time: number;
  };
  lastModified?: {
    time: number;
  };
  owner?: string;
  content?: {
    media?: {
      url: string;
      title?: string;
    };
  };
}

/**
 * Platform connection request payload
 */
export interface ConnectPlatformRequest {
  /** Platform to connect */
  platform: IntegratedPlatform;

  /** Tenant ID */
  tenantId: string;

  /** OAuth authorization code */
  authCode: string;

  /** Optional state for CSRF verification */
  state?: string;
}

/**
 * Platform disconnection request
 */
export interface DisconnectPlatformRequest {
  /** Platform to disconnect */
  platform: IntegratedPlatform;

  /** Tenant ID */
  tenantId: string;
}

/**
 * Sync content metrics request
 */
export interface SyncContentMetricsRequest {
  /** Content ID to sync */
  contentId: string;

  /** Tenant ID */
  tenantId: string;

  /** Platform to sync from */
  platform: IntegratedPlatform;

  /** External post ID on the platform */
  externalPostId: string;
}

/**
 * Batch sync request
 */
export interface BatchSyncMetricsRequest {
  /** Tenant ID */
  tenantId: string;

  /** Optional platform filter */
  platform?: IntegratedPlatform;

  /** Maximum number of items to sync */
  limit?: number;
}

/**
 * Platform connection status response
 */
export interface PlatformConnectionStatusResponse {
  /** Platform */
  platform: IntegratedPlatform;

  /** Connection status */
  status: ConnectionStatus;

  /** Connected account info */
  accountInfo?: {
    id: string;
    name: string;
    type?: string;
  };

  /** Last sync timestamp */
  lastSyncedAt?: number;

  /** Error message if any */
  error?: string;

  /** Token expiration timestamp */
  expiresAt?: number;

  /** Days until token expires */
  daysUntilExpiration?: number;
}

/**
 * Metrics sync result
 */
export interface SyncMetricsResult {
  /** Whether sync was successful */
  success: boolean;

  /** Number of metrics updated */
  metricsUpdated?: number;

  /** Error message if failed */
  error?: string;

  /** Sync timestamp */
  syncedAt: number;

  /** Job ID for background jobs */
  jobId?: string;
}
