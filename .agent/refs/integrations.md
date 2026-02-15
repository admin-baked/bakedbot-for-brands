# Integrations Reference

## Overview
BakedBot integrates with numerous external services for messaging, payments, data, compliance, and automation. This reference documents all active integrations, their status, and key implementation details.

---

## Integration Matrix

| Service | Primary Agent | Key File | Category | Status |
|---------|---------------|----------|----------|--------|
| **Blackleaf** | Craig | `blackleaf-service.ts` | Messaging | Default SMS |
| **Mailjet** | Craig | `mailjet-service.ts` | Messaging | Default Email |
| **WhatsApp** | Craig | `openclaw/gateway.ts` | Messaging | Production |
| **Alpine IQ** | Mrs. Parker | `alpine-iq.ts` | Loyalty | Live |
| **CannMenus** | Ezal | `cannmenus.ts` | Data | Live |
| **Headset** | Ezal | `headset.ts` | Data | Mock |
| **Green Check** | Deebo | `green-check.ts` | Compliance | Mock |
| **Authorize.net** | Money Mike | `authorize-net.ts` | Payments | Live |
| **Firecrawl** | Discovery | `firecrawl.ts` | Scraping | Live |
| **Twilio** | Craig | `twilio.ts` | Messaging | Backup |
| **Ayrshare** | Craig | `social-manager.ts` | Social | Live |
| **Cal.com** | Felisha | `scheduling-manager.ts` | Scheduling | Live |
| **Google Maps** | Discovery | `gmaps-connector.ts` | Geo | Live |

---

## Messaging Services

### Blackleaf (Default SMS)
**File**: `src/server/services/blackleaf-service.ts`
**Agent**: Craig

| Attribute | Value |
|-----------|-------|
| **Purpose** | SMS messaging for cannabis businesses |
| **Status** | Production Default |
| **Env Vars** | `BLACKLEAF_API_KEY` |

```typescript
import { BlackleafService } from '@/server/services/blackleaf-service';

const blackleaf = new BlackleafService();
await blackleaf.sendSMS({
  to: '+1234567890',
  message: 'Your order is ready!',
  brandId: 'brand_123'
});
```

**Features:**
- Cannabis-compliant messaging
- Delivery receipts
- Opt-out management
- Campaign tracking

---

### Mailjet (Default Email)
**File**: `src/server/services/mailjet-service.ts`
**Agent**: Craig

| Attribute | Value |
|-----------|-------|
| **Purpose** | Transactional and marketing email |
| **Status** | Production Default |
| **Env Vars** | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` |

```typescript
import { MailjetService } from '@/server/services/mailjet-service';

const mailjet = new MailjetService();
await mailjet.sendEmail({
  to: 'customer@example.com',
  subject: 'Your Weekly Deals',
  template: 'weekly_deals',
  variables: { deals: [...] }
});
```

**Features:**
- Template support
- Marketing campaigns
- Delivery tracking
- Bounce handling

---

### Twilio (Backup SMS)
**File**: `src/server/services/twilio.ts`
**Agent**: Craig

| Attribute | Value |
|-----------|-------|
| **Purpose** | Backup SMS provider |
| **Status** | Available (not default) |
| **Env Vars** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |

---

### WhatsApp Gateway
**Files**:
- `src/server/services/openclaw/` - Client & gateway service
- `src/server/actions/whatsapp.ts` - Server actions
- `cloud-run/openclaw-service/` - Cloud Run microservice

**Agent**: Craig
**Deployment**: Cloud Run (separate service)

| Attribute | Value |
|-----------|-------|
| **Purpose** | WhatsApp messaging for customer support & campaigns |
| **Status** | Production (Super Admin only) |
| **Env Vars** | `OPENCLAW_API_URL`, `OPENCLAW_API_KEY` |
| **Architecture** | Microservice (Cloud Run) + REST API |

**Architecture:**
```
BakedBot Main App (Firebase App Hosting)
    ↓ (REST API)
WhatsApp Gateway (Cloud Run)
    ├── whatsapp-web.js + Puppeteer
    ├── LocalAuth + Session Manager
    └── Firebase Cloud Storage (session persistence)
```

**Key Features:**
- Real QR code generation (scan once, persistent session)
- Session persistence via Cloud Storage (~100MB Chromium profiles)
- Auto-reconnect on container restart (no re-scan needed)
- Scales to zero (Min instances: 0)
- Individual & bulk messaging
- Message history
- Media support (images, videos)

**Server Actions:**
```typescript
import {
  getWhatsAppSessionAction,
  generateWhatsAppQRAction,
  sendWhatsAppMessageAction,
  sendWhatsAppCampaignAction,
  getWhatsAppHistoryAction,
  disconnectWhatsAppAction
} from '@/server/actions/whatsapp';

// Check connection status
const status = await getWhatsAppSessionAction();

// Generate QR code for initial connection
const qr = await generateWhatsAppQRAction();
// Returns: { qrCode: "data:image/png;base64,..." }

// Send individual message
await sendWhatsAppMessageAction({
  to: '+15555551234',
  message: 'Your order is ready for pickup!',
  mediaUrl: 'https://...' // optional
});

// Send campaign (bulk)
await sendWhatsAppCampaignAction({
  recipients: ['+15555551234', '+15555555678'],
  message: 'Flash sale this weekend!',
  delayMs: 1000 // rate limiting
});
```

**UI Access:**
- **Super Admin only**: `/dashboard/ceo?tab=whatsapp`
- **Features**: QR code connection, message composer, history viewer

**Cloud Run Service:**
- **Service**: `whatsapp-gateway`
- **Region**: `us-central1`
- **Resources**: 2 CPU, 2 GiB RAM
- **Timeout**: 300s
- **Scaling**: 0-1 instances
- **Cost**: ~$5-10/month

**Session Persistence:**
```
Container Start
    ↓
Check Firebase Storage for whatsapp-session.zip
    ↓ (if exists)
Download & Extract → ./whatsapp-sessions/
    ↓
Initialize whatsapp-web.js with LocalAuth
    ↓
Auto-connect (no QR scan!)
    ↓ (on ready)
Backup to Storage every 5 minutes
```

**Deployment:**
- Location: `cloud-run/openclaw-service/`
- Build: Dockerfile with Chromium
- Deploy: Cloud Build or Console
- Docs: `cloud-run/openclaw-service/DEPLOYMENT.md`

**API Key:**
- Generate: `node -e "console.log('whatsapp-' + require('crypto').randomBytes(32).toString('hex'))"`
- Store in: Firebase Secret Manager (`OPENCLAW_API_KEY`)
- Used for: Bearer token authentication on all endpoints

**Limitations:**
- WhatsApp Web rate limits apply (don't spam)
- Phone must remain connected & charged
- One active session per phone number
- Session expires if phone is offline >14 days

---

## Payment Services

### Authorize.net
**File**: `src/server/services/authorize-net.ts`
**Agent**: Money Mike

| Attribute | Value |
|-----------|-------|
| **Purpose** | Payment processing, subscriptions |
| **Status** | Production |
| **Env Vars** | `AUTHORIZE_NET_LOGIN_ID`, `AUTHORIZE_NET_TRANSACTION_KEY` |

```typescript
// Server Action: Create subscription
import { createClaimSubscription } from '@/server/actions/createClaimSubscription';

const result = await createClaimSubscription({
  email: 'owner@dispensary.com',
  businessName: 'Green Leaf Wellness',
  cardNumber: '4111111111111111',
  expirationDate: '2027-12',
  cvv: '123'
});
```

**Features:**
- ARB (Automated Recurring Billing)
- One-time payments
- Subscription management
- Webhook support

**Subscription Tiers:**
| Tier | Price | ARB Interval |
|------|-------|--------------|
| Claim Pro | $99/mo | Monthly |
| Growth | $299/mo | Monthly |
| Scale | $999/mo | Monthly |

---

## Data Services

### CannMenus
**File**: `src/server/services/cannmenus.ts`
**Agent**: Ezal

| Attribute | Value |
|-----------|-------|
| **Purpose** | Cannabis menu data, live pricing |
| **Status** | Production |
| **Env Vars** | `CANNMENUS_API_KEY` |

```typescript
import { CannMenusService } from '@/server/services/cannmenus';

const cannmenus = new CannMenusService();

// Search dispensaries
const results = await cannmenus.searchDispensaries('Denver, CO');

// Get menu
const menu = await cannmenus.getDispensaryMenu('green-leaf-denver');

// Get details
const details = await cannmenus.getDispensaryDetails('green-leaf-denver');
```

**API Routes:**
| Route | Purpose |
|-------|---------|
| `/api/cannmenus/retailers` | Search retailers |
| `/api/cannmenus/products` | Get menu products |
| `/api/cannmenus/brands` | Search brands |
| `/api/cannmenus/sync` | Trigger sync |
| `/api/cannmenus/semantic-search` | Vector search |

---

### Headset
**File**: `src/server/services/headset.ts`
**Agent**: Ezal

| Attribute | Value |
|-----------|-------|
| **Purpose** | Market trends, category data |
| **Status** | Mock (API pending) |
| **Env Vars** | `HEADSET_API_KEY` |

**Planned Features:**
- Category trend analysis
- Market share data
- Pricing benchmarks

---

## Loyalty Services

### Alpine IQ
**File**: `src/server/services/alpine-iq.ts`
**Agent**: Mrs. Parker, Craig

| Attribute | Value |
|-----------|-------|
| **Purpose** | Loyalty program management |
| **Status** | Production |
| **Env Vars** | `ALPINE_IQ_API_KEY` |

```typescript
import { AlpineIQService } from '@/server/services/alpine-iq';

const alpineiq = new AlpineIQService();

// Check customer points
const profile = await alpineiq.getCustomerProfile(customerId);

// Apply reward
await alpineiq.applyReward(customerId, rewardId);
```

**Agent Tools:**
| Tool | Description |
|------|-------------|
| `loyalty_check_points` | Get customer loyalty profile |
| `loyalty_send_sms` | Send loyalty SMS via Blackleaf |

---

## Compliance Services

### Green Check
**File**: `src/server/services/green-check.ts`
**Agent**: Deebo

| Attribute | Value |
|-----------|-------|
| **Purpose** | License verification, banking access |
| **Status** | Mock (API pending) |
| **Env Vars** | `GREEN_CHECK_API_KEY` |

**Planned Tools:**
| Tool | Description |
|------|-------------|
| `compliance_verify_license` | Verify cannabis license |
| `compliance_check_banking` | Check banking access status |

---

## Discovery & Scraping

### Firecrawl
**File**: `src/server/services/firecrawl.ts`
**Agent**: Discovery (Demo, Ezal)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Web scraping, data extraction |
| **Status** | Production |
| **Env Vars** | `FIRECRAWL_API_KEY` |

```typescript
import { FirecrawlService } from '@/server/services/firecrawl';

const firecrawl = new FirecrawlService();

// Search
const results = await firecrawl.search('cannabis dispensary Denver', { limit: 10 });

// Scrape
const content = await firecrawl.scrape('https://example.com/menu');

// Deep discovery
const enriched = await firecrawl.discoverUrl('https://dispensary.com');
```

**Timeouts:**
| Operation | Timeout |
|-----------|---------|
| Search | 25 seconds |
| Scrape | 30 seconds |
| Discovery | 45 seconds |

---

### Google Maps / Places
**File**: `src/server/services/gmaps-connector.ts`, `src/server/services/places-connector.ts`
**Agent**: Discovery

| Attribute | Value |
|-----------|-------|
| **Purpose** | Geolocation, place enrichment |
| **Status** | Production |
| **Env Vars** | `GOOGLE_MAPS_API_KEY` |

```typescript
import { GMapsConnector } from '@/server/services/gmaps-connector';

const gmaps = new GMapsConnector();

// Geocode
const coords = await gmaps.geocode('1420 Cannabis Ave, Denver CO');

// Find places
const places = await gmaps.findPlaces('dispensary near me', coords);
```

---

## Social Media

### Ayrshare
**File**: `src/server/services/social-manager.ts`
**Agent**: Craig

| Attribute | Value |
|-----------|-------|
| **Purpose** | Social media posting |
| **Status** | Production |
| **Env Vars** | `AYRSHARE_API_KEY` |

**Supported Platforms:**
- Twitter/X
- LinkedIn
- Instagram (Business)
- Facebook (Page)

**Agent Tools:**
| Tool | Description |
|------|-------------|
| `social_post` | Post to multiple platforms |
| `social_profile` | Get engagement stats |

---

## Scheduling

### Cal.com
**File**: `src/server/services/scheduling-manager.ts`
**Agent**: Felisha

| Attribute | Value |
|-----------|-------|
| **Purpose** | Meeting scheduling |
| **Status** | Production |
| **Env Vars** | `CAL_COM_API_KEY` |

**Agent Tools:**
| Tool | Description |
|------|-------------|
| `check_availability` | Get available time slots |
| `book_meeting` | Book a meeting |

---

## Payment Processors

### Payment App Store System
**Files**:
- `src/app/dashboard/apps/actions.ts` - App Store backend with payment processors
- `src/app/dashboard/apps/page-client.tsx` - App Store UI
- `src/app/dashboard/admin/payment-config/page.tsx` - Payment configuration dashboard
- `src/server/actions/payment-config.ts` - Server actions for payment management

**Status**: Production-ready
**Access**: `/dashboard/apps` (App Store) OR `/dashboard/admin/payment-config` (Full Dashboard)

**Architecture:**
```
App Store → getApps() → Fetch paymentConfig from locations/{id}
         → Display payment processor cards with install status
         → Click "Configure" → Payment Config Dashboard
         → Toggle switches → updatePaymentMethod() → Update Firestore
```

**AppDefinition Interface:**
```typescript
interface AppDefinition {
  id: string;
  name: string;
  description: string;
  category: 'pos' | 'marketing' | 'compliance' | 'utility' | 'payment';
  icon: string;
  installed: boolean;
  configUrl?: string;
  status?: 'active' | 'inactive' | 'error';
  features?: string[];  // NEW for payment processors
  pricing?: {
    setup: string;
    transaction?: string;
    monthly?: string;
  };
  provider?: {
    name: string;
    website: string;
    support: string;
  };
}
```

**Payment Config Flow:**
```typescript
// Load config
const { locationId } = await getCurrentUserLocationId();
const { data: config } = await getPaymentConfig(locationId);

// Update method
await updatePaymentMethod({
  locationId,
  method: 'cannpay' | 'aeropay' | 'credit_card' | 'dispensary_direct',
  enabled: true
});

// Config structure in Firestore: locations/{id}/paymentConfig
{
  enabledMethods: ['dispensary_direct', 'cannpay', 'aeropay'],
  defaultMethod: undefined,  // Force explicit selection
  cannpay: {
    enabled: true,
    integratorId: 'xxx',
    environment: 'sandbox'
  },
  aeropay: {
    enabled: true,
    merchantId: 'yyy',
    environment: 'sandbox'
  }
}
```

---

### Smokey Pay (CannPay RemotePay)
**File**: `src/lib/payments/cannpay.ts`
**Webhook**: `src/app/api/webhooks/cannpay/route.ts`
**Widget**: `src/components/checkout/cannpay-widget.tsx`
**Agent**: Money Mike

| Attribute | Value |
|-----------|-------|
| **Purpose** | Cannabis-compliant bank-to-bank payment |
| **Status** | Production (Thrive Syracuse) |
| **Env Vars** | `CANPAY_INTEGRATOR_ID`, `CANPAY_ENVIRONMENT` |
| **Transaction Fee** | Fixed $0.50 |
| **Integration Type** | Stateless (per-transaction widget) |

**Features:**
- Bank-to-bank transfer (no credit cards)
- Guest checkout support
- Tip handling
- Instant settlement
- Cannabis compliance (SAFE Banking Act compliant)

**Implementation:**
```typescript
import { authorizePayment, reverseTransaction } from '@/lib/payments/cannpay';

// Authorize payment
const result = await authorizePayment({
  orderId: 'order_123',
  amount: 100.50,
  customerEmail: 'customer@example.com'
});
// Returns: { sessionToken, widgetUrl }

// Show CannPay widget in iframe
<CannPayWidget
  sessionToken={sessionToken}
  onSuccess={(transactionId) => { /* Update order */ }}
  onError={(error) => { /* Handle error */ }}
/>

// Void transaction (if needed)
await reverseTransaction(transactionId);
```

**Webhook Events:**
- `transaction.completed` → Update order to `paid`
- `transaction.declined` → Update order to `failed`
- `transaction.voided` → Update order to `voided`

**Signature Verification:** HMAC-SHA256 with `crypto.timingSafeEqual()` for constant-time comparison

---

### Aeropay
**File**: `src/lib/payments/aeropay.ts`
**Webhook**: `src/app/api/webhooks/aeropay/route.ts`
**Widget**: `src/components/checkout/aeropay-bank-link.tsx`
**Agent**: Money Mike

| Attribute | Value |
|-----------|-------|
| **Purpose** | Cannabis-compliant bank transfer with persistent accounts |
| **Status** | Production (Thrive Syracuse) |
| **Env Vars** | `AEROPAY_CLIENT_ID`, `AEROPAY_CLIENT_SECRET`, `AEROPAY_MERCHANT_ID`, `AEROPAY_WEBHOOK_SECRET` |
| **Transaction Fee** | Fixed $0.50 |
| **Integration Type** | Stateful (persistent user/bank management) |

**Key Difference from CannPay:** Aeropay requires creating user accounts and linking banks once, then reusing for future transactions. CannPay is stateless (bank linking per transaction).

**OAuth Flow:**
```typescript
// 1. Get OAuth token
const token = await getOAuthToken('merchant');

// 2. Create Aeropay user (first time only)
const user = await createAeropayUser({
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe'
});

// 3. Get bank linking URL (Aerosync widget)
const { aggregatorUrl } = await getAggregatorCredentials(user.userId);

// 4. Show Aerosync widget, customer links bank
<AeropayBankLink
  aerosyncUrl={aggregatorUrl}
  onLinked={(accountId) => { /* Save to Firestore */ }}
/>

// 5. Create transaction (reuse linked bank)
const transaction = await createTransaction({
  userId: user.userId,
  bankAccountId: accountId,
  amount: 100.50,
  merchantOrderId: 'order_123'
});

// 6. Poll transaction status
const status = await getTransactionDetails(transaction.transactionId);
```

**Firestore Collections:**
```typescript
// aeropay_users/{userId}
{
  userId: 'user_123',  // BakedBot user ID
  aeropayUserId: 'aero_xxx',
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  bankAccounts: [
    { id: 'bank_xxx', bankName: 'Wells Fargo', last4: '1234', accountType: 'checking' }
  ],
  defaultBankAccountId: 'bank_xxx',
  status: 'active',
  createdAt: '2026-02-15T...',
  updatedAt: '2026-02-15T...'
}

// aeropay_transactions/{transactionId}
{
  transactionId: 'txn_xxx',
  orderId: 'order_123',
  userId: 'user_123',
  aeropayUserId: 'aero_xxx',
  bankAccountId: 'bank_xxx',
  amount: 100.50,
  fee: 0.50,
  status: 'completed',
  merchantOrderId: 'order_123',
  webhookEvents: [
    { type: 'transaction_completed', receivedAt: '...' }
  ],
  createdAt: '2026-02-15T...',
  updatedAt: '2026-02-15T...'
}
```

**Webhook Events:**
- `transaction_completed` → Update order to `paid`
- `transaction_declined` → Update order to `failed`
- `transaction_voided` → Update order to `voided`
- `transaction_refunded` → Update order to `refunded`
- `preauthorized_transaction_created` → Pre-authorization created
- `user_suspended` → User account suspended
- `user_active` → User account reactivated
- `merchant_reputation_updated` → Merchant reputation changed

**OAuth Token Caching:**
```typescript
// In-memory Map with expiration
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// Cache with 30-second safety margin
const expiresAt = Date.now() + (response.expires_in * 1000) - 30000;
tokenCache.set(scope, { token: response.access_token, expiresAt });
```

---

### Authorize.net (Credit Card)
**File**: `src/lib/payments/authorize-net.ts`
**Agent**: Money Mike

| Attribute | Value |
|-----------|-------|
| **Purpose** | Credit card processing |
| **Status** | Available (not primary for cannabis) |
| **Env Vars** | `AUTHORIZE_NET_LOGIN_ID`, `AUTHORIZE_NET_TRANSACTION_KEY` |

**Note:** Credit card processing is limited for cannabis businesses due to federal regulations. Most customers use Smokey Pay or Aeropay instead.

---

## Data Hydration Waterfall

When onboarding new brands/dispensaries, data is hydrated in priority order:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | POS | Direct from connected POS (if available) |
| 2 | CannMenus | Cannabis menu API |
| 3 | Leafly | Fallback cannabis data (via Apify) |
| 4 | Firecrawl | Website scraping (last resort) |

**Implementation**: `src/app/api/jobs/process/route.ts`

---

## Environment Variables

```env
# Messaging
BLACKLEAF_API_KEY=xxx
MAILJET_API_KEY=xxx
MAILJET_SECRET_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
OPENCLAW_API_URL=https://whatsapp-gateway-xxxxx-uc.a.run.app
OPENCLAW_API_KEY=whatsapp-xxxxxxxxxxxx

# Payments
AUTHORIZE_NET_LOGIN_ID=xxx
AUTHORIZE_NET_TRANSACTION_KEY=xxx

# Data
CANNMENUS_API_KEY=xxx
HEADSET_API_KEY=xxx
FIRECRAWL_API_KEY=xxx
GOOGLE_MAPS_API_KEY=xxx

# Loyalty & Compliance
ALPINE_IQ_API_KEY=xxx
GREEN_CHECK_API_KEY=xxx

# Social & Scheduling
AYRSHARE_API_KEY=xxx
CAL_COM_API_KEY=xxx
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/server/services/` | All service implementations |
| `src/server/tools/` | Agent tool wrappers |
| `apphosting.yaml` | Secret configuration |
| `src/app/dashboard/integrations/` | Integration settings UI |

---

## Related Documentation
- `refs/agents.md` — Which agents use which integrations
- `refs/backend.md` — Service architecture
- `refs/onboarding.md` — Data hydration flow
- `refs/tools.md` — Agent tools wrapping integrations
