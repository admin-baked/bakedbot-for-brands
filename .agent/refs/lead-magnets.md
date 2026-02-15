# Lead Magnet Integration Architecture

**Last Updated:** 2026-02-15

> Unified architecture for Academy, Vibe Studio, Training, and general lead capture systems.

---

## Overview

BakedBot uses a **multi-source lead aggregation** system where different public-facing features capture leads into separate Firestore collections, then aggregate them into a unified CEO Dashboard view.

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLIC LEAD MAGNETS                          │
│  /academy    /vibe    /training    Age Gates    Menu    Chatbot │
└──────┬──────────┬────────────┬──────────┬────────┬────────┬─────┘
       │          │            │          │        │        │
       ▼          ▼            ▼          └────────┴────────┘
┌─────────┐ ┌─────────┐ ┌─────────┐      ▼
│ academy │ │  vibe   │ │training │  ┌──────────┐
│ _leads  │ │ _leads  │ │ _cohorts│  │  email   │
│         │ │         │ │         │  │  _leads  │
└────┬────┘ └────┬────┘ └────┬────┘  └─────┬────┘
     │           │           │             │
     ▼           ▼           ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│              FEATURE-SPECIFIC ADMIN DASHBOARDS               │
│  /dashboard/     /dashboard/    /dashboard/                  │
│  academy-        vibe-admin     training/admin               │
│  analytics                                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────────┐
          │    CEO UNIFIED LEADS DASHBOARD     │
          │   /dashboard/ceo?tab=leads         │
          │  (aggregates ALL sources)          │
          └────────────────────────────────────┘
```

---

## Lead Sources

### 1. Academy (`academy_leads`)

**Public Entry**: `/academy`
**Admin Dashboard**: `/dashboard/academy-analytics`
**Trigger**: Email gate after 3 video views

#### Data Structure
```typescript
{
  id: string;
  email: string;
  firstName?: string;
  videosWatched: number;
  resourcesDownloaded: number;
  leadScore: number; // 0-100
  intentSignals: string[]; // 'demo_interest', 'completed_track', etc.
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: Date;
  lastActivityAt: Date;
  status?: 'active' | 'converted' | 'churned';
}
```

#### Key Files
- **Capture**: `src/server/actions/academy.ts` → `captureAcademyLead()`
- **Analytics**: `src/server/actions/academy-analytics.ts` → `getAcademyAnalytics()`
- **Component**: `src/app/academy/page.tsx`

#### Related Collection
- `academy_views` - Tracks video views (type: 'video') and resource downloads (type: 'resource')

---

### 2. Vibe Studio (`vibe_leads`)

**Public Entry**: `/vibe`
**Admin Dashboard**: `/dashboard/vibe-admin`
**Trigger**: Email gate after 3 web vibes OR immediately for mobile vibes

#### Data Structure
```typescript
{
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  industry?: 'cannabis' | 'cbd' | 'wellness' | 'retail' | 'other';
  source: 'vibe-generator' | 'vibe-templates' | 'mobile-vibe' | 'download';
  platformInterest: 'web' | 'mobile' | 'both';
  vibesGenerated: number;
  refinementCount: number;
  highIntent: boolean;
  intentSignals: string[]; // 'multiple_vibes', 'heavy_refinement', 'mobile_interest', etc.
  lastVibeId?: string;
  lastVibeName?: string;
  utmSource?: string;
  createdAt: Date;
  lastActivityAt: Date;
}
```

#### Key Files
- **Capture**: `src/server/actions/leads.ts` → `captureEmail()`
- **Read**: `src/server/actions/leads.ts` → `getVibeLeads()`
- **Component**: `src/app/vibe/page.tsx`

#### Related Collections
- `public_vibes` - Web vibes (colors, fonts, layout)
- `public_mobile_vibes` - Mobile vibes (theme, radius, screens)

---

### 3. Training (`training_cohorts` + user progress)

**Public Entry**: `/training`
**Student Dashboard**: `/dashboard/training`
**Admin Dashboard**: `/dashboard/training/admin`
**Trigger**: Auto-enrollment on signup (zero-touch)

#### Data Structure
```typescript
// Training Cohort
{
  id: string;
  name: string; // 'Cohort Feb 2026'
  startDate: Date;
  endDate: Date; // 8 weeks from start
  maxParticipants: 50;
  currentParticipants: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
}

// User Progress (users/{userId}/training/progress)
{
  userId: string;
  cohortId: string;
  currentWeek: number; // 1-8
  completedChallenges: string[]; // Challenge IDs
  submissions: Array<{
    challengeId: string;
    submittedAt: Date;
    status: 'pending' | 'approved' | 'needs_revision';
  }>;
  startedAt: Date;
  lastActivityAt: Date;
}
```

#### Key Files
- **Enrollment**: `src/server/actions/training.ts` → `selfEnrollInTraining()`
- **Progress**: `src/server/actions/training.ts` → `getTrainingProgress()`
- **Admin**: `src/server/actions/training.ts` → `getCohorts()`, `getCohortStudents()`
- **Component**: `src/app/training/page.tsx`

---

### 4. General Leads (`email_leads`)

**Sources**: Age gates, menu, demo-shop, homepage, chatbot
**Dashboard**: `/dashboard/ceo?tab=leads` (primary consumer)

#### Data Structure
```typescript
{
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  emailConsent: boolean;
  smsConsent: boolean;
  brandId?: string;
  dispensaryId?: string;
  state?: string;
  source: string; // 'menu', 'demo-shop', 'homepage', 'chatbot', 'age-gate', etc.
  ageVerified: boolean;
  dateOfBirth?: string;
  firstOrderDiscountCode?: string;
  capturedAt: number;
  lastUpdated: number;
  welcomeEmailSent?: boolean;
  welcomeSmsSent?: boolean;
  tags: string[];
}
```

#### Key Files
- **Capture**: `src/server/actions/email-capture.ts` → `captureEmailLead()`
- **Read**: `src/server/actions/email-capture.ts` → `getLeads()`, `getLeadStats()`
- **Component**: `src/app/dashboard/ceo/components/leads-tab.tsx`

---

## CEO Unified Leads Dashboard

**Path**: `/dashboard/ceo?tab=leads`
**Component**: `src/app/dashboard/ceo/components/leads-tab.tsx`

### Features

1. **Stats Cards**
   - Total leads
   - Email opt-ins (percentage)
   - SMS opt-ins (percentage)
   - Age verified (percentage)

2. **Source Filter**
   - Dropdown with all sources
   - Shows count for each source: `academy (45)`, `vibe-generator (120)`, `training (30)`, etc.
   - "All Sources" option

3. **CSV Export**
   - Exports filtered leads
   - Headers: Lead ID, Name, Email, Phone, State, Source, Email Consent, SMS Consent, Age Verified, Captured At
   - Filename: `bakedbot-leads-{YYYY-MM-DD}.csv`

4. **Lead Table**
   - Columns: Name, Email (with consent icon), Phone (with consent icon), State, Source (badge), Consent, Captured (relative time)
   - Sortable by timestamp
   - Pagination (shows first 1000)

### Server Actions

```typescript
// Get all leads (optionally filtered by brandId/dispensaryId)
export async function getLeads(
  brandId?: string,
  dispensaryId?: string
): Promise<EmailLead[]>

// Get aggregated statistics
export async function getLeadStats(
  brandId?: string,
  dispensaryId?: string
): Promise<{
  total: number;
  emailOptIns: number;
  smsOptIns: number;
  ageVerified: number;
  bySource: Record<string, number>; // { academy: 45, vibe: 120, ... }
}>
```

**Note**: This reads **only** the `email_leads` collection, NOT `academy_leads` or `vibe_leads`. Those have dedicated admin dashboards.

---

## Lead Scoring

Each lead magnet calculates a **lead score (0-100)** based on engagement:

### Academy Scoring
```typescript
Base: 25
+ Videos watched × 10
+ Resources downloaded × 5
+ Demo requested × 25
+ Completed agent track × 20
= Max 100
```

### Vibe Studio Scoring
```typescript
Base: 20
+ Vibes generated × 5
+ Refinements × 2
+ Mobile interest × 15
+ Downloaded package × 10
= Max 100
```

### Training Scoring
```typescript
Base: 30
+ Weeks completed × 10
+ Challenges submitted × 5
+ Peer reviews given × 3
= Max 100
```

**High-Intent Threshold**: Score > 75

---

## Common Integration Patterns

### 1. Lead Capture Pattern

```typescript
// Step 1: Public page triggers lead capture
export async function captureFeatureLead(data: CaptureInput) {
  // Validate input
  if (!data.email) return { success: false, error: 'Email required' };

  // Check for existing lead
  const existing = await db.collection('feature_leads')
    .where('email', '==', data.email)
    .limit(1)
    .get();

  if (!existing.empty) {
    // Update existing lead
    await existing.docs[0].ref.update({
      ...updates,
      lastActivityAt: Date.now(),
    });
    return { success: true, leadId: existing.docs[0].id, isNewLead: false };
  }

  // Create new lead
  const leadData = {
    ...data,
    leadScore: calculateScore(data),
    intentSignals: detectSignals(data),
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  const docRef = await db.collection('feature_leads').add(leadData);
  return { success: true, leadId: docRef.id, isNewLead: true };
}
```

### 2. Analytics Dashboard Pattern

```typescript
// Step 1: Require super user
await requireSuperUser();

// Step 2: Read collections
const leads = await db.collection('feature_leads').get();
const views = await db.collection('feature_views').get();

// Step 3: Calculate metrics
const analytics = {
  totalLeads: leads.size,
  totalViews: views.size,
  highIntentLeads: leads.docs.filter(d => d.data().leadScore > 75),
  popularContent: calculatePopular(views.docs),
  funnel: calculateFunnel(leads.docs, views.docs),
};

return { success: true, data: analytics };
```

### 3. Sidebar Registration Pattern

```typescript
// src/components/dashboard/super-admin-sidebar.tsx
<SidebarMenuButton asChild isActive={pathname === '/dashboard/feature-analytics'}>
  <Link href="/dashboard/feature-analytics">
    <Icon />
    Feature Analytics
  </Link>
</SidebarMenuButton>
```

---

## Firestore Collections Summary

| Collection | Purpose | Written By | Read By |
|-----------|---------|------------|---------|
| `email_leads` | General leads (age gate, menu, chatbot) | `captureEmailLead()` | `getLeads()` (CEO Dashboard) |
| `academy_leads` | Academy-specific leads with scoring | `captureAcademyLead()` | `getAcademyAnalytics()` |
| `academy_views` | Video views + resource downloads | `trackVideoProgress()`, `trackResourceDownload()` | `getAcademyAnalytics()` |
| `vibe_leads` | Vibe Studio leads with intent signals | `captureEmail()` | `getVibeLeads()` |
| `public_vibes` | Web vibes (colors, fonts, layout) | `generateVibe()` | `/vibe` page |
| `public_mobile_vibes` | Mobile vibes (theme, radius, screens) | `generateMobileVibe()` | `/vibe` page |
| `training_cohorts` | Training cohorts (max 50 students) | `selfEnrollInTraining()` | `getCohorts()` |
| `users/{userId}/training/progress` | Student progress (36 challenges, 8 weeks) | `submitChallenge()` | `getTrainingProgress()` |

---

## Data Flow Summary

```
1. User visits public page (/academy, /vibe, /training)
   ↓
2. Trigger condition met (3 views, signup, etc.)
   ↓
3. Lead capture modal/form shown
   ↓
4. Server action called (captureAcademyLead, captureEmail, selfEnrollInTraining)
   ↓
5. Data written to Firestore (academy_leads, vibe_leads, training_cohorts)
   ↓
6. Admin dashboard reads collection (getAcademyAnalytics, getVibeLeads, getCohorts)
   ↓
7. CEO Dashboard aggregates ALL sources (getLeads, getLeadStats)
   ↓
8. Export to CSV for CRM integration
```

---

## Reserved Paths

The following paths are reserved in `src/app/[brand]/page.tsx` to prevent routing conflicts:

```typescript
const RESERVED_PATHS = [
  'academy',
  'vibe',
  'training',
  'dashboard',
  'api',
  'auth',
  // ... more
];
```

---

## Related Documentation

- **super-users.md** - Lead Management Dashboard details
- **academy.md** - Academy Analytics Dashboard
- **MEMORY.md** - Quick reference (Lead Magnet Dashboard Integration section)
- **Prime.md** - Recent updates
