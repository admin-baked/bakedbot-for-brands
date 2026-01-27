# Inbox-First Architecture Implementation
**Date:** January 27, 2026
**Status:** ✅ Implemented
**Related:** [inbox-audit-2026-01.md](./inbox-audit-2026-01.md)

---

## 🎯 Objective

Transform the BakedBot dashboard from a traditional multi-page application into an **inbox-first conversational workspace** where the Unified Inbox is the primary interface for brand and dispensary users.

---

## ✅ Implementation Summary

### What Changed

**Before (Legacy):**
```
/dashboard → Overview page with stats
Sidebar → "New Chat" button → /dashboard (showing hardcoded mockup)
Sidebar → "Inbox" link → /dashboard/inbox (Unified Inbox)
```

**After (Inbox-First):**
```
/dashboard → Auto-redirects brand/dispensary users to /dashboard/inbox
Sidebar → "New Chat" button → /dashboard/inbox (creates new thread)
Sidebar → "Inbox" link → /dashboard/inbox (Unified Inbox)
/dashboard/demo → Mockup moved here for reference
```

---

## 📋 Files Modified

### 1. **Dashboard Default Page** (`src/app/dashboard/page.tsx`)
**Status:** ✅ Complete

**Changes:**
- Removed hardcoded "Agentic Command Center" mockup
- Added role-based routing logic
- Brand and dispensary users auto-redirect to `/dashboard/inbox`
- Super users and other roles see `DashboardWelcome` overview

**Implementation:**
```typescript
// Inbox-First: Brand and dispensary users go directly to inbox
if (
  role === 'brand' ||
  role === 'brand_admin' ||
  role === 'brand_member' ||
  role === 'dispensary' ||
  role === 'dispensary_admin' ||
  role === 'dispensary_staff'
) {
  router.replace('/dashboard/inbox');
  return;
}
```

---

### 2. **Mockup Demo Route** (`src/app/dashboard/demo/page.tsx`)
**Status:** ✅ Complete

**Changes:**
- Moved hardcoded mockup from `/dashboard/page.tsx`
- Added prominent demo banner with link to production inbox
- Retained all original functionality for reference

**Purpose:** Preserves the prototype UI for design reference and testing without exposing it to production users.

---

### 3. **Sidebar History Navigation** (`src/components/dashboard/shared-sidebar-history.tsx`)
**Status:** ✅ Complete

**Changes:**
- Updated "New Chat" button routing for brand/dispensary users
- Updated session selection routing
- Both now route to `/dashboard/inbox` instead of `/dashboard`

**Before:**
```typescript
if (role === 'brand') {
    router.push('/dashboard'); // ❌ Wrong - went to mockup
}
```

**After:**
```typescript
if (
    role === 'brand' ||
    role === 'brand_admin' ||
    role === 'brand_member' ||
    role === 'dispensary' ||
    role === 'dispensary_admin' ||
    role === 'dispensary_staff'
) {
    router.push('/dashboard/inbox'); // ✅ Correct - goes to inbox
}
```

---

### 4. **Inbox CTA Banners** (Already Present)
**Status:** ✅ Verified

**Locations:**
- ✅ Creative Center (`src/app/dashboard/brand/creative/page.tsx:421`)
- ✅ Playbooks (`src/app/dashboard/playbooks/page.tsx:133`)
- ✅ Projects (`src/app/dashboard/projects/page-client.tsx:98`)

These banners encourage users to migrate workflows to the unified inbox, supporting the inbox-first philosophy.

---

## 🧭 Navigation Flow Diagram

### Brand/Dispensary Users

```
User logs in
     ↓
/dashboard (loads)
     ↓
Detects role: brand/dispensary
     ↓
Auto-redirects to /dashboard/inbox
     ↓
User sees Unified Inbox (empty state or threads)
     ↓
Clicks "New Chat" → Creates new inbox thread
```

### Super Users

```
User logs in
     ↓
/dashboard/ceo (primary workspace)
     ↓
OR clicks "Dashboard" → /dashboard
     ↓
Shows DashboardWelcome overview
     ↓
Can navigate to /dashboard/inbox if needed
```

---

## 🔄 Routing Table

| Route | Brand/Dispensary | Super User | Customer | Notes |
|-------|------------------|------------|----------|-------|
| `/dashboard` | Redirects to `/dashboard/inbox` | Shows `DashboardWelcome` | Shows overview | Inbox-first |
| `/dashboard/inbox` | ✅ Primary workspace | ✅ Available | N/A | Unified Inbox |
| `/dashboard/demo` | ✅ Demo only | ✅ Demo only | N/A | Mockup reference |
| `/dashboard/playbooks` | ✅ Legacy page with CTA | ✅ Primary workspace | N/A | Encourages inbox |
| `/dashboard/projects` | ✅ Legacy page with CTA | ✅ Available | N/A | Encourages inbox |
| `/dashboard/brand/creative` | ✅ Legacy page with CTA | ✅ Available | N/A | Encourages inbox |

---

## 🎨 Design Consistency

### Unified Styling Patterns

All inbox and dashboard pages now follow consistent design language:

| Element | Pattern | Implementation |
|---------|---------|----------------|
| **Backgrounds** | Glassmorphism with subtle gradients | `bg-gradient-to-br from-background via-background to-baked-950/10` |
| **Panels** | Translucent with backdrop blur | `bg-sidebar/80 backdrop-blur-xl` |
| **Animations** | Slide-overs for panels | `initial={{ x: 100 }} animate={{ x: 0 }}` |
| **Agent Activity** | Pulse animations | InboxTaskFeed component |
| **Colors** | Primary green for actions | `bg-green-600 hover:bg-green-700` |

**Note:** The hardcoded mockup used `bg-baked-green` and darker themes, which conflicted with the production design system. Moving it to `/demo` resolves this inconsistency.

---

## 📊 Benefits of Inbox-First Architecture

### 1. **Single Source of Truth**
- All artifact creation flows through inbox threads
- Consistent HitL (Human-in-the-Loop) approval workflow
- Unified artifact storage (prepares for future migration to single `artifacts` collection)

### 2. **Natural Multi-Agent Coordination**
- Users converse with agent squad in one place
- Agent personas visually represented in conversation
- Task transparency via InboxTaskFeed

### 3. **Reduced User Confusion**
- No more "Where do I create X?" questions
- "New Chat" → Inbox (predictable behavior)
- Consistent navigation patterns across roles

### 4. **Aligned with Product Vision**
- Inbox as "coordination layer for AI squad" (from spec)
- Conversation → Artifact paradigm (from audit)
- Premium, cohesive UX across all workflows

---

## 🧪 Testing Checklist

### Manual Testing (Brand User)

- [ ] Log in as brand user
- [ ] Verify auto-redirect from `/dashboard` to `/dashboard/inbox`
- [ ] Click "New Chat" button in sidebar
- [ ] Verify navigation to `/dashboard/inbox` with empty state
- [ ] Create a new inbox thread
- [ ] Verify thread appears in sidebar history
- [ ] Click on thread in history
- [ ] Verify conversation loads correctly
- [ ] Navigate to Creative Center
- [ ] Verify Inbox CTA banner is visible
- [ ] Click CTA "Open in Inbox" button
- [ ] Verify navigation to `/dashboard/inbox?type=creative`

### Manual Testing (Super User)

- [ ] Log in as super user
- [ ] Navigate to `/dashboard`
- [ ] Verify `DashboardWelcome` component loads (not redirect)
- [ ] Click "New Chat" button in sidebar
- [ ] Verify navigation to `/dashboard/playbooks`
- [ ] Navigate to `/dashboard/inbox`
- [ ] Verify Unified Inbox loads correctly

### Manual Testing (Demo Route)

- [ ] Navigate to `/dashboard/demo`
- [ ] Verify hardcoded mockup loads with demo banner
- [ ] Click "Go to /dashboard/inbox" link in banner
- [ ] Verify navigation to production inbox

### Automated Testing

- [ ] TypeScript type checking passes: `npm run check:types` ✅
- [ ] No ESLint errors: `npm run lint`
- [ ] Unit tests pass: `npm test`
- [ ] E2E navigation tests (if available)

---

## 📝 Migration Notes

### For Developers

**If you need to add a new artifact type:**
1. Add thread type to `InboxThreadType` enum (`src/types/inbox.ts`)
2. Add artifact type to `InboxArtifactType` enum
3. Update `buildThreadContext()` in `src/server/actions/inbox.ts`
4. Create artifact display component
5. Users create via inbox, not standalone pages

**If you're adding a new role:**
1. Update routing logic in `src/app/dashboard/page.tsx`
2. Update "New Chat" routing in `src/components/dashboard/shared-sidebar-history.tsx`
3. Consider whether role should be inbox-first or overview-first

### For Users

**Existing workflows remain functional:**
- Creative Center, Playbooks, and Projects pages still exist
- Inbox CTA banners guide users to the new inbox workflow
- No data migration required (inbox and legacy collections coexist)

**New workflows:**
1. Click "Inbox" in sidebar → Go to Unified Inbox
2. Click "New Chat" → Creates new inbox thread
3. Use quick actions in inbox sidebar for common tasks (carousels, bundles, creative)

---

## 🚀 Future Enhancements

### Phase 1: Runtime Agent Handoffs (Medium Priority)
- Add `handoffHistory` array to InboxThread
- Create `handoffToAgent()` server action
- Update ThreadHeader to show agent transitions
- Add transition animations

### Phase 2: Unified Artifact Storage (High Priority)
- Migrate separate collections (carousels, bundles, creative) to single `artifacts` collection
- Add `sourceType: 'inbox' | 'legacy'` flag during transition
- Update legacy pages to save to unified schema
- Data migration script

### Phase 3: Remote Sidecar Integration (Low Priority)
- Build `RemoteMcpClient` for Python sidecar
- Route heavy research tasks (Big Worm, NotebookLM) to sidecar
- Add sidecar health check UI

### Phase 4: Global Approval Queue (Low Priority)
- Create `/dashboard/approvals` page
- Query all artifacts with `status: 'pending_review'`
- Bulk approve/reject actions

---

## 📖 Related Documentation

- **Original Audit:** [inbox-audit-2026-01.md](./inbox-audit-2026-01.md)
- **Inbox Types:** `src/types/inbox.ts`
- **Server Actions:** `src/server/actions/inbox.ts`
- **Unified Inbox Component:** `src/components/inbox/unified-inbox.tsx`
- **Agent Definitions:** `src/server/agents/agent-definitions.ts`

---

## 🏁 Conclusion

The inbox-first architecture successfully transforms BakedBot from a traditional dashboard into a modern, conversational workspace. Brand and dispensary users now experience a unified interface where the AI agent squad is front and center, making it the true "coordination layer" envisioned in the original spec.

**Key Metrics to Track:**
- Time from idea → published artifact (expect 40% reduction)
- User satisfaction (NPS increase)
- Adoption rate of inbox vs. legacy pages
- Artifacts created via inbox vs. legacy paths

---

**Implementation completed:** January 27, 2026
**TypeScript build status:** ✅ Passing
**Deployed to:** Production (Firebase App Hosting on next push to main)
