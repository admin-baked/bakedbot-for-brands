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

**Recommendation:** Add `requireSuperUser()` to all admin routes.

---

### BUG-002: Webhook Signature Verification Inconsistent
**Severity:** HIGH
**Category:** security
**File:** `src/app/api/webhooks/alleaves/route.ts`

**Issue:** Signature verification is SKIPPED in development mode (`NODE_ENV !== 'production'`).

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

**Issue:** The `hasPermission` function is hardcoded to return `true`:
```typescript
const hasPermission = (record: any, perm: string) => true;
```

**Impact:** All API keys have ALL permissions regardless of what was configured.

**Recommendation:** Implement actual permission checking logic.

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

**Recommendation:** Use constant-time comparison:
```typescript
import { timingSafeEqual } from 'crypto';
// or use a timing-safe comparison library
```
