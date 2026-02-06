# Hero Banner System - Implementation Guide

> AI-powered hero banner design tool for cannabis dispensaries and brands

**Status:** ✅ Complete
**Date:** 2026-02-06
**Pattern:** Modeled after Carousel system

---

## 📋 Overview

The Hero Banner System provides a complete solution for creating, managing, and deploying stunning hero banners on brand and dispensary menu pages. It combines AI-powered generation with manual customization and live preview capabilities.

### Key Features

✅ **AI-Powered Generation** - Claude AI suggests colors, copy, and CTAs
✅ **Live Preview** - Real-time rendering with desktop/mobile views
✅ **Inline & Standalone** - Works in chat and dedicated dashboard
✅ **Template System** - 10+ preset prompts for common scenarios
✅ **Active/Draft Workflow** - Only one hero active per organization
✅ **Unified Artifacts** - Integrated with artifact system

---

## 🏗️ Architecture

### Component Hierarchy

```
Dashboard
├── /dashboard/heroes (Standalone Page)
│   ├── HeroGeneratorInline (AI Builder Tab)
│   │   ├── AI Prompt Input
│   │   ├── HeroPreview (Live Preview)
│   │   └── Hero Builder Form
│   └── Hero Grid (Your Heroes Tab)
│       ├── Hero Cards (with preview thumbnails)
│       └── Actions (Edit, Duplicate, Activate, Delete)
│
├── Inline (Chat Integration)
│   └── HeroGeneratorInline
│       ├── AI Generation
│       ├── Manual Builder
│       └── Live Preview
│
└── Management
    ├── HeroForm (Edit/Create Sheet)
    ├── HeroPreview (Preview Sheet)
    └── BrandHero (Display Component)
```

### Data Flow

```
User Prompt
    ↓
AI API (/api/ai/hero-suggest)
    ↓
Claude AI Analysis
    ↓
Hero Suggestion (colors, copy, style)
    ↓
HeroGeneratorInline (user customization)
    ↓
Server Action (createHero)
    ↓
Firestore (heroes collection)
    ↓
Menu Pages (display active hero)
```

---

## 📁 File Structure

### Types
- **[src/types/heroes.ts](../src/types/heroes.ts)** - Hero, HeroAISuggestion, enums
- **[src/types/unified-artifact.ts](../src/types/unified-artifact.ts)** - Added `hero_banner` type

### Server Actions
- **[src/app/actions/heroes.ts](../src/app/actions/heroes.ts)** - CRUD operations
  - `getHeroes(orgId)` - List all heroes
  - `getHeroById(id)` - Get single hero
  - `getActiveHero(orgId)` - Get currently active hero
  - `createHero(data)` - Create new hero
  - `updateHero(id, data)` - Update hero
  - `deleteHero(id)` - Delete hero
  - `toggleHeroActive(id, active)` - Activate/deactivate
  - `duplicateHero(id)` - Clone hero

### API Routes
- **[src/app/api/ai/hero-suggest/route.ts](../src/app/api/ai/hero-suggest/route.ts)** - AI generation endpoint

### Components
- **[src/components/inbox/hero-generator-inline.tsx](../src/components/inbox/hero-generator-inline.tsx)** - Inline chat tool
- **[src/components/dashboard/heroes/hero-form.tsx](../src/components/dashboard/heroes/hero-form.tsx)** - Edit form
- **[src/components/dashboard/heroes/hero-preview.tsx](../src/components/dashboard/heroes/hero-preview.tsx)** - Live preview
- **[src/components/demo/brand-hero.tsx](../src/components/demo/brand-hero.tsx)** - Display component (existing)

### Pages
- **[src/app/dashboard/heroes/page.tsx](../src/app/dashboard/heroes/page.tsx)** - Management dashboard

### Documentation
- **[docs/hero-banner-presets.md](./hero-banner-presets.md)** - Preset prompts library

---

## 🚀 Usage

### For Users

#### Option 1: AI Builder (Recommended)

1. Navigate to `/dashboard/heroes`
2. Click **"AI Builder"** tab
3. Describe your hero banner:
   ```
   Create a hero for my premium flower brand with green colors,
   local pickup option, and emphasis on quality.
   ```
4. Click **"Generate with AI"**
5. Review AI suggestion and customize
6. Toggle **"Show Preview"** to see live preview
7. Click **"Create Hero Banner"**
8. Activate from the "Your Heroes" tab

#### Option 2: Manual Creation

1. Navigate to `/dashboard/heroes`
2. Click **"Manual Hero"** button
3. Fill in all fields:
   - Brand name, tagline, description
   - Colors and style
   - Purchase model
   - CTAs and stats
4. Preview changes in real-time (if available)
5. Save hero banner

#### Option 3: Inline (Chat)

1. Chat with AI agent: *"Create a hero banner for my dispensary"*
2. Inline generator appears
3. Use AI mode or manual mode
4. Create and save

### For Developers

#### Creating a Hero Programmatically

```typescript
import { createHero } from '@/app/actions/heroes';

const result = await createHero({
  orgId: 'org_123',
  brandName: 'Premium Flower Co',
  tagline: 'Premium Cannabis Products',
  description: 'Discover our collection of premium flower.',
  primaryColor: '#16a34a',
  style: 'professional',
  purchaseModel: 'local_pickup',
  verified: true,
  primaryCta: {
    label: 'Find Near Me',
    action: 'find_near_me',
  },
  stats: {
    products: 50,
    retailers: 10,
    rating: 4.8,
  },
  active: false, // Create as draft
});
```

#### Getting Active Hero

```typescript
import { getActiveHero } from '@/app/actions/heroes';

const result = await getActiveHero('org_123');
if (result.success && result.data) {
  const hero = result.data;
  // Use hero in menu page
}
```

#### Rendering Hero Banner

```tsx
import { BrandHero } from '@/components/demo/brand-hero';

<BrandHero
  brandName={hero.brandName}
  brandLogo={hero.brandLogo}
  tagline={hero.tagline}
  description={hero.description}
  heroImage={hero.heroImage}
  primaryColor={hero.primaryColor}
  verified={hero.verified}
  stats={hero.stats}
  purchaseModel={hero.purchaseModel}
  shipsNationwide={hero.shipsNationwide}
  onFindNearMe={() => {/* handle click */}}
  onShopNow={() => {/* handle click */}}
/>
```

---

## 🔧 Configuration

### Environment Variables

No additional environment variables required. Uses existing:
- Firebase Admin SDK (Firestore)
- Claude AI API (via `callClaude`)

### Firestore Collection

**Collection:** `heroes`

**Security Rules:**
```javascript
match /heroes/{heroId} {
  // Read: Anyone (for displaying on menu pages)
  allow read: if true;

  // Write: Only authenticated users of the organization
  allow create, update: if request.auth != null
    && request.resource.data.orgId == request.auth.token.orgId;

  // Delete: Only org owners
  allow delete: if request.auth != null
    && get(/databases/$(database)/documents/heroes/$(heroId)).data.orgId == request.auth.token.orgId;
}
```

### Firestore Indexes

**Required Indexes:**

```json
{
  "collectionGroup": "heroes",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "orgId", "order": "ASCENDING"},
    {"fieldPath": "displayOrder", "order": "ASCENDING"}
  ]
}
```

```json
{
  "collectionGroup": "heroes",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "orgId", "order": "ASCENDING"},
    {"fieldPath": "active", "order": "ASCENDING"},
    {"fieldPath": "displayOrder", "order": "ASCENDING"}
  ]
}
```

**Deploy Indexes:**
```powershell
firebase deploy --only firestore:indexes --project=bakedbot-agents
```

---

## 📊 Data Model

### Hero Interface

```typescript
interface Hero {
  // Identity
  id: string;
  orgId: string;
  brandId?: string;
  dispensaryId?: string;

  // Content
  brandName: string;
  brandLogo?: string;
  tagline: string;
  description?: string;
  heroImage?: string;

  // Style
  primaryColor: string; // Hex color
  style: 'default' | 'minimal' | 'bold' | 'professional';

  // Stats (optional)
  stats?: {
    products?: number;
    retailers?: number;
    rating?: number; // 0-5
  };

  // E-commerce
  purchaseModel: 'online_only' | 'local_pickup' | 'hybrid';
  shipsNationwide?: boolean;

  // CTAs
  primaryCta: {
    label: string;
    action: 'find_near_me' | 'shop_now' | 'custom';
    url?: string; // Required if action is 'custom'
  };
  secondaryCta?: {
    label: string;
    action: 'find_near_me' | 'shop_now' | 'custom';
    url?: string;
  };

  // Status
  active: boolean; // Only one active per orgId
  displayOrder: number; // Lower = higher priority
  verified?: boolean; // Show verified badge

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🧪 Testing

### Manual Testing Checklist

**AI Generation:**
- [ ] Generate hero with various prompts
- [ ] Verify colors are valid hex codes
- [ ] Verify style enums are valid
- [ ] Check AI reasoning is sensible

**Live Preview:**
- [ ] Preview updates in real-time
- [ ] Desktop/mobile toggle works
- [ ] Colors render correctly
- [ ] CTAs are clickable (console logs)

**CRUD Operations:**
- [ ] Create new hero (draft)
- [ ] Edit existing hero
- [ ] Duplicate hero (creates copy)
- [ ] Activate hero (deactivates others)
- [ ] Delete hero

**Integration:**
- [ ] Active hero displays on brand menu page
- [ ] Only one hero active per org at a time
- [ ] Firestore queries use proper indexes

### Unit Tests (TODO)

Create tests in `tests/app/actions/heroes.test.ts`:
- `createHero()` validation
- `toggleHeroActive()` single-active logic
- `duplicateHero()` copy behavior

---

## 🎨 Design Patterns

### Color Psychology

The AI is trained to suggest colors based on brand positioning:

| Color | Psychology | Use Cases |
|-------|-----------|-----------|
| **Green** (#16a34a) | Natural, organic, traditional | Traditional flower brands |
| **Purple** (#a855f7) | Premium, luxury, modern | High-end brands |
| **Blue** (#0891b2) | Medical, professional, trust | Medical dispensaries |
| **Orange/Red** | Energy, excitement, deals | Promotions, events |

### Style Guidelines

| Style | Description | Best For |
|-------|-------------|----------|
| **default** | Balanced, versatile | Most brands |
| **minimal** | Clean, product-focused | Modern, minimalist brands |
| **bold** | Eye-catching, vibrant | Events, promos, youth brands |
| **professional** | Corporate, serious | Medical, B2B |

### Purchase Models

| Model | Description | CTA Suggestions |
|-------|-------------|-----------------|
| **local_pickup** | In-store only | "Find Near Me", "Visit Store" |
| **online_only** | E-commerce | "Shop Now", "Browse Products" |
| **hybrid** | Both options | "Find Near Me" + "Shop Online" |

---

## 🔗 Integration Points

### Menu Pages

**Brand Menu ([brand]/page.tsx):**
```tsx
import { getActiveHero } from '@/app/actions/heroes';
import { BrandHero } from '@/components/demo/brand-hero';

const hero = await getActiveHero(brandId);

{hero.success && hero.data && (
  <BrandHero {...hero.data} />
)}
```

**Dispensary Menu (dispensaries/[slug]/page.tsx):**
```tsx
const hero = await getActiveHero(dispensaryId);
// Same rendering logic
```

### Agent Integration (Future)

Craig (Marketer) can suggest hero updates:
```typescript
// In Craig's tools
async function suggestHeroUpdate(context: AgentContext) {
  const suggestion = await fetch('/api/ai/hero-suggest', {
    method: 'POST',
    body: JSON.stringify({
      prompt: `Update hero for ${context.brandName} emphasizing new products`,
      orgId: context.orgId,
    }),
  });

  // Create draft hero for approval
  await createHero({ ...suggestion, active: false });
}
```

---

## 📈 Analytics (Future Enhancement)

Track hero performance:
- Views (impressions)
- CTA clicks (Find Near Me vs Shop Now)
- Conversion rate
- A/B test results

**Implementation:**
```typescript
// Add to heroes collection
interface Hero {
  // ... existing fields
  analytics?: {
    views: number;
    ctaClicks: {
      primary: number;
      secondary: number;
    };
    lastViewed: Date;
  };
}
```

---

## 🐛 Troubleshooting

### AI Generation Fails

**Symptom:** "Failed to generate suggestions" error

**Solutions:**
1. Check Claude API is accessible
2. Verify API key in environment
3. Try simpler, more specific prompts
4. Use Manual mode as fallback

### Preview Not Updating

**Symptom:** Live preview shows old data

**Solutions:**
1. Check state management (React useState)
2. Verify HeroPreview receives correct props
3. Hard refresh browser (Ctrl+Shift+R)

### Multiple Heroes Active

**Symptom:** More than one hero active for same org

**Solutions:**
1. Check `toggleHeroActive()` batch logic
2. Run cleanup script:
```typescript
// Deactivate all but first active hero
const heroes = await getHeroes(orgId);
const activeHeroes = heroes.filter(h => h.active);
if (activeHeroes.length > 1) {
  for (let i = 1; i < activeHeroes.length; i++) {
    await toggleHeroActive(activeHeroes[i].id, false);
  }
}
```

### Firestore Permission Denied

**Symptom:** "Missing or insufficient permissions"

**Solutions:**
1. Check security rules allow read/write
2. Verify user has orgId custom claim
3. Ensure orgId matches document orgId

---

## 🚧 Future Enhancements

### Phase 2 (Planned)
- [ ] Image upload integration (Firebase Storage)
- [ ] Color palette generator (extract from logo)
- [ ] More stats options (certifications, awards)
- [ ] Schedule hero activation (time-based)
- [ ] A/B testing framework

### Phase 3 (Ideas)
- [ ] Video background support
- [ ] Animated hero banners
- [ ] Multi-language support
- [ ] SEO optimization (structured data)
- [ ] Social media preview generator

---

## 📚 Related Documentation

- [Carousel System](../src/components/dashboard/carousels/) - Similar pattern
- [Unified Artifacts](../src/types/unified-artifact.ts) - Artifact system
- [BrandHero Component](../src/components/demo/brand-hero.tsx) - Display component
- [Hero Presets](./hero-banner-presets.md) - Preset prompt library

---

## ✅ Checklist for Deployment

Before deploying to production:

- [x] All TypeScript types defined
- [x] Server actions implemented
- [x] AI API route created
- [x] UI components built
- [x] Standalone page created
- [x] Unified artifacts updated
- [x] Documentation written
- [ ] Firestore indexes deployed
- [ ] Security rules updated
- [ ] Manual testing completed
- [ ] Unit tests written (optional)
- [ ] Load testing (optional)

---

**Questions?** Open an issue or contact the development team.

**Last Updated:** 2026-02-06
