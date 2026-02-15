# Super Users Reference

## Overview
Super Users (Owners) have unrestricted platform access and special privileges.

---

## Definition

A Super User is identified by:
- Role: `super_admin`
- Flag: `isSuperUser: true` in session

```typescript
const isSuperUser = session.role === 'super_admin' || session.isSuperUser;
```

---

## Privileges

### 1. Absolute Access
- **Bypass Paywalls** — All features available without subscription
- **View All Tenants** — Can switch context to any brand/dispensary
- **Full Analytics** — Access to platform-wide metrics

### 2. Executive Boardroom
- **Path**: `/dashboard/ceo`
- Access to Leo, Mike, Craig, Linus, Glenda agents
- Direct tool access (Gmail, Drive, Slack, GitHub)

### 3. Agent Capabilities
| Capability | Description |
|------------|-------------|
| Full Tool Access | Agent Discovery, Advanced Analytics |
| Sub-Agent Spawning | Can instantiate ephemeral agents |
| Direct API Access | Finance, Ops, Growth, Docs integrations |
| File Authority | CRUD on Knowledge Base and codebase |

### 4. Playbook Management
- Own and manage all playbooks across tenants
- Access to private/internal playbooks

---

## Executive Boardroom Protocol

The Executive Agents operate with **Level 5 Autonomy**:

1. **Direct Tool Access**
   - Email: Send/Read/Draft via Gmail
   - Files: Create/Edit in Google Drive
   - Code: Read/Write access to repository

2. **Sub-Agent Spawning**
   - Dynamically instantiate ephemeral agents
   - Example: "Linus spawns a React Refactor Bot"

3. **Command Chain**
   - **Leo** directs entire operational fleet
   - **Jack & Glenda** direct Mrs. Parker
   - **Linus** directs codebase health

---

## BakedBot Drive

**Path**: `/dashboard/ceo?tab=drive`

Google Drive-like file storage system for super users.

### Features
- **File Management**: Upload, organize, search, rename, move, delete
- **Folder System**: Custom folders + system folders (agents, qr, images, documents)
- **Sharing**: Public links, password protection, email-gated access, expiration
- **Views**: Grid and list view with sorting options

### Key Files
| File | Purpose |
|------|---------|
| `src/types/drive.ts` | TypeScript types |
| `src/server/actions/drive.ts` | Server actions (50+ operations) |
| `src/server/services/drive-storage.ts` | Firebase Storage wrapper |
| `src/lib/store/drive-store.ts` | Zustand UI state |
| `src/components/drive/` | UI components |

### Firestore Collections
- `drive_files` - File metadata
- `drive_folders` - Folder structure
- `drive_shares` - Sharing configurations

### Storage
- **Bucket**: `bakedbot-global-assets`
- **Path**: `drive/{userId}/{category}/{timestamp}_{filename}`

---

## Lead Management Dashboard

**Path**: `/dashboard/ceo?tab=leads`

Unified lead aggregation system combining all lead magnets (Academy, Vibe Studio, Training, age gates).

### Architecture

```
Public Lead Magnets → Firestore Collections → Admin Dashboards → CEO Unified View
```

### Leads Tab Features
- **Stats Cards**: Total leads, Email opt-ins, SMS opt-ins, Age verified
- **Source Filter**: Dropdown to filter by source (academy, vibe-generator, training, menu, chatbot)
- **CSV Export**: Export filtered leads with full data (name, email, phone, state, consent, source, timestamp)
- **Lead Table**: Real-time lead data with consent tracking

### Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/ceo/components/leads-tab.tsx` | Leads tab component |
| `src/server/actions/email-capture.ts` | `getLeads()`, `getLeadStats()` server actions |

### Data Sources

**1. General Leads (`email_leads` collection)**
- Sources: menu, demo-shop, homepage, chatbot, age gates
- Captures: email, phone, firstName, emailConsent, smsConsent, ageVerified, state
- Written by: `captureEmailLead()` in `src/server/actions/email-capture.ts`

**2. Academy Leads (`academy_leads` collection)**
- Public: `/academy` - Email gate after 3 video views
- Admin: `/dashboard/academy-analytics` - Analytics dashboard
- Collections: `academy_leads`, `academy_views`
- Features: Lead scoring (0-100), video completion tracking, resource downloads, demo requests
- Written by: `captureAcademyLead()` in `src/server/actions/academy.ts`
- Read by: `getAcademyAnalytics()` in `src/server/actions/academy-analytics.ts`
- Sidebar: Super Admin → "Content & Growth" → "Academy Analytics"

**3. Vibe Studio Leads (`vibe_leads` collection)**
- Public: `/vibe` - Email gate after 3 web vibes
- Admin: `/dashboard/vibe-admin` - Vibe admin dashboard
- Features: Platform interest (web/mobile/both), intent signals, refinement tracking
- Intent Signals: multiple_vibes, heavy_refinement, mobile_interest, downloaded_package
- Written by: `captureEmail()` in `src/server/actions/leads.ts`
- Read by: `getVibeLeads()` in `src/server/actions/leads.ts`
- Sidebar: Super Admin → "Content & Growth" → "Vibe Admin"

**4. Training Enrollments**
- Public: `/training` - Auto-enrollment with intern role
- Dashboard: `/dashboard/training` - Student curriculum
- Admin: `/dashboard/training/admin` - Cohort management
- Collections: `training_cohorts`, `users/{userId}/training/progress`
- Features: Zero-touch enrollment, cohort assignment (max 50 students)
- Written by: `selfEnrollInTraining()` in `src/server/actions/training.ts`
- Sidebar: Super Admin → "Content & Growth" → "Training Program" + "Training Admin"

### Lead Scoring Formula

| Feature | Base Score | Multipliers |
|---------|-----------|-------------|
| **Academy** | 25 | Videos watched ×10, Resources downloaded ×5, Demo requested ×25 |
| **Vibe Studio** | 20 | Vibes generated ×5, Refinements ×2, Mobile interest ×15 |
| **Training** | 30 | Weeks completed ×10, Challenges submitted ×5 |

High-intent threshold: **Score > 75**

### Integration Pattern

```typescript
// 1. Public page captures lead
await captureFeatureLead({ email, ...metadata });

// 2. Lead stored in feature-specific collection
// academy_leads | vibe_leads | training_cohorts

// 3. Feature admin dashboard reads collection
const analytics = await getFeatureAnalytics();

// 4. CEO Leads Tab aggregates all sources
const allLeads = await getLeads(); // Reads email_leads
const stats = await getLeadStats(); // Groups by source
```

---

## Super Admin Login

**Component**: `src/components/super-admin-login.tsx`

Special login flow for super admin access.

---

## Related Files
- `src/server/services/permissions.ts`
- `src/components/super-admin-login.tsx`
- `src/app/dashboard/ceo/` — Boardroom pages
- `src/app/dashboard/ceo/components/leads-tab.tsx` — Unified leads dashboard
- `src/app/dashboard/academy-analytics/` — Academy analytics
- `src/app/dashboard/vibe-admin/` — Vibe Studio admin
- `src/app/dashboard/training/admin/` — Training admin
