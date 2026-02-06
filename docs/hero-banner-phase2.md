# Hero Banner System - Phase 2 Features

> Advanced features for the Hero Banner system

**Status:** ✅ Complete
**Date:** 2026-02-06

---

## 📋 Phase 2 Features Overview

Phase 2 adds powerful new capabilities to the Hero Banner system:

1. **Image Upload** - Direct upload to Firebase Storage
2. **AI Color Extraction** - Extract brand colors from logo
3. **Extended Stats** - Certifications, awards, years in business
4. **Scheduled Activation** - Time-based hero switching
5. **Analytics Tracking** - Views and CTA click tracking
6. **A/B Testing** - Compare hero performance

---

## 🖼️ 1. Image Upload System

### Overview
Direct upload to Firebase Storage with validation and optimization.

### Files Created
- `src/lib/storage/hero-images.ts` - Upload/delete utilities
- `src/app/api/heroes/upload/route.ts` - Upload API endpoint

### Usage

**Upload Logo or Hero Image:**
```typescript
// Client-side
const formData = new FormData();
formData.append('file', file);
formData.append('orgId', 'org_123');
formData.append('type', 'logo'); // or 'hero'

const response = await fetch('/api/heroes/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// { success: true, url: "https://storage.googleapis.com/..." }
```

**Validation:**
- Max file size: 5MB
- Allowed types: JPG, PNG, GIF, WebP, SVG
- Automatic public URL generation

**Storage Path:**
```
heroes/
  {orgId}/
    logo/
      {timestamp}_{filename}
    hero/
      {timestamp}_{filename}
```

---

## 🎨 2. AI Color Palette Extraction

### Overview
Uses Claude Vision to analyze logo images and extract brand colors.

### Files Created
- `src/app/api/heroes/extract-colors/route.ts` - Color extraction API

### Usage

**Extract Colors from Logo:**
```typescript
const response = await fetch('/api/heroes/extract-colors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://storage.googleapis.com/.../logo.png',
  }),
});

const result = await response.json();
// {
//   success: true,
//   colorPalette: {
//     primaryColor: "#16a34a",
//     secondaryColors: ["#22c55e", "#10b981", "#059669"],
//     reasoning: "Green tones represent natural cannabis brand",
//     brandPersonality: "natural"
//   }
// }
```

**How It Works:**
1. User uploads logo
2. Logo URL sent to Claude Vision API
3. AI analyzes dominant and accent colors
4. Returns hex codes with reasoning
5. UI applies colors to hero banner

---

## 📊 3. Extended Stats

### Overview
Additional stats beyond products/retailers/rating.

### New Fields (src/types/heroes.ts)
```typescript
interface HeroStats {
  products?: number;
  retailers?: number;
  rating?: number;
  yearsInBusiness?: number; // e.g., 10
  certifications?: string[]; // e.g., ["Organic", "Lab Tested"]
  awards?: string[]; // e.g., ["Best Edibles 2025"]
}
```

### Display Examples
- "Over 10 years of experience"
- Certification badges (Organic, Lab Tested, Veteran Owned)
- Award highlights

---

## ⏰ 4. Scheduled Activation

### Overview
Automatically activate/deactivate heroes based on schedule.

### Files Created
- `src/server/services/hero-scheduler.ts` - Scheduling service

### Usage

**Schedule Hero Activation:**
```typescript
import { scheduleHeroActivation } from '@/server/services/hero-scheduler';

await scheduleHeroActivation(
  'hero_123',
  new Date('2026-04-20T00:00:00'), // 4/20 campaign
  new Date('2026-04-21T23:59:59'),
  true // Auto-deactivate after end date
);
```

**Process Scheduled Heroes (Cron Job):**
```typescript
import { processScheduledHeroes } from '@/server/services/hero-scheduler';

// Call this every 15 minutes via Cloud Scheduler
const result = await processScheduledHeroes();
// {
//   success: true,
//   activated: 2,
//   deactivated: 1
// }
```

### Data Structure
```typescript
interface Hero {
  scheduledActivation?: {
    startDate: Date;
    endDate?: Date;
    autoDeactivate?: boolean;
  };
}
```

### Setup Cloud Scheduler (Required)

**Create Cloud Function:**
```javascript
// functions/src/scheduled-heroes.ts
import { processScheduledHeroes } from '@/server/services/hero-scheduler';

export const processHeroSchedules = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    await processScheduledHeroes();
  });
```

**Or use Cloud Scheduler + HTTP endpoint:**
```powershell
gcloud scheduler jobs create http process-hero-schedules `
  --schedule="*/15 * * * *" `
  --uri="https://your-app.web.app/api/cron/hero-scheduler" `
  --http-method=POST `
  --project=bakedbot-agents
```

---

## 📈 5. Analytics Tracking

### Overview
Track hero views and CTA clicks with conversion rates.

### Files Created
- `src/app/actions/hero-analytics.ts` - Analytics actions

### Usage

**Track Hero View:**
```typescript
import { trackHeroView } from '@/app/actions/hero-analytics';

// On hero render
await trackHeroView('hero_123');
```

**Track CTA Click:**
```typescript
import { trackHeroCtaClick } from '@/app/actions/hero-analytics';

// On CTA button click
await trackHeroCtaClick('hero_123', 'primary');
```

**Get Analytics:**
```typescript
import { getHeroAnalytics } from '@/app/actions/hero-analytics';

const result = await getHeroAnalytics('hero_123');
// {
//   views: 1250,
//   primaryClicks: 87,
//   secondaryClicks: 34,
//   conversionRate: 0.097, // 9.7%
//   lastViewed: Date
// }
```

**Get Org Analytics:**
```typescript
import { getOrgHeroAnalytics } from '@/app/actions/hero-analytics';

const result = await getOrgHeroAnalytics('org_123');
// Returns analytics for all heroes in org
```

### Data Structure
```typescript
interface Hero {
  analytics?: {
    views: number;
    ctaClicks: {
      primary: number;
      secondary: number;
    };
    lastViewed?: Date;
    conversionRate?: number; // Auto-calculated
  };
}
```

### Implementation in Components

**Hero Display (Brand Menu Page):**
```tsx
'use client';

import { useEffect } from 'react';
import { trackHeroView, trackHeroCtaClick } from '@/app/actions/hero-analytics';
import { BrandHero } from '@/components/demo/brand-hero';

export function HeroWithTracking({ hero }) {
  useEffect(() => {
    // Track view on mount
    trackHeroView(hero.id);
  }, [hero.id]);

  const handleFindNearMe = async () => {
    await trackHeroCtaClick(hero.id, 'primary');
    // Navigate to map...
  };

  const handleShopNow = async () => {
    await trackHeroCtaClick(hero.id, hero.secondaryCta ? 'secondary' : 'primary');
    // Navigate to shop...
  };

  return (
    <BrandHero
      {...hero}
      onFindNearMe={handleFindNearMe}
      onShopNow={handleShopNow}
    />
  );
}
```

---

## 🧪 6. A/B Testing Framework

### Overview
Run A/B tests to compare two hero variants.

### Files Created
- `src/server/services/hero-ab-testing.ts` - A/B testing service

### Usage

**Create A/B Test:**
```typescript
import { createABTest } from '@/server/services/hero-ab-testing';

const result = await createABTest(
  'org_123',                       // Organization ID
  'Holiday vs Standard',           // Test name
  'hero_a',                        // Control hero
  'hero_b',                        // Variant hero
  new Date('2026-03-01'),         // Start date
  new Date('2026-03-15'),         // End date
  0.5                              // 50/50 traffic split
);
// { success: true, testId: "test_abc123" }
```

**Select Hero Variant for User:**
```typescript
import { selectHeroVariant } from '@/server/services/hero-ab-testing';

// Generate consistent user hash (from IP, session ID, or user ID)
const userHash = hashString(req.ip);

const result = await selectHeroVariant('org_123', userHash);
// { success: true, heroId: "hero_b", variant: "B" }

// Show the selected hero to user
const hero = await getHeroById(result.heroId);
```

**Complete Test & Get Winner:**
```typescript
import { completeABTest } from '@/server/services/hero-ab-testing';

const result = await completeABTest('test_abc123');
// {
//   success: true,
//   winner: "B",
//   results: {
//     heroA: { views: 500, conversionRate: 0.08 },
//     heroB: { views: 520, conversionRate: 0.12 },
//     confidenceLevel: 0.85
//   }
// }
```

### Data Structure

**ABTest Collection:**
```typescript
interface ABTest {
  id: string;
  orgId: string;
  name: string;
  heroAId: string;
  heroBId: string;
  startDate: Date;
  endDate?: Date;
  trafficSplit: number; // 0-1
  status: 'active' | 'completed' | 'paused';
  results?: {
    heroA: { views, clicks, conversionRate };
    heroB: { views, clicks, conversionRate };
    winner?: 'A' | 'B' | 'tie';
    confidenceLevel?: number;
  };
}
```

**Hero abTest Field:**
```typescript
interface Hero {
  abTest?: {
    testId: string;
    variant: 'A' | 'B';
    startDate: Date;
    endDate?: Date;
  };
}
```

### Best Practices

1. **Test Duration**: Run tests for at least 1 week to account for weekly patterns
2. **Minimum Sample Size**: 1000+ views per variant for statistical significance
3. **Single Variable**: Change only one thing (color, CTA text, image, etc.)
4. **Winner Activation**: Manually activate winning hero after test completion

---

## 🔥 Quick Start - Phase 2

### 1. Set Up Image Upload

**Configure Firebase Storage:**
```javascript
// firebase.json
{
  "storage": {
    "rules": "storage.rules"
  }
}
```

**Storage Rules:**
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /heroes/{orgId}/{type}/{filename} {
      // Allow authenticated users to upload to their org
      allow write: if request.auth != null
        && request.auth.token.orgId == orgId
        && type in ['logo', 'hero']
        && request.resource.size < 5 * 1024 * 1024; // 5MB

      // Allow public read
      allow read: if true;
    }
  }
}
```

### 2. Set Up Scheduled Activation

**Option A: Cloud Function (Recommended)**
```javascript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import { processScheduledHeroes } from './hero-scheduler';

export const heroScheduler = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const result = await processScheduledHeroes();
    console.log(`Processed: ${result.activated} activated, ${result.deactivated} deactivated`);
  });
```

**Option B: Cloud Scheduler + HTTP Endpoint**
```typescript
// src/app/api/cron/hero-scheduler/route.ts
import { NextResponse } from 'next/server';
import { processScheduledHeroes } from '@/server/services/hero-scheduler';

export async function POST() {
  const result = await processScheduledHeroes();
  return NextResponse.json(result);
}
```

### 3. Integrate Analytics

**Update BrandHero wrapper:**
```tsx
// src/components/demo/brand-hero-wrapper.tsx
'use client';

import { useEffect } from 'react';
import { BrandHero } from './brand-hero';
import { trackHeroView, trackHeroCtaClick } from '@/app/actions/hero-analytics';

export function BrandHeroWithAnalytics({ hero }) {
  useEffect(() => {
    trackHeroView(hero.id);
  }, [hero.id]);

  return (
    <BrandHero
      {...hero}
      onFindNearMe={() => {
        trackHeroCtaClick(hero.id, 'primary');
        // Navigate...
      }}
      onShopNow={() => {
        trackHeroCtaClick(hero.id, hero.secondaryCta ? 'secondary' : 'primary');
        // Navigate...
      }}
    />
  );
}
```

---

## 🔧 Configuration

### Required Indexes

```json
{
  "collectionGroup": "hero_ab_tests",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "orgId", "order": "ASCENDING"},
    {"fieldPath": "status", "order": "ASCENDING"}
  ]
}
```

### Environment Variables

No new environment variables required! Uses existing Firebase and Claude setup.

---

## 📊 Analytics Dashboard (Future UI)

**Planned Dashboard Features:**
- Real-time view/click counters
- Conversion rate graphs
- A/B test results comparison
- Best performing heroes leaderboard
- Time-series analytics

**Location:** `/dashboard/heroes?tab=analytics`

---

## 🚀 Deployment Checklist

- [ ] Deploy Storage rules (`firebase deploy --only storage`)
- [ ] Deploy Firestore indexes (`firebase deploy --only firestore:indexes`)
- [ ] Set up Cloud Scheduler or Cloud Function for scheduled activation
- [ ] Test image upload with logo and hero image
- [ ] Test color extraction with sample logo
- [ ] Create test A/B test and verify variant selection
- [ ] Verify analytics tracking on live hero

---

## 🐛 Troubleshooting

### Image Upload Fails

**Symptom:** "Failed to upload image"

**Solutions:**
1. Check Firebase Storage is enabled
2. Verify storage rules allow write for authenticated users
3. Check file size (must be < 5MB)
4. Verify file type is allowed

### Color Extraction Returns Generic Colors

**Symptom:** Always returns #16a34a

**Solutions:**
1. Check image URL is publicly accessible
2. Verify Claude Vision API is working
3. Try with higher resolution logo
4. Check API response for parsing errors

### Scheduled Heroes Not Activating

**Symptom:** Heroes past start date remain inactive

**Solutions:**
1. Verify Cloud Scheduler/Function is running
2. Check logs for `processScheduledHeroes()` execution
3. Verify scheduledActivation field is set correctly
4. Check date/time timezone handling

### Analytics Not Tracking

**Symptom:** Views/clicks stay at 0

**Solutions:**
1. Verify `trackHeroView()` is called on hero render
2. Check Firestore rules allow analytics field updates
3. Verify `FieldValue.increment()` is working
4. Check browser console for errors

---

## 💡 Phase 3 Ideas

Future enhancements to consider:

- [ ] Video background support for heroes
- [ ] Animated hero transitions
- [ ] Multi-language hero content
- [ ] Dynamic personalization (location-based CTAs)
- [ ] Social media preview generator
- [ ] Hero templates library
- [ ] Bulk hero creation from CSV
- [ ] Integration with Google Analytics

---

**Questions?** Refer to [hero-banner-system.md](./hero-banner-system.md) for core documentation.

**Last Updated:** 2026-02-06
