# Social Media API Integration Architecture
**Date:** January 27, 2026
**Phase:** B - Social Media Integration
**Status:** 🔵 Design Complete - Ready for Implementation

---

## 🎯 Overview

Design for integrating real social media posting capabilities into the Creative Command Center. Supports OAuth-based account connections and automated publishing to Instagram, Facebook, TikTok, LinkedIn, and Twitter/X.

---

## 📐 Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Creative Command Center                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Content    │ -> │   Approval   │ -> │  Schedule    │ │
│  │  Generation  │    │   Workflow   │    │   Posting    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Platform Connections │
                    │   (OAuth Settings)    │
                    └───────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  Meta Graph  │ │   TikTok     │ │  LinkedIn    │
        │     API      │ │     API      │ │     API      │
        │ (IG + FB)    │ │              │ │              │
        └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🔐 OAuth Connection Flow

### 1. Connection Initiation

**UI Location:** `/dashboard/brand/creative/settings` (new page)

```tsx
interface PlatformConnection {
  platform: SocialPlatform;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  accountName?: string;
  accountId?: string;
  avatarUrl?: string;
  connectedAt?: number;
  expiresAt?: number;
  scopes: string[];
}
```

### 2. OAuth Flow Steps

#### Step 1: Redirect to Platform
```typescript
// /api/auth/social/[platform]/authorize
GET /api/auth/social/instagram/authorize
→ Redirects to: https://www.instagram.com/oauth/authorize
  ?client_id={CLIENT_ID}
  &redirect_uri={CALLBACK_URL}
  &scope=instagram_basic,instagram_content_publish
  &response_type=code
  &state={ENCRYPTED_STATE_TOKEN}
```

**State Token:**
```typescript
interface OAuthState {
  tenantId: string;
  userId: string;
  platform: SocialPlatform;
  nonce: string;
  timestamp: number;
}
```

#### Step 2: Handle Callback
```typescript
// /api/auth/social/[platform]/callback
GET /api/auth/social/instagram/callback?code={AUTH_CODE}&state={STATE}

1. Verify state token (decrypt, validate nonce, check timestamp)
2. Exchange code for access token
3. Fetch user profile
4. Store encrypted credentials in Firestore
5. Redirect to settings page with success message
```

#### Step 3: Store Credentials (Encrypted)
```typescript
// Firestore: tenants/{tenantId}/platform_credentials/{platform}
{
  platform: 'instagram',
  accountId: '1234567890',
  accountName: '@brandname',
  avatarUrl: 'https://...',
  encryptedToken: '...', // AES-256-GCM encrypted access token
  encryptedRefreshToken: '...', // If applicable
  tokenExpiresAt: 1738022400000,
  scopes: ['instagram_basic', 'instagram_content_publish'],
  connectedBy: 'userId',
  connectedAt: 1706313600000,
  lastRefreshedAt: 1706313600000,
  status: 'active' | 'expired' | 'revoked',
}
```

---

## 🔒 Security

### Encryption

**Token Encryption:**
```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY!; // 32-byte key

export function encryptToken(token: string): EncryptedToken {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decryptToken(encrypted: EncryptedToken): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(encrypted.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Environment Variables:**
```bash
# .env.local
SOCIAL_TOKEN_ENCRYPTION_KEY=<64-char-hex-string>

# Platform API Keys
META_APP_ID=<instagram-facebook-app-id>
META_APP_SECRET=<instagram-facebook-app-secret>
TIKTOK_CLIENT_KEY=<tiktok-client-key>
TIKTOK_CLIENT_SECRET=<tiktok-client-secret>
LINKEDIN_CLIENT_ID=<linkedin-client-id>
LINKEDIN_CLIENT_SECRET=<linkedin-client-secret>
TWITTER_CLIENT_ID=<twitter-client-id>
TWITTER_CLIENT_SECRET=<twitter-client-secret>

# OAuth Redirect URI
NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://bakedbot.ai/api/auth/social
```

---

## 📤 Platform Posting Service

### Abstract Platform Interface

```typescript
// src/lib/social/platform-adapter.ts

export interface PlatformAdapter {
  platform: SocialPlatform;

  /**
   * Publish content to platform
   */
  publish(content: CreativeContent, credentials: PlatformCredentials): Promise<PublishResult>;

  /**
   * Validate credentials are still valid
   */
  validateCredentials(credentials: PlatformCredentials): Promise<boolean>;

  /**
   * Refresh access token if supported
   */
  refreshToken?(credentials: PlatformCredentials): Promise<RefreshedCredentials>;

  /**
   * Get posting requirements for this platform
   */
  getRequirements(): PlatformRequirements;
}

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

export interface PlatformRequirements {
  maxCaptionLength: number;
  maxHashtags: number;
  supportedMediaTypes: MediaType[];
  aspectRatios: string[];
  maxImageSize: number; // bytes
  maxVideoSize: number; // bytes
  maxVideoDuration: number; // seconds
}
```

### Platform Implementations

#### 1. Meta Graph API (Instagram + Facebook)

```typescript
// src/lib/social/adapters/meta-adapter.ts

export class MetaAdapter implements PlatformAdapter {
  platform: SocialPlatform = 'instagram'; // or 'facebook'

  async publish(content: CreativeContent, credentials: PlatformCredentials): Promise<PublishResult> {
    const accessToken = decryptToken(credentials.encryptedToken);

    try {
      // Step 1: Upload media to container
      const containerId = await this.createMediaContainer(
        credentials.accountId,
        content.mediaUrls[0],
        content.caption,
        accessToken
      );

      // Step 2: Publish container
      const postId = await this.publishContainer(
        credentials.accountId,
        containerId,
        accessToken
      );

      return {
        success: true,
        postId,
        postUrl: `https://www.instagram.com/p/${postId}`,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async createMediaContainer(
    accountId: string,
    imageUrl: string,
    caption: string,
    accessToken: string
  ): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new MetaAPIError(data.error);
    }

    return data.id;
  }

  private async publishContainer(
    accountId: string,
    containerId: string,
    accessToken: string
  ): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new MetaAPIError(data.error);
    }

    return data.id;
  }

  getRequirements(): PlatformRequirements {
    return {
      maxCaptionLength: 2200,
      maxHashtags: 30,
      supportedMediaTypes: ['image', 'video', 'carousel'],
      aspectRatios: ['1:1', '4:5', '16:9'],
      maxImageSize: 8 * 1024 * 1024, // 8MB
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      maxVideoDuration: 60, // seconds
    };
  }
}
```

#### 2. TikTok API

```typescript
// src/lib/social/adapters/tiktok-adapter.ts

export class TikTokAdapter implements PlatformAdapter {
  platform: SocialPlatform = 'tiktok';

  async publish(content: CreativeContent, credentials: PlatformCredentials): Promise<PublishResult> {
    const accessToken = decryptToken(credentials.encryptedToken);

    try {
      // TikTok requires video upload first
      const videoUrl = content.mediaUrls[0];

      // Step 1: Initialize video upload
      const uploadUrl = await this.initializeUpload(accessToken);

      // Step 2: Upload video chunks
      await this.uploadVideo(uploadUrl, videoUrl);

      // Step 3: Create post
      const postId = await this.createPost({
        videoUrl: uploadUrl,
        caption: content.caption,
        accessToken,
      });

      return {
        success: true,
        postId,
        postUrl: `https://www.tiktok.com/@user/video/${postId}`,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  getRequirements(): PlatformRequirements {
    return {
      maxCaptionLength: 2200,
      maxHashtags: 100,
      supportedMediaTypes: ['video'],
      aspectRatios: ['9:16'],
      maxImageSize: 0,
      maxVideoSize: 287 * 1024 * 1024, // 287MB
      maxVideoDuration: 60,
    };
  }
}
```

#### 3. LinkedIn API

```typescript
// src/lib/social/adapters/linkedin-adapter.ts

export class LinkedInAdapter implements PlatformAdapter {
  platform: SocialPlatform = 'linkedin';

  async publish(content: CreativeContent, credentials: PlatformCredentials): Promise<PublishResult> {
    const accessToken = decryptToken(credentials.encryptedToken);

    try {
      // Step 1: Register upload
      const uploadUrl = await this.registerUpload(credentials.accountId, accessToken);

      // Step 2: Upload image
      await this.uploadImage(uploadUrl, content.mediaUrls[0]);

      // Step 3: Create post
      const postId = await this.createShare({
        urn: credentials.accountId,
        text: content.caption,
        media: uploadUrl,
        accessToken,
      });

      return {
        success: true,
        postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  getRequirements(): PlatformRequirements {
    return {
      maxCaptionLength: 3000,
      maxHashtags: 3,
      supportedMediaTypes: ['image', 'video'],
      aspectRatios: ['1:1', '16:9'],
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
      maxVideoDuration: 600, // 10 minutes
    };
  }
}
```

### Platform Manager

```typescript
// src/lib/social/platform-manager.ts

export class PlatformManager {
  private adapters: Map<SocialPlatform, PlatformAdapter>;

  constructor() {
    this.adapters = new Map([
      ['instagram', new MetaAdapter('instagram')],
      ['facebook', new MetaAdapter('facebook')],
      ['tiktok', new TikTokAdapter()],
      ['linkedin', new LinkedInAdapter()],
      ['twitter', new TwitterAdapter()],
    ]);
  }

  async publishContent(
    content: CreativeContent,
    tenantId: string
  ): Promise<PublishResult> {
    // 1. Get credentials
    const credentials = await this.getCredentials(tenantId, content.platform);

    if (!credentials) {
      return {
        success: false,
        error: {
          code: 'NO_CREDENTIALS',
          message: `${content.platform} account not connected`,
          retryable: false,
        },
      };
    }

    // 2. Validate credentials
    const adapter = this.adapters.get(content.platform);
    const isValid = await adapter?.validateCredentials(credentials);

    if (!isValid) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Access token expired or revoked',
          retryable: false,
        },
      };
    }

    // 3. Publish
    const result = await adapter!.publish(content, credentials);

    // 4. Update content status
    if (result.success) {
      await this.updateContentStatus(content.id, tenantId, {
        status: 'published',
        publishedAt: Date.now(),
        postId: result.postId,
        postUrl: result.postUrl,
      });
    }

    return result;
  }

  private async getCredentials(
    tenantId: string,
    platform: SocialPlatform
  ): Promise<PlatformCredentials | null> {
    const { firestore } = await createServerClient();
    const doc = await firestore
      .doc(`tenants/${tenantId}/platform_credentials/${platform}`)
      .get();

    return doc.exists ? (doc.data() as PlatformCredentials) : null;
  }
}
```

---

## ⏰ Scheduled Publishing

### Cloud Tasks Integration

```typescript
// src/lib/social/scheduler.ts

export async function schedulePost(
  content: CreativeContent,
  scheduledAt: Date
): Promise<string> {
  const { CloudTasksClient } = await import('@google-cloud/tasks');
  const client = new CloudTasksClient();

  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
  const queue = 'social-posting';

  const parent = client.queuePath(project, location, queue);

  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/execute-post`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(
        JSON.stringify({
          contentId: content.id,
          tenantId: content.tenantId,
        })
      ).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(scheduledAt.getTime() / 1000),
    },
  };

  const [response] = await client.createTask({ parent, task });

  logger.info('[scheduler] Post scheduled', {
    contentId: content.id,
    taskName: response.name,
    scheduledAt: scheduledAt.toISOString(),
  });

  return response.name!;
}
```

### Execution Endpoint

```typescript
// src/app/api/social/execute-post/route.ts

export async function POST(request: NextRequest) {
  const { contentId, tenantId } = await request.json();

  // Get content
  const content = await getContentById(tenantId, contentId);

  if (!content || content.status !== 'scheduled') {
    return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
  }

  // Publish
  const manager = new PlatformManager();
  const result = await manager.publishContent(content, tenantId);

  // Log result
  logger.info('[social-post] Execution complete', {
    contentId,
    success: result.success,
    postUrl: result.postUrl,
  });

  return NextResponse.json(result);
}
```

---

## 🎨 UI Components

### 1. Platform Connections Settings

```tsx
// src/components/brand/creative/platform-connections.tsx

export function PlatformConnections() {
  const { connections, loading } = usePlatformConnections();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Connect your social media accounts to publish content directly from BakedBot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PLATFORMS.map((platform) => {
          const connection = connections.find((c) => c.platform === platform);
          return (
            <PlatformConnectionCard
              key={platform}
              platform={platform}
              connection={connection}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function PlatformConnectionCard({
  platform,
  connection,
}: {
  platform: SocialPlatform;
  connection?: PlatformConnection;
}) {
  const isConnected = connection?.status === 'connected';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <PlatformIcon platform={platform} className="h-8 w-8" />
        <div>
          <h3 className="font-semibold capitalize">{platform}</h3>
          {isConnected ? (
            <p className="text-sm text-muted-foreground">
              Connected as {connection.accountName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not connected</p>
          )}
        </div>
      </div>
      {isConnected ? (
        <Button variant="outline" size="sm">
          Disconnect
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => window.location.href = `/api/auth/social/${platform}/authorize`}
        >
          Connect
        </Button>
      )}
    </div>
  );
}
```

### 2. Publishing Status Indicator

```tsx
// src/components/brand/creative/publishing-status.tsx

export function PublishingStatus({ content }: { content: CreativeContent }) {
  if (content.status === 'published') {
    return (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Published
        {content.postUrl && (
          <ExternalLink
            className="h-3 w-3 ml-1 cursor-pointer"
            onClick={() => window.open(content.postUrl, '_blank')}
          />
        )}
      </Badge>
    );
  }

  if (content.status === 'scheduled') {
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Scheduled for {new Date(content.scheduledAt!).toLocaleString()}
      </Badge>
    );
  }

  if (content.status === 'failed') {
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Publishing Failed
      </Badge>
    );
  }

  return null;
}
```

---

## 🔄 Error Handling & Retries

### Retry Strategy

```typescript
// src/lib/social/retry.ts

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 60000,
  backoffFactor: 2,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      logger.warn('[retry] Attempt failed, retrying', {
        attempt,
        maxAttempts: config.maxAttempts,
        delay,
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Rate limit errors are retryable
  if (error.statusCode === 429) {
    return true;
  }

  // Server errors are retryable
  if (error.statusCode >= 500) {
    return true;
  }

  // Auth errors are not retryable
  if (error.statusCode === 401 || error.statusCode === 403) {
    return false;
  }

  return false;
}
```

---

## 📊 Status Tracking

### Publishing Status Schema

```typescript
// Extended CreativeContent type
interface CreativeContent {
  // ... existing fields

  /** Publishing metadata */
  publishingStatus?: {
    attempts: number;
    lastAttemptAt?: number;
    failureReason?: string;
    taskName?: string; // Cloud Tasks task name
  };

  /** Platform post metadata */
  postId?: string;
  postUrl?: string;
  publishedAt?: number;
}
```

---

## 🧪 Testing Strategy

### Mock Platform Adapters

```typescript
// src/lib/social/adapters/__mocks__/meta-adapter.ts

export class MockMetaAdapter implements PlatformAdapter {
  async publish(content: CreativeContent): Promise<PublishResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate 10% failure rate
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          retryable: true,
        },
      };
    }

    return {
      success: true,
      postId: `mock_${Date.now()}`,
      postUrl: `https://instagram.com/p/mock_${Date.now()}`,
    };
  }
}
```

---

## 📝 Implementation Checklist

### Phase B.1: Foundation (Week 1)
- [ ] Create encryption utilities
- [ ] Define platform adapter interface
- [ ] Set up Firestore schema for credentials
- [ ] Create platform manager service
- [ ] Add error types and retry logic

### Phase B.2: OAuth Flows (Week 2)
- [ ] Meta (Instagram + Facebook) OAuth
- [ ] TikTok OAuth
- [ ] LinkedIn OAuth
- [ ] Twitter/X OAuth
- [ ] OAuth callback handler
- [ ] State token encryption/validation

### Phase B.3: Platform Adapters (Week 3)
- [ ] Meta Graph API adapter
- [ ] TikTok API adapter
- [ ] LinkedIn API adapter
- [ ] Twitter API adapter
- [ ] Adapter tests with mocks

### Phase B.4: Publishing Service (Week 4)
- [ ] Cloud Tasks scheduler setup
- [ ] Execute post endpoint
- [ ] Status tracking
- [ ] Retry logic implementation
- [ ] Failure notifications

### Phase B.5: UI Integration (Week 5)
- [ ] Platform connections settings page
- [ ] Connection status indicators
- [ ] Publishing status badges
- [ ] OAuth redirect pages
- [ ] Error/success toasts

---

## 🚀 Future Enhancements

1. **Analytics Integration**
   - Track post performance (likes, comments, shares)
   - Fetch analytics from each platform's API
   - Display engagement metrics in dashboard

2. **Content Optimization**
   - Auto-resize images for platform requirements
   - Generate platform-specific captions
   - Suggest optimal posting times

3. **Multi-Account Support**
   - Connect multiple accounts per platform
   - Cross-post to multiple accounts
   - Account-specific content routing

4. **Advanced Scheduling**
   - Best time to post recommendations
   - Recurring posts
   - Timezone-aware scheduling

5. **Approval Workflows**
   - Multi-stage approvals
   - Role-based publishing permissions
   - Audit trails

---

**Architecture complete. Ready for implementation.**
