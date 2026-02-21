# Spec: WordPress Theme Management System

**Date:** 2026-02-21
**Requested by:** User (for marcus@andrewsdevelopments.com initial pilot)
**Spec status:** 🟡 Draft

---

## 1. Intent (Why)

Enable brand and dispensary admins to upload, preview, and activate custom WordPress themes on their public menu sites (similar to Siteground's theme management), giving customers full design control while keeping BakedBot's commerce & compliance infrastructure.

---

## 2. Scope (What)

### New Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/types/wordpress-theme.ts` | WordPress theme metadata type definitions | 100 |
| `src/server/services/wordpress-theme-service.ts` | Theme upload, validation, CRUD, activation | 400 |
| `src/server/actions/themes.ts` | Server actions: upload, list, switch, delete, get active | 200 |
| `src/app/api/themes/upload/route.ts` | Theme ZIP upload endpoint (multipart) | 80 |
| `src/app/api/themes/list/route.ts` | List org themes (paginated) | 60 |
| `src/app/api/themes/activate/route.ts` | Activate theme for org/dispensary | 50 |
| `src/app/api/themes/preview/route.ts` | Generate theme preview (iframe safe) | 120 |
| `src/components/dashboard/theme-manager.tsx` | Admin panel: list, upload, switch, delete themes | 250 |
| `src/components/dashboard/theme-uploader.tsx` | Drag-drop theme ZIP uploader with progress | 150 |
| `src/components/dashboard/theme-switcher.tsx` | Dropdown/grid to activate theme | 80 |
| `src/components/theme-preview-modal.tsx` | Full-screen preview iframe | 100 |
| `src/app/dashboard/menu/themes-tab.tsx` | Dashboard "Themes" tab in menu section | 120 |
| `tests/wordpress-theme-service.test.ts` | Unit tests for theme service | 300 |
| `tests/theme-manager.test.tsx` | Component integration tests | 200 |
| `dev/WORDPRESS_THEME_SPEC.md` | Implementation guide + WordPress theme structure | 150 |

**Est. total new code:** ~2,300 lines

### Modified Files

| File | Change | Impact |
|------|--------|--------|
| `src/app/[brand]/page.tsx` | Add theme provider wrapper; load active theme from DB | Medium |
| `src/app/dispensaries/[slug]/page.tsx` | Add theme provider wrapper; load active theme from DB | Medium |
| `src/app/dashboard/menu/page.tsx` | Add "Themes" tab alongside "Menu Settings", "Domains" | Small |
| `src/types/themes.ts` | Extend with `WordPressTheme` interface | Small |
| `firestore.indexes.json` | Add composite indexes for org theme queries | Small |
| `src/lib/logger.ts` | Already present; add logger calls to theme service | Small |

**Est. modifications:** ~200 lines

### Files Explicitly NOT Touched

- `src/server/agents/` — No agent logic changes
- `src/components/demo/` — No changes to product, menu, or POS components
- `src/app/[brand]/layout.tsx` — Theme applied at route level, not layout
- Compliance logic (Deebo) — Themes are purely cosmetic; no compliance gates

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | **YES** | Requires `brand_admin` or `dispensary_admin` role for theme upload/manage; must verify org membership |
| Touches payment or billing? | NO | Theme uploads are admin-only; no cost to customers |
| Modifies database schema? | **YES** | New Firestore collection `orgs/{orgId}/themes` + document `activeTheme` on org doc |
| Changes infra cost profile? | **MAYBE** | Firebase Storage for theme ZIPs (50MB per org × 100 orgs = 5GB). Cost: ~$0.02/GB/month = ~$0.10/month. Negligible but should monitor. |
| Modifies LLM prompts/agent behavior? | NO | No AI changes |
| Touches compliance (Deebo, age-gate)? | NO | Themes are UI only; compliance gates unchanged |
| Adds new external dependency? | NO | Uses built-in PHP parser + ZIP extraction (Node.js native) |

**Escalation needed?** **YES** — Auth/permissions + schema changes require approval.

---

## 4. Implementation Plan

### Phase 1: Foundation (Days 1-2)

1. **Create WordPress theme types** (`src/types/wordpress-theme.ts`)
   - `WordPressTheme` interface: id, name, version, zipUrl, active, uploadedBy, uploadedAt, fileSize, errorLog
   - `ThemeMetadata` interface: theme name, version, description, author, license (extracted from `style.css`)
   - `ThemeValidationError` interface: type, file, message
   - Theme storage path: `gs://bucket/themes/{orgId}/{themeId}/theme-{version}.zip`

2. **Create theme upload service** (`src/server/services/wordpress-theme-service.ts`)
   - `uploadTheme(orgId, file)` → validates ZIP structure, extracts metadata, stores in Firebase Storage + Firestore
   - `validateThemeZip(buffer)` → ensures required WP files (style.css, functions.php, index.php, screenshot.png)
   - `extractThemeMetadata(buffer)` → parses style.css header for theme name, author, version
   - `deleteTheme(orgId, themeId)` → removes from Storage + Firestore
   - `listThemesByOrg(orgId)` → returns active theme first, rest sorted by uploadedAt DESC
   - `activateTheme(orgId, themeId)` → sets `activeTheme: themeId` on org doc + logs to audit trail
   - Error handling: custom ZIP error types (missing files, too large, invalid structure)

3. **Create Firestore schema**
   - New collection: `orgs/{orgId}/themes/{themeId}`
   - Document structure:
     ```json
     {
       "id": "theme_xyz123",
       "name": "Modern Shop",
       "version": "1.0.0",
       "author": "John Doe",
       "zipUrl": "gs://bucket/themes/org_xyz/theme_xyz123/theme-1.0.0.zip",
       "active": false,
       "uploadedBy": "uid_marcus",
       "uploadedAt": Timestamp,
       "fileSize": 5242880,
       "screenshot": "gs://bucket/themes/org_xyz/theme_xyz123/screenshot.png",
       "errorLog": null
     }
     ```
   - Update org doc: add `activeThemeId: string | null` field
   - Firestore index: `orgs/{orgId}/themes` (orgId, active, uploadedAt DESC)

4. **Create server actions** (`src/server/actions/themes.ts`)
   - `uploadThemeAction(formData)` → calls service, returns theme ID or error
   - `listThemesAction(orgId)` → calls service, returns paginated list
   - `activateThemeAction(orgId, themeId)` → verifies org membership, calls service
   - `deleteThemeAction(orgId, themeId)` → verifies ownership, calls service
   - `getActiveThemeAction(orgId)` → returns active theme or null
   - All protected with `requireUser()` + org membership check

### Phase 2: API & Frontend (Days 2-3)

5. **Create API endpoints** (`src/app/api/themes/*`)
   - `POST /api/themes/upload` — multipart form (file + orgId), calls `uploadThemeAction`, returns `{ success, themeId, error }`
   - `GET /api/themes/list?orgId=X` — returns paginated themes
   - `POST /api/themes/activate` — activates theme, returns `{ success, activeThemeId }`
   - `DELETE /api/themes/{themeId}` — deletes theme
   - `GET /api/themes/{themeId}/preview` — generates iframe-safe preview (see below)
   - Auth: All require `requireUser()` + org membership verification

6. **Theme preview endpoint** (`src/app/api/themes/preview/route.ts`)
   - GET `/api/themes/{themeId}/preview?orgId=X`
   - Fetches theme ZIP from Storage
   - Extracts `screenshot.png` if available, else generates placeholder
   - Returns safe HTML preview (no PHP execution — just CSS/assets from theme)
   - CORS: allow origin `*.bakedbot.ai`
   - Cache: 1 hour (Cloudflare CDN)

7. **UI Components** (`src/components/dashboard/theme-*.tsx`)
   - `theme-manager.tsx` — Main panel: two tabs (My Themes, Upload New)
     - Tab 1: Grid of uploaded themes, each with "Activate", "Preview", "Delete" buttons
     - Active theme highlighted; shows upload date, author
     - Pagination (5 themes per page)
   - `theme-uploader.tsx` — Drag-drop zone, validates file before upload, shows progress bar
     - Validation: checks file is `.zip`, size <50MB
     - Success: shows "Theme uploaded! Activate it?"
     - Error: shows error message (missing files, too large, etc.)
   - `theme-switcher.tsx` — Dropdown or grid selector to quickly activate theme (from menu settings)
   - `theme-preview-modal.tsx` — Full-screen iframe showing theme preview

8. **Dashboard integration** (`src/app/dashboard/menu/themes-tab.tsx`)
   - Add "Themes" tab in `/dashboard/menu` (alongside "Menu Settings", "Domains")
   - Renders `<ThemeManager />` component
   - Bread crumb: Menu → Themes

### Phase 3: Public Site Rendering (Days 3-4)

9. **Integrate theme into public menu pages**
   - Modify `src/app/[brand]/page.tsx`:
     ```typescript
     export const dynamic = 'force-dynamic'; // Fetch fresh theme per request

     export default async function BrandMenuPage({ params }) {
       const { brand } = await params;
       const orgId = await resolveOrgIdFromBrand(brand);
       const activeTheme = await getActiveThemeAction(orgId);

       return (
         <ThemeProvider themeZip={activeTheme?.zipUrl}>
           <BrandMenuClient orgId={orgId} />
         </ThemeProvider>
       );
     }
     ```
   - Same for `src/app/dispensaries/[slug]/page.tsx`

10. **Theme provider wrapper** (`src/components/theme-provider.tsx` — extend existing)
    - Accept `themeZip` URL (Firebase Storage signed URL)
    - Extract CSS/JS from ZIP (client-side using JSZip library)
    - Inject theme CSS into `<head>` before BakedBot CSS (theme = lower specificity override)
    - Fallback: if theme ZIP is invalid/missing, render with default BakedBot theme
    - Error boundary: catch ZIP extraction errors, log, render default

### Phase 4: Testing & Deployment (Days 4-5)

11. **Unit tests** (`tests/wordpress-theme-service.test.ts`)
    - ✅ Upload valid theme ZIP → extracts metadata, stores in Firestore/Storage
    - ✅ Reject invalid ZIP (missing style.css) → returns error
    - ✅ Reject oversized ZIP (>50MB) → returns error
    - ✅ List themes for org (pagination)
    - ✅ Activate theme → updates org.activeThemeId
    - ✅ Delete theme → removes from Storage + Firestore
    - ✅ Theme metadata extraction → parses style.css correctly
    - Coverage target: >85%

12. **Integration tests** (`tests/theme-manager.test.tsx`)
    - ✅ User uploads theme → preview available → activate → appears on public site
    - ✅ Switch between themes → public site updates
    - ✅ Only brand/dispensary admins can manage (RBAC)
    - ✅ Org membership check prevents cross-org access
    - ✅ Theme preview iframe loads safely
    - Coverage target: >80%

13. **Manual smoke test on Thrive + test brand**
    - [ ] Brand admin logs in → goes to Menu → Themes tab
    - [ ] Uploads test WP theme (e.g., a free public theme)
    - [ ] Views preview
    - [ ] Activates theme
    - [ ] Visits public menu URL → renders with theme
    - [ ] Switches to different theme → public site updates
    - [ ] Dispensary admin also manages themes for their location
    - [ ] Deletes theme → no longer available
    - [ ] Fallback: deletes active theme → site reverts to default
    - No console errors; load time <2s

---

## 5. Test Plan

### Unit Tests

```typescript
// Theme Service
✅ uploadTheme() — valid ZIP → Firestore + Storage
✅ uploadTheme() — invalid ZIP structure → ValidationError
✅ uploadTheme() — oversized ZIP → ValidationError
✅ extractThemeMetadata() — parses style.css header
✅ validateThemeZip() — requires style.css, functions.php, index.php
✅ deleteTheme() — removes from Storage + Firestore
✅ listThemesByOrg() — pagination, active first
✅ activateTheme() — updates org.activeThemeId
✅ getActiveTheme() — returns active theme or null
```

### Integration Tests

```typescript
// Theme Manager Component
✅ Upload flow: file → progress → success → theme in list
✅ Activate flow: click button → theme marked active → org doc updated
✅ Preview flow: click preview → iframe shows theme
✅ Delete flow: click delete → theme removed from list + Storage
✅ RBAC: non-admins cannot see theme manager
✅ Org membership: cannot upload to other org
✅ Error handling: invalid file → shows user-friendly error
```

### Manual Smoke Test (Marcus + Thrive)

```
1. Marcus logs in as brand_admin
2. Navigates to /dashboard/menu/themes
3. Drag-drops a valid WP theme ZIP (e.g., from Envato)
4. Sees success message, theme appears in list
5. Clicks "Preview" → sees theme in iframe
6. Clicks "Activate" → theme becomes "active"
7. Opens https://bakedbot.ai/thrivesyracuse → menu renders with theme CSS
8. Goes back to dashboard, clicks "Switch Theme"
9. Activates different theme → public site re-renders with new theme
10. Dispensary admin (if any) also sees theme manager
11. Deletes a theme → no longer available
12. Network tab: CSS loads correctly, <2s total page load
```

### Golden Set Eval

N/A — no LLM/agent changes.

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | **YES** — All feature in one PR; `git revert <commit-hash>` undoes completely |
| Feature flag? | NO — Not complex enough; no partial rollout needed |
| Data migration rollback? | Firestore docs in `orgs/{orgId}/themes` remain (harmless); remove via one-time cleanup script if needed |
| Downstream services? | Public menu pages: if active theme is missing, fallback to default BakedBot theme (safe) |
| Safety net? | Error boundary in `ThemeProvider` prevents white-screen crashes |

**Rollback procedure (if needed):**
```bash
git log --oneline | grep "WordPress Theme Management"
git revert <commit-hash>
git push origin main
# Firebase deploy auto-triggers; site back to default theme within 2 min
```

---

## 7. Success Criteria

- [ ] **All tests pass** — Unit + integration + manual smoke test (0 regressions)
- [ ] **Marcus can upload theme** — Brand admin uploads custom WP theme via dashboard
- [ ] **Theme renders correctly** — Public menu site displays with uploaded theme CSS
- [ ] **Theme switching works** — Can activate/deactivate themes; public site updates within 30s
- [ ] **Preview accurate** — Theme preview modal shows expected design
- [ ] **RBAC enforced** — Only brand_admin + dispensary_admin roles can manage; cross-org access blocked
- [ ] **Error handling** — Invalid ZIPs show user-friendly errors (not 500s)
- [ ] **No performance regression** — Public menu page load time remains <2s (theme CSS <1MB)
- [ ] **Fallback working** — If active theme deleted, site reverts to default BakedBot theme
- [ ] **No new errors** — Error logs clean within 24h post-deploy
- [ ] **Accessibility preserved** — WCAG 2.1 AA compliance maintained (theme CSS must not break keyboard nav)

---

## Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]

---

## Notes for Reviewer

**Why full spec required:**
1. ✅ Touches auth/permissions (role-based access control)
2. ✅ Modifies database schema (new collection + fields)
3. Estimated ~2,500 lines of code (substantial feature)

**Key assumptions:**
- WordPress theme ZIPs follow standard structure (style.css, functions.php, index.php)
- Themes are pure cosmetic (CSS/assets); no PHP code execution on BakedBot
- Theme assets (images, fonts) are served from Firebase Storage with signed URLs
- Themes can coexist with BakedBot's own CSS (theme CSS has lower priority)

**Future enhancements (out of scope):**
- Theme code editor (inline PHP/CSS editing)
- Theme marketplace (pre-built BakedBot themes)
- Theme previewing with live product data (currently shows structure only)
- Automatic WP theme compatibility check

