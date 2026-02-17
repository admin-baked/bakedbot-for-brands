# Playbooks Onboarding Audit
## New User Playbook Assignments by Subscription Tier & Role

**Date:** 2026-02-17
**Status:** AUDIT COMPLETE
**Scope:** All subscription tiers (Starter free, Pro $49/mo, Enterprise $199/mo) × All user roles

---

## Executive Summary

**Key Findings:**
1. ✅ **Welcome playbooks are assigned to ALL new users** (5 segment-based templates with multi-step sequences)
2. ⚠️ **Tier-based playbook differentiation is MINIMAL** — Free users get 1 exclusive playbook (weekly competitive intel), but Pro/Enterprise get no additional playbooks in the current codebase
3. ⚠️ **Paid tier value proposition is unclear** — Free and paid users receive identical welcome/nurture sequences
4. ✅ **Segment-based personalization is strong** — 5 distinct welcome playbooks tailored to customer, super_user, dispensary_owner, brand_marketer, and lead segments
5. **Recommendation:** Create tier-specific playbook templates to differentiate paid tier value

---

## Current Playbook Assignment Architecture

### Playbook Assignment Triggers

| Trigger Event | Source | Target Users |
|---------------|--------|--------------|
| `user.signup` | Age gate (dispensary customers) | Customers |
| `user.signup.platform` | BakedBot.ai account creation | All platform users (brands, dispensaries, super_users) |
| User onboarding completion | `onboarding/actions.ts` | Free-tier only (dispensary/brand operators) |

### Trigger to Playbook Flow

```
1. User Signs Up
    ↓
2. Determine Segment (role → segment mapping)
    ↓
3. Assign Welcome Playbook (segment-specific)
    ↓
4. Trigger Platform Signup Event (user.signup.platform)
    ↓
5. Playbook System Executes Welcome + Nurture Sequence
    ├─ Immediate: Welcome email
    ├─ Day 3: Value/Setup email
    ├─ Day 7: Engagement email
    └─ Weekly: Nurture email
    ↓
6. Free-Tier Only: Assign Competitive Intel Playbook
    ├─ Auto-discover 3 competitors (25-mile radius)
    ├─ Daily scrape (1440 min frequency)
    └─ Weekly summary email
```

---

## Subscription Tier Comparison

### Tier Feature Matrix

| Feature | Starter (Free) | Pro ($49/mo) | Enterprise ($199/mo) |
|---------|----------------|--------------|----------------------|
| **Competitors** | 3 | 10 | Unlimited |
| **Scans/Month** | 10 | 100 | Unlimited |
| **AI Insights** | ❌ | ✅ | ✅ |
| **Custom Alerts** | ❌ | ✅ | ✅ |
| **Data Export** | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |
| **White Label** | ❌ | ❌ | ✅ |

---

## Playbook Assignments by Tier & Role

### TIER 1: STARTER (FREE)

#### 🎯 Startup Flow
1. **Role Selection** → user chooses brand/dispensary/customer
2. **Onboarding Completion** → org created, subscription set to `free`
3. **Welcome Email** → segment-based playbook triggered
4. **Competitor Discovery** → auto-discover 3 nearby competitors
5. **Weekly Playbook Assignment** → `free-weekly-competitive-intel`

#### Playbooks Assigned

**Universal (All Roles):**
- ✅ `welcome_{segment}` — 4-email series (immediate, day 3, day 7, weekly)
  - Channels: email ✅, SMS (varies), dashboard (varies)
  - AI-Generated: Yes
  - Personalization: Contextual or Deep

**Free-Tier Exclusive:**
- ✅ `free-weekly-competitive-intel` — Weekly summary playbook
  - Trigger: Scheduled weekly (Mondays)
  - Max Competitors: 3 (auto-discovered within 25 miles)
  - Scrape Frequency: Daily (1440 minutes)
  - Content: Weekly menu changes, price updates, product drops
  - Recipient: dispensary_admin/brand_admin email

#### Current Playbook Count by Role

| Role | Welcome Playbook | Additional Playbooks | Total |
|------|------------------|----------------------|-------|
| `dispensary_admin` | welcome_dispensary | free-weekly-competitive-intel | 2 |
| `dispensary_staff` | welcome_dispensary | free-weekly-competitive-intel | 2 |
| `brand_admin` | welcome_brand | free-weekly-competitive-intel | 2 |
| `brand_member` | welcome_brand | free-weekly-competitive-intel | 2 |
| `customer` | welcome_customer | (none) | 1 |

#### Example: Dispensary Admin (Free Tier) Playbook Timeline

```
Day 0 (Signup):
├─ welcome_dispensary playbook triggers
├─ Immediate: Craig sends "Welcome to BakedBot" email
├─ Email: Setup guide + dashboard tour
├─ SMS: Confirmation message
└─ Dashboard: Welcome notification showing onboarding checklist

Day 3:
├─ Craig sends "Setup Guide" email
├─ Content: POS integration steps, competitor tracking setup
└─ Continue nurture emails

Day 7:
├─ Craig sends "Feature Walkthrough" email
├─ Content: How to use playbooks, loyalty, campaigns
└─ Weekly nurture series begins

Weekly (Every Monday):
├─ free-weekly-competitive-intel playbook executes
├─ Ezal scrapes 3 competitors (auto-discovered)
├─ Craig sends weekly summary email:
│   ├─ Menu changes from competitors
│   ├─ New products added
│   ├─ Price changes detected
│   └─ Actions: [View Details] [Add to Watchlist]
└─ Report stored in Google Drive
```

---

### TIER 2: PRO ($49/mo)

#### 🎯 Upgrade Flow
1. User signs up (free tier)
2. Visits `/dashboard/settings/billing`
3. Upgrades to Pro plan (credit card required)
4. Subscription updated to `pro` in Firestore
5. Feature flags enable Pro-tier features (10 competitors, AI insights, etc.)

#### Playbooks Assigned

**Same as Free Tier:**
- ✅ `welcome_{segment}` — 4-email series (identical)

**Pro-Tier Exclusive:**
- ❌ **NONE** — No additional playbooks currently seeded for Pro users in code

#### ⚠️ Gap Identified
Pro users pay $49/mo but receive **identical playbooks** to free users. The only difference is backend features (more competitors to scan, AI insights), not playbook automation.

#### Current Playbook Count by Role

| Role | Welcome Playbook | Additional Playbooks | Total |
|------|------------------|----------------------|-------|
| `dispensary_admin` | welcome_dispensary | (none) | 1 |
| `dispensary_staff` | welcome_dispensary | (none) | 1 |
| `brand_admin` | welcome_brand | (none) | 1 |
| `brand_member` | welcome_brand | (none) | 1 |
| `customer` | welcome_customer | (none) | 1 |

---

### TIER 3: ENTERPRISE ($199/mo)

#### 🎯 Upgrade Flow
1. Admin invites user or user requests trial
2. Enterprise plan provisioned (whitelist email domain)
3. Auto-created with unlimited competitor budget
4. API access + white-label options enabled

#### Playbooks Assigned

**Same as Free Tier:**
- ✅ `welcome_{segment}` — 4-email series (identical)

**Enterprise-Tier Exclusive:**
- ❌ **NONE** — No additional playbooks currently seeded for Enterprise users in code

#### ⚠️ Gap Identified
Enterprise users pay $199/mo but receive **identical playbooks** to free users. The code does not differentiate playbook assignments by tier for paid accounts.

#### Current Playbook Count by Role

| Role | Welcome Playbook | Additional Playbooks | Total |
|------|------------------|----------------------|-------|
| `dispensary_admin` | welcome_dispensary | (none) | 1 |
| `dispensary_staff` | welcome_dispensary | (none) | 1 |
| `brand_admin` | welcome_brand | (none) | 1 |
| `brand_member` | welcome_brand | (none) | 1 |
| `customer` | welcome_customer | (none) | 1 |

---

## Welcome & Nurture Playbooks Detail

### Universal Welcome Playbook Series

All new users (free, pro, enterprise) are assigned ONE of these 5 segment-based welcome playbooks:

#### 1. `welcome_customer` — 🌿 Customer Welcome Series
**Segment:** Dispensary customers (age-gated users)
**Trigger Event:** `user.signup`
**Enabled:** Yes

**Schedule:**
- Immediate: Welcome email
- Day 3: Value/tips email
- Day 7: Engagement email
- Weekly: Recurring nurture

**Channels:**
- Email: ✅
- SMS: ✅
- Dashboard: ❌
- Push: ❌

**Personalization:** Deep (uses customer interests, browsing history, device type)
**Tracking:** Opens + Clicks + Conversions

**Weekly Nurture Topics:**
- New product drops this week
- Exclusive member deals
- Cannabis education & tips
- Loyalty rewards update
- Upcoming events & specials

---

#### 2. `welcome_dispensary` — 💼 Dispensary Onboarding
**Segment:** Dispensary operators (brand_admin, dispensary_admin)
**Trigger Event:** `user.signup.platform`
**Enabled:** Yes

**Schedule:**
- Immediate: Welcome email + SMS + dashboard notification
- Day 3: Setup guide (POS integration, competitor tracking)
- Day 7: Feature walkthrough (playbooks, loyalty, campaigns)
- Weekly: Weekly insights & trends

**Channels:**
- Email: ✅
- SMS: ✅
- Dashboard: ✅
- Push: ❌

**Personalization:** Deep (uses org setup progress, role, location)
**Tracking:** Opens + Clicks + Conversions

**Weekly Nurture Topics:**
- Inventory insights & trends
- Compliance updates
- Customer retention strategies
- Revenue optimization tips
- Industry news & regulations

---

#### 3. `welcome_brand` — 🎨 Brand Partner Welcome
**Segment:** Cannabis brands (brand_admin, brand_member)
**Trigger Event:** `user.signup.platform`
**Enabled:** Yes

**Schedule:**
- Immediate: Welcome email + dashboard notification
- Day 3: Quick wins guide (launching first campaign, setting up segment)
- Day 7: Campaign ideas (bundle promotions, seasonal themes)
- Weekly: Weekly marketing tips

**Channels:**
- Email: ✅
- SMS: ❌
- Dashboard: ✅
- Push: ❌

**Personalization:** Deep (uses brand type, campaign history, offers)
**Tracking:** Opens + Clicks + Conversions

**Weekly Nurture Topics:**
- Campaign performance review
- Content creation ideas
- Partner spotlight
- Industry trends & insights
- Marketing automation wins

---

#### 4. `welcome_super_user` — 🚀 Team Member Welcome
**Segment:** BakedBot team members (super_user, admin, intern)
**Trigger Event:** `user.signup.platform`
**Enabled:** Yes

**Schedule:**
- Immediate: Welcome email + dashboard notification
- Day 3: Onboarding resources + team access
- Day 7: First assignment & goals
- Weekly: Company updates & wins

**Channels:**
- Email: ✅
- SMS: ❌
- Dashboard: ✅ (onboarding checklist)
- Push: ❌

**Personalization:** Contextual (uses team role, department)
**Tracking:** Opens + Clicks (NOT conversions - internal users)

**Weekly Nurture Topics:**
- Company growth metrics
- Customer wins & testimonials
- Competitive intelligence updates
- Product roadmap progress
- Team celebrations & announcements

---

#### 5. `welcome_lead` — 🧲 Lead Nurture Series
**Segment:** Unqualified leads (no defined segment)
**Trigger Event:** `user.signup.lead`
**Enabled:** Yes

**Schedule:**
- Immediate: Welcome + lead magnet offer (if applicable)
- Day 3: Educational content (cannabis marketing 101, case studies)
- Day 7: Demo invitation + trial offer
- Weekly: Value emails (industry best practices, platform highlights)

**Channels:**
- Email: ✅
- SMS: ❌
- Dashboard: ❌
- Push: ❌

**Personalization:** Contextual (uses company type, industry, utm params)
**Tracking:** Opens + Clicks + Conversions

**Weekly Nurture Topics:**
- Cannabis marketing 101
- Case studies & success stories
- Platform feature highlights
- Industry best practices
- Demo invitation & trial offer

---

## Segment Role Mapping

When a user signs up, their role is mapped to a segment to determine which welcome playbook to assign:

```typescript
Role → Segment → Welcome Playbook

super_user           → super_user         → welcome_super_user
admin (legacy)       → super_user         → welcome_super_user
intern               → super_user         → welcome_super_user

dispensary           → dispensary_owner   → welcome_dispensary
dispensary_admin     → dispensary_owner   → welcome_dispensary
dispensary_manager   → dispensary_owner   → welcome_dispensary
dispensary_budtender → dispensary_owner   → welcome_dispensary

brand                → brand_marketer     → welcome_brand
brand_admin          → brand_marketer     → welcome_brand
brand_manager        → brand_marketer     → welcome_brand

customer             → customer           → welcome_customer

(unrecognized)       → lead               → welcome_lead
```

---

## Comparison Matrix: Free vs Pro vs Enterprise

### Current State (Playbook Perspective)

| Dimension | Free Tier | Pro Tier | Enterprise |
|-----------|-----------|----------|------------|
| **Welcome Series** | ✅ 5 templates | ✅ 5 templates (same) | ✅ 5 templates (same) |
| **Nurture Emails** | ✅ Day 0,3,7,weekly | ✅ Day 0,3,7,weekly (same) | ✅ Day 0,3,7,weekly (same) |
| **Competitive Intel** | ✅ free-weekly | ❌ None | ❌ None |
| **Custom Playbooks** | ❌ Not available | ❌ Not available | ❌ Not available |
| **AI-Generated Content** | ✅ Yes | ✅ Yes (same) | ✅ Yes (same) |
| **Total Playbooks** | 2 (dispensary/brand) | 1 | 1 |
| **Value Prop Clarity** | High (clear free tier) | ⚠️ Low (identical to free) | ⚠️ Low (identical to free) |

### Conclusion
**Playbook-wise, only FREE tier has distinct value.** Pro and Enterprise users receive identical playbook assignments to free users, which makes the paid tier value proposition weak from an automation perspective.

---

## Identified Gaps & Opportunities

### 🔴 CRITICAL GAPS

#### Gap 1: No Paid-Tier Specific Playbooks
**Problem:** Pro and Enterprise users pay monthly but receive identical playbooks to free users
**Impact:** Paid tier value proposition is unclear to new customers
**Current Playbooks:** Only free tier has exclusive `free-weekly-competitive-intel`

**Solution:** Create tier-specific playbook templates:
```
Pro Tier:
- pro-competitive-intel (daily instead of weekly, 10 competitors)
- pro-campaign-analyzer (weekly performance review of campaigns)
- pro-revenue-optimizer (weekly revenue insights + optimization tips)

Enterprise Tier:
- enterprise-competitive-intel (hourly, unlimited competitors, custom rules)
- enterprise-account-intelligence (daily exec summary for all locations)
- enterprise-api-activity (daily API usage & optimization)
- enterprise-custom-integrations (partner ecosystem management)
```

#### Gap 2: No Playbook-Based Upsell Flow
**Problem:** Users start on free tier with 1 playbook, but no automated path to upgrade
**Impact:** Missing opportunity to show paid tier value through playbook limitations

**Solution:** Create upsell playbooks that trigger on free tier actions:
```
Trigger: User clicks "Add Competitor" but at limit (3 max)
Action: Craig sends email:
  "You've hit your competitor limit (3/3 on Starter).

  Upgrade to Pro ($49/mo) to track 10 competitors,
  plus get daily intel summaries and AI insights."

  [Upgrade Now →]
```

#### Gap 3: No Role-Based Playbook Customization
**Problem:** dispensary_admin and brand_admin get identical playbooks (welcome_dispensary / welcome_brand) regardless of company size or complexity
**Impact:** One-size-fits-all onboarding doesn't address needs of different business models

**Solution:** Add role substrats within segments:
```
dispensary_admin (solo operator):
  → welcome_dispensary_solo
  → focused on quick wins, single-location management

dispensary_admin (multi-location):
  → welcome_dispensary_multi
  → focused on team collaboration, cross-location analytics

brand_admin (small brand):
  → welcome_brand_startup
  → focused on launch, first campaign, growth hacking

brand_admin (established brand):
  → welcome_brand_enterprise
  → focused on scaling, compliance, portfolio management
```

---

### 🟡 MODERATE GAPS

#### Gap 4: Limited Segment Coverage
**Problem:** Only 5 user segments have welcome playbooks; other roles (budtender, driver, etc.) fall back to generic lead nurture
**Impact:** Supporting roles don't get tailored onboarding

**Solution:** Add playbooks for:
```
budtender_tablet_user → welcome_budtender
  (POS terminal training, quick reference guide)

delivery_driver → welcome_driver
  (Route optimization, delivery best practices, safety)

customer (loyalty member) → welcome_customer_loyalty
  (Points system, tier progression, exclusive offers)
```

#### Gap 5: No Intent-Based Playbook Assignment
**Problem:** Segment assignment is purely role-based; doesn't consider signup context (demo request vs trial vs referral)
**Impact:** All brand_marketers get same welcome regardless of intent

**Solution:** Add context-aware playbooks:
```
Signup Context: demo_request
→ welcome_demo_track
→ Day 0: "Thanks for requesting a demo!"
→ Day 1: Demo scheduled confirmation
→ Day 3: "Here's what we showed you..."
→ Day 7: Demo follow-up with pricing

Signup Context: referral
→ welcome_referral_track
→ Day 0: "You've been invited!"
→ Day 3: Referral program details + rewards
→ Day 7: "Join the community" + exclusive offers
```

---

### 🟢 MINOR OPPORTUNITIES

#### Opportunity 1: Regional Customization
**Enhancement:** Welcome playbooks could detect location (state) and add region-specific content
```
dispensary_admin (CA) → welcome_dispensary_ca
  → includes CA compliance updates, local trends

brand_admin (CO) → welcome_brand_co
  → includes CO regulations, local market insights
```

#### Opportunity 2: Industry Segment Awareness
**Enhancement:** Brand playbooks could differ by product type
```
brand_admin (flower) → welcome_brand_flower
brand_admin (edibles) → welcome_brand_edibles
brand_admin (concentrates) → welcome_brand_concentrates
```

#### Opportunity 3: Playbook Templates Marketplace
**Enhancement:** Pro/Enterprise users should be able to choose from a library of templates
```
Available Templates:
- Black Friday Campaign
- Back to School Promotion
- Valentine's Day Bundle
- Holiday Gift Guide
- Customer Loyalty Acceleration
- New Product Launch
- Clearance Sale
- Seasonal Menu Update
```

---

## Recommendations (Prioritized)

### 🔥 P0: Immediate (Next Sprint)

**1. Create Pro-Tier Exclusive Playbooks**
- `pro-daily-competitive-intel` — Daily summary for 10 competitors
- `pro-campaign-performance` — Weekly campaign analytics and ROI

**Files to Create:**
- `src/app/onboarding/templates/pro-tier-playbooks.ts` — Pro playbook definitions
- Seed playbook_templates collection with pro_* entries
- Update `assignPlaybookToOrg()` to check subscription tier and assign pro playbooks

**Acceptance Criteria:**
- Pro users automatically receive pro-* playbooks on signup
- Free users do NOT have access to pro-* playbooks (feature flag gated)
- Pro playbooks appear in analytics dashboard with revenue attribution

---

### 🔥 P0: High (Next Sprint)

**2. Create Enterprise-Tier Exclusive Playbooks**
- `enterprise-realtime-intel` — Real-time competitor updates (hourly)
- `enterprise-account-summary` — Executive daily digest across locations
- `enterprise-integration-health` — API and webhook monitoring

**Files to Create:**
- `src/app/onboarding/templates/enterprise-tier-playbooks.ts` — Enterprise playbook definitions
- Seed playbook_templates collection with enterprise_* entries
- Add feature flag check for subscription tier

---

### 📊 P1: Medium (Following Sprint)

**3. Add Intent-Based Playbook Routing**
Modify `handlePlatformSignup()` to accept signup context and route to appropriate playbook

**Modification:**
- Add signup context detection (demo_request, referral, trial, etc.)
- Create context-specific playbooks (welcome_demo, welcome_referral, etc.)
- Update segment mapping to include context

**Files to Modify:**
- `src/server/actions/platform-signup.ts` — Add context parameter
- `src/types/welcome-system.ts` — Add context-specific configurations

---

### 📊 P1: Medium (Following Sprint)

**4. Implement Upsell Playbook Trigger**
Create playbook that monitors free-tier usage limits and prompts upgrade

**New Playbook:**
- `free-to-pro-upsell` — Triggers when free user hits competitor limit
- Message: "You've maxed out your 3 competitors. Upgrade to Pro to track 10."

**Files to Create:**
- `src/server/services/upsell-monitor.ts` — Listen for limit-hit events
- Playbook template in `playbook_templates` collection

---

### 🎯 P2: Lower (Future)

**5. Add Role-Specific Sub-Segments**
Create tailored playbooks for business size (solo vs multi-location, startup vs established)

**New Playbooks:**
- `welcome_dispensary_solo`
- `welcome_dispensary_multi`
- `welcome_brand_startup`
- `welcome_brand_enterprise`

---

## Data Sources & Verification

### Files Audited
1. ✅ `src/types/subscriptions.ts` — Subscription tier definitions
2. ✅ `src/types/roles.ts` — User role hierarchy
3. ✅ `src/types/welcome-system.ts` — Welcome playbook configurations
4. ✅ `src/server/actions/free-user-setup.ts` — Free tier playbook assignment
5. ✅ `src/server/actions/platform-signup.ts` — Platform signup + event triggers
6. ✅ `src/app/onboarding/actions.ts` — Onboarding workflow and subscription assignment

### Queries to Verify in Firestore

```
// Count playbooks by tier (approximate)
db.collection('playbook_event_listeners')
  .where('active', '==', true)
  .get()

// Check free-tier playbook assignments
db.collection('organizations')
  .where('subscriptionTier', '==', 'free')
  .select('playbooks')
  .get()

// Verify welcome playbook execution
db.collection('playbook_executions')
  .where('playbookId', '==', 'welcome_dispensary')
  .orderBy('createdAt', 'desc')
  .limit(100)
  .get()
```

---

## Summary: Current vs. Ideal State

### Current Reality (As of 2026-02-17)

| Tier | Welcome Playbooks | Additional Playbooks | Segment Coverage |
|------|-------------------|----------------------|------------------|
| Free | ✅ 5 templates | ✅ 1 (weekly intel) | 5 segments |
| Pro | ✅ 5 templates | ❌ None | 5 segments |
| Enterprise | ✅ 5 templates | ❌ None | 5 segments |

**Total Unique Playbooks in System:** ~11
**Tier Differentiation:** Minimal (only free has exclusive playbook)

### Ideal State (Post-Recommendations)

| Tier | Welcome Playbooks | Additional Playbooks | Segment Coverage |
|------|-------------------|----------------------|------------------|
| Free | ✅ 5 templates | ✅ 1 (weekly intel) | 5 segments |
| Pro | ✅ 5 templates | ✅ 2-3 (daily intel, analytics) | 5 segments |
| Enterprise | ✅ 5 templates | ✅ 3-4 (realtime intel, summaries) | 5 segments |

**Total Unique Playbooks:** ~25-30
**Tier Differentiation:** Strong (each tier has distinct playbook value)

---

## Next Steps

1. **Stakeholder Approval** — Confirm P0 recommendations (create pro/enterprise playbooks)
2. **Product Design** — Define Pro/Enterprise playbook content and schedule
3. **Implementation** — Create templates and wire tier-based assignment
4. **Testing** — Verify Pro/Enterprise users receive correct playbooks on signup
5. **Monitoring** — Track playbook execution by tier to measure engagement

---

**Audit Complete** ✅
Contact: [AI Agent]
Questions? Review `.agent/refs/` for architecture details.
