# Vibe IDE Integration Plan

**Status:** Implementation Plan
**Date:** 2026-02-11
**Goal:** Transform Vibe from simple lead magnet to comprehensive "Shopify for Cannabis" platform

---

## 🎯 Vision

Create a progression-based platform where:
1. **Newbies** use simple bakedbot.ai/vibe (lead magnet)
2. **Intermediate** users get side-by-side preview and basic deployment
3. **Experts** access full Vibe IDE with code, templates, and collaboration
4. **All levels** can easily host sites with auth, checkout, and POS integration

**Analogy:** "Wix → Webflow → VS Code" progression for cannabis

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VIBE ECOSYSTEM                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /vibe (Lead Magnet - Level 1)                              │
│  ├─ AI theme generator                                       │
│  ├─ 3 free generations                                       │
│  ├─ Email gate → 6 total                                    │
│  └─ NEW: Side-by-side live preview while building           │
│                                                               │
│  /vibe/builder (New - Level 2) ← NEEDS BUILD                │
│  ├─ Authenticated users only                                 │
│  ├─ Drag-drop visual builder                                │
│  ├─ Live product integration (Alleaves POS)                 │
│  ├─ One-click deploy to *.bakedbot.ai                       │
│  └─ Basic auth + checkout (Smokey Pay)                      │
│                                                               │
│  /vibe/beta → /vibe/ide (Level 3) ← RENAME                  │
│  ├─ Full code editor (Monaco)                               │
│  ├─ Template marketplace                                     │
│  ├─ Real-time collaboration                                  │
│  ├─ Custom domains                                           │
│  ├─ Multi-provider payments                                  │
│  ├─ GitHub repo creation                                     │
│  └─ VS Code extension                                        │
│                                                               │
│  /dashboard/vibe-studio (Management Hub)                     │
│  ├─ All user's vibe projects                                │
│  ├─ Analytics (traffic, conversions)                        │
│  ├─ Domain management                                        │
│  └─ Billing & subscriptions                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Phase 1: Fix & Polish Existing (Week 1)

### 1.1 Fix /vibe/beta Auth (✅ DONE)
- [x] Add `useAuth()` hook
- [x] Show "Log In" button when not authenticated
- [x] "Dashboard" button → "Start Free Trial" when not logged in
- [x] Redirect to signup with proper redirect URL

### 1.2 Add Live Preview to /vibe (Simple Lead Magnet)
**Goal:** Let users see their design come to life while describing it

**Implementation:**
```typescript
// src/app/vibe/components/live-preview-pane.tsx
'use client';

import { VibePreview } from '../vibe-preview';
import { Card } from '@/components/ui/card';

interface LivePreviewPaneProps {
  currentVibe: PublicVibe | PublicMobileVibe | null;
  generating: boolean;
}

export function LivePreviewPane({ currentVibe, generating }: LivePreviewPaneProps) {
  return (
    <Card className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <h3 className="font-semibold">Live Preview</h3>
          <p className="text-sm text-muted-foreground">
            Your design updates in real-time
          </p>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-4">
          {generating && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!generating && !currentVibe && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Describe your vibe to see a preview</p>
              </div>
            </div>
          )}

          {!generating && currentVibe && (
            <VibePreview vibe={currentVibe} />
          )}
        </div>

        {/* Quick Actions */}
        {currentVibe && (
          <div className="border-t p-4 space-y-2">
            <Button size="sm" className="w-full">
              Save & Continue to Builder
            </Button>
            <Button size="sm" variant="outline" className="w-full">
              Export Code
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
```

**Page Layout Update:**
```tsx
// src/app/vibe/page.tsx - Update main layout
<div className="container mx-auto px-4 py-12">
  <div className="grid lg:grid-cols-2 gap-8">
    {/* Left: Input Pane */}
    <div className="space-y-8">
      {/* Existing generator UI */}
    </div>

    {/* Right: Live Preview Pane (new) */}
    <div className="hidden lg:block">
      <LivePreviewPane
        currentVibe={currentVibe}
        generating={generating}
      />
    </div>
  </div>
</div>
```

**Mobile Behavior:**
- On mobile, preview shows below input
- Sticky "Preview" button floats at bottom
- Tapping opens full-screen preview modal

---

## 🎨 Phase 2: Build /vibe/builder (Weeks 2-3)

**Purpose:** Visual builder for authenticated users who don't want to code

### 2.1 Core Features
- **Drag-Drop Interface:** GrapesJS or similar
- **Block Library:** Product grids, hero sections, menus, checkout
- **Live Data:** Pull real products from Alleaves POS
- **Instant Deploy:** One-click publish to `{brandSlug}.bakedbot.ai`
- **Basic Auth:** Simple email/password login for customers
- **Smokey Pay Checkout:** Integrated Authorize.net payment flow

### 2.2 Technical Stack
```typescript
// Dependencies
- grapesjs: Visual builder framework
- @grapesjs/react: React wrapper
- grapesjs-blocks-basic: Pre-built blocks
- grapesjs-plugin-forms: Form builder

// Integration Points
- src/server/services/vibe-backend-generator.ts: Generate Next.js code from builder JSON
- src/server/services/vibe-deployment.ts: Deploy to Firebase App Hosting
- src/server/actions/pos-sync.ts: Fetch products for builder
```

### 2.3 Builder Page Structure
```tsx
// src/app/vibe/builder/page.tsx
'use client';

export default function VibeBuilderPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <BuilderTopBar
        projectName="My Dispensary"
        onSave={handleSave}
        onDeploy={handleDeploy}
        onPreview={handlePreview}
      />

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Left Sidebar: Blocks & Settings */}
        <BlocksSidebar />

        {/* Center: Canvas */}
        <GrapesJSCanvas config={builderConfig} />

        {/* Right Sidebar: Properties */}
        <PropertiesPanel />
      </div>
    </div>
  );
}
```

### 2.4 Progression Flow
```
/vibe (generate theme)
  → "Upgrade to Builder" CTA
  → /signup (if not logged in)
  → /vibe/builder (visual editor)
  → "Need more control?" → /vibe/ide (code editor)
```

---

## 💻 Phase 3: Polish /vibe/ide (Week 4)

**Current:** /vibe/beta (demo/testing page)
**Future:** /vibe/ide (production-ready code editor)

### 3.1 Rename & Rebrand
- Move `/vibe/beta/` → `/vibe/ide/`
- Update routes, imports, and documentation
- Add "Advanced" badge instead of "Beta"

### 3.2 Feature Enhancements

#### A. Template Marketplace Integration
**Connect to real Firestore data:**
```typescript
// src/app/vibe/ide/template-actions.ts
// Remove mock data
// Connect to actual vibe_templates collection
// Add template submission workflow
// Implement review/approval system for community templates
```

#### B. Project Management
**Add full CRUD:**
```typescript
// src/app/vibe/ide/projects/page.tsx
- List all user's IDE projects
- Create new project (blank or from template)
- Clone existing project
- Archive/delete projects
- Search & filter by tech stack
```

#### C. Deployment Pipeline
**Full Firebase integration:**
```typescript
// src/server/services/vibe-deployment.ts
1. Generate Next.js project from Monaco code
2. Create GitHub repo (optional)
3. Deploy to Firebase App Hosting
4. Configure custom domain (if provided)
5. Set up CI/CD via GitHub Actions
```

#### D. Real-Time Collaboration
**Production-ready WebRTC:**
```typescript
// src/lib/collaboration-service.ts
- Use Firebase Realtime Database (already implemented)
- Add presence indicators
- Implement operational transforms for conflict resolution
- Add @mentions in code comments
- Sync across IDE + VS Code extension
```

---

## 🏪 Phase 4: Shopify-Level Features (Weeks 5-6)

### 4.1 Hosted Site Features

**Every deployed Vibe site should include:**

#### A. Authentication System
```typescript
// Auto-generated in deployed sites:
- Firebase Auth (email/password, Google, SMS)
- Protected routes (/account, /orders)
- Session management
- Password reset flow
```

#### B. Checkout Flow
```typescript
// Integration with existing Smokey Pay:
- Shopping cart (Zustand store)
- Multi-step checkout
- Authorize.net/Stripe/Square payment
- Order confirmation emails
- Receipt generation
```

#### C. POS Integration
```typescript
// For brands with POS systems:
- Sync products from Alleaves/Dutchie/Treez
- Real-time inventory checks
- Auto-disable out-of-stock items
- Price updates from POS
```

#### D. Admin Panel
```typescript
// Every site gets /admin dashboard:
- Orders management
- Customer list
- Analytics (traffic, sales, conversion)
- Content management (update hero text, images)
- Domain settings
- Payment provider settings
```

### 4.2 Monetization Tiers

```
┌──────────────────────────────────────────────┐
│ FREE TIER                                     │
├──────────────────────────────────────────────┤
│ - /vibe theme generator (unlimited)          │
│ - *.bakedbot.ai subdomain                    │
│ - Basic templates                             │
│ - 2% transaction fee on Smokey Pay           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ BUILDER TIER - $99/month                     │
├──────────────────────────────────────────────┤
│ - /vibe/builder visual editor                │
│ - Custom domain                               │
│ - POS integration (1 location)               │
│ - Premium templates                           │
│ - 1% transaction fee                          │
│ - Email support                               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ IDE TIER - $249/month                        │
├──────────────────────────────────────────────┤
│ - /vibe/ide code editor                      │
│ - Unlimited custom domains                   │
│ - Multi-location POS sync                    │
│ - GitHub repo ownership                       │
│ - Real-time collaboration (5 seats)          │
│ - VS Code extension                           │
│ - 0% transaction fee (bring own merchant)    │
│ - Priority support                            │
│ - Whitelabel option (+$500/mo)               │
└──────────────────────────────────────────────┘
```

---

## 🔗 Phase 5: Ecosystem Integration (Weeks 7-8)

### 5.1 Agent Integration

**Connect Vibe sites to BakedBot agents:**

```typescript
// src/server/services/vibe-agent-integration.ts

// Craig (Marketing)
- Auto-generate product images from POS data
- Schedule social posts with Vibe design assets
- A/B test landing page variants

// Smokey (Budtender)
- Embed chatbot widget in deployed sites
- Answer product questions inline
- Smart product recommendations

// Ezal (Competitive Intel)
- Track competitor site changes
- Alert on design trends
- Suggest improvements based on market data

// Deebo (Compliance)
- Scan deployed sites for compliance issues
- Flag non-compliant copy/images
- Auto-apply age gates per state law
```

### 5.2 Data Flow

```
┌─────────────────────────────────────────┐
│         Vibe Deployed Site              │
│      (yourbrand.bakedbot.ai)            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Products    │◄───┤  Alleaves    │  │
│  │  (realtime)  │    │  POS API     │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Orders      │────►│  Firestore   │  │
│  │  (stored)    │    │  /orders     │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Customers   │────►│  Firebase    │  │
│  │  (auth)      │    │  Auth        │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Analytics   │────►│  BigQuery    │  │
│  │  (events)    │    │  (CEO dash)  │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### 5.3 Backend Templates

**Pre-built backend modules:**

```typescript
// src/server/vibe-templates/modules/

/auth
  - Firebase Auth setup
  - Protected route middleware
  - User profile pages

/checkout
  - Cart management
  - Smokey Pay integration
  - Order confirmation emails

/pos-sync
  - Alleaves/Dutchie/Treez connectors
  - Real-time inventory sync
  - Product caching layer

/cms
  - Firestore-backed content
  - Image upload to Storage
  - Draft/publish workflow

/analytics
  - Google Analytics 4
  - Custom event tracking
  - BigQuery export

/compliance
  - Age verification
  - State-specific disclaimers
  - License verification
```

**Usage:**
```tsx
// In /vibe/builder and /vibe/ide:
<ModuleSelector>
  <Module name="auth" icon={Lock} installed={true} />
  <Module name="checkout" icon={ShoppingCart} installed={true} />
  <Module name="pos-sync" icon={Database} installed={false} />
  <Module name="analytics" icon={BarChart} installed={false} />
</ModuleSelector>

// One-click install adds module to project
// Generates API routes + frontend components
// Updates deployment config
```

---

## 🎯 Phase 6: Polish & Launch (Week 9)

### 6.1 Documentation
- **Help Center:** `/help/vibe/` with tutorials for each tier
- **Video Walkthrough:** Record 5-10 min demo for each level
- **Template Gallery:** Showcase community-submitted templates

### 6.2 Onboarding Flow
```
New User Journey:
1. Land on /vibe (simple generator)
2. Generate 3 free themes
3. Email gate → 6 total
4. See "Upgrade to publish" CTA
5. Sign up → /vibe/builder
6. Build site visually
7. Deploy to *.bakedbot.ai
8. See "Need code?" → /vibe/ide
9. Advanced users unlock IDE
10. Happy customer pays $99-249/mo
```

### 6.3 Metrics Dashboard
**Track progression funnel:**
```typescript
// src/app/dashboard/ceo/vibe-metrics.tsx
- Total vibe generations (public)
- Email capture rate
- Signup conversions
- Builder → IDE upgrades
- Average time to first deploy
- Deployed sites (active)
- MRR from Vibe subscriptions
```

---

## 📋 Implementation Checklist

### Immediate (This Week)
- [x] Fix auth buttons on /vibe/beta
- [ ] Add side-by-side preview to /vibe
- [ ] Create live-preview-pane component
- [ ] Update /vibe page layout for 2-column

### Phase 1 (Week 1)
- [ ] Implement sticky preview on desktop
- [ ] Add mobile preview modal
- [ ] Add "Save & Continue to Builder" CTA
- [ ] Wire up progression CTAs

### Phase 2 (Weeks 2-3)
- [ ] Install GrapesJS dependencies
- [ ] Build /vibe/builder page structure
- [ ] Implement blocks sidebar
- [ ] Connect to Alleaves POS for products
- [ ] Add one-click deploy to *.bakedbot.ai
- [ ] Implement Smokey Pay checkout

### Phase 3 (Week 4)
- [ ] Rename /vibe/beta to /vibe/ide
- [ ] Connect template marketplace to Firestore
- [ ] Add project management CRUD
- [ ] Implement full deployment pipeline
- [ ] Polish collaboration features

### Phase 4 (Weeks 5-6)
- [ ] Build auto-generated auth system
- [ ] Create checkout template module
- [ ] Implement POS sync module
- [ ] Build admin panel template
- [ ] Define monetization tiers

### Phase 5 (Weeks 7-8)
- [ ] Integrate Craig agent for marketing
- [ ] Add Smokey chatbot embed
- [ ] Connect Ezal for competitive insights
- [ ] Add Deebo compliance scanning
- [ ] Build backend template modules

### Phase 6 (Week 9)
- [ ] Write help center docs
- [ ] Record demo videos
- [ ] Build onboarding flow
- [ ] Create metrics dashboard
- [ ] Launch marketing campaign

---

## 🚨 Critical Decisions Needed

### 1. Pricing Model
**Question:** Should we charge for Vibe tiers separately or bundle with existing plans?

**Option A: Separate Vibe Pricing**
- Clean separation
- Easier to market
- Allows non-BakedBot customers to use Vibe only

**Option B: Bundle with Existing Plans**
- Seed: Vibe generator only
- Growth: + Builder tier
- Empire: + IDE tier
- Simpler for customers (one bill)

**Recommendation:** Option A with discount for BakedBot customers

### 2. GitHub Integration
**Question:** Do we create repos in our BakedBot org or user's personal GitHub?

**Option A: BakedBot Organization**
- Easier to manage
- Can enforce standards
- We own the code

**Option B: User's GitHub**
- User owns code
- More portable
- Better for agencies

**Recommendation:** Option B (user ownership) with optional BakedBot backup

### 3. Custom Code Restrictions
**Question:** Can IDE users write arbitrary backend code or only frontend?

**Option A: Frontend Only**
- Safer (no server vulnerabilities)
- Easier to review for compliance
- Faster deploys

**Option B: Full-Stack**
- More powerful
- Matches "Shopify" analogy
- Attracts developers

**Recommendation:** Option A for launch, Option B for Enterprise tier

---

## 📊 Success Metrics

**6-Month Goals:**
- 10,000 vibe generations (public)
- 2,000 email captures (20% conversion)
- 500 Builder tier signups (25% conversion)
- 100 IDE tier signups (20% upgrade)
- 50 active deployed sites
- $40,000 MRR from Vibe subscriptions

**12-Month Goals:**
- 50,000 vibe generations
- 5,000 deployed sites
- 1,000 paying Vibe customers
- $200,000 MRR from Vibe
- Template marketplace with 500+ templates
- 10,000+ hours of collaboration time

---

## 🎬 Next Steps

1. **Review this plan with team** - Get feedback on pricing, timeline, priorities
2. **Finalize Phase 1** - Complete live preview this week
3. **Start Phase 2 discovery** - Evaluate GrapesJS vs alternatives
4. **Design mockups** - Create Figma designs for builder interface
5. **Write RFC** - Document backend architecture for modules system

**Questions?** Tag @team in Slack or comment in [GitHub Discussion #123]
