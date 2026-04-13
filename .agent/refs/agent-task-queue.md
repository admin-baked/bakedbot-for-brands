# Authentication Flow Bugs - 2026-04-12

## Bugs Found

### BUG-001: Admin Routes Missing Authentication
**Severity:** CRITICAL
**Category:** security
**File:** `src/app/api/admin/set-claims/route.ts`, `src/app/api/admin/seed/route.ts`, `src/app/api/admin/debug-booking/route.ts`

**Issue:** Several `/api/admin/*` routes have no authentication whatsoever.

**Details:**
- `set-claims`: No auth - anyone can set custom claims on any user
- `seed`: Weak key auth only (`key=bakedbot_seed_2025`) - not a secure secret
- `debug-booking`: Weak secret (`secret=bakedbot-dev-secret`) - not CRON_SECRET

**Status:** ✅ FIXED (commit `106f5408d`)

**Fix:** Added `requireSuperUser()` to set-claims, replaced weak keys with CRON_SECRET pattern for seed and debug-booking routes.

---

### BUG-002: Webhook Signature Verification Inconsistent
**Severity:** HIGH
**Category:** security
**File:** `src/app/api/webhooks/alleaves/route.ts`

**Issue:** Signature verification is SKIPPED in development mode (`NODE_ENV !== 'production'`).

**Status:** ✅ FIXED (commit `e9b051262`) - Now verifies in ALL environments if secret is configured

**Details:** Line 98-108 skips signature verification entirely in non-production:
```typescript
if (process.env.NODE_ENV === 'production' && webhookSecret) {
  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
  // ...
}
```

**Impact:** Webhooks can be injected in development/staging environments.

**Recommendation:** Use CRON_SECRET pattern for webhooks (like other cron routes), or require signature verification in all environments with a proper secret.

---

### BUG-003: Session Cookie Bypass in Development
**Severity:** MEDIUM
**Category:** security
**File:** `src/server/auth/auth.ts`

**Issue:** Mock session bypass allows any role simulation in development without real auth.

**Status:** ✅ FIXED (commit `e9b051262`) - Added double-check safeguard that throws in non-development

**Details:** Lines 69-94 allow bypass with `x-simulated-role` cookie:
- Any role can be simulated
- No actual Firebase authentication required
- Could accidentally ship to production if `NODE_ENV` check fails

**Recommendation:** Ensure this code path NEVER executes in production. Add additional safeguard:
```typescript
if (isDev && simulatedRole) {
  // Add explicit dev-only safeguard
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Dev bypass attempted in production');
  }
  // ...
}
```

---

### BUG-004: Mock API Key Validation Always Returns True
**Severity:** HIGH
**Category:** security
**File:** `src/server/auth/api-key-auth.ts`

**Issue:** The `hasPermission` function may not properly check permissions.

**Status:** ✅ VERIFIED - Code was already correct (line 48 checks `record.permissions.includes(perm)`)

---

### BUG-005: Admin Debug Routes Expose Sensitive Data
**Severity:** MEDIUM
**Category:** security
**File:** `src/app/api/admin/debug-user/route.ts`

**Issue:** Returns sensitive token data (brandId, locationId, currentOrgId) without proper access control.

**Details:** Only uses `requireUser()` - any authenticated user can query this and see org membership details of all users.

**Recommendation:** Restrict to super_user role only:
```typescript
const user = await requireSuperUser();
```

---

### BUG-006: Role Simulation Allows Any Role
**Severity:** MEDIUM
**Category:** security
**File:** `src/server/auth/auth.ts`

**Issue:** Role simulation (lines 134-148) allows super users to set ANY role including `super_user` itself without verification.

**Details:** The whitelist only checks format, not actual permissions needed for sensitive roles:
```typescript
if (simulatedRole && ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'customer'].includes(simulatedRole)) {
```

Missing: `super_user`, `super_admin`

**Recommendation:** Add explicit audit logging when role simulation is used.

---

### BUG-007: API Key Auth Returns Mock Data
**Severity:** HIGH
**Category:** security
**File:** `src/server/auth/api-key-auth.ts`

**Issue:** API key validation returns a mock record instead of actually validating:
```typescript
const validateAPIKey = async (key: string): Promise<APIKeyRecord> => ({
    id: 'mock',
    orgId: 'mock',
    permissions: [...ALL_API_PERMISSIONS],
    // ...
});
```

**Impact:** ALL API requests using key auth bypass actual validation.

**Recommendation:** Implement real API key validation or remove the endpoint until it's ready.

---

### BUG-008: Missing Org Access Verification
**Severity:** HIGH
**Category:** bug
**File:** Various server actions

**Issue:** Some routes verify user identity but not org access.

**Example:** In `src/app/api/billing/authorize-net/route.ts`, `verifyOrgAccess` exists but may not be called consistently.

**Recommendation:** Audit all routes that take `orgId` in the request body to ensure `verifyOrgAccess` is called.

---

### BUG-009: Webhook orgId Inference Can Be Manipulated
**Severity:** MEDIUM
**Category:** security
**File:** `src/app/api/webhooks/alleaves/route.ts`

**Issue:** orgId is taken from the webhook payload (`payload.data.orgId`) without validation.

**Details:** Line 123 - directly uses `payload.data.orgId` which could be spoofed.

**Recommendation:** Validate orgId against the organization's known configuration or verify webhook signature includes orgId.

---

### BUG-010: Cron Secret Check Uses String Equality
**Severity:** LOW
**Category:** security
**File:** `src/app/api/agent-tasks/route.ts`

**Issue:** Uses direct string equality for cron secret check:
```typescript
return auth === `Bearer ${cronSecret}`;
```

**Vulnerability:** Vulnerable to timing attacks.

**Status:** ✅ FIXED (commit `e9b051262`) - Now uses crypto.timingSafeEqual for timing-safe comparison

---

## Server Actions Bugs - Session 2 (2026-04-12)

### BUG-011: Delivery Driver Creation Allows User ID Injection
**Severity:** HIGH
**Category:** bug
**File:** `src/server/actions/delivery.ts:157`

**Issue:** `input.userId` from request body is used without validation, allowing users to claim their driver profile is linked to any user account.

**Details:**
```typescript
userId: input.userId || user.uid, // Link to user account
```

**Impact:** A user could pass someone else's `userId` and get access to their delivery data.

**Recommendation:** Either use ONLY `user.uid` or validate that `input.userId === user.uid` if provided.

---

### BUG-012: Age Verification Uses User ID From Input
**Severity:** HIGH
**Category:** security
**File:** `src/server/actions/age-verification.ts`

**Issue:** Multiple places use `input.userId` directly from the request.

**Details:** Lines 39, 52, 71, 82, 92, 109, 127 all use `userId: input.userId`

**Impact:** IDOR vulnerability - users can verify ages of other users.

**Recommendation:** Always use `user.uid` from session, not from input.

---

### BUG-013: Missing Org Access Check in Drive Actions
**Severity:** MEDIUM
**Category:** security
**File:** `src/server/actions/drive.ts`

**Issue:** While auth is checked, org access isn't validated for file/folder operations.

**Details:** Actions like `renameItem`, `moveItem`, `createShare` use `user.uid` but don't verify the item belongs to user's org.

**Recommendation:** Add `verifyOrgAccess` for all write operations.

---

### BUG-014: Blog Actions Use OrgId From Input Without Validation
**Severity:** MEDIUM
**Category:** bug
**File:** `src/server/actions/blog.ts:300,345,1004,1014,1027`

**Issue:** `orgId: input.orgId` is used directly without verifying user has access to that org.

**Details:**
```typescript
orgId: input.orgId,
```

**Recommendation:** Verify `await verifyOrgAccess(user.uid, input.orgId)` before using.

---

### BUG-015: CreateHireSubscription Uses UserId From Input
**Severity:** MEDIUM
**Category:** bug
**File:** `src/server/actions/createHireSubscription.ts:199`

**Issue:** Uses `input.userId` for logging and potentially modifying another user's account.

**Details:** Line 199 logs modifying custom claims for `input.userId` - needs validation that current user can modify target user.

**Recommendation:** Verify current user is admin/super_user before allowing modifications to other users.

---

### BUG-016: Subscription Actions Missing Org Verification
**Severity:** HIGH
**Category:** security
**File:** `src/server/actions/subscription.ts`

**Issue:** `getSubscription`, `getInvoices`, `cancelSubscription` accept `orgId` from input without verifying org access.

**Status:** ✅ ALREADY FIXED - Code verifies org ownership (line 447: `org.ownerId !== user.uid && org.ownerUid !== user.uid`)

---

## Payment/Billing Bugs - Session 3 (2026-04-12)

### BUG-017: Payment Authorizations Don't Always Use Server Amount
**Severity:** MEDIUM
**Category:** bug
**File:** `src/app/api/checkout/aeropay/authorize/route.ts:135`

**Issue:** Amount from client is accepted but server amount is used with a warning - good! But the warning could be used to manipulate behavior.

**Details:** Line 135 logs a warning but silently uses server amount. This is correct behavior but could be clearer.

**Recommendation:** This is actually good security - client amount is a hint but server validates. Consider making this more explicit.

---

### BUG-018: Order Amount Validation in CannPay Could Be Bypassed
**Severity:** HIGH
**Category:** security
**File:** `src/app/api/checkout/cannpay/authorize/route.ts`

**Issue:** Order amount validation uses `serverAmountCents` but there's no explicit check that the client's `amount` isn't used if it differs significantly.

**Details:** Currently the client sends `amount` but server calculates from order. Could allow manipulation if order total is modified between fetch and payment.

**Recommendation:** Add explicit amount mismatch rejection, not just warning:
```typescript
if (Math.abs(amount - serverAmountCents) > tolerance) {
  return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
}
```

---

### BUG-019: Checkout Routes Use getUserFromRequest Instead of requireUser
**Severity:** MEDIUM
**Category:** security
**File:** Multiple checkout routes

**Issue:** Some checkout endpoints use `getUserFromRequest` which returns null on failure, but handle it gracefully. However, this pattern is inconsistent.

**Details:** Routes like `/api/checkout/aeropay/authorize` use `getUserFromRequest` but handle null properly. The issue is inconsistency with other auth patterns.

**Recommendation:** Standardize on `requireUser()` for all payment endpoints.

---

### BUG-020: No Rate Limiting on Payment Endpoints
**Severity:** MEDIUM
**Category:** performance
**File:** All checkout routes

**Issue:** No rate limiting on payment authorization endpoints.

**Status:** ⚠️ NOT FIXED - Needs Upstash Redis rate limiting implementation

---

## Firestore Query Security Bugs - Session 4 (2026-04-12)

### BUG-021: CollectionGroup Queries Without Org Filtering
**Severity:** HIGH
**Category:** security
**File:** Multiple files

**Issue:** `collectionGroup` queries bypass org-level security and can return data from all orgs.

**Details:** Files using collectionGroup:
- `src/server/services/template-version-service.ts:160`
- `src/server/services/content-engine/generator.ts:40`
- `src/server/actions/blog.ts:137,451,836`

**Impact:** Could leak data across orgs if collectionGroup is used without proper filtering.

**Recommendation:** Add orgId filtering after collectionGroup query or restrict to super_user.

---

### BUG-022: Global Query Without Access Control
**Severity:** MEDIUM
**Category:** security
**File:** `src/server/actions/stats.ts`

**Issue:** `getPlatformStats()` likely queries global data without proper role checks.

**Details:** Line 11 - `getPlatformStats` returns platform-wide data.

**Recommendation:** Ensure only super_users can access platform-wide stats.

---

### BUG-023: Agent Tools Can Query Any Collection
**Severity:** HIGH
**Category:** security
**File:** `src/server/tools/database-tools.ts`

**Issue:** `database_query` tool allows arbitrary Firestore queries on any collection.

**Details:** Line 26 allows `db.collection(inputs.collectionName).limit(limit).get()` - no access control.

**Impact:** Could be used to exfiltrate data from any collection.

**Status:** ✅ FIXED (commit `106f5408d`) - Added `requireSuperUser()` check to tool execution.

---

## Agent Tools & Permissions Bugs - Session 5 (2026-04-12)

### BUG-024: Email Tool Has No Access Control
**Severity:** HIGH
**Category:** security
**File:** `src/server/tools/email-tool.ts`

**Issue:** Email tool (`EmailTool`) doesn't check user permissions before sending.

**Details:** Extends BaseTool but doesn't override to verify user can send emails.

**Impact:** Any authenticated user could send emails from the platform.

**Recommendation:** Add permission check in `execute()` method.

---

### BUG-025: BaseTool Auth Validation May Be Missing
**Severity:** MEDIUM
**Category:** security
**File:** `src/server/tools/base-tool.ts`

**Issue:** BaseTool has authType but individual tools may not enforce it.

**Details:** Line 76-86 has validateAuth but may not be called properly.

**Recommendation:** Audit all tool implementations to ensure auth is enforced.

---

### BUG-026: CRM Tools Use Admin Firestore Without Auth
**Severity:** HIGH
**Category:** security
**File:** `src/server/tools/crm-tools.ts:8`

**Issue:** Comment says "uses admin Firestore directly (no requireUser)" - no auth at all.

**Details:** Line 8 explicitly notes no requireUser, uses admin SDK directly.

**Impact:** Any code that can call these tools has unrestricted database access.

**Recommendation:** Add requireSuperUser check to all CRM tool methods.

---

## Frontend Security Bugs - Session 6 (2026-04-12)

### BUG-027: XSS via dangerouslySetInnerHTML Without Sanitization
**Severity:** HIGH
**Category:** security
**File:** Multiple components

**Issue:** Multiple components use `dangerouslySetInnerHTML` with unsanitized user data.

**Details:** Components like `outreach-draft-card.tsx:272` render `data.htmlBody` directly. Also `drive/file-viewer.tsx:210` renders markdown output.

**Impact:** Stored XSS if user-controlled content is rendered.

**Status:** ✅ PARTIALLY FIXED (commit `106f5408d`)
- Added `stripHtmlForRendering()` function in `src/server/security/sanitize.ts`
- Updated `outreach-draft-card.tsx` and `outreach-tab.tsx` to use sanitization
- Other components still need updating (JSON-LD, markdown, etc.)

---

### BUG-028: CSRF Protection Is Properly Implemented
**Severity:** INFO
**Category:** security
**File:** `src/lib/csrf.ts`, `src/server/middleware/csrf.ts`

**Good news:** CSRF protection is well implemented with:
- Cryptographically secure token generation
- Cookie-based storage
- X-CSRF-Token header validation
- Middleware for API routes
- Client-side hooks

No issues found - this is a strength of the codebase.

---

## External API Integrations - Session 7 (2026-04-12)

### BUG-029: External API Keys in Code
**Severity:** MEDIUM
**Category:** security
**File:** Multiple service files

**Issue:** External API keys are loaded from environment at module level.

**Details:** Files like `heygen-video.ts:14-16` load keys at module scope:
```typescript
const API_KEY = process.env.HEYGEN_API_KEY || '';
```

**Impact:** If these modules are evaluated at build time, keys could be logged.

**Recommendation:** Use lazy initialization pattern (covered in prime.md).

---

### BUG-030: External API Calls Without Error Handling
**Severity:** MEDIUM
**Category:** bug
**File:** Multiple services

**Issue:** External API calls like fetch don't always have proper error handling.

**Details:** While `heygen-video.ts` has error handling, other services may not.

**Recommendation:** Ensure all external API calls have try/catch and timeout handling.

---

## Polling Script

Created scripts to automatically trigger bug hunt sessions:

| File | Description |
|------|-------------|
| `scripts/poll-opencode.ps1` | PowerShell poller (Windows) |
| `scripts/poll-opencode.sh` | Bash poller (Linux/Mac) |

**Usage:**
```powershell
# Set CRON_SECRET env var first
$env:CRON_SECRET = "your-secret-here"

# Run (every 30 min default)
.\poll-opencode.ps1

# Run with custom interval
.\poll-opencode.ps1 -IntervalMinutes 60
```

## Agent Wakeup System

Automated agent triggering system for bug hunting:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent-wakeup` | POST | Spawns opencode agent to process tasks |
| `/api/cron/agent-poller` | GET | Checks for pending tasks, triggers wakeup |

**Flow:**
1. Poller creates task in `agent_tasks` collection
2. Cron endpoint (`/api/cron/agent-poller`) picks up open tasks
3. Cron calls `/api/agent-wakeup` to spawn opencode
4. Opencode processes the task

**Setup:**
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://bakedbot.ai/api/cron/agent-poller

# Or use the PowerShell poller which handles both steps
./poll-opencode.ps1
```

**Environment:**
- `CRON_SECRET` - Required for auth
- `AGENT_WORKSPACE` - Workspace path (default: `/workspace/bakedbot-for-brands`)
- `OPENCODE_PATH` - Path to opencode binary (default: `/usr/local/bin/opencode`)

---

## Thrive Syracuse Check-in Flow Bugs - Session 9 (2026-04-13)

### BUG-031: "Could not load recommendations" Products Not Loading
**Severity:** HIGH
**Category:** bug
**File:** `src/server/actions/loyalty-tablet.ts:505-517`

**Issue:** Customers see "Could not load recommendations" when the tablet mood recommendations fail.

**Root Cause:** Multiple possible causes:
1. POS sync not running - `tenants/org_thrive_syracuse/publicViews/products/items` is empty
2. Alleaves API credentials missing/invalid in location config
3. Cache has empty array for 5 min TTL (line 111)

**Impact:** Major UX failure on check-in tablet - customers can't get product recommendations.

**Debug Steps:**
1. Check Firestore: `tenants/org_thrive_syracuse/publicViews/products/items` exists?
2. Check cron: `/api/cron/pos-sync?orgId=org_thrive_syracuse`
3. Check location: `locations` doc has `posConfig.provider === 'alleaves'`

**Recommendation:** Add diagnostic endpoint to check inventory status and surface issues earlier.

---

### BUG-032: No Org Access Validation on Check-in
**Severity:** HIGH
**Category:** security
**File:** `src/server/actions/visitor-checkin.ts:1084`

**Issue:** `captureVisitorCheckin` accepts any `orgId` without verifying caller has access to that org.

**Details:** Line 1084 just parses the input with Zod but doesn't verify org membership.

**Impact:** Users could potentially submit check-ins for other organizations.

**Recommendation:** Add `verifyOrgAccess(user.uid, validated.orgId)` before processing.

---

### BUG-033: Weekly Campaign Subscriber Race Condition
**Severity:** MEDIUM
**Category:** bug
**File:** `src/server/actions/visitor-checkin.ts:1121-1138`

**Issue:** Check+insert for weekly campaign subscribers isn't atomic.

**Details:** Lines 1121-1138:
```typescript
const existingSubscriber = await db.collection('weekly_campaign_subscribers')
    .where('email', '==', normalizedEmail)
    .where('orgId', '==', validated.orgId)
    .limit(1).get();

if (existingSubscriber.empty) {
    await db.collection('weekly_campaign_subscribers').add({...});
}
```

**Impact:** Could create duplicate subscribers if concurrent check-ins happen.

**Recommendation:** Use Firestore runTransaction for atomic check+insert.

---

### BUG-034: Check-in Lookup Missing Org Validation
**Severity:** MEDIUM
**Category:** security
**File:** `src/app/api/checkin/lookup/route.ts`

**Issue:** `/api/checkin/lookup` uses API key auth but doesn't validate org access - could query other orgs.

**Details:** Line 42 calls `getPosDossierByPhoneLast4(orgId, phoneLast4)` without verifying the API key has access to that org.

**Recommendation:** Verify API key's allowed orgs includes the requested orgId.
```
