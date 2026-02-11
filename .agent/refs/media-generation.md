# Media Generation & Cost Tracking

> Reference documentation for image/video generation with cost analytics and playbook automation.

**Last Updated**: 2026-02-11

---

## Overview

BakedBot includes a comprehensive media generation infrastructure with cost tracking for AI-generated images and videos. This system powers automated content creation through playbooks and provides detailed cost analytics for CEOs.

**Key Features**:
- Multi-provider support (Gemini Flash/Pro, Veo, Sora)
- Per-generation cost tracking with Firestore persistence
- CEO Dashboard with cost analytics and breakdowns
- Automated playbook workflows for content generation
- Template library for common automation patterns

---

## Cost Tracking Infrastructure

### Types and Pricing

**Location**: `src/types/media-generation.ts`

```typescript
// Media providers
type MediaProvider = 'gemini-flash' | 'gemini-pro' | 'veo' | 'sora';

// Generation types
type MediaGenerationType = 'image' | 'video' | 'image_edit';

// Pricing (as of 2026-02)
const MEDIA_PRICING = {
    'gemini-flash': { perImage: 0.02 },        // $0.02/image
    'gemini-pro': { perImage: 0.04 },          // $0.04/image
    'veo': {
        per4Seconds: 0.50,                      // $0.50 for 4s
        per6Seconds: 0.625,                     // $0.625 for 6s
        per8Seconds: 0.75,                      // $0.75 for 8s
    },
    'sora': {
        per4Seconds: 0.50,                      // $0.50 for 4s
        per8Seconds: 1.00,                      // $1.00 for 8s
    },
} as const;
```

### Tracking Service

**Location**: `src/server/services/media-tracking.ts`

**Key Functions**:
```typescript
// Calculate costs
calculateImageCost(provider: 'gemini-flash' | 'gemini-pro'): number
calculateVideoCost(provider: 'veo' | 'sora', durationSeconds: number): number
estimateMediaCost(type, provider, options): MediaCostEstimate

// Track generations
trackMediaGeneration(event: MediaGenerationEvent): Promise<MediaGenerationEvent>

// Wrapped generators (auto-tracking)
withImageTracking<T>(...): Promise<T & { trackingEvent }>
withVideoTracking<T>(...): Promise<T & { trackingEvent }>

// Analytics
getMediaUsage(tenantId, startDate, endDate): Promise<MediaUsageStats>
getMediaCostsByProvider(tenantId, period): Promise<Record<MediaProvider, number>>
getRecentMediaEvents(tenantId, limit): Promise<MediaGenerationEvent[]>
checkCostLimit(tenantId, limitUsd): Promise<{ exceeded, currentCostUsd }>
```

**Firestore Collections**:
- `media_generation_events` - All generation events with costs
- `tenants/{id}/media_usage/{date}` - Daily aggregates for quick queries

**Important**: This is a service file (NOT a server action). No `'use server'` directive.

### Cost Dashboard

**Location**: `src/app/dashboard/ceo/components/costs-tab.tsx`

**URL**: `/dashboard/ceo?tab=costs`

**Features**:
- Summary cards (total cost, generations, success rate)
- Provider breakdown (Gemini Flash/Pro, Veo, Sora)
- Tenant breakdown (top spenders)
- Daily trend chart
- Time period filters (7d, 30d, 90d, all)

**Server Actions**: `src/server/actions/media-costs.ts`
```typescript
getMediaCostsDashboard(period): DashboardData
getGlobalMediaCosts(period): GlobalCostData
```

---

## Playbook Automation

### Step Executors

**Location**: `src/server/services/playbook-executor.ts`

**New Step Types**:
```typescript
// Fetch current deals from POS or Firestore
executeFetchDeals(step, context): Promise<{ deals: Deal[] }>

// Generate video with Veo or Sora
executeGenerateVideo(step, context): Promise<{
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    trackingEvent: MediaGenerationEvent;
}>

// Generate image with Gemini Flash/Pro
executeGenerateImage(step, context): Promise<{
    imageUrl: string;
    trackingEvent: MediaGenerationEvent;
}>

// Generate platform-specific caption with AI
executeGenerateCaption(step, context): Promise<{ caption: string }>

// Submit content for approval
executeSubmitApproval(step, context): Promise<{
    contentId: string;
    status: 'pending' | 'approved' | 'rejected';
}>
```

**Step Parameters**:
```typescript
// fetch_deals
{ source: 'firestore' | 'pos' }

// generate_video
{
    provider?: 'veo' | 'sora',
    aspectRatio?: '16:9' | '9:16' | '1:1',
    duration?: '5' | '10' | '15' | '30',
    style?: string,
    template?: string
}

// generate_image
{
    tier?: 'free' | 'paid' | 'super',
    style?: 'professional' | 'playful' | 'modern' | 'vintage' | 'luxury',
    aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16'
}

// generate_caption
{
    platform: 'instagram' | 'twitter' | 'facebook' | 'tiktok',
    includeHashtags?: boolean,
    includeCTA?: boolean
}

// submit_approval
{ platform: string }
```

### Playbook Templates

**Global Collection**: `playbook_templates`

**Seed Action**: `src/server/actions/seed-playbooks.ts`
```typescript
seedPlaybookTemplates(): Promise<{
    success: boolean;
    seeded: string[];
    skipped: string[];
    errors: string[];
}>

installPlaybookTemplate(templateId, orgId): Promise<{
    success: boolean;
    playbookId?: string;
    error?: string;
}>
```

**UI**: "Seed Templates" button on `/dashboard/ceo/playbooks`

**Available Templates**:

1. **Weekly Deals Video**
   - ID: `weekly-deals-video`
   - Schedule: Monday 9am (`0 9 * * 1`)
   - Steps: fetch_deals → generate_video → generate_caption → review → submit_approval → notify
   - Agent: Craig (marketer)
   - Requires approval: Yes

2. **Daily Product Spotlight**
   - ID: `daily-product-spotlight`
   - Steps: select_product → generate_image → generate_caption → submit_approval
   - Agent: Craig (marketer)
   - Requires approval: Yes

3. **Competitor Price Alert**
   - ID: `competitor-price-alert`
   - Steps: fetch_competitor_prices → analyze_pricing → generate_video → notify
   - Agent: Ezal (intel)
   - Requires approval: No (internal alert)

### Context Variables

Playbook steps can access results from previous steps via `context.stepResults`:

```typescript
interface PlaybookExecutionContext {
    playbookId: string;
    runId: string;
    tenantId: string;
    userId: string;
    triggeredBy: 'manual' | 'schedule' | 'webhook';
    variables: Record<string, unknown>;
    stepResults: Record<string, unknown>; // Results from previous steps
    startTime: number;
}

// Example: Access deals from step-1 in step-2
const deals = context.stepResults['step-1'].deals;
```

---

## Super Admin Features

### Sidebar Links

**Location**: `src/components/dashboard/super-admin-sidebar.tsx`

**Operations Section**:
- Creative Center → `/dashboard/creative`
- Media Costs → `/dashboard/ceo?tab=costs`
- Playbooks → `/dashboard/ceo/playbooks`

### Seeding Templates

**How to Seed**:
1. Navigate to `/dashboard/ceo/playbooks`
2. Click "Seed Templates" button (super_user only)
3. System checks `playbook_templates` collection
4. Seeds missing templates (skips existing)
5. Shows success/error toast

**Note**: Templates are global. Individual orgs install them via `installPlaybookTemplate()`.

---

## Unit Tests

### Test Coverage (35+ tests)

**Media Tracking** (`src/server/services/__tests__/media-tracking.test.ts`)
- 21 tests covering:
  - Image cost calculations (gemini-flash, gemini-pro)
  - Video cost calculations (veo 4s/6s/8s, sora 4s/8s)
  - Cost estimation for all providers
  - Invalid provider/type combinations
  - Cost comparison helpers

**Seed Playbooks** (`src/server/actions/__tests__/seed-playbooks.test.ts`)
- 14 tests covering:
  - Template seeding (success, skip, partial failure)
  - Weekly Deals Video structure validation
  - Required steps verification
  - Schedule trigger validation
  - Template installation for orgs
  - Error handling

**Playbook Executor Media** (`src/server/services/__tests__/playbook-executor-media.test.ts`)
- Integration tests for:
  - executeFetchDeals (Firestore and POS)
  - executeGenerateVideo (Veo and Sora)
  - executeGenerateImage (tier-based)
  - executeGenerateCaption (platform-specific)
  - executeSubmitApproval (creative content)
  - Full Weekly Deals workflow (end-to-end)
  - Cost tracking integration
  - Error handling

**Run Tests**:
```powershell
npm test -- --testPathPattern="media-tracking.test"
npm test -- --testPathPattern="seed-playbooks.test"
npm test -- --testPathPattern="playbook-executor-media.test"
```

---

## Implementation Patterns

### 1. Service File Pattern

**Always remove `'use server'` from service files**:
```typescript
// ❌ WRONG - Service file with 'use server'
'use server';
export function calculateCost() { ... }

// ✅ CORRECT - Service file without 'use server'
/**
 * Service file, NOT server action.
 * Exports utility functions for server actions.
 */
export function calculateCost() { ... }
```

**Why**: Turbopack requires all exports in `'use server'` files to be async functions. Service files export utility functions (often sync) used by server actions.

### 2. Cost Tracking Wrapper Pattern

**Always use tracking wrappers for generation**:
```typescript
// ✅ CORRECT - Automatic cost tracking
const result = await withVideoTracking(
    tenantId,
    userId,
    'veo',
    prompt,
    5, // duration
    async () => generateVeoVideo({ prompt, duration: '5' }),
    {
        contentId: 'content_123',
        playbookRunId: 'run_456',
    }
);

// Access both result and tracking event
console.log(result.videoUrl);
console.log(result.trackingEvent.costUsd);
```

**Benefits**:
- Automatic cost calculation
- Firestore persistence
- Success/failure tracking
- Generation time metadata
- No manual tracking calls

### 3. TypeScript Narrowing for Union Types

**Always narrow before accessing provider-specific properties**:
```typescript
// ❌ WRONG - TS can't narrow generic variable
const pricing = MEDIA_PRICING[provider];
if (provider === 'veo') {
    return pricing.per6Seconds; // Error: Property may not exist
}

// ✅ CORRECT - Direct access with narrowed type
if (provider === 'veo') {
    const veoPricing = MEDIA_PRICING.veo;
    return veoPricing.per6Seconds; // OK: Type is narrowed
}
```

---

## Common Issues

### Build Error: "'use server' file exports non-async"

**Cause**: Service file has `'use server'` directive but exports non-async functions.

**Fix**: Remove `'use server'` from service files. Only use in server action files.

**Example**:
- ✅ `src/server/actions/playbooks.ts` → Has `'use server'`
- ❌ `src/server/services/playbook-executor.ts` → No `'use server'`

### Missing Template Error

**Cause**: Org trying to run playbook that hasn't been installed.

**Fix**:
1. Seed global templates: `/dashboard/ceo/playbooks` → "Seed Templates"
2. Install for org: `installPlaybookTemplate('weekly-deals-video', 'org_id')`

### Cost Tracking Not Working

**Cause**: Direct generation call instead of using tracking wrappers.

**Fix**: Use `withImageTracking()` or `withVideoTracking()` wrappers.

---

## Related Files

**Types**:
- `src/types/media-generation.ts` - Core types and pricing
- `src/types/playbook.ts` - Playbook types

**Services**:
- `src/server/services/media-tracking.ts` - Cost tracking
- `src/server/services/playbook-executor.ts` - Step executors

**Actions**:
- `src/server/actions/media-costs.ts` - Dashboard actions
- `src/server/actions/seed-playbooks.ts` - Template management

**UI**:
- `src/app/dashboard/ceo/components/costs-tab.tsx` - Cost dashboard
- `src/app/dashboard/ceo/playbooks/page.tsx` - Playbooks page
- `src/components/dashboard/super-admin-sidebar.tsx` - Super admin nav

**Tests**:
- `src/server/services/__tests__/media-tracking.test.ts`
- `src/server/actions/__tests__/seed-playbooks.test.ts`
- `src/server/services/__tests__/playbook-executor-media.test.ts`

---

## Next Steps

**Potential Enhancements**:
- [ ] Add Imagen 3 support for image generation
- [ ] Implement cost alerts (daily/weekly/monthly thresholds)
- [ ] Add budget management (per-org limits)
- [ ] Expose cost API for external integrations
- [ ] Add media generation dashboard for brands/dispensaries
- [ ] Implement A/B testing for generated content
- [ ] Add style presets library for consistent branding
- [ ] Implement retry logic with exponential backoff
- [ ] Add generation queue for high-volume requests
- [ ] Implement caching for duplicate prompts

---

**Related References**:
- `.agent/refs/agents.md` - Agent implementations (Craig, Ezal)
- `.agent/refs/backend.md` - Backend architecture
- `.agent/refs/testing.md` - Testing guidelines
