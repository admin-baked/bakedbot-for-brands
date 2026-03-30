# CRM Customer Lifecycle Testing Guide

**Version:** 1.0
**Date:** March 12, 2026
**Scope:** Customer CRM, customer detail, lifecycle playbook suggestions, spending enrichment, communications history, and message sandbox flows.

---

## Overview

This guide covers the current CRM/customer lifecycle surface shipped in the dashboard:

- `/dashboard/customers`
- `/dashboard/customers/[id]`
- `/api/customers/spending`
- lifecycle playbook suggestion and launch flows
- customer communications and scheduled message rendering

It is designed for release validation after changes to CRM data loading, lifecycle playbooks, customer communications, or Alleaves-driven spending enrichment.
---

## Prerequisites

Before testing, confirm:

1. You can sign in as a `brand`, `brand_admin`, `brand_member`, `dispensary`, `dispensary_admin`, `dispensary_staff`, `budtender`, or `super_user`.
2. The org you are testing has at least one customer record.
3. For spending/order enrichment tests, the org has an active Alleaves POS config or cached spending/order data.
4. Firebase App Hosting is deployed and the dashboard is reachable.
5. If testing super-user behavior, you have a way to impersonate or switch into the target org context.

---

## Automated Tests

Run the focused CRM/customer suite:

```powershell
npm test -- --runInBand --runTestsByPath "src/app/dashboard/customers/__tests__/actions.test.ts" "src/app/dashboard/customers/[id]/__tests__/actions.test.ts" "src/app/dashboard/customers/[id]/__tests__/page-client.test.tsx" "src/server/actions/__tests__/customer-communications.test.ts" "src/app/api/customers/spending/__tests__/route.security.test.ts" "src/lib/customers/__tests__/profile-derivations.test.ts" "src/lib/customers/__tests__/lifecycle-playbooks.test.ts"
```

Expected result:

```text
Test Suites: 7 passed, 7 total
Tests:       26 passed, 26 total
```

Coverage by file:

- `src/app/api/customers/spending/__tests__/route.security.test.ts`
  - auth required
  - cross-org access blocked
  - same-org cached reads allowed
  - super-user explicit org reads allowed
- `src/server/actions/__tests__/customer-communications.test.ts`
  - communication history org scoping
  - upcoming scheduled message mapping
  - playbook metadata preservation
  - status update authorization
- `src/app/dashboard/customers/__tests__/actions.test.ts`
  - lifecycle suggestion generation
  - status hint rendering
  - playbook launch uses requested org
- `src/app/dashboard/customers/[id]/__tests__/actions.test.ts`
  - customer detail assembly
  - lifecycle state derivation
  - order fallback and auto-tag derivation
- `src/app/dashboard/customers/[id]/__tests__/page-client.test.tsx`
  - chat dialog open
  - notes/tags rendering
  - upcoming message rendering
- `src/lib/customers/__tests__/profile-derivations.test.ts`
  - display name and tag derivation
- `src/lib/customers/__tests__/lifecycle-playbooks.test.ts`
  - lifecycle matching
  - preview copy generation
  - playbook ordering

---

## Manual Test Scenarios

### 1. CRM List Loads

Navigate to `/dashboard/customers`.

Verify:

- Page header shows `Customer CRM`.
- Customer rows render without crashing.
- Search input placeholder is `Search customers, emails, or tags...`.
- If spending enrichment runs, the banner reads `Loading a fresh POS spending snapshot. Segments and playbook recommendations will update automatically.`
- After enrichment, a green success banner appears showing either cached or fresh POS spending snapshot text.

### 2. Search and Tag Discovery

From `/dashboard/customers`:

1. Search by email.
2. Search by display name.
3. Search by a known manual tag.
4. Search by a known auto tag.

Verify:

- Matching customers remain visible.
- Non-matching rows disappear.
- Auto tags appear inline on the customer row when present.

### 3. Playbook Suggestions

On `/dashboard/customers`, inspect the `Playbook Suggestions` card.

Verify:

- Suggestions render for eligible lifecycle states.
- Status badges show `Active`, `Ready`, or `Missing`.
- Clicking a card filters to the suggested segment.
- Clicking `Launch Playbook` shows success or a clear error toast.

Expected behavior:

- Existing active lifecycle playbook: toast indicates it is already active.
- Existing but inactive lifecycle playbook: toast indicates it is ready in sandbox.
- Missing lifecycle playbook: it is created for the current org and returned as ready in sandbox.

### 4. Customer Detail Loads

Open a customer from the CRM table.

Verify:

- Detail page renders without redirect loops.
- Header shows the customer display name, segment badge, and tier.
- `Chat About Customer` button is visible.
- Core metrics render: Lifetime Value, Total Orders, Avg. Order, Last Order, Price Range.

### 5. Communications Tab

Open the `Communications` tab.

Verify:

- Scheduled messages render in chronological order.
- If the scheduled message has no stored preview but has lifecycle metadata, the UI still shows a synthesized preview.
- History cards show channel, type, subject, and send time.
- Empty states show `No communications yet` instead of a broken section.

### 6. Lifecycle Sandbox

From the detail page:

1. Use `Preview in Sandbox` from the next-message section, or
2. Click `Sandbox` on a lifecycle playbook card.

Verify:

- Dialog title is `Message Sandbox`.
- Description reads `Preview personalized email and SMS copy for this customer. Nothing is sent live from this sandbox.`
- Switching between `Welcome Email`, `Win-Back`, and `VIP Appreciation` updates preview text.
- `Open Playbooks` routes to `/dashboard/playbooks`.

### 7. Orders and Auto Tags

Open the detail page and wait for order loading.

Verify:

- Order history loads or degrades gracefully.
- If order data exists, preferred categories/products populate.
- `Auto Tags` in `Notes & Tags` reflect updated order/spending context.
- If the customer endpoint fails and cached/all-orders fallback is used, the page still renders usable order data.

### 8. Notes and Manual Tags

Open the `Notes & Tags` tab.

Verify:

- `CRM Notes`, `Auto Tags`, and `Manual Tags` sections all render.
- Updating notes persists and shows a success toast.
- Adding a tag persists.
- Removing a tag persists.
- Manual tags merge cleanly with auto tags in the UI without duplicate labels.

### 9. Spending API Authorization

Use browser devtools while authenticated.

Check requests to `/api/customers/spending?orgId=...`.

Verify:

- Same-org request returns `200`.
- Unauthenticated request returns `401`.
- Cross-org request from a non-super user returns `403`.
- Super-user request for an explicit org is allowed.

### 10. Super-User Org Switching

Test as `super_user` in an org-switched context.

Verify:

- CRM suggestions are based on the viewed org, not the default user org.
- `Launch Playbook` creates or reuses the lifecycle playbook inside the requested org.
- Customer detail reads communications and lifecycle state from the impersonated org.

---

## Failure-Mode Checks

Validate these non-happy paths before sign-off:

- No Alleaves config:
  - CRM still loads.
  - Spending banner does not break the page.
  - Orders fall back to `No connected POS client available`.
- Missing scheduled message preview:
  - lifecycle preview is synthesized from message metadata.
- Missing playbook assignments:
  - customer detail still renders lifecycle cards with safe fallback state.
- Missing communications:
  - page shows explicit empty states.
- Unauthorized org access:
  - API blocks request instead of returning another org's data.

---

## Data and Logging Checks

Inspect these collections when debugging:

```text
customers/
customer_communications/
scheduled_emails/
playbooks/
tenants/{orgId}/customer_spending/
```

Useful log areas:

- `[SPENDING]` for spending enrichment and authorization failures
- `[COMMS]` for communication reads and status updates
- `[CUSTOMERS]` for lifecycle launch and suggestion issues
- `[CUSTOMER_DETAIL]` for detail assembly and assignment fallback issues

---

## Release Sign-Off Checklist

- [ ] Focused automated CRM/customer suite passes
- [ ] `/dashboard/customers` loads for the target org
- [ ] Spending enrichment succeeds or degrades cleanly
- [ ] Search works for name, email, and tags
- [ ] Lifecycle suggestions render with correct status badges
- [ ] `Launch Playbook` targets the correct org
- [ ] Customer detail page renders communications and lifecycle cards
- [ ] Sandbox previews email and SMS variants
- [ ] Notes and manual tags save correctly
- [ ] Unauthorized spending API access is blocked
- [ ] Firebase App Hosting deploy completed successfully

---

## Recommended Deployment Verification

After pushing:

```bash
gh run list --branch main --workflow deploy.yml --limit 5
gh run list --branch main --workflow production-deploy.yml --limit 5
```

Expected:

- `Deploy to Firebase App Hosting`: `success`
- `Production Deploy`: `success`

If App Hosting is green and Production Deploy fails, inspect the specific run before assuming the CRM change is broken. In recent runs, App Hosting has been the more reliable signal for this surface.

---

## Related Files

- `src/app/api/customers/spending/route.ts`
- `src/app/dashboard/customers/actions.ts`
- `src/app/dashboard/customers/page-client.tsx`
- `src/app/dashboard/customers/[id]/actions.ts`
- `src/app/dashboard/customers/[id]/page-client.tsx`
- `src/app/dashboard/customers/components/customer-chat-dialog.tsx`
- `src/app/dashboard/customers/components/customer-message-sandbox-dialog.tsx`
- `src/server/actions/customer-communications.ts`
- `src/lib/customers/profile-derivations.ts`
- `src/lib/customers/lifecycle-playbooks.ts`

---

*Last updated for commit `8ff63beae` (`Improve CRM customer lifecycle workflows`).*
