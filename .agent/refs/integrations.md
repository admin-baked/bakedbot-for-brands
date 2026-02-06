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
