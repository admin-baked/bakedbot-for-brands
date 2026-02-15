# Cannabis Marketing AI Academy

**Last Updated:** 2026-02-09

> BakedBot's primary lead generation engine and thought leadership platform.

---

## Overview

The Academy is a 12-episode video course teaching cannabis operators how to leverage AI for marketing, compliance, and customer retention. It serves dual purposes:
1. **Lead Generation** - Email gate captures high-intent prospects
2. **Thought Leadership** - Positions BakedBot as the category-defining authority

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLIC LANDING (/academy)                     │
│  ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────────┐  │
│  │ Episode │   │ Resource │   │   Email   │   │   Social    │  │
│  │  Cards  │   │ Library  │   │   Gate    │   │   Share     │  │
│  └────┬────┘   └────┬─────┘   └─────┬─────┘   └──────┬──────┘  │
└───────┼─────────────┼───────────────┼────────────────┼──────────┘
        │             │               │                │
        ▼             ▼               ▼                ▼
┌───────────────────────────────────────────────────────────────┐
│                      TRACKING LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │ Video Views │  │  Downloads  │  │     Lead Capture        ││
│  │ (milestones)│  │  (resources)│  │ (intent signals/score)  ││
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘│
└─────────┼────────────────┼─────────────────────┼──────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    FIRESTORE COLLECTIONS                       │
│  academy_views    academy_leads    scheduled_emails            │
└───────────────────────────────────────────────────────────────┘
          │                │                     │
          │                │                     ▼
          │                │         ┌─────────────────────────┐
          │                │         │   CLOUD SCHEDULER       │
          │                │         │  (hourly email cron)    │
          │                │         └───────────┬─────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    EMAIL NURTURE SEQUENCE                      │
│  Welcome (Day 0) → Value Email (Day 3) → Demo CTA (Day 7)     │
│  [tracking pixels]   [UTM params]        [20% offer]          │
└───────────────────────────────────────────────────────────────┘
```

---

## Key Files

### Core Infrastructure
| File | Purpose |
|------|---------|
| `src/types/academy.ts` | Type definitions (AcademyEpisode, AcademyResource, AcademyLead) |
| `src/lib/academy/curriculum.ts` | Programmatic content structure (12 episodes, 15+ resources) |
| `src/lib/academy/usage-tracker.ts` | Client-side localStorage tracking |

### Server Actions
| File | Purpose |
|------|---------|
| `src/server/actions/academy.ts` | Lead capture, view tracking, intent signals |
| `src/server/actions/video-progress.ts` | Video milestone tracking (25/50/75/100%) |

### Email System
| File | Purpose |
|------|---------|
| `src/server/services/academy-welcome.ts` | Email templates with tracking pixels |
| `src/app/api/cron/scheduled-emails/route.ts` | Hourly cron processor |

### Components
| File | Purpose |
|------|---------|
| `src/app/academy/page.tsx` | Public landing page |
| `src/components/academy/email-gate-modal.tsx` | Email capture modal |
| `src/components/academy/youtube-embed.tsx` | Video player with tracking |
| `src/components/academy/episode-card.tsx` | Episode display cards |
| `src/components/academy/resource-library.tsx` | Downloadable resources |
| `src/components/academy/social-share-buttons.tsx` | Social sharing with UTM |

### Protected Dashboard
| File | Purpose |
|------|---------|
| `src/app/dashboard/academy/page.tsx` | User progress dashboard |

---

## 12-Episode Curriculum

### General Track
1. **What Is AI Marketing for Cannabis** - Intro to AI-powered marketing
2. **The Invisible Menu Problem** - Why menus fail customers
3. **Indica vs Sativa Is a Lie** - Effect-based product discovery
4. **Compliance as Competitive Moat** - Turning constraints into advantages

### Agent Deep Dives
5. **Smokey (Budtender)** - AI product recommendations
6. **Craig (Marketer)** - Automated campaigns
7. **Ezal (Lookout)** - Competitive intelligence
8. **Deebo (Enforcer)** - Compliance automation
9. **Pops (Analyst)** - Revenue analytics
10. **Money Mike (CFO)** - Financial optimization
11. **Mrs. Parker (Memory)** - Customer retention

### Capstone
12. **The Full Stack** - Deploying all 7 agents together

---

## Email Nurture Sequence

### Email 1: Welcome (Immediate)
- **Subject:** "Welcome to the Cannabis Marketing AI Academy, {name}!"
- **Content:** Resource library access, episode 1 CTA
- **Tracking:** Open pixel, UTM links

### Email 2: Value Delivery (Day 3)
- **Subject:** "How Thrive Syracuse Increased Sales 40% with AI"
- **Content:** Case study, social proof, agent highlights
- **CTA:** "See BakedBot in Action"

### Email 3: Demo Booking (Day 7)
- **Subject:** "Your Exclusive Academy Member Offer (Expires Soon)"
- **Content:** 20% discount, urgency, testimonials
- **CTA:** "Book Your Demo (Save 20%)"

---

## Video Progress Tracking

### YouTube Player API Integration
```typescript
// Initialize YouTube Player API
(window as any).onYouTubeIframeAPIReady = () => {
  playerRef.current = new YT.Player(`youtube-player-${episode.id}`, {
    events: { onStateChange: handlePlayerStateChange }
  });
};

// Track progress every 10 seconds while playing
const trackCurrentProgress = async () => {
  const currentTime = playerRef.current.getCurrentTime();
  const duration = playerRef.current.getDuration();
  const completionPercentage = Math.round((currentTime / duration) * 100);

  // Detect milestones
  let milestone: 25 | 50 | 75 | 100 | undefined;
  if (completionPercentage >= 100 && !milestonesReached.has(100)) milestone = 100;
  else if (completionPercentage >= 75 && !milestonesReached.has(75)) milestone = 75;
  // ...

  await trackVideoProgress({ episodeId, watchedSeconds, totalSeconds, completionPercentage, milestone });
};
```

### Milestone Values
- **25%** - Engaged viewer
- **50%** - Interested prospect
- **75%** - High-intent lead
- **100%** - Completed episode (trigger next episode suggestion)

---

## Email Tracking

### Open Pixels
```html
<img src="https://bakedbot.ai/api/track/email/open?type=welcome&leadId=${leadId}"
     width="1" height="1" style="display:block;border:0;" alt="" />
```

### UTM Parameters
All email links include:
- `utm_source=email`
- `utm_medium=welcome|value|demo`
- `utm_campaign=academy`

---

## Lead Scoring

### Intent Signals
| Signal | Points | Trigger |
|--------|--------|---------|
| `video_binge` | +10 | 3+ videos in session |
| `multiple_downloads` | +10 | 2+ resource downloads |
| `demo_interest` | +25 | Clicked demo CTA |
| `high_engagement` | +15 | >30 min watch time |
| `return_visitor` | +10 | 2+ sessions |
| `completed_track` | +20 | All episodes in track |

### Score Calculation
```typescript
function calculateLeadScore(lead: AcademyLead): number {
  let score = 0;
  score += lead.videosWatched * 5;
  score += lead.resourcesDownloaded * 10;
  score += lead.intentSignals.length * 10;
  if (lead.intentSignals.includes('demo_interest')) score += 25;
  if (lead.intentSignals.includes('completed_track')) score += 20;
  return Math.min(score, 100);
}
```

---

## Cloud Scheduler Setup

```bash
# Create scheduled job for email automation
gcloud scheduler jobs create http academy-email-cron \
  --schedule="0 * * * *" \
  --uri="https://bakedbot.ai/api/cron/scheduled-emails" \
  --http-method=GET \
  --headers="Authorization=Bearer $CRON_SECRET" \
  --location=us-central1

# Verify job
gcloud scheduler jobs describe academy-email-cron --location=us-central1
```

**Environment Variable:** `CRON_SECRET` in `apphosting.yaml`

---

## Unit Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/server/actions/__tests__/video-progress.test.ts` | 9 | Milestone detection, auth handling |
| `src/app/api/cron/scheduled-emails/__tests__/route.test.ts` | 11 | Auth, processing, error handling |
| `src/components/academy/__tests__/social-share-buttons.test.tsx` | 21 | Share URLs, UTM params, clipboard |
| `src/server/services/__tests__/academy-welcome.test.ts` | 20 | Templates, pixels, Letta integration |

**Total: 61 tests**

---

## Common Patterns

### Usage Gating (Client-Side)
```typescript
import { canViewContent, recordContentView, hasProvidedEmail } from '@/lib/academy/usage-tracker';

// Check if user can view more content
const { allowed, remaining } = canViewContent('video');
if (!allowed) {
  // Show email gate modal
}

// Record view after watching
recordContentView({ type: 'video', contentId: episode.id });
```

### Reserved Path
Added `'academy'` to `RESERVED_PATHS` in `src/app/[brand]/page.tsx` to prevent routing conflict with brand pages.

---

## Analytics Dashboard

**Path**: `/dashboard/academy-analytics` (Super User only)

Comprehensive analytics dashboard for Academy performance and lead quality.

### Features

**1. Overview Metrics**
- Total leads with lead score distribution
- Total video views by episode
- Total resource downloads
- Total demo requests (high-intent signal)
- Growth percentages (week/month/all-time)

**2. Conversion Funnel**
```
Visitors → Video Views → Email Captures → Demo Requests → Conversions
```
- Tracks drop-off rates at each stage
- Estimated visitor count (40% capture rate assumption)

**3. Popular Episodes**
- Top 5 episodes by view count
- Average watch time per episode
- Completion rates (75%+ = engaged)
- Ranked by views

**4. Popular Resources**
- Top 5 downloaded resources
- Download counts by resource ID
- Resource type (PDF, Excel, template, checklist)

**5. High-Intent Leads**
- Leads with score > 75
- Sorted by lead score descending
- Shows: email, firstName, leadScore, videosWatched, resourcesDownloaded, intentSignals[]
- Limit: Top 10 for quick review

**6. Lead Score Distribution**
- Bucketed: 0-24, 25-49, 50-74, 75-100
- Visual breakdown of lead quality

### Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/academy-analytics/page.tsx` | Analytics dashboard page |
| `src/server/actions/academy-analytics.ts` | `getAcademyAnalytics()` server action |
| `src/types/academy.ts` | `AcademyAnalytics` type definition |

### Server Action

```typescript
export async function getAcademyAnalytics(
  input: { timeRange: 'week' | 'month' | 'all' }
): Promise<{ success: boolean; data?: AcademyAnalytics; error?: string }>
```

**Access Control**: Requires `super_user` role via `requireSuperUser()`

### Firestore Collections Read
- `academy_leads` - Lead data with scoring
- `academy_views` - Video views (type: 'video') and resource downloads (type: 'resource')

### Analytics Type

```typescript
interface AcademyAnalytics {
  totalLeads: number;
  totalVideoViews: number;
  totalDownloads: number;
  totalDemoRequests: number;
  leadGrowth: number; // Percentage
  videoGrowth: number;
  downloadGrowth: number;
  demoGrowth: number;
  funnel: {
    visitors: number;
    videoViews: number;
    emailCaptures: number;
    demoRequests: number;
    conversions: number;
  };
  popularEpisodes: {
    episodeId: string;
    title: string;
    views: number;
    avgWatchTime: number;
    completionRate: number;
  }[];
  popularResources: {
    resourceId: string;
    title: string;
    downloads: number;
    type: string;
  }[];
  highIntentLeads: {
    id: string;
    email: string;
    firstName: string;
    leadScore: number;
    videosWatched: number;
    resourcesDownloaded: number;
    intentSignals: string[];
  }[];
  leadScoreDistribution: {
    '0-24': number;
    '25-49': number;
    '50-74': number;
    '75-100': number;
  };
}
```

### Integration with CEO Dashboard

Academy leads are also aggregated in the CEO Dashboard Leads Tab (`/dashboard/ceo?tab=leads`) alongside other lead sources. This provides:

1. **Unified View**: All leads across all sources (academy, vibe, training, age gates)
2. **Source Filtering**: Filter dropdown includes "academy" option
3. **Comparative Analysis**: Compare academy lead volume vs other sources
4. **CSV Export**: Export academy leads for CRM import

### Sidebar Navigation

**Super Admin Sidebar:**
```
📚 Content & Growth
  ├── Academy Dashboard (/dashboard/academy) - User-facing
  ├── Academy Analytics (/dashboard/academy-analytics) - Admin analytics ← HERE
  ├── Vibe Admin (/dashboard/vibe-admin)
  ├── Training Program (/dashboard/training)
  └── Training Admin (/dashboard/training/admin)

📊 Analytics (CEO Dashboard)
  └── Leads (/dashboard/ceo?tab=leads) ← Unified view
```

---

## Related Documentation

- **Prime.md** - Recent updates overview
- **MEMORY.md** - Quick reference
- **super-users.md** - Lead Management Dashboard section
- **Plan File** - `C:\Users\admin\.claude\plans\reactive-strolling-moonbeam.md` (full implementation plan)
