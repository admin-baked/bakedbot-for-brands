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

## Multi-Org Team Management (2026-02-17)

**Status**: ✅ Production — Full vertical integration + org-scoped user management

### Team Management Dashboard

**Path**: `/dashboard/settings/team`

Org-scoped user management where admins (brand_admin, dispensary_admin) can manage their team.

#### Members Tab
- **Query**: `users.where('organizationIds', 'array-contains', orgId)`
- **Display**: Avatar, Name/Email, Role (editable), Joined date
- **Actions**: Change Role (via dialog with confirm), Remove User (with soft-delete pattern)
- **Includes**: Active members + pending invitations in single unified view
- **Role Edit Flow**: Click role badge → Select new role → Confirm (updates `orgMemberships[orgId].role` + Firebase custom claims)

#### Invitations Tab
- **Display**: Pending invitations with email, invited date, invited by
- **Actions**: Revoke, Resend (toggle)
- **Component**: Reuses existing `<InvitationsList>` for consistency

#### Locations Tab (Dispensary-Only)
- **Display**: List of sub-locations with name, state/jurisdiction, POS provider, status
- **CRUD Operations**:
  - **Add Location**: Dialog with name, address, state, posProvider, posApiKey, posDispensaryId
  - **Edit Location**: Inline edit dialog + complianceConfig (state, licenseNumber)
  - **Remove Location**: Soft delete (set `isActive: false`)
- **MSO Support**: One dispensary org can have multiple locations across different states, each with jurisdiction-specific compliance config

### Super User Promotion Flow

**Email Whitelist**: `src/lib/super-admin-config.ts`
```typescript
const SUPER_ADMIN_EMAILS = [
  'martez@bakedbot.ai',
  'jack@bakedbot.ai',
  'vib@cannmenus.com',
  'rishabh@bakedbot.ai',  // ← rishabh added here
];
```

**Promotion Options:**

#### Option 1: UI Promotion (Recommended)
1. User signs up at `/signin`
2. Redirected to `/onboarding` (no role yet)
3. Existing super user goes to `/dashboard/ceo/users`
4. Clicks "Promote" next to user's entry
5. Confirms promotion (sets role to 'super_user')
6. User logs back in → auto-routed to `/dashboard/ceo`

#### Option 2: CLI Script
```bash
node scripts/promote-super-user.mjs rishabh@bakedbot.ai
```

**Script Details** (`scripts/promote-super-user.mjs`):
- Initializes Firebase Admin SDK (uses default credentials or service account)
- Looks up user by email (throws if not found)
- Sets custom claims: `{ role: 'super_user' }`
- Updates Firestore: `users/{uid}.roles = ['super_user']`
- Pretty-printed output with status checks

**Critical Flow:**
```
Email Whitelist        Firebase Account       Custom Claims          Access Level
   ✅ Found       →   ✅ Signed up     →   ⏳ Not yet set     →   🟡 Auth-only
                                                   ↓ (promotion)
                                            ✅ role: 'super_user'   →   🟢 Full Admin
```

### Super User Org Impersonation (2026-02-17)

**Feature**: Super users can test orgs without being members

**How It Works:**
1. Super user opens Admin Controls (bottom-right button in dashboard)
2. Clicks "View as Org..." → Dialog lists all organizations (paginated, 50 per page)
3. Selects an org → Sets `x-impersonated-org-id` cookie → Page reloads
4. Server-side (auth.ts): Cookie checked, org data fetched, user context overridden with selected org's values
5. Super user can now test org-scoped features, view member data, test payments, etc.
6. Clicking "Clear Org Impersonation" removes cookie and resets context

**Implementation** (`src/server/auth/auth.ts`):
```typescript
// After role simulation check
const impersonatedOrgId = cookieStore.get('x-impersonated-org-id')?.value;
if (decodedToken.role === 'super_user' && impersonatedOrgId) {
  const org = await firestore.collection('organizations').doc(impersonatedOrgId).get();
  // Override: currentOrgId, orgId, brandId (if brand), locationId (if dispensary)
}
```

### Org-Scoped Invitation Acceptance

**Critical Pattern**: `acceptInvitationAction` must update Firebase custom claims

```typescript
// Invitation acceptance flow
acceptInvitationAction(token) {
  const invite = await validateToken(token);

  // 1. Update Firestore
  await firestore.collection('users').doc(uid).update({
    organizationIds: FieldValue.arrayUnion(invite.targetOrgId),
    role: invite.role,  // Update current role
    currentOrgId: invite.targetOrgId,
    [`orgMemberships.${invite.targetOrgId}`]: {
      orgId: invite.targetOrgId,
      orgName, orgType, role, joinedAt
    }
  });

  // 2. ⚠️ CRITICAL: Update Firebase custom claims
  //    Without this, user can READ org data but can't ACCESS it (authz failures)
  await auth.setCustomUserClaims(uid, {
    role: invite.role,
    orgId: invite.targetOrgId,
    brandId: (if brand),
    locationId: (if dispensary)
  });
}
```

---

## Super Admin Login

**Component**: `src/components/super-admin-login.tsx`

Special login flow for super admin access.

---

## Related Files
- `src/lib/super-admin-config.ts` — Email whitelist (SUPER_ADMIN_EMAILS)
- `src/server/actions/team-management.ts` — Core multi-org actions (600+ lines)
- `src/types/org-membership.ts` — OrgMembership type definition
- `src/server/auth/auth.ts` — Auth logic with org impersonation support
- `src/components/org/org-switcher.tsx` — Org context switcher component
- `src/app/dashboard/settings/team/page.tsx` — Team management page
- `src/app/dashboard/ceo/users/page.tsx` — User promotion UI
- `scripts/promote-super-user.mjs` — CLI promotion script
- `src/server/services/permissions.ts`
- `src/components/super-admin-login.tsx`
- `src/app/dashboard/ceo/` — Boardroom pages
- `src/app/dashboard/ceo/components/leads-tab.tsx` — Unified leads dashboard
- `src/app/dashboard/academy-analytics/` — Academy analytics
- `src/app/dashboard/vibe-admin/` — Vibe Studio admin
- `src/app/dashboard/training/admin/` — Training admin
