# Onboarding Reference

## Overview
The onboarding flow takes new users from signup through to a functional dashboard with data.

---

## Onboarding Flows

### Brand Onboarding
```
1. Sign Up (/login)
   └─▶ Email/Google Auth
   
2. Role Selection
   └─▶ Brand vs Dispensary
   
3. Business Setup (/dashboard/settings/link)
   └─▶ Business Name, Logo, Website
   
4. Data Hydration
   └─▶ Waterfall: CannMenus → Leafly → Firecrawl
   
5. Dashboard Ready
   └─▶ Products, Analytics, Agents
```

### Claim Flow (Discovery Pages)
**Path**: `/claim`

For claiming unclaimed location/brand pages.

```
1. Landing (/location/[state]/[city])
   └─▶ User finds unclaimed page
   
2. Claim CTA
   └─▶ Click "Claim This Page"
   
3. Claim Form (/claim)
   └─▶ Business verification
   
4. Subscription
   └─▶ Authorize.net ARB ($99/mo)
   
5. Verification
   └─▶ Email/Phone confirmation
   
6. Dashboard Access
   └─▶ Full page control
```

---

## Data Hydration Waterfall

When a new brand/dispensary is onboarded, we hydrate data in priority order:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | POS | Direct from connected POS (if available) |
| 2 | CannMenus | Cannabis menu API |
| 3 | Leafly | Fallback cannabis data |
| 4 | Firecrawl | Website scraping (last resort) |

**Implementation**: `src/app/api/jobs/process/route.ts`

```typescript
async function processProductSync(job: Job) {
  // Level 1: POS (skip during onboarding)
  // Level 2: CannMenus
  // Level 3: Leafly via Apify
  // Level 4: Website Discover via Firecrawl
}
```

---

## Setup Wizard Components

### Wiring Screen
**File**: `src/app/dashboard/settings/link/components/wiring-screen.tsx`

Visual progress indicator showing sync status.

### Integration Config
**File**: `src/app/dashboard/integrations/`

POS, CRM, and payment integrations.

---

## Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Basic agent, limited scans |
| **Claim Pro** | $99/mo | Verified badge, analytics, lead capture |
| **Growth** | $299/mo | Full agents, unlimited scans |
| **Scale** | $999/mo | White-label, API access |

### Subscription Actions
```typescript
// Server Actions
import { createClaimSubscription } from '@/server/actions/createClaimSubscription';
import { createHireSubscription } from '@/server/actions/createHireSubscription';
```

---

## Thank You Flow

After successful subscription:

**Path**: `/thank-you`

- Confirmation message
- Google Ads conversion tracking
- Next steps guidance

---

## Related Files
- `src/app/claim/` — Claim flow pages
- `src/app/dashboard/settings/link/` — Onboarding setup
- `src/server/actions/createClaimSubscription.ts`
- `src/server/actions/createHireSubscription.ts`
